import { z } from "zod";

export const memberSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(100),
  email: z
    .string()
    .email("Invalid email")
    .refine((v) => v.toLowerCase().endsWith("@gmail.com"), "Email must be a @gmail.com address"),
  phone: z
    .string()
    .regex(/^[6-9][0-9]{9}$/, "Phone must be a valid 10-digit Indian mobile number"),
  college: z.string().min(2, "College name required").max(150),
  degree: z.string().trim().min(1, "Degree is required").max(60),
});

export const registrationSchema = z
  .object({
    teamName: z
      .string()
      .min(2, "Team name must be at least 2 characters")
      .max(60, "Team name too long")
      .regex(/^[a-zA-Z0-9 _\-.]+$/, "Team name has invalid characters"),
    college: z.string().max(150).optional().or(z.literal("")),
    members: z.array(memberSchema).min(3, "Minimum 3 members required").max(4, "Maximum 4 members allowed"),
  })
  .superRefine((data, ctx) => {
    // Prevent duplicate member emails within the team
    const emails = data.members.map((m) => m.email.toLowerCase().trim());
    const seen = new Set<string>();
    emails.forEach((email, idx) => {
      if (seen.has(email)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["members", idx, "email"],
          message: "Duplicate email within team",
        });
      }
      seen.add(email);
    });
  });

export function normalizeRegistrationMembers(members: MemberInput[]) {
  return members.map((member, index) => ({
    ...member,
    isLeader: index === 0,
  }));
}

export const paymentSubmissionSchema = z.object({
  transactionId: z
    .string()
    .min(4, "Transaction ID too short")
    .max(100, "Transaction ID too long"),
});

export const rejectionSchema = z.object({
  reason: z.string().min(3, "Reason required").max(500),
});

export const foodCheckInSchema = z.object({
  qrToken: z.string().regex(/^[a-f0-9]{48}$/i, "Invalid QR token"),
  mealId: z.string().min(1),
});

export const loginSchema = z.object({
  identifier: z.string().min(1, "Username or email required"), // accepts username OR email
  password: z.string().min(1, "Password required"),
});

// ─── BERSERK recovery & password change ────────────────────────────────────

export const passwordChangeSchema = z
  .object({
    newUsername: z.string().min(4, "Username must be at least 4 characters").max(60).regex(/^[a-zA-Z0-9_.\-]+$/, "Username has invalid characters"),
    newPassword: z.string().min(12, "Password must be at least 12 characters").max(200),
    recoveryKey: z.string().min(10, "Recovery key required"),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword.toLowerCase() === "change-me" || data.newPassword === "password") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["newPassword"], message: "Password is too weak" });
    }
  });

export const mealSchema = z.object({
  type: z.enum(["BREAKFAST", "LUNCH", "SNACKS", "DINNER", "CUSTOM"]).default("CUSTOM"),
  label: z.string().min(1).max(60),
  date: z.string().optional(),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  enabled: z.boolean().default(true),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;
export type MemberInput = z.infer<typeof memberSchema>;
export type PaymentSubmissionInput = z.infer<typeof paymentSubmissionSchema>;
export type FoodCheckInInput = z.infer<typeof foodCheckInSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
export type MealInput = z.infer<typeof mealSchema>;
