import { BRAND_NAME } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-border py-6">
      <p className="eyebrow text-center text-[0.6rem] tracking-[0.14em]">{BRAND_NAME}</p>
    </footer>
  );
}
