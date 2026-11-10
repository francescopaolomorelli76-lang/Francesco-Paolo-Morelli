// © 2026 FPM WebDesignTech – Francesco Paolo Morelli. Tutti i diritti riservati.
// Crea i pagamenti sul conto Stripe di CLINIA. Le divisioni (specialista, FPM, Progetto Arca)
// avvengono in automatico nel webhook appena il pagamento è riuscito.
//
//  tipo "visita"        paziente → prezzo + servizio (7 € o 9 €)
//  tipo "studio"        specialista → affitto delle stanze (resta a Clinia)
//  tipo "abbonamento"   specialista → 49,90 €/mese
//  tipo "carta"         salva la carta dello specialista (servizio delle visite in struttura)
//  tipo "carta_clinica" salva la carta o il conto SEPA di Clinia (licenza mensile a FPM)
//  tipo "conto"         collega il conto (IBAN) dello specialista o di FPM per gli accrediti
import { admin, cent, cors, Errore, impostazioni, json, stripe, utente } from "../_shared/clients.ts";

async function profilo(userId: string) {
  const { data } = await admin.from("profiles").select("ruolo").eq("id", userId).single();
  return data?.ruolo as string | undefined;
}
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
      const { data: a } = await admin.from("appointments").select("*").eq("id", body.appointment_id).single();
      if (!a || a.patient_id !== user.id) throw new Errore(404, "Visita non trovata");
      if (a.metodo_pagamento !== "carta" || a.pagato) throw new Errore(400, "Questa visita non va pagata con carta");
      const totale = cent(a.prezzo) + cent(a.commissione_app);
      const pi = await stripe.paymentIntents.create({
        amount: totale, currency: "eur",
        automatic_payment_methods: { enabled: true },       // carta, Apple Pay, Google Pay, PayPal se attivo
        transfer_group: `visita-${a.id}`,
        description: `${a.prestazione} – ${a.giorno} ${a.ora}`,
        metadata: { tipo: "visita", appointment_id: a.id, specialist_id: a.specialist_id },
      }, { idempotencyKey: `visita-${a.id}` });
      return json({ client_secret: pi.client_secret, importo: totale / 100 });
    }

    if (body.tipo === "studio") {
      const sp = await specialistaDi(user.id);
      const ids: string[] = body.booking_ids ?? [];
      const { data: bs } = await admin.from("room_bookings").select("*").in("id", ids);
      if (!bs?.length || bs.some((b: any) => b.specialist_id !== sp.id || b.stato !== "in_attesa_pagamento"))
        throw new Errore(400, "Prenotazioni non valide o già pagate");
      let totale = 0;
      for (const b of bs) {
        const { data: c } = await admin.rpc("costo_studio", { p_room: b.room_id, p_inizio: b.inizio, p_fine: b.fine });
        totale += cent(c);
      }
      const pi = await stripe.paymentIntents.create({
        amount: totale, currency: "eur", customer: await clienteStripe(sp, user.email),
        automatic_payment_methods: { enabled: true },
        description: `Affitto stanze Clinia – ${sp.nome_visualizzato}`,
        metadata: { tipo: "studio", booking_ids: ids.join(","), specialist_id: sp.id },
      });
      return json({ client_secret: pi.client_secret, importo: totale / 100 });
    }

    if (body.tipo === "abbonamento") {
      const sp = await specialistaDi(user.id);
      if (sp.is_titolare) throw new Errore(400, "La direzione di Clinia non paga l'abbonamento");
      const sub = await stripe.subscriptions.create({
        customer: await clienteStripe(sp, user.email),
        items: [{ price: Deno.env.get("STRIPE_PRICE_SPECIALISTA")! }],
        payment_behavior: "default_incomplete",
        payment_settings: { save_default_payment_method: "on_subscription" },
        expand: ["latest_invoice.payment_intent"],
        metadata: { user_id: user.id, specialist_id: sp.id, piano: "specialista" },
      });
      await admin.from("subscriptions").upsert({ user_id: user.id, piano: "specialista", prezzo_mensile: 49.9,
        stato: "in_attesa", stripe_subscription_id: sub.id }, { onConflict: "stripe_subscription_id" });
      const inv: any = sub.latest_invoice;
      return json({ client_secret: inv?.payment_intent?.client_secret, subscription: sub.id });
    }

    if (body.tipo === "carta") {
      const sp = await specialistaDi(user.id);
      const si = await stripe.setupIntents.create({ customer: await clienteStripe(sp, user.email), usage: "off_session",
        metadata: { specialist_id: sp.id, uso: "servizio_visite_in_struttura" } });
      return json({ client_secret: si.client_secret });
    }

    if (body.tipo === "carta_clinica") {
      if ((await profilo(user.id)) !== "titolare") throw new Errore(403, "Solo la direzione di Clinia");
      const { data: st } = await admin.from("app_settings").select("valore").eq("chiave", "clinica_stripe").maybeSingle();
      let customer = st?.valore?.customer as string | undefined;
      if (!customer) {
        customer = (await stripe.customers.create({ name: "Clinia – Dott. Marco Morelli", email: user.email,
          metadata: { uso: "licenza_fpm" } })).id;
        await admin.from("app_settings").upsert({ chiave: "clinica_stripe", valore: { customer } });
      }
      const si = await stripe.setupIntents.create({ customer, usage: "off_session",
        payment_method_types: ["card", "sepa_debit"], metadata: { uso: "licenza_fpm" } });
      return json({ client_secret: si.client_secret });
    }

    if (body.tipo === "conto") {
      const ruolo = await profilo(user.id);
      let conto: string | undefined, salva: (id: string) => Promise<unknown>;
      if (ruolo === "admin") {
        const { data } = await admin.from("fpm_account").select("stripe_account_id").eq("id", 1).maybeSingle();
        conto = data?.stripe_account_id;
        salva = (id) => admin.from("fpm_account").upsert({ id: 1, stripe_account_id: id }) as unknown as Promise<unknown>;
      } else {
        const sp = await specialistaDi(user.id);
        conto = sp.specialist_private?.stripe_account_id;
        salva = (id) => admin.from("specialist_private").upsert({ specialist_id: sp.id, stripe_account_id: id }) as unknown as Promise<unknown>;
      }
      if (!conto) {
        const acc = await stripe.accounts.create({
          type: "express", country: "IT", email: user.email, business_type: "individual",
          capabilities: { transfers: { requested: true } },
          metadata: { ruolo: ruolo ?? "" },
        });
        conto = acc.id; await salva(conto);
      }
      const link = await stripe.accountLinks.create({ account: conto, type: "account_onboarding",
        refresh_url: body.ritorno ?? "https://cliniamatera.it", return_url: body.ritorno ?? "https://cliniamatera.it" });
      return json({ url: link.url });
    }

    if (body.tipo === "servizio") {   // valore del servizio in vigore, per mostrarlo nell'app
      return json({ servizio: (await impostazioni()).servizio });
    }

    throw new Errore(400, "Tipo di pagamento sconosciuto");
  } catch (e) {
    const status = e instanceof Errore ? e.status : 500;
    console.error(e);
    return json({ errore: e instanceof Errore ? e.message : "Pagamento non riuscito, riprova" }, status);
  }
});
