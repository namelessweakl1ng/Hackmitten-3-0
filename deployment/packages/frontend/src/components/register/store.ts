"use client";

import { create } from "zustand";

export interface MemberForm {
  fullName: string;
  email: string;
  phone: string;
  college: string;
  degree: string;
  participantImage: File | null;
}

interface RegisterState {
  step: number; // 0..4
  teamName: string;
  college: string;
  members: MemberForm[];
  transactionId: string;
  screenshot: File | null;
  screenshotPreview: string | null;

  // After POST /api/registrations
  teamId: string | null;
  acknowledgementEmailSent: boolean | null;
  // Last server error
  serverError: string | null;
  // Pending request flag
  submitting: boolean;

  setStep: (s: number) => void;
  next: () => void;
  prev: () => void;
  setTeamName: (s: string) => void;
  setCollege: (s: string) => void;
  setMember: (idx: number, m: Partial<MemberForm>) => void;
  addMember: () => void;
  removeMember: (idx: number) => void;
  setTransactionId: (s: string) => void;
  setScreenshot: (f: File | null) => void;
  setTeamId: (id: string | null) => void;
  setAcknowledgementEmailSent: (sent: boolean | null) => void;
  setServerError: (e: string | null) => void;
  setSubmitting: (s: boolean) => void;
  reset: () => void;
}

const emptyMember = (): MemberForm => ({ fullName: "", email: "", phone: "", college: "", degree: "", participantImage: null });

export const useRegisterStore = create<RegisterState>((set) => ({
  step: 0,
  teamName: "",
  college: "",
  members: [emptyMember(), emptyMember(), emptyMember()],
  transactionId: "",
  screenshot: null,
  screenshotPreview: null,
  teamId: null,
  acknowledgementEmailSent: null,
  serverError: null,
  submitting: false,

  setStep: (s) => set({ step: s }),
  next: () => set((st) => ({ step: Math.min(4, st.step + 1) })),
  prev: () => set((st) => ({ step: Math.max(0, st.step - 1) })),
  setTeamName: (s) => set({ teamName: s }),
  setCollege: (s) => set({ college: s }),
  setMember: (idx, m) =>
    set((st) => ({
      members: st.members.map((mem, i) => (i === idx ? { ...mem, ...m } : mem)),
    })),
  addMember: () =>
    set((st) =>
      st.members.length < 4 ? { members: [...st.members, emptyMember()] } : st,
    ),
  removeMember: (idx) =>
    set((st) => ({
      members: st.members.filter((_, i) => i !== idx),
    })),
  setTransactionId: (s) => set({ transactionId: s }),
  setScreenshot: (f) =>
    set((st) => {
      if (st.screenshotPreview && st.screenshotPreview.startsWith("blob:")) {
        URL.revokeObjectURL(st.screenshotPreview);
      }
      return {
        screenshot: f,
        screenshotPreview: f ? URL.createObjectURL(f) : null,
      };
    }),
  setTeamId: (id) => set({ teamId: id }),
  setAcknowledgementEmailSent: (sent) => set({ acknowledgementEmailSent: sent }),
  setServerError: (e) => set({ serverError: e }),
  setSubmitting: (s) => set({ submitting: s }),
  reset: () =>
    set((st) => {
      if (st.screenshotPreview && st.screenshotPreview.startsWith("blob:")) {
        URL.revokeObjectURL(st.screenshotPreview);
      }
      return {
        step: 0,
        teamName: "",
        college: "",
        members: [emptyMember(), emptyMember(), emptyMember()],
        transactionId: "",
        screenshot: null,
        screenshotPreview: null,
        teamId: null,
        acknowledgementEmailSent: null,
        serverError: null,
        submitting: false,
      };
    }),
}));
