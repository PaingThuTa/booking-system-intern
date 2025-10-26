"use client";

import { Loader2, LogOut } from "lucide-react";
import { useState } from "react";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";

interface SignOutButtonProps {
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

export function SignOutButton({ size = "sm", variant = "ghost" }: SignOutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      await signOut({ callbackUrl: "/login" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={handleSignOut} variant={variant} size={size} disabled={isLoading}>
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      <span className="ml-2 hidden sm:inline">Sign out</span>
    </Button>
  );
}
