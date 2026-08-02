-- =============================================================================
-- Nabung Bareng — hapus tabungan (soft delete)
--
-- Hard delete groups tidak mungkin di v1: groups -> transactions pakai ON
-- DELETE CASCADE, tapi transactions_block_delete menolak semua DELETE demi
-- ledger append-only (lihat komentar di 20260728120200_rls.sql). Jadi "hapus
-- tabungan" di sini juga UPDATE yang mengisi deleted_at, sama seperti pola
-- hapus transaksi di 20260730010000_soft_delete_transactions.sql.
--
-- Beda dengan transaksi: begitu deleted_at terisi, tabungannya hilang total
-- dari group_overview, jadi tidak ada jalan UI balik ke sana lagi (baik lewat
-- home maupun link langsung) — tidak perlu trigger "bekukan setelah dihapus"
-- seperti transactions_guard_update, dan groups_update_owner (RLS yang sudah
-- ada) sudah cukup mengizinkan owner mengisi kolom ini.
-- =============================================================================

alter table public.groups
  add column deleted_at timestamptz;

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
) mb on mb.group_id = g.id
where g.deleted_at is null;

-- member_contributions tidak pernah join ke groups sebelumnya — ditambahkan
-- di sini supaya kontribusi dari tabungan yang sudah dihapus tidak lagi ikut
-- kehitung ke "Total kamu simpan" di home.
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
join public.groups g
  on g.id = m.group_id
left join public.profiles p
  on p.id = m.user_id
left join public.transactions t
  on t.group_id = m.group_id
 and t.user_id  = m.user_id
 and t.deleted_at is null
where m.status = 'active'
  and g.deleted_at is null
group by m.group_id, m.user_id, m.role, m.joined_at, p.display_name, p.avatar_url;
