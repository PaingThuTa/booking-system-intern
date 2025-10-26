import { Role } from "@prisma/client";

export const ADMIN_ONLY_ROUTES = ["/admin", "/admin/blocks", "/admin/bookings"] as const;
export const INTERN_ROUTES = ["/book", "/bookings"] as const;
export const PUBLIC_ROUTES = ["/", "/login"] as const;

export const DEFAULT_REDIRECT: Record<Role, string> = {
  ADMIN: "/admin/blocks",
  INTERN: "/book",
};

export const canAccessRoute = (role: Role | undefined, pathname: string) => {
  if (!role) {
    return PUBLIC_ROUTES.includes(pathname as (typeof PUBLIC_ROUTES)[number]);
  }

  if (ADMIN_ONLY_ROUTES.some((route) => pathname.startsWith(route))) {
    return role === Role.ADMIN;
  }

  if (INTERN_ROUTES.some((route) => pathname.startsWith(route))) {
    return role === Role.INTERN || role === Role.ADMIN;
  }

  return true;
};

export const isAuthRoute = (pathname: string) =>
  PUBLIC_ROUTES.includes(pathname as (typeof PUBLIC_ROUTES)[number]) && pathname === "/login";
