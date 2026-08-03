-- =============================================================================
-- Nabung Bareng — tier user (free/premium) + limit jumlah tabungan
--
-- Tier saat ini murni flag manual: diubah langsung dari Supabase dashboard,
-- belum ada UI upgrade/downgrade atau payment gateway (lihat supabase/README.md).
-- Limit per tier disimpan di tabel config `tier_limits`, bukan hardcode di
-- trigger/kode aplikasi, supaya bisa diubah (mis. free 3 -> 5) tanpa migration
-- baru — cukup UPDATE baris di dashboard.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- tier_limits — tabel config, diedit manual dari Supabase dashboard.
-- max_groups NULL berarti tidak dibatasi (dipakai untuk premium).
-- -----------------------------------------------------------------------------
create table public.tier_limits (
  tier       text primary key,
  max_groups integer,

  constraint tier_limits_max_groups_positive
    check (max_groups is null or max_groups > 0)
);

comment on table public.tier_limits is
  'Config batas jumlah tabungan per tier. Diedit manual dari Supabase dashboard, bukan dari UI aplikasi.';
comment on column public.tier_limits.max_groups is
  'NULL = tidak dibatasi.';

insert into public.tier_limits (tier, max_groups) values
  ('free', 3),
  ('premium', null);

-- -----------------------------------------------------------------------------
-- profiles.tier
--
-- References tier_limits(tier) alih-alih check constraint terpisah, supaya
-- menambah tier baru (mis. 'enterprise') cukup insert baris baru di
-- tier_limits — tidak perlu migration untuk mengubah daftar tier yang valid.
-- Tidak ada policy UPDATE untuk profiles (lihat 20260728120200_rls.sql), jadi
-- kolom ini juga sengaja tidak bisa diubah user sendiri lewat REST API — hanya
-- lewat Supabase dashboard atau service_role.
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column tier text not null default 'free' references public.tier_limits (tier);

-- -----------------------------------------------------------------------------
-- groups: tolak INSERT kalau owner sudah mencapai batas tabungan tier-nya.
--
-- Pakai auth.uid() langsung (bukan new.owner_id) supaya trigger ini tidak
-- bergantung urutan eksekusi relatif terhadap groups_set_owner — keduanya
-- sama-sama BEFORE INSERT dan urutan trigger dengan nama berbeda tidak
-- dijamin selain alfabetis.
-- -----------------------------------------------------------------------------
create or replace function public.tg_groups_check_tier_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid           uuid    := auth.uid();
  v_max_groups    integer;
  v_current_count integer;
begin
  select tl.max_groups into v_max_groups
  from public.profiles p
  join public.tier_limits tl on tl.tier = p.tier
  where p.id = v_uid;

  -- NULL = tier ini tidak dibatasi (premium hari ini, tier lain di masa depan).
  if v_max_groups is null then
    return new;
  end if;

  select count(*) into v_current_count
  from public.groups
  where owner_id = v_uid
    and deleted_at is null;

  if v_current_count >= v_max_groups then
    -- Format terstruktur "KODE:angka" supaya application layer bisa menampilkan
    -- limit yang aktual (dari tier_limits, bukan hardcode) di pesan error/toast.
    raise exception 'FREE_TIER_LIMIT_REACHED:%', v_max_groups
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger groups_check_tier_limit
  before insert on public.groups
  for each row execute function public.tg_groups_check_tier_limit();

-- -----------------------------------------------------------------------------
-- RLS: tier_limits perlu terbaca authenticated supaya application layer bisa
-- menampilkan limit yang aktual sebelum submit. Tidak ada policy insert/update/
-- delete — perubahan config hanya lewat Supabase dashboard (service_role
-- melewati RLS).
-- -----------------------------------------------------------------------------
alter table public.tier_limits enable row level security;

create policy tier_limits_select_authenticated
  on public.tier_limits for select
  to authenticated
  using (true);
