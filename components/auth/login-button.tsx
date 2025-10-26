"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";

interface LoginButtonProps {
  disabled?: boolean;
  disabledReason?: string;
}

export function LoginButton({ disabled = false, disabledReason }: LoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isButtonDisabled = disabled || isLoading;

  const handleLogin = async () => {
    if (disabled) {
      return;
    }

    try {
      setIsLoading(true);
      await signIn("google", { callbackUrl: "/" });
    } catch (error) {
      console.error("Failed to initiate sign in", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button onClick={handleLogin} disabled={isButtonDisabled} className="w-full">
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue with Google"}
      </Button>
      {disabled && disabledReason ? (
        <p className="text-sm text-muted-foreground text-center">{disabledReason}</p>
      ) : null}
    </div>
  );
}
