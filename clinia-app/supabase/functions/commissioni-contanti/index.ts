// © 2026 FPM WebDesignTech – Francesco Paolo Morelli. Tutti i diritti riservati.
// Ogni notte: per le visite pagate IN STRUTTURA del giorno prima, Clinia addebita 7 € allo specialista.
// Gli importi si aggiungono alla prossima fattura dell'abbonamento (una sola fattura e un solo
// addebito al mese sulla stessa carta), così si pagano meno commissioni Stripe.
// Pianificazione: Supabase › Database › Cron, ogni giorno alle 02:00, chiamata HTTP a questa funzione
// con l'header Authorization: Bearer <CRON_SECRET>.
import { admin, COMMISSIONE_APP_CENT, json, stripe } from "../_shared/clients.ts";

Deno.serve(async (req) => {
  if (req.headers.get("Authorization") !== `Bearer ${Deno.env.get("CRON_SECRET")}`)
    return new Response("Non autorizzato", { status: 401 });

  const oggi = new Date().toISOString().slice(0, 10);
  const { data: visite, error } = await admin.from("appointments")
    .select("id, specialist_id, giorno, prestazione, specialists(nome_visualizzato, specialist_private(stripe_customer_id))")
    .eq("metodo_pagamento", "struttura").eq("commissione_addebitata", false)
    .neq("stato", "annullata").lt("giorno", oggi);
  if (error) return json({ errore: error.message }, 500);

  const perSpecialista = new Map<string, any[]>();
  for (const v of visite ?? []) perSpecialista.set(v.specialist_id, [...(perSpecialista.get(v.specialist_id) ?? []), v]);

  const esito: Record<string, unknown> = {};
  for (const [sp, lista] of perSpecialista) {
    const cliente = (lista[0] as any).specialists?.specialist_private?.stripe_customer_id;
    if (!cliente) { esito[sp] = "manca la carta dello specialista"; continue; }
    const item = await stripe.invoiceItems.create({
      customer: cliente, currency: "eur", amount: COMMISSIONE_APP_CENT * lista.length,
      description: `Servizio Clinia App: ${lista.length} ${lista.length === 1 ? "visita pagata" : "visite pagate"} in struttura (7 € ciascuna)`,
      metadata: { tipo: "commissioni_contanti", specialist_id: sp, visite: lista.map((v) => v.id).join(",").slice(0, 490) },
    }, { idempotencyKey: `comm-${sp}-${oggi}` });
    await admin.from("appointments").update({ commissione_addebitata: true }).in("id", lista.map((v) => v.id));
    await admin.from("payments").insert({
      tipo: "servizio_specialista", importo: (COMMISSIONE_APP_CENT * lista.length) / 100, beneficiario: "clinica",
      specialist_id: sp, metodo: "addebito_mensile", stato: "in_attesa", stripe_payment_intent: `ii:${item.id}`,
    });
    esito[sp] = `${lista.length} visite, ${(COMMISSIONE_APP_CENT * lista.length) / 100} €`;
  }
  // Libera anche gli studi prenotati e mai pagati.
  const { data: liberati } = await admin.rpc("libera_studi_non_pagati");
  return json({ esito, studi_liberati: liberati });
});
