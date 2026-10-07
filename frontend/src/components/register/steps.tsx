"use client";

import { useRegisterStore } from "./store";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowLeft, Plus, X, Check, Crown, AlertCircle } from "lucide-react";
import Link from "next/link";
import { normalizeTeamName } from "@/lib/team-name";

const STEPS = ["TEAM", "MEMBERS", "DETAILS", "PAYMENT", "SUBMIT"];

export function RegisterStepper() {
  const step = useRegisterStore((s) => s.step);
  return (
    <div className="flex items-center justify-between max-w-2xl mx-auto mb-10 md:mb-12">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-2">
            <div
              className={`flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full border text-xs font-semibold transition-all ${
                i < step
                  ? "border-[#B52A32] bg-[#B52A32] text-white"
                  : i === step
                    ? "border-[#B52A32] bg-transparent text-[#B52A32] red-glow"
                    : "border-white/15 text-[#A8A8A8]"
              }`}
            >
              {i < step ? <Check size={14} /> : String(i + 1).padStart(2, "0")}
            </div>
            <span
              className={`mono text-[9px] md:text-[10px] uppercase tracking-widest text-center ${
                i === step ? "text-white" : "text-[#A8A8A8]"
              }`}
            >
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className="flex-1 h-px mx-1.5 md:mx-4 bg-white/10 relative overflow-hidden">
              <div
                className={`absolute inset-0 bg-[#B52A32] transition-transform duration-500 origin-left ${
                  i < step ? "scale-x-100" : "scale-x-0"
                }`}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── STEP 0: TEAM ─────────────────────────────────────────────────────────────

export function StepTeam() {
  const { teamName, setTeamName, next } = useRegisterStore();
  const normalizedTeamName = normalizeTeamName(teamName);
  const validFormat = normalizedTeamName.length >= 2 && /^[a-zA-Z0-9 _\-.]+$/.test(teamName.trim());
  const [debouncedTeamName, setDebouncedTeamName] = useState(normalizedTeamName);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedTeamName(normalizedTeamName), 400);
    return () => window.clearTimeout(timeout);
  }, [normalizedTeamName]);

  const { data: checkData, isFetching, isError } = useQuery<{ available: boolean; reason?: string }>({
    queryKey: ["team-name-check", debouncedTeamName],
    queryFn: async () => {
      const r = await fetch(`/api/registrations/check-team-name?name=${encodeURIComponent(debouncedTeamName)}`);
      if (!r.ok) throw new Error("Unable to verify team name availability");
      return r.json();
    },
    enabled: validFormat && debouncedTeamName === normalizedTeamName,
    staleTime: 30_000,
  });

  const checking = validFormat && (debouncedTeamName !== normalizedTeamName || isFetching);
  const availability = !validFormat
    ? "invalid"
    : checking
      ? "checking"
      : isError
        ? "error"
        : checkData?.available === false
          ? "taken"
          : checkData?.available === true
            ? "available"
            : "error";
  const valid = availability === "available";

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="display text-3xl md:text-5xl font-bold text-white mb-3">NAME YOUR CREW.</h2>
      <p className="text-sm md:text-base text-[#A8A8A8] mb-8 md:mb-10">
        Pick a team name. This is how you will be known throughout the mission.
      </p>

      <label className="block">
        <span className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8]">
          Team Name
        </span>
        <input
          type="text"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="Enter your team name"
          maxLength={60}
          className="mt-2 w-full bg-transparent border-b border-white/15 py-3 text-xl md:text-2xl text-white placeholder:text-[#A8A8A8]/40 focus:border-[#B52A32] focus:outline-none transition-colors"
        />
      </label>
      {teamName.length > 0 && (
        <div className="mt-2 text-xs">
          {checking ? (
            <span className="text-[#A8A8A8]">Checking availability…</span>
          ) : availability === "taken" ? (
            <span className="text-[#D83A43] flex items-center gap-1.5">
              <AlertCircle size={12} /> Team name already exists. Please choose a different team name.
            </span>
          ) : availability === "available" ? (
            <span className="text-green-400 flex items-center gap-1.5">
              <Check size={12} /> Team name is available.
            </span>
          ) : availability === "error" ? (
            <span className="text-[#D83A43] flex items-center gap-1.5">
              <AlertCircle size={12} /> Unable to verify team name. Please try again.
            </span>
          ) : (
            <span className="text-[#D83A43]">Team name contains invalid characters.</span>
          )}
        </div>
      )}

      <div className="mt-8 md:mt-10 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-[#A8A8A8] hover:text-white transition-colors min-h-[44px]"
        >
          <ArrowLeft size={14} /> Cancel
        </Link>
        <button
          disabled={!valid}
          onClick={next}
          className="group flex items-center gap-2 rounded-full bg-[#B52A32] disabled:opacity-30 disabled:cursor-not-allowed px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[#D83A43] min-h-[44px]"
        >
          CONTINUE <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
}

