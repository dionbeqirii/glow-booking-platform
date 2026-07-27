import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { homeForRole } from "@/lib/rbac";

// The root has no landing page: logged-in users go to their panel, everyone
// else straight to the login screen.
export default async function Home() {
  const session = await getSession();
  redirect(session ? homeForRole(session.role) : "/login");
}
