import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [pronto, setPronto] = useState(false);
  const [linkValido, setLinkValido] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [conferma, setConferma] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fatto, setFatto] = useState(false);

  useEffect(() => {
    // Il client Supabase intercetta da solo il link di recupero nell'URL e
    // apre una sessione temporanea: qui aspettiamo quell'evento prima di
    // mostrare il form, altrimenti "aggiorna password" fallirebbe.
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setLinkValido(true);
        setPronto(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setLinkValido(true);
      setPronto(true);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setErrore("La password deve avere almeno 8 caratteri.");
      return;
    }
    if (password !== conferma) {
      setErrore("Le due password non coincidono.");
      return;
    }
    setSubmitting(true);
    setErrore(null);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      setErrore("Aggiornamento non riuscito. Richiedi un nuovo link dal login.");
      return;
    }
    setFatto(true);
    setTimeout(() => navigate({ to: "/" }), 1500);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center">
            <Logo />
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            {!pronto && <p className="text-sm text-muted-foreground">Verifica del link…</p>}

            {pronto && !linkValido && (
              <div className="space-y-3">
                <p className="text-sm text-destructive">
                  Link non valido o scaduto. Richiedine uno nuovo dalla pagina di login.
                </p>
                <a href="/login" className="text-sm text-accent hover:underline">
                  Torna al login
                </a>
              </div>
            )}

            {pronto && linkValido && !fatto && (
              <form onSubmit={onSubmit} className="space-y-4">
                <p className="text-sm text-muted-foreground">Imposta la nuova password.</p>
                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm text-muted-foreground">
                    Nuova password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label htmlFor="conferma" className="mb-1.5 block text-sm text-muted-foreground">
                    Conferma password
                  </label>
                  <input
                    id="conferma"
                    type="password"
                    required
                    minLength={8}
                    value={conferma}
                    onChange={(e) => setConferma(e.target.value)}
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                {errore && <p className="text-sm text-destructive">{errore}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? "Salvataggio…" : "Salva nuova password"}
                </button>
              </form>
            )}

            {fatto && (
              <p className="text-sm text-accent">Password aggiornata. Ti sto reindirizzando…</p>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
