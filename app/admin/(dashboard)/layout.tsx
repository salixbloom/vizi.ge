import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/session";
import LogoutButton from "@/components/admin/LogoutButton";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdmin())) {
    redirect("/admin/login");
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <nav
        style={{
          display: "flex",
          gap: 16,
          alignItems: "center",
          padding: "12px 20px",
          borderBottom: "1px solid #333",
          position: "sticky",
          top: 0,
          background: "#161616",
          zIndex: 5,
        }}
      >
        <strong>vizi.ge admin</strong>
        <Link href="/admin">Overview</Link>
        <Link href="/admin/submissions">Submissions</Link>
        <Link href="/admin/devices">Devices</Link>
        <Link href="/" style={{ opacity: 0.7 }}>
          View site ↗
        </Link>
        <div style={{ marginLeft: "auto" }}>
          <LogoutButton />
        </div>
      </nav>
      <div style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>{children}</div>
    </div>
  );
}
