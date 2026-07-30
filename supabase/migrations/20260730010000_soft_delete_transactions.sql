-- =============================================================================
-- Nabung Bareng — hapus transaksi (soft delete)
--
-- Ledger tetap append-only (tg_transactions_block_delete masih memblokir DELETE
-- sungguhan) — "hapus" di sini adalah UPDATE yang mengisi deleted_at, lalu
-- baris itu disaring keluar dari tiga view turunan. Baris fisiknya tetap ada
-- untuk audit (dan tetap tercatat di transaction_events), tapi tidak lagi ikut
-- dihitung ke saldo/kontribusi dan tidak muncul di riwayat.
--
-- Hanya owner tabungan yang boleh menghapus, transaksi milik siapa pun di
-- grup itu — beda dengan edit nominal/bukti yang dibatasi transaksi miliknya
-- sendiri, karena hapus adalah tindakan moderasi atas seluruh ledger grup.
-- =============================================================================

alter table public.transactions
  add column deleted_at timestamptz;

alter table public.transaction_events
  drop constraint transaction_events_action_check;

alter table public.transaction_events
  add constraint transaction_events_action_check
  check (action = any (array[
    'created', 'approved', 'rejected', 'unapproved',
    'amount_edited', 'note_edited', 'proof_edited', 'deleted'
  ]));

create or replace function public.tg_transactions_guard_update()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_uid       uuid    := auth.uid();
  v_is_owner  boolean := public.is_group_owner(old.group_id);
  v_is_author boolean := (old.user_id = v_uid);
  v_balance   numeric;
