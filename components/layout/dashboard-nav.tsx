"use client";

import type { Role } from "@prisma/client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  roles: Role[];
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/admin", roles: ["ADMIN"] },
  { label: "Blocks", href: "/admin/blocks", roles: ["ADMIN"] },
  { label: "All Bookings", href: "/admin/bookings", roles: ["ADMIN"] },
  { label: "Book a Session", href: "/book", roles: ["INTERN"] },
  { label: "My Bookings", href: "/bookings", roles: ["INTERN"] },
];

interface DashboardNavProps {
  role: Role;
}

export function DashboardNav({ role }: DashboardNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const navItems = useMemo(() => NAV_ITEMS.filter((item) => item.roles.includes(role)), [role]);

  useEffect(() => {
    for (const item of navItems) {
      router.prefetch(item.href).catch(() => {
        // Prefetch is best-effort; ignore failures (e.g. dynamic routes).
      });
    }
  }, [navItems, router]);

  return (
    <nav className="flex flex-wrap items-center gap-2">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              buttonVariants({
                variant: isActive ? "default" : "ghost",
                size: "sm",
              }),
              "px-3 py-1 text-sm",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
