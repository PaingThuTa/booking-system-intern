import { redirect } from "next/navigation";

import { EmailLoginForm } from "@/components/auth/email-login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth, defaultRedirectForRole } from "@/lib/auth";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect(defaultRedirectForRole(session.user.role));
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <CardTitle className="text-2xl">Welcome to the Min Intelligence internship Portal</CardTitle>
          <CardDescription>
            Reserve time with our talent team to secure your Min Intelligence internship. Sign in with your email,
            full name, and intern ID to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmailLoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
