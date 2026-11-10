// © 2026 FPM WebDesignTech – Francesco Paolo Morelli. Tutti i diritti riservati.
// Giorno 1 di ogni mese, per i primi 12 mesi: addebita a Clinia (carta o conto SEPA registrati)
// 300 € e li accredita SUBITO a FPM, netti. La ritenuta d'acconto (lordo − 300 €) la versa Clinia con F24.
// Pianificazione: Supabase › Cron, "0 6 1 * *", header Authorization: Bearer <CRON_SECRET>.
import { accreditaFpm, admin, cent, impostazioni, json, stripe } from "../_shared/clients.ts";

Deno.serve(async (req) => {
  if (req.headers.get("Authorization") !== `Bearer ${Deno.env.get("CRON_SECRET")}`)
    return new Response("Non autorizzato", { status: 401 });

  const s = await impostazioni();
  const ora = new Date(), mese = ora.toISOString().slice(0, 7);
  const [ai, mi] = s.licenzaInizio.split("-").map(Number);
  const k = (ora.getUTCFullYear() - ai) * 12 + (ora.getUTCMonth() + 1 - mi) + 1;
  if (k < 1 || k > s.licenzaMesi) return json({ esito: `nessun addebito: mese ${k} fuori dai ${s.licenzaMesi} mesi di licenza` });

  // Se Clinia paga con bonifico o in contanti (ricevuta mensile), o ha già registrato il mese, niente addebito.
  const { data: mt } = await admin.from("app_settings").select("valore").eq("chiave", "licenza_metodo").maybeSingle();
  const metodo = String(mt?.valore?.metodo ?? "automatico");
  if (metodo !== "automatico") return json({ esito: `nessun addebito: Clinia paga la licenza con ${metodo}` });
  const { data: giaPagato } = await admin.from("fpm_pagamenti").select("metodo").eq("mese", `${mese}-01`).maybeSingle();
  if (giaPagato) return json({ esito: `nessun addebito: ${mese} già pagato (${giaPagato.metodo})` });

  const { data: st } = await admin.from("app_settings").select("valore").eq("chiave", "clinica_stripe").maybeSingle();
  const customer = st?.valore?.customer as string | undefined;
  if (!customer) return json({ errore: "Clinia non ha ancora registrato carta o conto" }, 409);
  const metodi = await stripe.paymentMethods.list({ customer, limit: 1 });
  if (!metodi.data.length) return json({ errore: "Nessun metodo di pagamento di Clinia" }, 409);

  const pm = metodi.data[0];
  const pi = await stripe.paymentIntents.create({
    amount: cent(s.licenzaNetto), currency: "eur", customer, payment_method: pm.id,
    payment_method_types: [pm.type], off_session: true, confirm: true,
    description: `Licenza Clinia App – rata ${k} di ${s.licenzaMesi}`, metadata: { tipo: "licenza", rata: String(k) },
  }, { idempotencyKey: `licenza-${mese}` });
  if (pi.status !== "succeeded" && pi.status !== "processing")
    return json({ errore: `Addebito non riuscito (${pi.status})` }, 402);

  const charge = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id;
  const r = await accreditaFpm({ tipo: "licenza", netto: s.licenzaNetto, conBeneficenza: false,
    sourceCharge: charge ?? undefined, chiave: `licenza-${mese}` });
  await admin.from("fpm_pagamenti").upsert({ mese: `${mese}-01`, voce: "licenza", importo_netto: s.licenzaNetto,
    metodo: "automatico", pagato_il: ora.toISOString().slice(0, 10), confermato_fpm: pi.status === "succeeded",
    confermato_il: pi.status === "succeeded" ? ora.toISOString() : null, nota: `Stripe ${pi.id}` });
  return json({ rata: k, addebitato: s.licenzaNetto, ...r });
});
