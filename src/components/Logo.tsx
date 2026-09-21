import { HEADER_SLOGAN } from "@/lib/site";

export function LogoMark({ className = "h-16 w-16" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="var(--color-card)" />
      <path d="M32 14 L54 30 L32 26 L10 30 Z" fill="var(--color-accent)" opacity="0.55" />
      <path d="M27 18 H37 L40 50 H24 Z" fill="var(--color-primary)" />
      <rect x="25.5" y="30" width="13" height="4" fill="var(--color-background)" />
      <rect x="26.5" y="40" width="11" height="4" fill="var(--color-background)" />
      <rect x="28.5" y="10" width="7" height="8" rx="1.5" fill="var(--color-accent)" />
      <path d="M20 50 H44 L47 54 H17 Z" fill="var(--color-primary)" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3.5 ${className ?? ""}`}>
      <LogoMark className="h-16 w-16" />
      <div className="leading-tight">
        <div className="text-3xl font-semibold tracking-[0.08em] text-primary">FARO</div>
        <div className="eyebrow text-[0.65rem] tracking-[0.14em]">{HEADER_SLOGAN}</div>
      </div>
    </div>
  );
}
