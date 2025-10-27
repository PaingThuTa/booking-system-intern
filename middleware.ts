import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";
import {
  ADMIN_ONLY_ROUTES,
  DEFAULT_REDIRECT,
  INTERN_ROUTES,
  PUBLIC_ROUTES,
} from "@/lib/roles";

const isPublicRoute = (pathname: string) =>
  PUBLIC_ROUTES.some((route) => route === pathname);

const isAdminRoute = (pathname: string) =>
  ADMIN_ONLY_ROUTES.some((route) => pathname.startsWith(route));

const isInternRoute = (pathname: string) =>
  INTERN_ROUTES.some((route) => pathname.startsWith(route));

export default withAuth(
  (req) => {
    const { nextUrl } = req;
    const pathname = nextUrl.pathname;
    const token = req.nextauth?.token as { role?: Role } | undefined;

    if (pathname.startsWith("/api")) {
      return NextResponse.next();
    }

    if (isPublicRoute(pathname)) {
      if (pathname === "/login" && token?.role) {
        const redirectUrl = new URL(
          DEFAULT_REDIRECT[token.role],
          nextUrl.origin,
        );
        return NextResponse.redirect(redirectUrl);
      }
      return NextResponse.next();
    }

    if (!token?.role) {
      const loginUrl = new URL("/login", nextUrl.origin);
      loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    const role = token.role ?? Role.INTERN;

    if (isAdminRoute(pathname) && role !== Role.ADMIN) {
      const redirectUrl = new URL(DEFAULT_REDIRECT[role], nextUrl.origin);
      return NextResponse.redirect(redirectUrl);
    }

    if (isInternRoute(pathname) && role !== Role.INTERN) {
      const redirectUrl = new URL(DEFAULT_REDIRECT[role], nextUrl.origin);
      return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Defer authorization logic to the middleware function above
      authorized: () => true,
    },
  },
);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
