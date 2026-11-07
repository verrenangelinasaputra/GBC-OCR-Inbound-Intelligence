import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { isSheetOnlyMode } from "@/lib/config/app-mode";

const PUBLIC_PATHS = [
  "/login",
  "/supplier/login",
  "/supplier/register",
  "/supplier/forgot-password",
  "/api/auth/login",
  "/api/auth/logout",
];

function nextWithPath(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-gbc-path", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isSheetOnlyMode()) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const session = token ? await verifySessionToken(token) : null;
    const supplierSession =
      session?.roles.includes("SUPPLIER_USER") || session?.roles.includes("SUPER_ADMIN");

    const open =
      pathname === "/supplier/login" ||
      pathname === "/supplier/register" ||
      pathname === "/supplier/forgot-password" ||
      pathname.startsWith("/api/supplier/auth/") ||
      pathname === "/api/auth/logout" ||
      pathname === "/api/app-mode" ||
      pathname === "/api/health" ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/favicon");

    if (
      (pathname === "/supplier/login" ||
        pathname === "/supplier/register" ||
        pathname === "/supplier/forgot-password") &&
      supplierSession
    ) {
      return NextResponse.redirect(new URL("/supplier", request.url));
    }
    if (open) return nextWithPath(request);

    const supplierArea =
      pathname === "/supplier" ||
      pathname.startsWith("/supplier/") ||
      pathname.startsWith("/api/supplier/");
    if (supplierArea && supplierSession) return nextWithPath(request);
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/supplier/login", request.url));
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
