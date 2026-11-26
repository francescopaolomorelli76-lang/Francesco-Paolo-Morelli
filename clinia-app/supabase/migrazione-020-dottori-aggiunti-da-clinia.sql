-- =====================================================================
-- CLINIA APP · Migrazione 020: Clinia aggiunge e attiva dottori ed enti (26/11/2026).
--   · Clinia (titolare) crea il profilo con l'e-mail di accesso e lo attiva: è il suo "ok"
--   · chi si registra con quell'e-mail viene collegato da solo al profilo, già attivo
--   · anche Clinia, oltre a FPM, può attivare o rifiutare chi si registra da solo
-- © 2026 FPM WebDesignTech – Francesco Paolo Morelli. Tutti i diritti riservati.
-- =====================================================================
alter table public.specialists add column if not exists email_invito text;
create unique index if not exists specialists_email_invito on public.specialists (lower(email_invito)) where email_invito is not null;

create or replace function public.accesso_dottore() returns trigger
language plpgsql security definer set search_path = public as $$
declare em text;
begin
  if public.sono_admin() or public.sono_titolare() then
    if tg_op = 'INSERT' and public.sono_titolare() and new.stato_accesso is null then new.stato_accesso := 'approvato'; end if;
    if tg_op = 'UPDATE' and new.stato_accesso is distinct from old.stato_accesso then
      new.accesso_deciso_il := now(); new.attivo := new.stato_accesso = 'approvato';
    end if;
    return new;
  end if;
  if new.is_titolare then return new; end if;
  if tg_op = 'INSERT' then
    new.stato_accesso := 'attesa'; new.attivo := false;
  elsif new.user_id is distinct from old.user_id and new.user_id is not null then
    select lower(email) into em from auth.users where id = new.user_id;
    if old.stato_accesso = 'approvato' and old.email_invito is not null and lower(old.email_invito) = em then
      new.stato_accesso := 'approvato'; new.attivo := true;          -- invitato da Clinia: entra già attivo
    else
      new.stato_accesso := 'attesa'; new.attivo := false;
    end if;
  else
    new.stato_accesso := old.stato_accesso; new.attivo := old.attivo; new.accesso_deciso_il := old.accesso_deciso_il;
  end if;
  new.email_invito := coalesce(old.email_invito, new.email_invito);
  return new;
end $$;

-- Collega l'account appena registrato al profilo creato da Clinia con la stessa e-mail
create or replace function public.collega_invito() returns void
language plpgsql security definer set search_path = public as $$
declare em text;
begin
  select lower(email) into em from auth.users where id = auth.uid();
  if em is null then return; end if;
  update specialists set user_id = auth.uid()
   where lower(email_invito) = em and user_id is null and stato_accesso = 'approvato';
end $$;
revoke all on function public.collega_invito() from public, anon;
grant execute on function public.collega_invito() to authenticated;

-- Clinia può creare profili di dottori ed enti
drop policy if exists specialisti_titolare on public.specialists;
create policy specialisti_titolare on public.specialists for all using (public.sono_titolare()) with check (public.sono_titolare());
