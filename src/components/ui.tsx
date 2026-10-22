import Link from "next/link";
import type { ReactNode } from "react";

export function PageShell({ children, title, back, actions }: { children: ReactNode; title?: string; back?: { href: string; label: string }; actions?: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
      {(title || back || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {back && (
              <Link href={back.href} className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-muted shadow-sm ring-1 ring-black/5 hover:text-foreground">
                ← {back.label}
              </Link>
            )}
            {title && <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl bg-card p-5 shadow-sm ring-1 ring-black/5 ${className}`}>{children}</section>;
}

export function ButtonLink({ href, children, variant = "primary", className = "" }: { href: string; children: ReactNode; variant?: "primary" | "soft" | "ghost"; className?: string }) {
  const styles = {
    primary: "bg-brand text-white shadow-md hover:bg-brand/90",
    soft: "bg-brand-soft text-brand hover:bg-brand/20",
    ghost: "bg-white text-foreground ring-1 ring-black/10 hover:bg-black/5",
  }[variant];
  return (
    <Link href={href} className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-base font-bold transition ${styles} ${className}`}>
      {children}
    </Link>
  );
}

export function Loading({ label = "불러오는 중…" }: { label?: string }) {
  return (
    <div className="flex flex-1 items-center justify-center py-16 text-muted" role="status">
      <span className="mr-2 inline-block h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" aria-hidden />
      {label}
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-sm font-semibold text-bad" role="alert">
      {message}
    </p>
  );
}

export const inputClass =
  "w-full rounded-2xl border-2 border-brand/20 bg-white px-4 py-3 text-base outline-none transition focus:border-brand";
