-- =============================================================================
-- Nabung Bareng — tutup kebocoran email + dukungan notifikasi
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Email tidak boleh terbaca dari client
--
-- RLS Postgres bersifat row-level, bukan column-level. Policy
-- profiles_select_co_members memberi member akses ke BARIS rekan satu grupnya
-- supaya nama dan avatar bisa ditampilkan — tapi izin itu otomatis mencakup
-- semua kolom, termasuk `email`. Akibatnya sebelum migrasi ini,
-- `from("profiles").select("email")` dari browser member mana pun mengembalikan
-- email seluruh rekan grupnya.
--
-- Grant per-kolom menutupnya tanpa mengubah policy: baris tetap terbaca, kolom
-- email tidak. Aman karena aplikasi tidak pernah membaca tabel profiles
-- langsung — hanya lewat view, dan view hanya memilih display_name & avatar_url.
-- -----------------------------------------------------------------------------
revoke select on public.profiles from authenticated;
revoke select on public.profiles from anon;

grant select (id, display_name, avatar_url, updated_at)
  on public.profiles to authenticated;

comment on column public.profiles.email is
  'Hanya untuk pengiriman notifikasi di server. Sengaja TIDAK di-grant ke role '
  'authenticated/anon — jangan tambahkan kembali.';

-- -----------------------------------------------------------------------------
-- 2. transaction_events dipakai sekalian sebagai antrean notifikasi
--
-- Setiap kejadian yang layak dikabarkan sudah tercatat di sini oleh trigger
-- transactions_log_event: created, approved, rejected, unapproved. Jadi tidak
-- perlu tabel antrean terpisah — cukup tandai mana yang sudah terkirim.
--
-- Efeknya juga idempoten: kalau pengiriman gagal di tengah, barisnya tetap
-- null dan akan dicoba lagi, bukan hilang.
-- -----------------------------------------------------------------------------
alter table public.transaction_events
  add column notified_at timestamptz;

comment on column public.transaction_events.notified_at is
  'Waktu notifikasi email untuk kejadian ini berhasil dikirim. null = belum.';

-- Antrean selalu dibaca dengan filter "yang belum terkirim", jadi index
-- parsialnya tetap kecil walau ledger tumbuh.
create index transaction_events_unnotified_idx
  on public.transaction_events (created_at)
  where notified_at is null;

-- -----------------------------------------------------------------------------
-- 3. notification_targets — dipakai kode server untuk tahu siapa yang dikabari
--
-- SECURITY DEFINER supaya bisa membaca profiles.email, dan execute-nya HANYA
-- diberikan ke service_role. Kalau `authenticated` boleh memanggilnya, member
-- bisa menelusuri id transaksi (mereka memang boleh melihat seluruh ledger)
-- untuk memanen email semua orang di grupnya — persis kebocoran yang baru
-- ditutup di bagian 1.
--
-- Penerima ditentukan murni dari state di database, bukan dari parameter
-- pemanggil, supaya tidak ada cara meminta "kejadian" lain demi email lain.
-- -----------------------------------------------------------------------------
create or replace function public.notification_targets(p_event_id bigint)
returns table (
  recipient_email text,
  recipient_name  text,
  kind            text,   -- 'needs_approval' | 'approved' | 'rejected' | 'withdrawal'
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
    v_group.name,
    (select p2.display_name from public.profiles p2 where p2.id = v_tx.user_id),
    v_tx.amount,
    v_tx.note,
    v_event.reason
  from recipients r
  where r.email is not null;
end;
$$;

revoke execute on function public.notification_targets(bigint) from public;
revoke execute on function public.notification_targets(bigint) from anon;
revoke execute on function public.notification_targets(bigint) from authenticated;
grant   execute on function public.notification_targets(bigint) to service_role;
