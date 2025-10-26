import { redirect } from "next/navigation";

import { LoginButton } from "@/components/auth/login-button";
import { EmailLoginForm } from "@/components/auth/email-login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth, defaultRedirectForRole } from "@/lib/auth";

export default async function LoginPage() {
  const session = await auth();
  const missingConfigKeys = [
    process.env.GOOGLE_CLIENT_ID ? null : "GOOGLE_CLIENT_ID",
    process.env.GOOGLE_CLIENT_SECRET ? null : "GOOGLE_CLIENT_SECRET",
    process.env.NODE_ENV === "production" && !process.env.NEXTAUTH_SECRET ? "NEXTAUTH_SECRET" : null,
  ].filter(Boolean) as string[];

  const ssoConfigured = missingConfigKeys.length === 0;

  const disabledReason = ssoConfigured
    ? undefined
    : `Google sign-in is not configured. Please add ${missingConfigKeys
        .map((key) => key)
        .join(", ")} to your environment variables and restart the app.`;

  if (session?.user) {
    redirect(defaultRedirectForRole(session.user.role));
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <CardTitle className="text-2xl">Welcome to the Internship Portal</CardTitle>
          <CardDescription>
            Reserve time with our talent team to secure your internship. Sign in with your work or
            university Google account to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <EmailLoginForm />
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground text-center uppercase tracking-wide">
                or
              </p>
              <LoginButton disabled={!ssoConfigured} disabledReason={disabledReason} />
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
