// © 2026 FPM WebDesignTech – Francesco Paolo Morelli. Tutti i diritti riservati.
// Riceve gli eventi di Stripe e aggiorna il database (in tempo reale anche sui telefoni).
// In Stripe › Sviluppatori › Webhook: URL https://<progetto>.supabase.co/functions/v1/stripe-webhook
// Eventi: payment_intent.succeeded, payment_intent.payment_failed, invoice.paid,
//         invoice.payment_failed, customer.subscription.updated, customer.subscription.deleted, charge.refunded
import Stripe from "npm:stripe@16.12.0";
import { admin, stripe } from "../_shared/clients.ts";

const euro = (c: number) => Math.round(c) / 100;
const giorno = (unix: number) => new Date(unix * 1000).toISOString().slice(0, 10);

Deno.serve(async (req) => {
  const firma = req.headers.get("stripe-signature") ?? "";
  const testo = await req.text();
  let ev: Stripe.Event;
  try {
    ev = await stripe.webhooks.constructEventAsync(testo, firma, Deno.env.get("STRIPE_WEBHOOK_SECRET")!,
      undefined, Stripe.createSubtleCryptoProvider());
  } catch (_e) {
    return new Response("Firma non valida", { status: 400 });
  }

  switch (ev.type) {
    case "payment_intent.succeeded": {
      const pi = ev.data.object as Stripe.PaymentIntent;
      const m = pi.metadata ?? {};
      if (m.tipo === "visita") {
        const { data: a } = await admin.from("appointments")
          .update({ pagato: true, pagato_il: new Date().toISOString(), stato: "confermata" })
          .eq("id", m.appointment_id).select().single();
        if (a) await admin.from("payments").upsert([
          { tipo: "visita", importo: a.prezzo, beneficiario: "specialista", pagatore_user: a.patient_id,
            specialist_id: a.specialist_id, appointment_id: a.id, metodo: "carta", stato: "riuscito",
            stripe_payment_intent: pi.id },
          { tipo: "commissione_app", importo: euro(pi.application_fee_amount ?? 700), beneficiario: "app",
            pagatore_user: a.patient_id, specialist_id: a.specialist_id, appointment_id: a.id, metodo: "carta",
            stato: "riuscito", stripe_payment_intent: pi.id + ":fee" },
        ], { onConflict: "stripe_payment_intent" });
      }
      if (m.tipo === "studio") {
        const ids = (m.booking_ids ?? "").split(",").filter(Boolean);
        await admin.from("room_bookings").update({ stato: "confermata" }).in("id", ids);
        const { data: p } = await admin.from("payments").upsert({
          tipo: "affitto_studio", importo: euro(pi.amount), beneficiario: "clinica", specialist_id: m.specialist_id,
          room_booking_ids: ids, metodo: "carta", stato: "riuscito", stripe_payment_intent: pi.id,
        }, { onConflict: "stripe_payment_intent" }).select().single();
        if (p) await admin.from("room_bookings").update({ payment_id: p.id }).in("id", ids);
      }
      break;
    }
    case "payment_intent.payment_failed": {
      const pi = ev.data.object as Stripe.PaymentIntent;
      if (pi.metadata?.tipo === "studio") {   // libera subito gli studi
        await admin.from("room_bookings").update({ stato: "annullata" })
          .in("id", (pi.metadata.booking_ids ?? "").split(",")).eq("stato", "in_attesa_pagamento");
      }
      break;
    }
    case "invoice.paid": {   // abbonamento mensile (+ eventuali commissioni delle visite in struttura)
      const inv = ev.data.object as Stripe.Invoice;
      if (!inv.subscription) break;
      const sub = await stripe.subscriptions.retrieve(inv.subscription as string);
      const piano = sub.metadata.piano;
      await admin.from("subscriptions").update({
        stato: sub.cancel_at_period_end ? "disdetto" : "attivo",
        inizio: giorno(sub.start_date), prossimo_rinnovo: giorno(sub.current_period_end),
      }).eq("stripe_subscription_id", sub.id);
      for (const riga of inv.lines.data) {
        if (riga.type === "subscription") {
          await admin.from("payments").upsert({
            tipo: piano === "clinica" ? "abbonamento_clinica" : "abbonamento_specialista", importo: euro(riga.amount),
            beneficiario: "app", pagatore_user: sub.metadata.user_id, specialist_id: sub.metadata.specialist_id,
            metodo: "carta", stato: "riuscito", stripe_payment_intent: `${inv.id}:${riga.id}`, stripe_invoice: inv.id,
          }, { onConflict: "stripe_payment_intent" });
        } else if (riga.metadata?.tipo === "commissioni_contanti") {
          await admin.from("payments").update({ stato: "riuscito", stripe_invoice: inv.id })
            .eq("stripe_payment_intent", `ii:${riga.invoice_item}`);
        }
      }
      break;
    }
    case "invoice.payment_failed": {
      const inv = ev.data.object as Stripe.Invoice;
      if (inv.subscription) await admin.from("subscriptions").update({ stato: "insoluto" })
        .eq("stripe_subscription_id", inv.subscription as string);
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = ev.data.object as Stripe.Subscription;
      const stato = ev.type.endsWith("deleted") ? "scaduto" : sub.cancel_at_period_end ? "disdetto"
        : sub.status === "active" ? "attivo" : sub.status === "past_due" ? "insoluto" : "in_attesa";
      await admin.from("subscriptions").update({ stato, prossimo_rinnovo: giorno(sub.current_period_end) })
        .eq("stripe_subscription_id", sub.id);
      break;
    }
    case "charge.refunded": {
      const ch = ev.data.object as Stripe.Charge;
      if (ch.payment_intent) await admin.from("payments").update({ stato: "rimborsato" })
        .eq("stripe_payment_intent", ch.payment_intent as string);
      break;
    }
  }
  return new Response(JSON.stringify({ ricevuto: true }), { headers: { "Content-Type": "application/json" } });
});
