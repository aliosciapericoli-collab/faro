import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/login")({
  ssr: false,
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [modalita, setModalita] = useState<"login" | "recupera">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [inviata, setInviata] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrore(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      setErrore("Accesso non riuscito. Controlla email e password.");
      return;
    }
    navigate({ to: "/" });
  };

  const onGoogle = async () => {
    setErrore(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) setErrore("Accesso con Google non riuscito. Riprova.");
  };

  const onRecupera = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrore(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (error) {
      setErrore("Invio non riuscito. Riprova tra qualche minuto.");
      return;
    }
    setInviata(true);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center">
            <Logo />
          </div>

          {modalita === "login" && (
            <div className="mb-4 space-y-4">
              <button
                type="button"
                onClick={onGoogle}
                className="flex w-full items-center justify-center gap-2.5 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-accent/50"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.81z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.92l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.1A12 12 0 0 0 12 24z" />
                  <path fill="#FBBC05" d="M5.29 14.28a7.2 7.2 0 0 1 0-4.56v-3.1H1.28a12 12 0 0 0 0 10.76l4.01-3.1z" />
                  <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.28 6.62l4.01 3.1C6.23 6.88 8.88 4.77 12 4.77z" />
                </svg>
                Accedi con Google
              </button>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                oppure
                <span className="h-px flex-1 bg-border" />
              </div>
            </div>
          )}

          {modalita === "login" ? (
            <form
              onSubmit={onSubmit}
              className="rounded-lg border border-border bg-card p-6 space-y-4"
            >
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm text-muted-foreground">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm text-muted-foreground">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {errore && <p className="text-sm text-destructive">{errore}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "Accesso…" : "Accedi"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalita("recupera");
                  setErrore(null);
                  setInviata(false);
                }}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
              >
                Password dimenticata?
              </button>
            </form>
          ) : (
            <form
              onSubmit={onRecupera}
              className="rounded-lg border border-border bg-card p-6 space-y-4"
            >
              <p className="text-sm text-muted-foreground">
                Inserisci la tua email: se corrisponde a un account, ricevi un link per impostare
                una nuova password.
              </p>
              <div>
                <label
                  htmlFor="email-recupero"
                  className="mb-1.5 block text-sm text-muted-foreground"
                >
                  Email
                </label>
                <input
                  id="email-recupero"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {errore && <p className="text-sm text-destructive">{errore}</p>}
              {inviata && (
                <p className="text-sm text-accent">
                  Email inviata, se l'indirizzo è registrato. Controlla anche lo spam.
                </p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "Invio…" : "Invia link di recupero"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalita("login");
                  setErrore(null);
                  setInviata(false);
                }}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
              >
                Torna al login
              </button>
            </form>
          )}

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Accesso riservato: vedi solo ciò che è condiviso con la tua email.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
