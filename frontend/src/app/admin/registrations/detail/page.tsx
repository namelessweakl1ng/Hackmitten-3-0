"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AdminShell } from "@/components/admin/shell";
import { AdminRegistrationDetail } from "@/components/admin/registration-detail";
import { Loader2 } from "lucide-react";

function DetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  if (!id) {
    return (
      <div className="p-8 text-center text-[#A8A8A8]">
        No registration ID provided.
      </div>
    );
  }

  return <AdminRegistrationDetail id={id} />;
}

export default function AdminRegistrationDetailPage() {
  return (
    <AdminShell>
      <Suspense fallback={
        <div className="flex h-[50vh] items-center justify-center text-[#A8A8A8]">
          <Loader2 className="animate-spin mr-2" size={20} /> Loading details...
        </div>
      }>
        <DetailContent />
      </Suspense>
    </AdminShell>
  );
}
