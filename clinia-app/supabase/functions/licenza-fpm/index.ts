// © 2026 FPM WebDesignTech – Francesco Paolo Morelli. Tutti i diritti riservati.
// Giorno 1 di ogni mese addebita a Clinia (carta o conto SEPA registrati) e accredita SUBITO a FPM, netti:
//   1. la parte fissa del prezzo di cessione del software: rata da 300 € (mesi 1–12) oppure 3.000 € (mese 1, unica soluzione);
//   2. la royalty d'autore del mese precedente: ore di studio prenotate e confermate × 4,99 € (qualsiasi formula),
//      a tempo indeterminato. Il 3 % della royalty FPM lo dona a Progetto Arca (registrato in "donazioni").
// Le royalty sugli abbonamenti degli specialisti (50 €/mese) arrivano già da sole con Stripe (stripe-webhook, invoice.paid).
// La ritenuta d'acconto (lordo − netto) la versa Clinia con F24.
// Pianificazione: Supabase › Cron, "0 6 1 * *", header Authorization: Bearer <CRON_SECRET>.
import { accreditaFpm, admin, cent, impostazioni, json, stripe } from "../_shared/clients.ts";

const r2 = (n: number) => Math.round(n * 100) / 100;

Deno.serve(async (req) => {
  if (req.headers.get("Authorization") !== `Bearer ${Deno.env.get("CRON_SECRET")}`)
    return new Response("Non autorizzato", { status: 401 });

  const s = await impostazioni();
  const ora = new Date(), mese = ora.toISOString().slice(0, 7);
  const prec = new Date(Date.UTC(ora.getUTCFullYear(), ora.getUTCMonth() - 1, 1)).toISOString().slice(0, 10);
  const [ai, mi] = s.licenzaInizio.split("-").map(Number);
  const k = (ora.getUTCFullYear() - ai) * 12 + (ora.getUTCMonth() + 1 - mi) + 1;

  // Metodo (automatico | bonifico | contanti) e modo d'acquisto (rate | unica) scelti da Clinia
  const { data: mt } = await admin.from("app_settings").select("valore").eq("chiave", "licenza_metodo").maybeSingle();
  const metodo = String(mt?.valore?.metodo ?? "automatico");
  const unica = mt?.valore?.modo === "unica";
  if (metodo !== "automatico") return json({ esito: `nessun addebito: Clinia paga con ${metodo} (ricevuta mensile)` });

  // Importi del mese
  const rata = unica ? (k === 1 ? s.licenzaUnica : 0) : (k >= 1 && k <= s.licenzaMesi ? s.licenzaNetto : 0);
  const { data: c } = await admin.rpc("canone_mese", { p_mese: prec });
  const ore = Number(c?.[0]?.ore ?? 0);
  const inizioRoyalty = `${s.licenzaInizio.slice(0, 7)}-01`;
  const royalty = prec >= inizioRoyalty ? r2(ore * s.royaltyOra) : 0;

  const { data: gia } = await admin.from("fpm_pagamenti").select("voce").eq("mese", `${mese}-01`);
  const fatte = new Set((gia ?? []).map((g: any) => g.voce));
  const voci = [
    { voce: "licenza" as const, netto: rata, arca: false,
      desc: unica ? "Cessione software Clinia App – unica soluzione" : `Cessione software Clinia App – rata ${k} di ${s.licenzaMesi}` },
    { voce: "royalty" as const, netto: royalty, arca: true,
      desc: `Royalty d'autore Clinia App – ${ore} ore di studio × ${s.royaltyOra} € (${prec.slice(0, 7)})` },
  ].filter((v) => v.netto > 0 && !fatte.has(v.voce));
  if (!voci.length) return json({ esito: "nessun addebito questo mese", rata, ore, royalty });

  const { data: st } = await admin.from("app_settings").select("valore").eq("chiave", "clinica_stripe").maybeSingle();
  const customer = st?.valore?.customer as string | undefined;
  if (!customer) return json({ errore: "Clinia non ha ancora registrato carta o conto" }, 409);
  const metodi = await stripe.paymentMethods.list({ customer, limit: 1 });
  if (!metodi.data.length) return json({ errore: "Nessun metodo di pagamento di Clinia" }, 409);
  const pm = metodi.data[0];

  const esiti: unknown[] = [];
  for (const v of voci) {
    const pi = await stripe.paymentIntents.create({
      amount: cent(v.netto), currency: "eur", customer, payment_method: pm.id,
      payment_method_types: [pm.type], off_session: true, confirm: true,
      description: v.desc, metadata: { tipo: v.voce, mese, ore: String(ore) },
    }, { idempotencyKey: `${v.voce}-${mese}` });
    if (pi.status !== "succeeded" && pi.status !== "processing") { esiti.push({ voce: v.voce, errore: pi.status }); continue; }
    const charge = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id;
    const r = await accreditaFpm({ tipo: v.voce, netto: v.netto, conBeneficenza: v.arca,
      sourceCharge: charge ?? undefined, chiave: `${v.voce}-${mese}` });
    const ok = pi.status === "succeeded";
    await admin.from("fpm_pagamenti").upsert({ mese: `${mese}-01`, voce: v.voce, importo_netto: v.netto,
      metodo: "automatico", pagato_il: ora.toISOString().slice(0, 10), confermato_fpm: ok,
      confermato_il: ok ? ora.toISOString() : null, nota: `${v.desc} · Stripe ${pi.id}` }, { onConflict: "mese,voce" });
    esiti.push({ voce: v.voce, addebitato: v.netto, ...r });
  }
  return json({ mese, ore, esiti });
});
