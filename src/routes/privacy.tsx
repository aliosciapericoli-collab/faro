import { createFileRoute } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { APP_NAME, BRAND_NAME, OWNER_EMAIL } from "@/lib/site";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1 px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 flex justify-center">
            <Logo />
          </div>
          <h1 className="text-2xl font-semibold text-primary">Privacy policy</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ultimo aggiornamento: ottobre 2026</p>

          <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground">
            <p>
              {APP_NAME} è un cruscotto interno di {BRAND_NAME}: non è un prodotto pubblico e non
              raccoglie dati di visitatori esterni. Vi accedono solo le persone a cui il
              proprietario ha dato esplicitamente accesso.
            </p>

            <section>
              <h2 className="font-semibold text-primary">Quali dati trattiamo</h2>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li>
                  <strong>Account di accesso</strong>: indirizzo email e, se scegli l'accesso con
                  Google, il nome e l'immagine del profilo Google associati a quell'account. Non
                  richiediamo né leggiamo altro dal tuo account Google oltre all'identità di base
                  necessaria per farti accedere.
                </li>
                <li>
                  <strong>Dati delle proprietà gestite</strong>: statistiche aggregate (traffico,
                  campagne pubblicitarie, posizionamento sui motori di ricerca) delle sole
                  proprietà a cui sei stato invitato, lette dalle rispettive piattaforme (Google
                  Analytics, Google Search Console, Google Ads, Lovable) tramite credenziali
                  conservate cifrate dal proprietario.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-semibold text-primary">Come li usiamo</h2>
              <p className="mt-2">
                Esclusivamente per farti vedere il cruscotto e le statistiche delle proprietà che
                ti sono state assegnate. Non vendiamo, non condividiamo e non usiamo questi dati
                per nessun altro scopo.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-primary">Dove sono conservati</h2>
              <p className="mt-2">
                Su Supabase (database Postgres in UE, regione eu-west-1). Le credenziali delle
                integrazioni pubblicitarie/analytics sono cifrate tramite Supabase Vault e non
                sono mai leggibili in chiaro dal browser.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-primary">I tuoi diritti</h2>
              <p className="mt-2">
                Puoi chiedere in qualsiasi momento la cancellazione del tuo account e dell'accesso
                assegnato scrivendo a{" "}
                <a href={`mailto:${OWNER_EMAIL}`} className="text-accent underline">
                  {OWNER_EMAIL}
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
