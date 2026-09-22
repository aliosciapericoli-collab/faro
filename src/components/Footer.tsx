import { BRAND_NAME } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-border py-6">
      <a
        href="https://alioscia.it"
        target="_blank"
        rel="noopener noreferrer"
        className="eyebrow block text-center text-[0.6rem] tracking-[0.14em] transition-colors hover:text-accent"
      >
        {BRAND_NAME}
      </a>
    </footer>
  );
}
