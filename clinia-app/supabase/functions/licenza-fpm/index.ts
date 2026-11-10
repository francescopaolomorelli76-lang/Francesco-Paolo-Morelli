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

  const lordo = Math.round((s.licenzaNetto / (1 - s.ritenuta)) * 100) / 100;   // 300 netti → 352,94 lordi
  const charge = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id;
  const r = await accreditaFpm({ tipo: "licenza", lordo, conBeneficenza: false, nettoFisso: s.licenzaNetto,
    sourceCharge: charge ?? undefined, chiave: `licenza-${mese}` });
  return json({ rata: k, addebitato: s.licenzaNetto, ...r });
});
