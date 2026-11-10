// © 2026 FPM WebDesignTech – Francesco Paolo Morelli. Tutti i diritti riservati.
// Client condivisi dalle Edge Functions. Le chiavi segrete stanno SOLO nei segreti di Supabase:
//   supabase secrets set STRIPE_SECRET_KEY=sk_live_… STRIPE_WEBHOOK_SECRET=whsec_… \
//     STRIPE_PRICE_SPECIALISTA=price_… STRIPE_PRICE_CLINICA=price_… CLINICA_STRIPE_ACCOUNT=acct_…
import Stripe from "npm:stripe@16.12.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

export const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

// Accesso completo al database (service role): usato solo lato server.
export const admin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

// Utente che chiama la funzione, ricavato dal suo token.
export async function utente(req: Request) {
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Errore(401, "Accesso richiesto");
  return data.user;
}

export class Errore extends Error {
  constructor(public status: number, msg: string) { super(msg); }
}

export const COMMISSIONE_APP_CENT = 700; // 7 € per ogni operazione
export const cent = (euro: number | string) => Math.round(Number(euro) * 100);

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
