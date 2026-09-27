import { describe, expect, it } from "bun:test";
import { paymentSubmissionBlockReason, shouldResetPaymentProof } from "@/lib/registration-payment-state";

describe("registration payment state", () => {
  it("allows initial submission, pending retries, and correction of rejected payments", () => {
    expect(paymentSubmissionBlockReason("SUBMITTED", null)).toBeNull();
    expect(paymentSubmissionBlockReason("PAYMENT_PENDING", "PENDING")).toBeNull();
    expect(paymentSubmissionBlockReason("REJECTED", "REJECTED")).toBeNull();
  });

  it("does not reopen a verified payment, approved team, or unrelated team rejection", () => {
    expect(paymentSubmissionBlockReason("PAYMENT_PENDING", "VERIFIED")).not.toBeNull();
    expect(paymentSubmissionBlockReason("APPROVED", "VERIFIED")).not.toBeNull();
    expect(paymentSubmissionBlockReason("REJECTED", "VERIFIED")).not.toBeNull();
    expect(paymentSubmissionBlockReason("REJECTED", "PENDING")).not.toBeNull();
  });

  it("retains proof on the same pending transaction and clears proof for another attempt", () => {
    expect(shouldResetPaymentProof(null, "TXN-1")).toBe(false);
    expect(shouldResetPaymentProof({ status: "PENDING", transactionId: "TXN-1" }, "TXN-1")).toBe(false);
    expect(shouldResetPaymentProof({ status: "PENDING", transactionId: "TXN-1" }, "TXN-2")).toBe(true);
    expect(shouldResetPaymentProof({ status: "REJECTED", transactionId: "TXN-1" }, "TXN-1")).toBe(true);
  });
});
