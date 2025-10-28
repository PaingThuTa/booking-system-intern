'use client';

import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/providers/theme-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { isDark, toggleTheme, mounted } = useTheme();

  const icon = isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => {
        if (!mounted) {
          return;
        }
        toggleTheme();
      }}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      disabled={!mounted}
      className={cn("relative transition", className)}
    >
      {mounted ? icon : <span className="h-4 w-4" />}
    </Button>
  );
}
