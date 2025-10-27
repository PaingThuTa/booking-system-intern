"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";

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

  return (
    <nav className="flex flex-wrap items-center gap-2">
      {NAV_ITEMS.filter((item) => item.roles.includes(role)).map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
