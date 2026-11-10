// © 2026 FPM WebDesignTech – Francesco Paolo Morelli. Tutti i diritti riservati.
// Ogni notte: per le visite pagate IN STRUTTURA del giorno prima, addebita il servizio (9 € a visita)
// sulla carta dello specialista, in un unico addebito al giorno, e accredita subito la quota a FPM
// (9 € netti; ritenuta a carico di Clinia; il 3 % per Progetto Arca lo bonifica FPM). Pianificazione: Supabase › Cron, ogni giorno alle 02:00,
// con l'header Authorization: Bearer <CRON_SECRET>.
import { accreditaFpm, admin, cent, json, stripe } from "../_shared/clients.ts";

Deno.serve(async (req) => {
  if (req.headers.get("Authorization") !== `Bearer ${Deno.env.get("CRON_SECRET")}`)
    return new Response("Non autorizzato", { status: 401 });

  const oggi = new Date().toISOString().slice(0, 10);
  const { data: visite, error } = await admin.from("appointments")
    .select("id, specialist_id, commissione_app, specialists(is_titolare, specialist_private(stripe_customer_id, stripe_payment_method))")
    .eq("metodo_pagamento", "struttura").eq("commissione_addebitata", false).neq("stato", "annullata").lt("giorno", oggi);
  if (error) return json({ errore: error.message }, 500);

  const per = new Map<string, any[]>();
  for (const v of visite ?? []) {
    if ((v as any).specialists?.is_titolare) continue;    // le visite del direttore sono già di Clinia
    per.set(v.specialist_id, [...(per.get(v.specialist_id) ?? []), v]);
  }
  const esito: Record<string, unknown> = {};
  for (const [sp, lista] of per) {
    const priv = (lista[0] as any).specialists?.specialist_private ?? {};
    if (!priv.stripe_customer_id || !priv.stripe_payment_method) { esito[sp] = "manca la carta dello specialista"; continue; }
    const totale = lista.reduce((t, v) => t + Number(v.commissione_app), 0);
    try {
      const pi = await stripe.paymentIntents.create({
        amount: cent(totale), currency: "eur", customer: priv.stripe_customer_id, payment_method: priv.stripe_payment_method,
        off_session: true, confirm: true,
        description: `Servizio Clinia App: ${lista.length} visite pagate in struttura`,
        metadata: { tipo: "servizio_specialista", specialist_id: sp },
      }, { idempotencyKey: `serv-cash-${sp}-${oggi}` });
      const charge = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id;
      await admin.from("appointments").update({ commissione_addebitata: true }).in("id", lista.map((v) => v.id));
      for (const v of lista) await accreditaFpm({ tipo: "servizio_specialista", netto: Number(v.commissione_app),
        conBeneficenza: true, sourceCharge: charge ?? undefined, appointment_id: v.id, specialist_id: sp, chiave: `cash-${v.id}` });
      esito[sp] = `${lista.length} visite, ${totale} €`;
    } catch (e) {
      esito[sp] = `addebito non riuscito: ${(e as Error).message}`;   // si riprova la notte successiva
    }
  }
  const { data: liberati } = await admin.rpc("libera_studi_non_pagati");
  return json({ esito, studi_liberati: liberati });
});
