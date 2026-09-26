import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizeRegistrationMembers, registrationSchema } from "@/lib/validators";
import { jsonError } from "@/lib/api-auth";
import { computeEventState, getEventState } from "@/lib/event-state";
import { normalizeTeamName } from "@/lib/team-name";
import { attemptRegistrationAcknowledgement } from "@/lib/registration-acknowledgement";
import { deletePrivateFile, storeParticipantImage, UploadError } from "@/lib/upload";

type RawQueryClient = Pick<typeof db, "$queryRaw">;

async function findTeamWithNormalizedName(client: RawQueryClient, normalizedName: string) {
  const matches = await client.$queryRaw<Array<{ teamName: string }>>`
    SELECT "teamName"
    FROM "Team"
    WHERE lower(regexp_replace(trim("teamName"), '\\s+', ' ', 'g')) = ${normalizedName}
    LIMIT 1
  `;
  return matches[0] ?? null;
}

/**
 * POST /api/registrations
 * Create a new team registration (status = SUBMITTED).
 * Enforces:
 *   - Registration deadline (server-side via event-state single source of truth): returns 403 if past deadline
 *   - registrationsOpen toggle (EventConfig) — if false, returns 403
 *   - Registration capacity (EventConfig) — if at capacity, returns 403
 *   - 3-4 members
 *   - First member is the sole team leader
 *   - College name required on every member
 *   - No duplicate member emails within the team
 *   - Unique team name (DB constraint)
 */
