-- =============================================================================
-- notification_targets: sertakan group_id
--
-- Email notifikasi butuh tautan langsung ke tabungannya (/g/<id>), tapi versi
-- pertama fungsi ini hanya mengembalikan nama grup. `create or replace` tidak
-- bisa mengubah daftar kolom yang dikembalikan, jadi harus drop lalu buat ulang.
-- =============================================================================

drop function if exists public.notification_targets(bigint);

create function public.notification_targets(p_event_id bigint)
returns table (
  recipient_email text,
  recipient_name  text,
  kind            text,   -- 'needs_approval' | 'approved' | 'rejected' | 'withdrawal'
  group_id        uuid,
  group_name      text,
  actor_name      text,
  amount          numeric,
  note            text,
  reason          text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_event public.transaction_events;
  v_tx    public.transactions;
  v_group public.groups;
  v_kind  text;
begin
  select * into v_event from public.transaction_events e where e.id = p_event_id;
  if not found then
    return;
  end if;

  select * into v_tx    from public.transactions t where t.id = v_event.transaction_id;
  select * into v_group from public.groups g       where g.id = v_tx.group_id;

  v_kind := case
    when v_tx.type = 'withdrawal' and v_event.action = 'created' then 'withdrawal'
    when v_tx.type = 'deposit'    and v_event.action = 'created' then 'needs_approval'
    when v_event.action = 'approved'                             then 'approved'
    when v_event.action in ('rejected', 'unapproved')            then 'rejected'
    else null
  end;

  -- amount_edited dan note_edited tidak dikabarkan lewat email.
  if v_kind is null then
    return;
  end if;

  -- Setoran owner sendiri langsung verified; tidak ada yang perlu menyetujui,
  -- jadi tidak ada yang perlu dikabari.
  if v_kind = 'needs_approval' and v_tx.user_id = v_group.owner_id then
    return;
  end if;

  return query
  with recipients as (
    -- Setoran member masuk: kabari owner.
    select p.email, p.display_name
    from public.profiles p
    where v_kind = 'needs_approval'
      and p.id = v_group.owner_id

    union all

    -- Keputusan owner: kabari pembuat transaksinya.
    select p.email, p.display_name
    from public.profiles p
    where v_kind in ('approved', 'rejected')
      and p.id = v_tx.user_id

    union all

    -- Penarikan dana mengurangi saldo tanpa persetujuan siapa pun, jadi kabari
    -- semua member aktif kecuali yang melakukannya.
    select p.email, p.display_name
    from public.memberships m
    join public.profiles p on p.id = m.user_id
    where v_kind = 'withdrawal'
      and m.group_id = v_group.id
      and m.status   = 'active'
      and m.user_id <> v_tx.user_id
  )
  select
    r.email,
    r.display_name,
    v_kind,
    v_group.id,
    v_group.name,
    (select p2.display_name from public.profiles p2 where p2.id = v_tx.user_id),
    v_tx.amount,
    v_tx.note,
    v_event.reason
  from recipients r
  where r.email is not null;
end;
$$;

-- Sengaja hanya service_role. Kalau `authenticated` boleh memanggilnya, member
-- bisa menelusuri id kejadian — mereka memang boleh melihat seluruh ledger —
-- untuk memanen email semua orang di grupnya.
revoke execute on function public.notification_targets(bigint) from public;
revoke execute on function public.notification_targets(bigint) from anon;
revoke execute on function public.notification_targets(bigint) from authenticated;
grant   execute on function public.notification_targets(bigint) to service_role;