begin
  if v_uid is null then
    raise exception 'harus login' using errcode = '42501';
  end if;

  -- Baris yang sudah dihapus dibekukan total — tidak ada field lain (status,
  -- nominal, bukti, catatan) yang boleh berubah lagi sesudahnya.
  if old.deleted_at is not null then
    raise exception 'transaksi yang sudah dihapus tidak bisa diubah'
      using errcode = '42501';
  end if;

  -- Kolom yang tidak boleh berubah sama sekali. proof_path TIDAK lagi di
  -- sini — dipindah ke blok penjagaan sendiri di bawah.
  if new.id         <> old.id
     or new.group_id   <> old.group_id
     or new.user_id    <> old.user_id
     or new.type       <> old.type
     or new.created_at <> old.created_at
  then
    raise exception 'kolom id, group_id, user_id, type, dan created_at tidak bisa diubah'
      using errcode = '42501';
  end if;

  -- ---- hapus (soft delete) -------------------------------------------------
  -- Hanya owner, transaksi apa pun di grupnya (bukan cuma miliknya sendiri),
  -- dan tidak boleh dibarengi perubahan field lain dalam UPDATE yang sama.
  if new.deleted_at is distinct from old.deleted_at then
    if not v_is_owner then
      raise exception 'hanya owner yang bisa menghapus transaksi'
        using errcode = '42501';
    end if;

    if new.status is distinct from old.status
       or new.amount is distinct from old.amount
       or new.note is distinct from old.note
       or new.proof_path is distinct from old.proof_path
    then
      raise exception 'penghapusan tidak boleh disertai perubahan lain'
        using errcode = '42501';
    end if;
  end if;

  -- Field verifikasi hanya boleh bergerak bersama perubahan status, dan nilainya
  -- ditetapkan di blok di bawah. Tanpa penjagaan ini, member bisa mengirim
  -- PATCH { verified_at, verified_by } ke setorannya sendiri yang masih pending
  -- dan barisnya akan tampil seolah sudah di-approve — tanpa jejak di
  -- transaction_events, karena log hanya mencatat delta status/amount/note/proof.
  if new.status is not distinct from old.status
     and (new.verified_by   is distinct from old.verified_by
       or new.verified_at   is distinct from old.verified_at
       or new.reject_reason is distinct from old.reject_reason)
  then
    raise exception 'field verifikasi hanya berubah lewat perubahan status'
      using errcode = '42501';
  end if;

  -- ---- perubahan status -------------------------------------------------
  if new.status is distinct from old.status then
    if not v_is_owner then
      raise exception 'hanya owner yang bisa mengubah status transaksi'
        using errcode = '42501';
    end if;

    if old.type = 'withdrawal' then
      raise exception 'status penarikan dana tidak bisa diubah'
        using errcode = '42501';
    end if;

    if not (
      (old.status = 'pending'  and new.status in ('verified', 'rejected'))
      or (old.status = 'verified' and new.status = 'rejected')
    ) then
      raise exception 'transisi status % -> % tidak diizinkan', old.status, new.status
        using errcode = '42501';
    end if;

    if new.status = 'verified' then
      new.verified_by   := v_uid;
      new.verified_at   := now();
      new.reject_reason := null;
    else
      new.verified_by := null;
      new.verified_at := null;
      -- reject_reason wajib — sudah dijaga constraint transactions_reject_needs_reason
    end if;
  end if;

  -- ---- edit nominal -----------------------------------------------------
  if new.amount is distinct from old.amount then
    if not (v_is_author and v_is_owner) then
      raise exception 'hanya owner yang bisa mengedit nominal transaksinya sendiri'
        using errcode = '42501';
    end if;

    if old.status = 'rejected' then
      raise exception 'transaksi yang sudah ditolak tidak bisa diedit'
        using errcode = '42501';
    end if;

    -- Withdrawal yang nominalnya dinaikkan juga tidak boleh sampai melebihi
    -- saldo. old.amount ditambahkan kembali ke v_balance karena baris ini
    -- sendiri (dengan nominal LAMA) masih ikut terhitung di agregat sampai
    -- UPDATE ini commit.
    if old.type = 'withdrawal' then
      select coalesce(sum(amount) filter (where type = 'deposit'), 0)
           - coalesce(sum(amount) filter (where type = 'withdrawal'), 0)
        into v_balance
      from public.transactions
      where group_id = old.group_id
        and status = 'verified'
        and deleted_at is null;

      if new.amount > v_balance + old.amount then
        raise exception 'nominal penarikan (Rp%) melebihi saldo tersedia (Rp%)',
          new.amount, v_balance + old.amount
          using errcode = '23514';
      end if;
    end if;
  end if;

  -- ---- edit bukti transfer -----------------------------------------------
  -- Sama persis batasan edit nominal: hanya owner, hanya transaksi miliknya
  -- sendiri, tidak bisa kalau sudah rejected. Path baru wajib tetap di folder
  -- grup+user yang sama — kalau tidak, trigger insert yang biasanya menjaga
  -- ini tidak berjalan lagi karena ini UPDATE, bukan INSERT.
  if new.proof_path is distinct from old.proof_path then
    if not (v_is_author and v_is_owner) then
      raise exception 'hanya owner yang bisa mengedit bukti transaksinya sendiri'
        using errcode = '42501';
    end if;

    if old.status = 'rejected' then
      raise exception 'transaksi yang sudah ditolak tidak bisa diedit'
        using errcode = '42501';
    end if;

    if new.proof_path not like old.group_id::text || '/' || old.user_id::text || '/%' then
      raise exception 'proof_path harus berada di folder grup dan user sendiri'
        using errcode = '42501';
    end if;
  end if;

  -- ---- edit catatan -----------------------------------------------------
  if new.note is distinct from old.note and not v_is_author then
    raise exception 'catatan hanya bisa diubah oleh pembuat transaksi'
      using errcode = '42501';
  end if;

  return new;
end;
$function$;

create or replace function public.tg_transactions_log_event()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_uid uuid := coalesce(auth.uid(), new.user_id);
begin
  if tg_op = 'INSERT' then
    insert into public.transaction_events (transaction_id, actor_id, action, amount_after)
    values (new.id, v_uid, 'created', new.amount);
    return new;
  end if;

  if new.deleted_at is distinct from old.deleted_at and new.deleted_at is not null then
    insert into public.transaction_events (transaction_id, actor_id, action)
    values (new.id, v_uid, 'deleted');
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into public.transaction_events (transaction_id, actor_id, action, reason)
    values (
      new.id,
      v_uid,
      case
        when new.status = 'verified' then 'approved'
        when old.status = 'verified' then 'unapproved'
        else 'rejected'
      end,
      new.reject_reason
    );
  end if;

  if new.amount is distinct from old.amount then
    insert into public.transaction_events (transaction_id, actor_id, action, amount_before, amount_after)
    values (new.id, v_uid, 'amount_edited', old.amount, new.amount);
  end if;

  if new.proof_path is distinct from old.proof_path then
    insert into public.transaction_events (
      transaction_id, actor_id, action, proof_path_before, proof_path_after
    )
    values (new.id, v_uid, 'proof_edited', old.proof_path, new.proof_path);
  end if;

  if new.note is distinct from old.note then
    insert into public.transaction_events (transaction_id, actor_id, action)
    values (new.id, v_uid, 'note_edited');
  end if;

  return new;
