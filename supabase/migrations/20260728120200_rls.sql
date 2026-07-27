-- =============================================================================
-- Nabung Bareng — Row Level Security
--
-- Prinsip:
--   * Member aktif melihat SEMUA isi grupnya (transparansi penuh sesuai spec),
--     termasuk transaksi rejected dan kontribusi member lain.
--   * Aksi mutasi (approve/reject/withdraw/invite) dibatasi ke owner.
--   * Validasi detail per-kolom ditangani trigger di 20260728120100; policy di
--     sini hanya menentukan siapa yang boleh menyentuh baris mana.
-- =============================================================================

alter table public.profiles           enable row level security;
alter table public.groups             enable row level security;
alter table public.memberships        enable row level security;
alter table public.transactions       enable row level security;
alter table public.transaction_events enable row level security;
alter table public.invitations        enable row level security;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------

-- Profil sendiri selalu terbaca.
create policy profiles_select_self
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

-- Profil orang lain terbaca kalau ada grup yang sama-sama diikuti — UI butuh
-- nama & avatar untuk daftar member dan baris history.
create policy profiles_select_co_members
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1
      from public.memberships m
      where m.user_id = profiles.id
        and m.status  = 'active'
        and public.is_group_member(m.group_id)
    )
  );

-- Tidak ada policy UPDATE: profiles sepenuhnya dikelola trigger sinkronisasi
-- dari auth.users. Kalau user boleh mengedit display_name-nya sendiri, dia bisa
-- menyamar sebagai member lain di tab History — dan pemulihan otomatis tidak
-- bisa diandalkan, karena trigger sinkron hanya menyala saat raw_user_meta_data
-- atau email berubah, bukan setiap login. Fitur "ubah nama tampilan" butuh
-- kolom terpisah (mis. `nickname`) supaya tidak menimpa identitas dari Google.

-- -----------------------------------------------------------------------------
-- groups
-- -----------------------------------------------------------------------------

-- Klausa `owner_id = auth.uid()` bukan sekadar kelonggaran — tanpa itu
-- `insert(...).select()` GAGAL. Postgres mengevaluasi policy SELECT sebagai
-- WITH CHECK saat INSERT ... RETURNING, dan itu terjadi SEBELUM trigger AFTER
-- INSERT membuat baris membership owner, jadi is_group_member() masih false.
-- owner_id sudah terisi pada saat itu karena groups_set_owner adalah BEFORE trigger.
create policy groups_select_member
  on public.groups for select
  to authenticated
  using (public.is_group_member(id) or owner_id = auth.uid());

-- Siapa pun yang login boleh bikin tabungan; trigger groups_set_owner yang
-- menetapkan owner_id dari sesi.
create policy groups_insert_authenticated
  on public.groups for insert
  to authenticated
  with check (true);

create policy groups_update_owner
  on public.groups for update
  to authenticated
  using (public.is_group_owner(id))
  with check (public.is_group_owner(id));

-- Tidak ada policy DELETE untuk groups di v1, dan ini disengaja:
-- `groups -> transactions` pakai ON DELETE CASCADE, sementara trigger
-- transactions_block_delete menolak semua DELETE demi ledger append-only.
-- Dua hal itu bertabrakan — hapus grup akan selalu gagal dengan error yang
-- membingungkan. Hapus/arsip grup perlu keputusan desain sendiri
-- (lihat supabase/README.md).

-- -----------------------------------------------------------------------------
-- memberships
--
-- `is_group_member` sengaja SECURITY DEFINER supaya policy di tabel ini tidak
-- memicu rekursi saat mengevaluasi keanggotaan.
-- -----------------------------------------------------------------------------

create policy memberships_select_self
  on public.memberships for select
  to authenticated
  using (user_id = auth.uid());

create policy memberships_select_co_members
  on public.memberships for select
  to authenticated
  using (public.is_group_member(group_id));

-- Tidak ada policy INSERT: baris owner dibuat trigger, baris member dibuat
-- lewat RPC accept_invitation(). Keduanya SECURITY DEFINER.

-- Tidak ada policy DELETE untuk memberships di v1, juga disengaja: kalau baris
-- membership hilang, transaksinya tetap ada di ledger (dan tetap dihitung ke
-- saldo pool), tapi orangnya lenyap dari tab Member — total kontribusi yang
-- tampil jadi tidak cocok lagi dengan saldo. "Keluarkan member" / "keluar dari
-- grup" butuh keputusan tersendiri (lihat supabase/README.md).

-- -----------------------------------------------------------------------------
-- transactions
-- -----------------------------------------------------------------------------

-- Transparansi penuh: semua member melihat seluruh ledger grup.
create policy transactions_select_member
  on public.transactions for select
  to authenticated
  using (public.is_group_member(group_id));

-- Member aktif boleh mencatat transaksi; trigger transactions_before_insert
-- yang menentukan user_id, status, dan menolak withdrawal dari non-owner.
create policy transactions_insert_member
  on public.transactions for insert
  to authenticated
  with check (public.is_group_member(group_id));

-- Owner (untuk approve/reject/unapprove) atau pembuat transaksi (untuk edit
-- nominal/catatan). Batasan per-kolom ada di trigger transactions_guard_update.
create policy transactions_update_owner_or_author
  on public.transactions for update
  to authenticated
  using (public.is_group_owner(group_id) or user_id = auth.uid())
  with check (public.is_group_owner(group_id) or user_id = auth.uid());

-- Tidak ada policy DELETE: ledger append-only.

-- -----------------------------------------------------------------------------
-- transaction_events
-- -----------------------------------------------------------------------------

create policy transaction_events_select_member
  on public.transaction_events for select
  to authenticated
  using (
    exists (
      select 1
      from public.transactions t
      where t.id = transaction_events.transaction_id
        and public.is_group_member(t.group_id)
    )
  );

-- Tidak ada INSERT/UPDATE/DELETE: audit log hanya ditulis trigger.

-- -----------------------------------------------------------------------------
-- invitations
-- -----------------------------------------------------------------------------

-- Owner melihat undangan yang dia buat (untuk kelola/cabut link).
create policy invitations_select_owner
  on public.invitations for select
  to authenticated
  using (public.is_group_owner(group_id));

create policy invitations_insert_owner
  on public.invitations for insert
  to authenticated
  with check (public.is_group_owner(group_id));

-- Owner bisa mencabut link (set status = 'revoked').
create policy invitations_update_owner
  on public.invitations for update
  to authenticated
  using (public.is_group_owner(group_id))
  with check (public.is_group_owner(group_id));

-- Penerima undangan TIDAK diberi akses SELECT langsung ke tabel ini — kalau
-- diberi, token orang lain bisa dienumerasi. Preview & join lewat RPC
-- get_invitation_preview() / accept_invitation() yang mensyaratkan token.