// ─── STEP 1: MEMBERS ──────────────────────────────────────────────────────────

export function StepMembers() {
  const { members, setMember, addMember, removeMember, next, prev } = useRegisterStore();

  const memberValid = (m: typeof members[0]) => {
    const imgValid = !m.participantImage || (
      ["image/jpeg", "image/png", "image/webp"].includes(m.participantImage.type) &&
      m.participantImage.size <= 1024 * 1024
    );
    return m.fullName.trim().length >= 2 &&
      m.email.toLowerCase().trim().endsWith("@gmail.com") &&
      /^[6-9][0-9]{9}$/.test(m.phone.trim()) &&
      m.college.trim().length >= 2 &&
      imgValid;
  };

  const allValid = members.every(memberValid);
  const emails = members.map((m) => m.email.toLowerCase().trim());
  const hasDuplicate = emails.some((e, i) => e && emails.indexOf(e) !== i);
  const valid = allValid && !hasDuplicate;

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="display text-3xl md:text-5xl font-bold text-white mb-3">ASSEMBLE THE CREW.</h2>
      <p className="text-sm md:text-base text-[#A8A8A8] mb-8 md:mb-10">
        Minimum 3, maximum 4. Each member must have a unique email. The first member is always the team leader.
      </p>

      <div className="space-y-4 md:space-y-6">
        {members.map((m, i) => {
          const isLeader = i === 0;
          const emailError = m.email.trim().length > 0 && !m.email.toLowerCase().trim().endsWith("@gmail.com")
            ? "• Enter a valid Gmail address"
            : hasDuplicate && emails.indexOf(emails[i]) !== i && emails[i]
              ? "• This email is duplicated within the team"
              : undefined;
          return (
            <div
              key={i}
              className={`glass rounded-lg p-4 md:p-5 border transition-all ${
                isLeader ? "border-[#B52A32]/50" : "border-transparent"
              }`}
            >
              <div className="flex items-center justify-between mb-3 md:mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="mono text-xs uppercase tracking-widest text-[#B52A32]">
                    Member {String(i + 1).padStart(2, "0")}
                  </span>
                  {i < 3 && <span className="text-[#A8A8A8] text-xs">· Required</span>}
                  {i === 3 && <span className="text-[#A8A8A8] text-xs">· Optional</span>}
                  <span className="inline-flex items-center gap-1 mono text-[10px] uppercase tracking-widest text-[#D83A43] border border-[#B52A32] px-2 py-0.5 rounded">
                    {isLeader && <Crown size={10} />} {isLeader ? "Team Leader" : "Team Member"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {i >= 3 && (
                    <button
                      onClick={() => removeMember(i)}
                      className="text-[#A8A8A8] hover:text-[#B52A32] transition-colors p-1"
                      aria-label="Remove member"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Input label="Full Name" value={m.fullName} onChange={(v) => setMember(i, { fullName: v })} placeholder="Enter full name" error={m.fullName.trim().length > 0 && m.fullName.trim().length < 2 ? "• Full name must be at least 2 characters" : undefined} />
                <Input label="Email" type="email" value={m.email} onChange={(v) => setMember(i, { email: v })} placeholder="example@gmail.com" error={emailError} />
                <Input label="Phone" type="tel" value={m.phone} onChange={(v) => setMember(i, { phone: v })} placeholder="10 digit number" error={m.phone.trim().length > 0 && !/^[6-9][0-9]{9}$/.test(m.phone.trim()) ? "• Enter a valid Indian mobile number" : undefined} />
                <Input label="College" value={m.college} onChange={(v) => setMember(i, { college: v })} placeholder="Enter your college / institution name" error={m.college.trim().length > 0 && m.college.trim().length < 2 ? "• College name is required" : undefined} />
                <div className="md:col-span-2">
                  <DegreeField
                    value={m.degree}
                    onChange={(v) => setMember(i, { degree: v })}
                  />
                </div>
                <label className="md:col-span-2 block">
                  <span className="mono text-xs uppercase tracking-widest text-[#A8A8A8]">Participant photo (optional, JPEG / PNG / WebP, max 1 MiB)</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setMember(i, { participantImage: e.target.files?.[0] ?? null })} className="mt-2 block w-full text-xs text-[#A8A8A8]" />
                  {m.participantImage && <span className="mt-1 block text-xs text-[#A8A8A8]">Selected: {m.participantImage.name} ({Math.ceil(m.participantImage.size / 1024)} KiB)</span>}
                  {m.participantImage && (!["image/jpeg", "image/png", "image/webp"].includes(m.participantImage.type) || m.participantImage.size > 1024 * 1024) && (
                    <span className="mt-1 block text-xs text-[#D83A43] flex items-center gap-1.5"><AlertCircle size={12} /> Invalid format or size &gt; 1MB</span>
                  )}
                </label>
              </div>

            </div>
          );
        })}
      </div>

      {members.length < 4 && (
        <button
          onClick={addMember}
          className="mt-4 flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm text-white hover:border-[#B52A32] hover:bg-white/5 transition-all min-h-[44px]"
        >
          <Plus size={14} /> Add Optional 4th Member
        </button>
      )}

      <div className="mt-8 md:mt-10 flex items-center justify-between">
        <button
          onClick={prev}
          className="flex items-center gap-2 text-sm text-[#A8A8A8] hover:text-white transition-colors min-h-[44px]"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <button
          disabled={!valid}
          onClick={next}
          className="group flex items-center gap-2 rounded-full bg-[#B52A32] disabled:opacity-30 disabled:cursor-not-allowed px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[#D83A43] min-h-[44px]"
        >
          CONTINUE <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
}

// ─── STEP 2: DETAILS REVIEW ───────────────────────────────────────────────────

export function StepDetails() {
  const { teamName, members, next, prev } = useRegisterStore();

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="display text-3xl md:text-5xl font-bold text-white mb-3">CONFIRM THE BRIEF.</h2>
      <p className="text-sm md:text-base text-[#A8A8A8] mb-8 md:mb-10">
        Review your team details before proceeding to payment.
      </p>

      <div className="glass rounded-lg p-5 md:p-8">
        <div className="pb-4 md:pb-6 border-b border-white/5">
          <div className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8]">Team</div>
          <div className="display text-xl md:text-2xl text-white mt-1 truncate">{teamName}</div>
        </div>

        <div className="mt-4 md:mt-6 space-y-3 md:space-y-4">
          {members.map((m, i) => (
            <div key={i} className="flex items-start gap-3 md:gap-4 pb-3 md:pb-4 border-b border-white/5 last:border-0 last:pb-0">
              <div className={`flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-full mono text-xs ${
                i === 0
                  ? "bg-[#B52A32] text-white"
                  : "bg-[#151515] border border-white/10 text-[#B52A32]"
              }`}>
                {i === 0 ? <Crown size={14} /> : String(i + 1).padStart(2, "0")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium text-sm md:text-base truncate">
                  {m.fullName}
                  <span className="ml-2 text-[10px] text-[#D83A43]">· {i === 0 ? "TEAM LEADER" : "TEAM MEMBER"}</span>
                </div>
                <div className="text-xs md:text-sm text-[#A8A8A8] truncate">{m.email}</div>
                <div className="text-xs text-[#A8A8A8] mt-0.5 truncate">{m.phone} · {m.college}</div>
                {m.degree && (
                  <div className="text-xs text-[#A8A8A8] mt-0.5 truncate">Degree: {m.degree}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 md:mt-10 flex items-center justify-between">
        <button
          onClick={prev}
          className="flex items-center gap-2 text-sm text-[#A8A8A8] hover:text-white transition-colors min-h-[44px]"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <button
          onClick={next}
          className="group flex items-center gap-2 rounded-full bg-[#B52A32] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[#D83A43] min-h-[44px]"
        >
          PROCEED TO PAYMENT <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
}

// ─── STEP 3: PAYMENT ─────────────────────────────────────────────────────────

const REGISTRATION_FEE = "₹1,000";
const OFFICIAL_UPI_ID = "mitthandavapura.99649826@hdfcbank";
const PAYMENT_QR = "/images/QRcode/payment-qr.png";

export function StepPayment() {
  const {
    transactionId, setTransactionId,
    screenshot, screenshotPreview, setScreenshot,
    next, prev, serverError, submitting,
    teamId, setTeamId, setAcknowledgementEmailSent,
    teamName, college, members,
    setServerError, setSubmitting,
  } = useRegisterStore();

  const fee = REGISTRATION_FEE;
  const qrUrl = PAYMENT_QR;

  const validTxn = transactionId.trim().length >= 4 && transactionId.trim().length <= 100;
  const screenshotValid = screenshot ? (
    ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(screenshot.type) &&
    screenshot.size <= 8 * 1024 * 1024
  ) : false;
  const valid = validTxn && screenshotValid;
  const transactionError = transactionId.trim().length > 0 && !validTxn
    ? transactionId.trim().length < 4
      ? "• Transaction ID must be at least 4 characters"
      : "• Transaction ID must be 100 characters or fewer"
    : undefined;

  const submitAll = async () => {
    setServerError(null);
    setSubmitting(true);
    try {
      // A payment or upload may fail after the team was created. Resume that
      // registration on retry instead of creating a duplicate team.
      let activeTeamId = teamId;
      if (!activeTeamId) {
        const registrationForm = new FormData();
        registrationForm.append("registration", JSON.stringify({ teamName, college, members: members.map(({ participantImage: _image, ...member }) => member) }));
        members.forEach((member, index) => { if (member.participantImage) registrationForm.append(`participantImage${index}`, member.participantImage); });
        const regRes = await fetch("/api/registrations", { method: "POST", body: registrationForm });
        const regJson = await regRes.json().catch(() => ({}));
        if (!regRes.ok) throw new Error(regJson.error || "Registration failed");
        activeTeamId = regJson.team.id;
        setTeamId(activeTeamId);
        setAcknowledgementEmailSent(regJson.acknowledgementEmailSent === true);
      }

      // Repeating this call with the same transaction ID is safe and preserves
      // its proof. A changed ID resets the old proof on the server.
      const payRes = await fetch(`/api/registrations/${activeTeamId}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: transactionId.trim() }),
      });
      const payJson = await payRes.json().catch(() => ({}));
      if (!payRes.ok) {
        if (payRes.status === 401) throw new Error(`Payment access expired. Contact the coordinator with registration reference ${activeTeamId}.`);
        throw new Error(payJson.error || "Payment submission failed");
      }

      const form = new FormData();
      form.append("file", screenshot!);
      const upRes = await fetch(`/api/registrations/${activeTeamId}/payment-screenshot`, {
        method: "POST",
        body: form,
      });
      const upJson = await upRes.json().catch(() => ({}));
      if (!upRes.ok) {
        if (upRes.status === 401) throw new Error(`Payment access expired. Contact the coordinator with registration reference ${activeTeamId}.`);
        throw new Error(upJson.error || "Screenshot upload failed");
      }

      next();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="display text-3xl md:text-5xl font-bold text-white mb-3">TRANSMIT PAYMENT.</h2>
      <p className="text-sm md:text-base text-[#A8A8A8] mb-8 md:mb-10">
        Pay the registration fee via UPI, then enter the transaction ID and upload the screenshot.
      </p>

      <div className="glass rounded-lg p-5 md:p-8 mb-6 md:mb-8">
        <div className="grid md:grid-cols-2 gap-4 md:gap-6 items-center">
          <div>
            <div className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8] mb-2">
              Registration Fee
            </div>
            <div className="display text-4xl md:text-5xl text-white font-bold">{fee}</div>
            <div className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8] mt-4 md:mt-6 mb-2">
              UPI ID
            </div>
            <div className="font-mono text-sm md:text-base text-[#B52A32] select-all break-all">
              {OFFICIAL_UPI_ID}
            </div>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(OFFICIAL_UPI_ID);
              }}
              className="mt-2 text-xs text-[#A8A8A8] hover:text-white transition-colors min-h-[36px]"
            >
              Tap to copy
            </button>
          </div>
          <div className="flex items-center justify-center">
            <div className="aspect-square w-44 max-w-full bg-white p-2 rounded">
              <img src={qrUrl} alt="Payment QR code" className="block h-full w-full object-contain" />
            </div>
          </div>
        </div>
      </div>

      <label className="block mb-6">
        <span className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8]">
          Transaction ID
        </span>
        <input
          type="text"
          value={transactionId}
          onChange={(e) => setTransactionId(e.target.value)}
          placeholder="Enter your UPI transaction ID"
          className="mt-2 w-full bg-transparent border-b border-white/15 py-3 text-base md:text-lg text-white placeholder:text-[#A8A8A8]/40 focus:border-[#B52A32] focus:outline-none transition-colors"
        />
        {transactionError && <div className="mt-1 text-xs text-[#D83A43]">{transactionError}</div>}
      </label>

      <label className="block">
        <span className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8]">
          Payment Screenshot (JPEG / PNG / WebP, max 8MB)
        </span>
        <div className="mt-2 glass rounded-lg p-4 border border-dashed border-white/15 hover:border-[#B52A32] transition-colors">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg"
            onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)}
            className="block w-full text-xs md:text-sm text-[#A8A8A8] file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-[#B52A32] file:text-white file:text-xs file:font-semibold file:cursor-pointer hover:file:bg-[#D83A43] cursor-pointer"
          />
          {screenshot && (
            <div className="mt-3 text-xs text-[#A8A8A8]">
              Selected: {screenshot.name} ({Math.round(screenshot.size / 1024)} KB)
            </div>
          )}
          {screenshot && (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(screenshot.type) || screenshot.size > 8 * 1024 * 1024) && (
            <div className="mt-2 text-xs text-[#D83A43] flex items-center gap-1.5">
              <AlertCircle size={12} /> Invalid format or size &gt; 8MB
            </div>
          )}
          {screenshot && screenshotPreview && (
            <img
              src={screenshotPreview}
              alt="Payment screenshot preview"
              className="mt-3 max-h-40 rounded border border-white/10"
            />
          )}
        </div>
      </label>

      {serverError && (
        <div className="mt-4 glass rounded-lg p-4 border-l-2 border-[#B52A32] text-sm text-[#D83A43]">
          {serverError}
        </div>
      )}

      <div className="mt-8 md:mt-10 flex items-center justify-between">
        {teamId ? (
          <span className="text-xs text-[#A8A8A8]">Team details submitted</span>
        ) : (
          <button
            onClick={prev}
            disabled={submitting}
            className="flex items-center gap-2 text-sm text-[#A8A8A8] hover:text-white transition-colors disabled:opacity-50 min-h-[44px]"
          >
            <ArrowLeft size={14} /> Back
          </button>
        )}
        <button
          disabled={!valid || submitting}
          onClick={submitAll}
          className="group flex items-center gap-2 rounded-full bg-[#B52A32] disabled:opacity-30 disabled:cursor-not-allowed px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[#D83A43] min-h-[44px]"
        >
          {submitting ? "SUBMITTING…" : "SUBMIT PAYMENT"}
          {!submitting && <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />}
        </button>
      </div>
    </div>
  );
}

// ─── STEP 4: SUBMIT / CONFIRMATION ────────────────────────────────────────────

export function StepSubmit() {
  const { teamId, teamName, acknowledgementEmailSent, reset } = useRegisterStore();

  return (
    <div className="max-w-2xl mx-auto text-center">
      <div className="flex justify-center mb-6">
        <div className="h-16 w-16 rounded-full bg-[#B52A32] flex items-center justify-center red-glow">
          <Check size={28} className="text-white" />
        </div>
      </div>
      <h2 className="display text-3xl md:text-6xl font-bold text-white mb-3">PAYMENT UNDER REVIEW.</h2>
      <p className="text-sm md:text-base text-[#A8A8A8] mb-2">
        Your registration for <span className="text-white">{teamName}</span> has been received.
      </p>
      {acknowledgementEmailSent ? (
        <p className="text-sm md:text-base text-[#A8A8A8] mb-2">
          A confirmation email has been sent to the team leader&apos;s email address.
        </p>
      ) : (
        <p className="text-sm md:text-base text-[#A8A8A8] mb-2">
          Your registration has been recorded. We were unable to send the confirmation email right now. Please keep your registration details.
        </p>
      )}
      <p className="text-sm md:text-base text-[#A8A8A8] mb-10">
        The super admin will verify your payment shortly. Once approved, you will receive a unique registration ID and your crew will be issued digital passes with QR credentials for the food check-in system.
      </p>

      {teamId && (
        <div className="glass rounded-lg p-6 mb-10">
          <div className="mono text-[10px] uppercase tracking-widest text-[#A8A8A8]">Reference</div>
          <div className="mono text-sm md:text-lg text-[#B52A32] mt-1 select-all break-all">{teamId}</div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/"
          className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white hover:border-white/40 hover:bg-white/5 transition-all min-h-[44px] flex items-center justify-center"
        >
          Return Home
        </Link>
        <button
          onClick={() => reset()}
          className="rounded-full bg-[#B52A32] px-6 py-3 text-sm font-semibold text-white hover:bg-[#D83A43] transition-all min-h-[44px]"
        >
          Register Another Team
        </button>
      </div>
    </div>
  );
}

// ─── SHARED INPUT ─────────────────────────────────────────────────────────────

function Input({
  label, value, onChange, placeholder, type = "text", error,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; error?: string;
}) {
  return (
    <label className="block">
      <span className="mono text-xs uppercase tracking-widest text-[#A8A8A8]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full bg-transparent border-b border-white/15 py-2 text-base text-white placeholder:text-[#A8A8A8]/40 focus:border-[#B52A32] focus:outline-none transition-colors"
      />
      {error && <div className="mt-1 text-xs text-[#D83A43]">{error}</div>}
    </label>
  );
}

// ─── DEGREE FIELD (dropdown + custom text input) ─────────────────────────────

const DEGREE_OPTIONS = [
  "B.E",
  "B.Tech",
  "MCA",
  "BCA",
  "Diploma",
  "Other",
];

function DegreeField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  // Determine if the current value is one of the preset options (not "Other")
  const isPreset = DEGREE_OPTIONS.includes(value) && value !== "Other";
  const isOtherSelected = !isPreset && value !== "" && !DEGREE_OPTIONS.includes(value);
  // The select's value: show "Other" when the stored value is custom (or "Other")
  const selectValue = isOtherSelected || value === "Other" ? "Other" : isPreset ? value : "";

  return (
    <div>
      <label className="block">
        <span className="mono text-xs uppercase tracking-widest text-[#A8A8A8]">Degree</span>
        <select
          value={selectValue}
          onChange={(e) => {
            if (e.target.value === "Other") {
              // Switching to "Other" — keep existing custom text if any, else empty
              onChange(isOtherSelected ? value : "");
            } else {
              onChange(e.target.value);
            }
          }}
          className="mt-1 w-full bg-transparent border-b border-white/15 py-2 text-base text-white focus:border-[#B52A32] focus:outline-none transition-colors appearance-none cursor-pointer"
        >
          <option value="" disabled className="bg-[#080808] text-[#A8A8A8]">Select degree</option>
          {DEGREE_OPTIONS.map((opt) => (
            <option key={opt} value={opt} className="bg-[#080808] text-white">
              {opt}
            </option>
          ))}
        </select>
      </label>
      {(isOtherSelected || selectValue === "Other") && (
        <label className="block mt-2">
          <span className="mono text-xs uppercase tracking-widest text-[#A8A8A8]">Specify your degree</span>
          <input
            type="text"
            value={isOtherSelected ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter your degree"
            maxLength={60}
            className="mt-1 w-full bg-transparent border-b border-white/15 py-2 text-base text-white placeholder:text-[#A8A8A8]/40 focus:border-[#B52A32] focus:outline-none transition-colors"
          />
        </label>
      )}
    </div>
  );
}
