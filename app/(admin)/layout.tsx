import type { ReactNode } from "react";

/**
 * Desktop canvas for the Admin Console (Figma "Admin", 1042:14855). Full-width,
 * unlike the 448px `MobileViewport` the consumer route groups wrap themselves in;
 * `min-w-5xl` keeps the 1440px-designed screens usable on narrow windows via
 * horizontal scroll instead of collapsing.
 */
export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-dvh w-full min-w-5xl bg-background">{children}</div>
  );
}
