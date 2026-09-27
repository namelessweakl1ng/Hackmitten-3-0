import type { PaymentStatus, RegistrationStatus } from "@prisma/client";

/** Return a client-safe reason when a payment attempt cannot reopen a team. */
export function paymentSubmissionBlockReason(
  teamStatus: RegistrationStatus,
  paymentStatus: PaymentStatus | null,
): string | null {
  if (!["SUBMITTED", "PAYMENT_PENDING", "REJECTED"].includes(teamStatus)) {
    return `Cannot submit payment from status ${teamStatus}`;
  }
  if (teamStatus === "REJECTED" && paymentStatus !== "REJECTED") {
    return "This registration cannot resubmit payment";
  }
  if (paymentStatus === "VERIFIED") {
    return "Payment has already been verified";
  }
  return null;
}

/** Proof for a different or rejected attempt must not be shown as current proof. */
export function shouldResetPaymentProof(
  payment: { status: PaymentStatus; transactionId: string | null } | null,
  nextTransactionId: string,
): boolean {
  return Boolean(payment && (payment.status === "REJECTED" || payment.transactionId !== nextTransactionId));
}