export async function POST(req: Request) {
  const storedParticipantImages: Array<{ relativePath: string; mimeType: string; sizeBytes: number }> = [];
  try {
    // ─── Registration deadline enforcement (single source of truth) ──────
    const eventState = await getEventState();
    if (!eventState.registrationOpen) {
      return NextResponse.json(
        { error: eventState.registrationMessage || "Registration is closed.", code: "REG_CLOSED" },
        { status: 403 },
      );
    }

    // ─── registrationsOpen toggle (manual close) ─────────────────────────
    if (!eventState.registrationsOpen) {
      return NextResponse.json(
        { error: "Registrations are currently closed.", code: "REG_CLOSED_MANUAL" },
        { status: 403 },
      );
    }

    // ─── Capacity check (atomic with team creation via transaction) ─────
    if (eventState.registrationCapacity > 0 && eventState.currentCount >= eventState.registrationCapacity) {
      return NextResponse.json(
        { error: "Registration is full. All spots have been taken.", code: "REG_FULL" },
        { status: 403 },
      );
    }

    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > 4 * 1_048_576 + 32_768) {
      return NextResponse.json({ error: "Registration upload is too large." }, { status: 413 });
    }
    let body: unknown;
    const files: Array<File | null> = [];
    if (req.headers.get("content-type")?.includes("multipart/form-data")) {
      try {
        const form = await req.formData();
        const registration = form.get("registration");
        if (typeof registration !== "string") return NextResponse.json({ error: "Registration details are required." }, { status: 400 });
        body = JSON.parse(registration);
        for (let i = 0; i < 4; i++) {
          const value = form.get(`participantImage${i}`);
          if (value !== null && !(value instanceof File)) return NextResponse.json({ error: "Invalid participant image upload." }, { status: 400 });
          files.push(value instanceof File && value.size > 0 ? value : null);
        }
        if ([...form.keys()].some((key) => key.startsWith("participantImage") && !/^participantImage[0-3]$/.test(key))) {
          return NextResponse.json({ error: "Invalid participant image field." }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: "Malformed registration upload." }, { status: 400 });
      }
    } else {
      body = await req.json();
    }
    const parsed = registrationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const { teamName, college } = parsed.data;
    const members = normalizeRegistrationMembers(parsed.data.members);
    if (files.some((file, index) => file && index >= members.length)) {
      return NextResponse.json({ error: "Image supplied for a missing team member." }, { status: 400 });
    }
    const normalizedTeamName = normalizeTeamName(teamName);
    if (normalizedTeamName.length < 2) {
      return NextResponse.json(
        { error: "Team name must be at least 2 characters long." },
        { status: 400 },
      );
    }

    // Check team name uniqueness (explicit error message for the user)
    const existing = await findTeamWithNormalizedName(db, normalizedTeamName);
    if (existing) {
      return NextResponse.json(
        { error: "Team name already exists. Please choose a different team name.", code: "TEAM_NAME_TAKEN" },
        { status: 409 },
      );
    }

    const participantImages: Array<Awaited<ReturnType<typeof storeParticipantImage>> | null> = [];
    for (let index = 0; index < members.length; index++) {
      const file = files[index];
      if (!file) {
        participantImages.push(null);
        continue;
      }
      const stored = await storeParticipantImage(file);
      storedParticipantImages.push(stored);
      participantImages.push(stored);
    }

    // ─── Transaction: re-check capacity atomically + create team ────────
    // Re-counting inside the transaction prevents the race where two registrations
    // slip through the capacity check simultaneously.
    let team;
    try {
      team = await db.$transaction(async (tx) => {
      // Serialize capacity checks so distinct team names cannot exceed the limit.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('hackmitten-registration-capacity'))`;
      // Serialize submissions for the same canonical name so equivalent names
      // cannot both pass the check before either insert commits.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${normalizedTeamName}))`;
      const existingInTransaction = await findTeamWithNormalizedName(tx, normalizedTeamName);
      if (existingInTransaction) {
        throw new Error("TEAM_NAME_TAKEN");
      }

      const currentCount = await tx.team.count();
      const cfg = await tx.eventConfig.findUnique({ where: { id: "singleton" } });
      if (!cfg) throw new Error("EVENT_CONFIG_MISSING");
      const currentEventState = computeEventState({ ...cfg, currentCount });
      if (currentEventState.state !== "REGISTRATION_OPEN") {
        throw new Error("Registration is closed.");
      }
      const capacity = cfg?.registrationCapacity ?? 60;
      const open = cfg?.registrationsOpen ?? true;
      if (!open) {
        throw new Error("Registrations are currently closed.");
      }
      if (capacity > 0 && currentCount >= capacity) {
        throw new Error("Registration is full. All spots have been taken.");
      }

      return tx.team.create({
        data: {
          teamName,
          college: college ?? members[0]?.college ?? null,
          status: "SUBMITTED",
          members: {
            create: members.map((m, index) => ({
              fullName: m.fullName,
              email: m.email.toLowerCase().trim(),
              phone: m.phone.trim(),
              college: m.college,
              degree: m.degree || null,
              participantImagePath: participantImages[index]?.relativePath ?? null,
              participantImageMimeType: participantImages[index]?.mimeType ?? null,
              participantImageSizeBytes: participantImages[index]?.sizeBytes ?? null,
              isLeader: m.isLeader,
            })),
          },
        },
        include: { members: true },
      });
      });
    } catch (error) {
      await Promise.all(storedParticipantImages.map((file) => deletePrivateFile(file.relativePath)));
      throw error;
    }

    const acknowledgementEmailSent = await attemptRegistrationAcknowledgement(team.id);
    const publicTeam = {
      ...team,
      members: team.members.map(({ participantImagePath: _path, participantImageMimeType: _mime, participantImageSizeBytes: _size, ...member }) => member),
    };
    return NextResponse.json({ team: publicTeam, acknowledgementEmailSent }, { status: 201 });
  } catch (err) {
    if (err instanceof UploadError) {
      await Promise.all(storedParticipantImages.map((file) => deletePrivateFile(file.relativePath)));
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    if (storedParticipantImages.length) {
      await Promise.all(storedParticipantImages.map((file) => deletePrivateFile(file.relativePath)));
    }
    if (err instanceof Error && err.message === "TEAM_NAME_TAKEN") {
      return NextResponse.json(
        { error: "Team name already exists. Please choose a different team name.", code: "TEAM_NAME_TAKEN" },
        { status: 409 },
      );
    }
    if (typeof err === "object" && err !== null && "code" in err && err.code === "P2002") {
      return NextResponse.json(
        { error: "Team name already exists. Please choose a different team name.", code: "TEAM_NAME_TAKEN" },
        { status: 409 },
      );
    }
    // Surface our capacity/close errors as 403, otherwise default jsonError handling
    if (err instanceof Error && err.message === "EVENT_CONFIG_MISSING") {
      return NextResponse.json({ error: "Registration is temporarily unavailable." }, { status: 503 });
    }
    if (err instanceof Error && (err.message === "Registrations are currently closed." || err.message === "Registration is closed." || err.message === "Registration is full. All spots have been taken.")) {
      const code = err.message === "Registration is full. All spots have been taken."
        ? "REG_FULL"
        : err.message === "Registration is closed." ? "REG_CLOSED" : "REG_CLOSED_MANUAL";
      return NextResponse.json({ error: err.message, code }, { status: 403 });
    }
    return jsonError(err);
  }
}

/**
 * GET /api/registrations/check-team-name?name=...
 * Public endpoint — checks if a team name is available (for live validation in the registration form).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const name = url.searchParams.get("name") ?? "";
  const normalizedName = normalizeTeamName(name);
  if (normalizedName.length < 2) {
    return NextResponse.json({ available: false, reason: "too-short" });
  }
  try {
    const existing = await findTeamWithNormalizedName(db, normalizedName);
    return NextResponse.json(existing ? { available: false, reason: "taken" } : { available: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to verify team name availability." },
      { status: 500 },
    );
  }
}
