// © 2026 FPM WebDesignTech – Francesco Paolo Morelli. Tutti i diritti riservati.
// Lo specialista (o la direzione) risponde a una richiesta di visita:
//   "conferma"   → con la carta addebita l'importo autorizzato; la visita diventa confermata
//   "rifiuta"    → con la carta annulla l'autorizzazione (nessun addebito); la visita diventa rifiutata
//   "effettuata" → la visita confermata diventa conclusa
// Le notifiche a paziente, FPM e specialista le scrive il database (migrazione 009).
import { admin, cors, Errore, json, stripe, utente } from "../_shared/clients.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const user = await utente(req);
    const { appointment_id, esito } = await req.json();
    if (!["conferma", "rifiuta", "effettuata"].includes(esito)) throw new Errore(400, "Esito non valido");
    const { data: a } = await admin.from("appointments").select("*, specialists(user_id)").eq("id", appointment_id).single();
    if (!a) throw new Errore(404, "Visita non trovata");
    const { data: prof } = await admin.from("profiles").select("ruolo").eq("id", user.id).single();
    const suo = (a as any).specialists?.user_id === user.id || prof?.ruolo === "titolare";
    if (!suo) throw new Errore(403, "Solo lo specialista della visita può rispondere");

    if (esito === "effettuata") {
      if (a.stato !== "confermata") throw new Errore(409, "Si può segnare effettuata solo una visita confermata");
      await admin.from("appointments").update({ stato: "conclusa" }).eq("id", a.id);
      return json({ stato: "conclusa" });
    }
    if (a.stato !== "richiesta") throw new Errore(409, "La richiesta ha già una risposta");
    if (a.metodo_pagamento === "carta" && a.stripe_payment_intent) {
      if (esito === "conferma") await stripe.paymentIntents.capture(a.stripe_payment_intent, {}, { idempotencyKey: `cattura-${a.id}` });
      else await stripe.paymentIntents.cancel(a.stripe_payment_intent, {}, { idempotencyKey: `annulla-${a.id}` });
    }
    const stato = esito === "conferma" ? "confermata" : "rifiutata";
    await admin.from("appointments").update({ stato }).eq("id", a.id);
    return json({ stato });
  } catch (e) {
    console.error(e);
    return json({ errore: e instanceof Errore ? e.message : "Operazione non riuscita, riprova" }, e instanceof Errore ? e.status : 500);
  }
});
