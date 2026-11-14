"use client";

import clsx from "clsx";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

export function MobileShellLayout({
  sidebar,
  title,
  subtitle,
  headerEnd,
  children,
  headerClassName = "border-b border-slate-200 bg-white",
}: {
  sidebar: ReactNode;
  title: string;
  subtitle?: string;
  headerEnd?: ReactNode;
  children: ReactNode;
  headerClassName?: string;
}) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!navOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [navOpen]);

  return (
    <div className="flex min-h-screen min-w-0 bg-slate-50">
      {navOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/45 lg:hidden"
          aria-label="Tutup menu navigasi"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      <div
        className={clsx(
          "fixed inset-y-0 left-0 z-40 max-w-[min(100vw,20rem)] lg:static lg:z-auto lg:max-w-none lg:shrink-0",
          "transition-transform duration-200 ease-out lg:translate-x-0",
          navOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {sidebar}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={clsx(
            "sticky top-0 z-20 px-4 py-3 shadow-sm sm:px-6 sm:py-4",
            headerClassName
          )}
        >
          <div className="flex items-start gap-3">
            <button
              type="button"
              className="mt-0.5 inline-flex shrink-0 rounded-lg border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 lg:hidden"
              aria-label="Buka menu navigasi"
              aria-expanded={navOpen}
              onClick={() => setNavOpen(true)}
            >
              <Menu size={20} aria-hidden />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold text-slate-900 sm:text-lg">{title}</h1>
              {subtitle ? (
                <p className="truncate text-xs text-slate-500 sm:text-sm">{subtitle}</p>
              ) : null}
            </div>
            {headerEnd ? (
              <div className="flex max-w-[55%] shrink-0 flex-wrap items-center justify-end gap-2 text-sm sm:max-w-none sm:gap-4">
                {headerEnd}
              </div>
            ) : null}
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
