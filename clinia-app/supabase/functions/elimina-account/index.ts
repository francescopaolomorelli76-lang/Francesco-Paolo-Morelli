// © 2026 FPM WebDesignTech – Francesco Paolo Morelli. Tutti i diritti riservati.
// Elimina l'account di chi lo chiede dall'app (richiesta di Apple e Google e diritto alla cancellazione del GDPR).
// Cancella l'utente di accesso: i suoi dati collegati con "on delete cascade" spariscono con lui; il profilo di un dottore
// creato da Clinia resta a Clinia ma viene scollegato e messo "in attesa".
import { admin, json, utente } from "../_shared/clients.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type" } });
  try {
    const u = await utente(req);
    await admin.from("specialists").update({ user_id: null, stato_accesso: "attesa", attivo: false }).eq("user_id", u.id).eq("is_titolare", false);
    const { error } = await admin.auth.admin.deleteUser(u.id);
    if (error) return json({ errore: error.message }, 500);
    return json({ esito: "account eliminato" });
  } catch (e) {
    return json({ errore: String((e as Error).message ?? e) }, 401);
  }
});