end;
$function$;

-- -----------------------------------------------------------------------------
-- Views: saring baris yang sudah dihapus (deleted_at is null) supaya saldo,
-- kontribusi, dan riwayat langsung ikut berubah pada request berikutnya —
-- tidak perlu invalidasi cache khusus karena semuanya Server Component.
-- -----------------------------------------------------------------------------

create or replace view public.group_overview
with (security_invoker = true) as
select
  g.id                                        as group_id,
  g.name,
  g.type,
  g.goal_amount,
  g.goal_deadline,
  g.owner_id,
  g.created_at,
  coalesce(tx.total_deposits, 0)              as total_deposits,
  coalesce(tx.total_withdrawals, 0)           as total_withdrawals,
  coalesce(tx.total_deposits, 0)
    - coalesce(tx.total_withdrawals, 0)       as balance,
  coalesce(tx.pending_count, 0)               as pending_count,
  coalesce(mb.member_count, 0)                as member_count,
  case
    when g.goal_amount is null then null
    else greatest(0, least(
      1.0,
      round(
        (coalesce(tx.total_deposits, 0) - coalesce(tx.total_withdrawals, 0))
          / g.goal_amount,
        4
      )
    ))
  end                                         as progress
from public.groups g
left join (
  select
    t.group_id,
    sum(t.amount) filter (where t.type = 'deposit'    and t.status = 'verified') as total_deposits,
    sum(t.amount) filter (where t.type = 'withdrawal' and t.status = 'verified') as total_withdrawals,
    count(*)      filter (where t.status = 'pending')                            as pending_count
  from public.transactions t
  where t.deleted_at is null
  group by t.group_id
) tx on tx.group_id = g.id
left join (
  select m.group_id, count(*) as member_count
  from public.memberships m
  where m.status = 'active'
  group by m.group_id
) mb on mb.group_id = g.id;

create or replace view public.member_contributions
with (security_invoker = true) as
select
  m.group_id,
  m.user_id,
  m.role,
  m.joined_at,
  coalesce(p.display_name, 'Pengguna') as display_name,
  p.avatar_url,
  coalesce(
    sum(t.amount) filter (where t.type = 'deposit' and t.status = 'verified'),
    0
  )                                                          as total_contributed,
  count(t.id) filter (where t.status = 'pending')             as pending_count
from public.memberships m
left join public.profiles p
  on p.id = m.user_id
left join public.transactions t
  on t.group_id = m.group_id
 and t.user_id  = m.user_id
 and t.deleted_at is null
where m.status = 'active'
group by m.group_id, m.user_id, m.role, m.joined_at, p.display_name, p.avatar_url;

create or replace view public.transaction_feed
with (security_invoker = true) as
select
  t.id,
  t.group_id,
  t.user_id,
  coalesce(p.display_name, 'Pengguna') as display_name,
  p.avatar_url,
  t.type,
  t.amount,
  -- Nilai bertanda, untuk kolom nominal di UI (withdrawal tampil negatif).
  case when t.type = 'withdrawal' then -t.amount else t.amount end as signed_amount,
  t.status,
  t.note,
  t.reject_reason,
  t.proof_path,
  t.created_at,
  t.verified_at,
  t.verified_by,
  exists (
    select 1
    from public.transaction_events e
    where e.transaction_id = t.id
      and e.action = 'amount_edited'
  ) as was_edited
from public.transactions t
left join public.profiles p
  on p.id = t.user_id
where t.deleted_at is null;
