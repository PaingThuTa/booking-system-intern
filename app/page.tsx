import { redirect } from "next/navigation";

import { auth, defaultRedirectForRole } from "@/lib/auth";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  redirect(defaultRedirectForRole(session.user.role));
}
