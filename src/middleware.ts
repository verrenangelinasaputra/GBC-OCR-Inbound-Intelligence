import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { isSheetOnlyMode } from "@/lib/config/app-mode";
import { canAccessRoute } from "@/lib/rbac/permissions";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/supplier/login",
  "/supplier/register",
  "/supplier/forgot-password",
  "/api/auth/login",
  "/api/auth/logout",
];

const INTERNAL_ROLES = ["SUPER_ADMIN", "DBM_OPERATOR", "WAREHOUSE_OPERATOR", "MANAGEMENT_VIEWER"] as const;

function nextWithPath(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-gbc-path", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

function isInternalStaff(roles: string[]): boolean {
  return roles.some((r) => INTERNAL_ROLES.includes(r as (typeof INTERNAL_ROLES)[number]));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isSheetOnlyMode()) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const session = token ? await verifySessionToken(token) : null;

    const open =
      pathname === "/login" ||
      pathname === "/register" ||
      pathname === "/supplier/login" ||
      pathname === "/supplier/register" ||
      pathname === "/supplier/forgot-password" ||
      pathname.startsWith("/api/supplier/auth/") ||
      pathname.startsWith("/api/auth/register") ||
      pathname === "/api/auth/login" ||
      pathname === "/api/auth/logout" ||
      pathname === "/api/app-mode" ||
      pathname === "/api/health" ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/favicon");

    if (
      session &&
      (pathname === "/supplier/login" ||
        pathname === "/supplier/register" ||
        pathname === "/supplier/forgot-password")
    ) {
      if (isInternalStaff(session.roles)) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      if (session.roles.includes("SUPPLIER_MASTER_ADMIN")) {
        return NextResponse.redirect(new URL("/supplier/master", request.url));
      }
      return NextResponse.redirect(new URL("/supplier", request.url));
    }

    if (
      (pathname === "/login" || pathname === "/register") &&
      session &&
      isInternalStaff(session.roles)
    ) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    if (open) return nextWithPath(request);

    if (session) {
      if (isInternalStaff(session.roles)) {
        if (!canAccessRoute(session.roles, pathname, session.allowedModules)) {
          return NextResponse.redirect(new URL("/dashboard", request.url));
        }
        return nextWithPath(request);
      }
      const isSupplierMaster = session.roles.includes("SUPPLIER_MASTER_ADMIN");
      if (session.roles.includes("SUPPLIER_USER") || isSupplierMaster) {
        if (pathname.startsWith("/supplier/master") && !isSupplierMaster) {
          return NextResponse.redirect(new URL("/supplier", request.url));
        }
        if (pathname.startsWith("/api/supplier/master") && !isSupplierMaster) {
          return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
        }
        const supplierArea =
          pathname === "/supplier" ||
          pathname.startsWith("/supplier/") ||
          pathname.startsWith("/api/supplier/");
        if (supplierArea) return nextWithPath(request);
        if (pathname.startsWith("/api/")) {
          return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
        }
        return NextResponse.redirect(new URL("/supplier", request.url));
      }
    }

    if (
      pathname === "/supplier/login" ||
      pathname === "/supplier/register" ||
      pathname === "/supplier/forgot-password"
    ) {
      return nextWithPath(request);
    }
    if (pathname.startsWith("/supplier") || pathname.startsWith("/api/supplier/")) {
      return NextResponse.redirect(new URL("/supplier/login", request.url));
    }
    if (!pathname.startsWith("/api")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  if (
    PUBLIC_PATHS.some((p) => pathname === p) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (pathname.startsWith("/supplier")) {
    if (!session) {
      return NextResponse.redirect(new URL("/supplier/login", request.url));
    }
    if (!session.roles.includes("SUPPLIER_USER") && !session.roles.includes("SUPER_ADMIN")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/supplier") && session?.roles.includes("SUPPLIER_USER")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  if (!session && !pathname.startsWith("/api")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (session?.roles.includes("SUPPLIER_USER") && !session.roles.includes("SUPER_ADMIN")) {
    if (!pathname.startsWith("/api")) {
      return NextResponse.redirect(new URL("/supplier", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};
