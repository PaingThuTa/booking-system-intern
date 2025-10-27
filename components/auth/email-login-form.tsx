"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EmailLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [internId, setInternId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email || !fullName || !internId) {
      setError("Please provide your email, full name, and intern ID to continue.");
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await signIn("credentials", {
        email,
        fullName,
        internId,
        redirect: false,
      });

      if (result?.error) {
        setError(
          result.error === "CredentialsSignin"
            ? "Unable to sign you in. Please verify your details."
            : result.error,
        );
        return;
      }

      if (result?.ok) {
        router.push("/");
        router.refresh();
      }
    } catch (submitError) {
      console.error("Failed to sign in with credentials", submitError);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
          type="text"
          autoComplete="name"
          required
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Ada Lovelace"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="internId">Intern ID</Label>
        <Input
          id="internId"
          type="text"
          required
          value={internId}
          onChange={(event) => setInternId(event.target.value)}
          placeholder="INT-1234"
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Signing in..." : "Continue with email"}
      </Button>
    </form>
  );
}
