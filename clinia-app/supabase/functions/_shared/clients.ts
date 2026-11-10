// © 2026 FPM WebDesignTech – Francesco Paolo Morelli. Tutti i diritti riservati.
// Client e regole condivise dalle Edge Functions.
// Piattaforma Stripe = conto di CLINIA (P.IVA della struttura), con Connect:
//   ogni specialista e FPM hanno un conto collegato e ricevono gli accrediti in automatico.
// Segreti (solo in Supabase › Edge Functions › Secrets):
//   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_SPECIALISTA, FPM_STRIPE_ACCOUNT, CRON_SECRET
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

export async function utente(req: Request) {
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Errore(401, "Accesso richiesto");
  return data.user;
}

export class Errore extends Error {
  constructor(public status: number, msg: string) { super(msg); }
}

export const cent = (euro: number | string) => Math.round(Number(euro) * 100);
const r2 = (n: number) => Math.round(n * 100) / 100;

// Impostazioni economiche lette dal database (app_settings)
export async function impostazioni() {
  const { data } = await admin.from("app_settings").select("chiave, valore");
  const m = Object.fromEntries((data ?? []).map((r: any) => [r.chiave, r.valore]));
  const rit = m.ritenuta_fpm ?? { aliquota: 0.2, quota_imponibile: 0.75 };
  return {
    servizio: Number(m.servizio_app?.importo ?? 7),
    beneficenzaPct: Number(m.servizio_app?.beneficenza_pct ?? 0.03),
    licenzaNetto: Number(m.licenza?.netto ?? 300),
    licenzaMesi: Number(m.licenza?.mesi ?? 12),
    licenzaInizio: String(m.licenza?.inizio ?? "2026-11-01"),
    ritenuta: Number(rit.aliquota) * Number(rit.quota_imponibile),   // 0,15 (0,12 se FPM ha meno di 35 anni)
  };
}

// Accredito immediato a FPM (conto collegato) di una quota lorda, al netto della sola ritenuta
// (resta nel saldo di Clinia, che la versa con F24). Il 3 % per Progetto Arca NON viene trattenuto:
// lo si registra nella tabella donazioni e FPM lo bonifica alla fondazione ogni mese.
export async function accreditaFpm(o: {
  tipo: "servizio_paziente" | "servizio_specialista" | "abbonamento" | "licenza";
  lordo: number; conBeneficenza: boolean; nettoFisso?: number;
  sourceCharge?: string; appointment_id?: string; specialist_id?: string; chiave: string;
}) {
  const s = await impostazioni();
  const beneficenza = o.conBeneficenza ? r2(o.lordo * s.beneficenzaPct) : 0;
  const netto = o.nettoFisso ?? r2(o.lordo * (1 - s.ritenuta));
  const ritenuta = r2(o.lordo - netto);
  const conto = Deno.env.get("FPM_STRIPE_ACCOUNT");
  let trId: string | null = null, stato = "in_attesa";
  if (conto) {
    const tr = await stripe.transfers.create({
      amount: cent(netto), currency: "eur", destination: conto,
      ...(o.sourceCharge ? { source_transaction: o.sourceCharge } : {}),
      description: `Clinia App – ${o.tipo}`, metadata: { tipo: o.tipo, appointment_id: o.appointment_id ?? "" },
    }, { idempotencyKey: `fpm-${o.chiave}` });
    trId = tr.id; stato = "accreditato";
  }
  await admin.from("fpm_transfers").upsert({
    tipo: o.tipo, appointment_id: o.appointment_id ?? null, specialist_id: o.specialist_id ?? null,
    lordo: o.lordo, beneficenza, ritenuta, netto, stripe_transfer_id: trId ?? `attesa:${o.chiave}`, stato,
  }, { onConflict: "stripe_transfer_id" });
  if (beneficenza) {   // quota del mese che FPM bonificherà a Progetto Arca
    const mese = new Date().toISOString().slice(0, 7) + "-01";
    const { data: d } = await admin.from("donazioni").select("importo, prenotazioni").eq("mese", mese).maybeSingle();
    await admin.from("donazioni").upsert({ mese, importo: r2(Number(d?.importo ?? 0) + beneficenza),
      prenotazioni: Number(d?.prenotazioni ?? 0) + 1 });
  }
  return { netto, ritenuta, beneficenza };
}

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
