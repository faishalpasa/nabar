-- =============================================================================
-- Nabung Bareng — view turunan
--
-- Business rule dari spec dihitung di satu tempat supaya frontend tidak pernah
-- menghitung saldo sendiri:
--
--   saldo pool  = SUM(deposit verified) - SUM(withdrawal)
--   kontribusi  = SUM(deposit verified milik member itu)   -- gross
--   progress    = saldo pool / goal_amount
--
-- `security_invoker = true` membuat RLS tabel dasar tetap berlaku untuk
-- pemanggil view. Tanpa itu, view akan berjalan dengan hak pemiliknya dan
-- membocorkan grup orang lain.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- group_overview — satu baris per grup, cukup untuk layar Home dan header Detail
-- -----------------------------------------------------------------------------
create view public.group_overview
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
  group by t.group_id
) tx on tx.group_id = g.id
left join (
  select m.group_id, count(*) as member_count
  from public.memberships m
  where m.status = 'active'
  group by m.group_id
) mb on mb.group_id = g.id;

comment on view public.group_overview is
  'Saldo, progress, dan jumlah pending per grup. progress dijepit ke rentang '
  '0..1 supaya progress bar tidak overflow saat target terlampaui dan tidak '
  'negatif saat saldo minus (withdrawal melebihi saldo tidak dicegah) — nilai '
  'mentahnya bisa dihitung dari balance / goal_amount kalau UI perlu >100%.';

-- -----------------------------------------------------------------------------
-- member_contributions — satu baris per member, untuk tab Member
--
-- LEFT JOIN ke transactions supaya member yang belum pernah setor tetap muncul
-- dengan total 0. Nilainya gross: tidak berkurang oleh withdrawal.
-- -----------------------------------------------------------------------------
create view public.member_contributions
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
where m.status = 'active'
group by m.group_id, m.user_id, m.role, m.joined_at, p.display_name, p.avatar_url;

comment on view public.member_contributions is
  'Kontribusi gross per member (SUM deposit verified). Tidak berubah walau ada '
  'withdrawal, sesuai business rule di spec.';

-- -----------------------------------------------------------------------------
-- transaction_feed — baris siap-render untuk tab History
-- -----------------------------------------------------------------------------
create view public.transaction_feed
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
  on p.id = t.user_id;

grant select on public.group_overview      to authenticated;
grant select on public.member_contributions to authenticated;
grant select on public.transaction_feed    to authenticated;
