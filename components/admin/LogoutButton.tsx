"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }
  return (
    <button
      onClick={logout}
      style={{
        background: "#2a2a2a",
        color: "#f2f2f2",
        border: "1px solid #444",
        padding: "6px 12px",
        borderRadius: 8,
        cursor: "pointer",
      }}
    >
      Sign out
    </button>
  );
}
