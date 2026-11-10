// © 2026 FPM WebDesignTech – Francesco Paolo Morelli. Tutti i diritti riservati.
// Crea i pagamenti sul conto Stripe di CLINIA (P.IVA della struttura): tutti gli incassi vanno a Clinia,
// che poi gira agli specialisti le visite pagate con carta (tabella specialist_payouts).
// L'app chiama questa funzione e conferma il pagamento con il client_secret restituito.
//
//  tipo "visita"      paziente → Clinia: prezzo della visita + 7 € di servizio
//  tipo "studio"      specialista → Clinia: affitto degli studi prenotati
//  tipo "abbonamento" specialista → Clinia: 49,90 €/mese
//  tipo "carta"       salva la carta dello specialista per i 7 € delle visite pagate in struttura
import { admin, cent, COMMISSIONE_APP_CENT, cors, Errore, json, stripe, utente } from "../_shared/clients.ts";

async function specialistaDi(userId: string) {
  const { data } = await admin.from("specialists").select("id, nome_visualizzato, is_titolare, specialist_private(*)")
    .eq("user_id", userId).single();
  if (!data) throw new Errore(403, "Profilo specialista non trovato");
  return data as any;
}

async function clienteStripe(sp: any, email?: string) {
  const priv = sp.specialist_private ?? {};
  if (priv.stripe_customer_id) return priv.stripe_customer_id as string;
  const c = await stripe.customers.create({ name: sp.nome_visualizzato, email, metadata: { specialist_id: sp.id } });
  await admin.from("specialist_private").upsert({ specialist_id: sp.id, stripe_customer_id: c.id });
  return c.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const user = await utente(req);
    const body = await req.json();

    if (body.tipo === "visita") {
      const { data: a } = await admin.from("appointments")
        .select("*").eq("id", body.appointment_id).single();
      if (!a || a.patient_id !== user.id) throw new Errore(404, "Visita non trovata");
      if (a.metodo_pagamento !== "carta" || a.pagato) throw new Errore(400, "Questa visita non va pagata con carta");
      const pi = await stripe.paymentIntents.create({
        amount: cent(a.prezzo) + COMMISSIONE_APP_CENT,
        currency: "eur",
        automatic_payment_methods: { enabled: true },       // carta, Apple Pay, Google Pay, PayPal se attivo nel conto
        description: `${a.prestazione} – ${a.giorno} ${a.ora} (visita ${a.prezzo} € + servizio 7 €)`,
        metadata: { tipo: "visita", appointment_id: a.id, specialist_id: a.specialist_id, paziente: user.id,
                    visita: String(a.prezzo), servizio: "7" },
}, { idempotencyKey: `visita-${a.id}` });
      return json({ client_secret: pi.client_secret, importo: (cent(a.prezzo) + COMMISSIONE_APP_CENT) / 100 });
    }

    if (body.tipo === "studio") {
      const sp = await specialistaDi(user.id);
      const ids: string[] = body.booking_ids ?? [];
      const { data: bs } = await admin.from("room_bookings").select("*").in("id", ids);
      if (!bs?.length || bs.some((b: any) => b.specialist_id !== sp.id || b.stato !== "in_attesa_pagamento"))
        throw new Errore(400, "Prenotazioni non valide o già pagate");
      let totale = 0;
      for (const b of bs) {   // il prezzo si ricalcola sul server dal tariffario
        const { data: c } = await admin.rpc("costo_studio", { p_room: b.room_id, p_inizio: b.inizio, p_fine: b.fine });
        totale += cent(c);
      }
      const pi = await stripe.paymentIntents.create({
        amount: totale,
        currency: "eur",
        customer: await clienteStripe(sp, user.email),
        automatic_payment_methods: { enabled: true },
        description: `Affitto studi Clinia – ${sp.nome_visualizzato}`,
        metadata: { tipo: "studio", booking_ids: ids.join(","), specialist_id: sp.id },
      });
      return json({ client_secret: pi.client_secret, importo: totale / 100 });
    }

    if (body.tipo === "abbonamento") {
      const sp = await specialistaDi(user.id);
      if (sp.is_titolare) throw new Errore(400, "La direzione di Clinia non paga l'abbonamento");
      const piano = "specialista";
      const price = Deno.env.get("STRIPE_PRICE_SPECIALISTA")!;
      const sub = await stripe.subscriptions.create({
        customer: await clienteStripe(sp, user.email),
        items: [{ price }],
        payment_behavior: "default_incomplete",
        payment_settings: { save_default_payment_method: "on_subscription" }, // la stessa carta paga le commissioni
        expand: ["latest_invoice.payment_intent"],
        metadata: { user_id: user.id, specialist_id: sp.id, piano },
      });
      await admin.from("subscriptions").upsert({
        user_id: user.id, piano, prezzo_mensile: 49.9,
        stato: "in_attesa", stripe_subscription_id: sub.id,
      }, { onConflict: "stripe_subscription_id" });
      const inv: any = sub.latest_invoice;
      return json({ client_secret: inv?.payment_intent?.client_secret, subscription: sub.id });
    }

    if (body.tipo === "carta") {
      const sp = await specialistaDi(user.id);
      const si = await stripe.setupIntents.create({
        customer: await clienteStripe(sp, user.email), usage: "off_session",
        metadata: { specialist_id: sp.id },
      });
      return json({ client_secret: si.client_secret });
    }

    throw new Errore(400, "Tipo di pagamento sconosciuto");
  } catch (e) {
    const status = e instanceof Errore ? e.status : 500;
    console.error(e);
    return json({ errore: e instanceof Errore ? e.message : "Pagamento non riuscito, riprova" }, status);
  }
});
