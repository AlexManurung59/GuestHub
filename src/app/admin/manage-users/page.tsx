
"use client";

import { useRouter } from "next/navigation";
import ManageUsers from "@/components/ManageUsers";

export default function ManageUsersPage() {
  const router = useRouter();

  return (
    <main className="container py-4">
      <button
        type="button"
        className="btn btn-outline-secondary mb-4"
        onClick={() => router.push("/admin")}
      >
        <i className="bi bi-arrow-left me-2" />
        Back to Admin Dashboard
      </button>

      <ManageUsers />
    </main>
  );
}
