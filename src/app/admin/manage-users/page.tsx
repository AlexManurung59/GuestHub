
"use client";

import { useRouter } from "next/navigation";
import ManageUsers from "@/components/ManageUsers";
import { LanguageSwitcher, useLanguage } from "@/app/language-provider";

export default function ManageUsersPage() {
  const router = useRouter();
  const { translate } = useLanguage();

  return (
    <main className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => router.push("/admin")}
        >
          <i className="bi bi-arrow-left me-2" />
          {translate("Kembali ke Dashboard Admin", "Back to Admin Dashboard")}
        </button>
        <LanguageSwitcher />
      </div>

      <ManageUsers />
    </main>
  );
}
