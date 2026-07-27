-- =============================================================================
-- Nabung Bareng — skema awal
-- Tabel, constraint, dan index. Function/trigger/RLS ada di migrasi berikutnya.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- profiles
-- auth.users tidak bisa dibaca dari client, tapi UI butuh nama & avatar untuk
-- daftar member dan baris history. Tabel ini mirror data publik dari Google
-- Sign-In, diisi otomatis oleh trigger di migrasi 20260728120100.
-- -----------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null,
  avatar_url    text,
  email         text,
  updated_at    timestamptz not null default now()
);

comment on table public.profiles is
  'Data publik user (nama, avatar) yang boleh dilihat sesama member grup.';

-- -----------------------------------------------------------------------------
-- groups — satu "tabungan" atau "kas"
-- -----------------------------------------------------------------------------
create table public.groups (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  type          text not null check (type in ('one_time', 'ongoing')),
  goal_amount   numeric(14, 2),
  goal_deadline date,
  owner_id      uuid not null references auth.users (id),
  created_at    timestamptz not null default now(),

  constraint groups_name_not_blank
    check (length(btrim(name)) between 1 and 80),

  -- goal_amount kalau diisi harus positif
  constraint groups_goal_amount_positive
    check (goal_amount is null or goal_amount > 0),

  -- tipe 'ongoing' (kas) tidak boleh punya target maupun deadline
  constraint groups_ongoing_has_no_goal
    check (
      type <> 'ongoing'
      or (goal_amount is null and goal_deadline is null)
    )

  -- Catatan: untuk tipe 'one_time', goal_amount dan goal_deadline sengaja
  -- opsional secara terpisah — mengisi tanggal tanpa nominal itu sah (misal
  -- tanggal keberangkatan sudah fix tapi budget belum), UI-nya cuma tidak
  -- menampilkan progress bar karena tidak ada pembaginya.
);

-- -----------------------------------------------------------------------------
-- memberships
-- Status 'invited' belum dipakai alur link v1 (join langsung jadi 'active');
-- disiapkan untuk undangan per-email di v2.
-- -----------------------------------------------------------------------------
create table public.memberships (
  group_id   uuid not null references public.groups (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null check (role in ('owner', 'member')),
  status     text not null check (status in ('invited', 'active')),
  joined_at  timestamptz,
  created_at timestamptz not null default now(),

  primary key (group_id, user_id),

  constraint memberships_active_has_joined_at
    check (status <> 'active' or joined_at is not null)
);

-- Kunci aturan "single owner per grup" di v1 langsung di level database.
create unique index memberships_one_owner_per_group
  on public.memberships (group_id)
  where role = 'owner';

-- Home: ambil semua grup milik satu user.
create index memberships_user_id_idx
  on public.memberships (user_id)
  where status = 'active';

-- -----------------------------------------------------------------------------
-- transactions — deposit & withdrawal dalam satu ledger
-- -----------------------------------------------------------------------------
create table public.transactions (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references public.groups (id) on delete cascade,
  user_id       uuid not null references auth.users (id),
  type          text not null check (type in ('deposit', 'withdrawal')),
  amount        numeric(14, 2) not null check (amount > 0),
  proof_path    text not null,
  note          text,
  status        text not null check (status in ('pending', 'verified', 'rejected')),
  reject_reason text,
  created_at    timestamptz not null default now(),
  -- Sengaja tanpa ON DELETE: `set null` akan melanggar constraint
  -- transactions_verified_fields_consistent, `cascade` akan menghapus baris
  -- ledger. Konsekuensinya user yang pernah bertransaksi tidak bisa dihapus
  -- dari auth.users — lihat catatan penghapusan akun di supabase/README.md.
  verified_by   uuid references auth.users (id),
  verified_at   timestamptz,

  constraint transactions_proof_not_blank
    check (length(btrim(proof_path)) > 0),

  -- Withdrawal wajib ada keterangan; deposit opsional.
  constraint transactions_withdrawal_needs_note
    check (type <> 'withdrawal' or length(btrim(coalesce(note, ''))) > 0),

  -- Reject wajib kasih alasan, dan alasan hanya relevan saat rejected.
  constraint transactions_reject_needs_reason
    check (
      case status
        when 'rejected' then length(btrim(coalesce(reject_reason, ''))) > 0
        else reject_reason is null
      end
    ),

  -- Withdrawal selalu auto-verified (cuma owner yang bisa melakukannya).
  constraint transactions_withdrawal_always_verified
    check (type <> 'withdrawal' or status = 'verified'),

  constraint transactions_verified_fields_consistent
    check (
      case status
        when 'verified' then verified_by is not null and verified_at is not null
        else true
      end
    )
);

comment on column public.transactions.proof_path is
  'Path objek di Storage bucket "proofs" (bukan URL publik) — bucket privat, '
  'client bikin signed URL saat mau menampilkan.';

-- History list: grup tertentu, terbaru dulu.
create index transactions_group_created_idx
  on public.transactions (group_id, created_at desc);

-- Rekap kontribusi per member.
create index transactions_group_user_verified_idx
  on public.transactions (group_id, user_id)
  where status = 'verified' and type = 'deposit';

-- Badge jumlah pending untuk owner.
create index transactions_group_pending_idx
  on public.transactions (group_id)
  where status = 'pending';

-- -----------------------------------------------------------------------------
-- transaction_events — audit log append-only
-- Menggantikan kolom `edited_from` di draft: satu kolom hanya menyimpan satu
-- nilai lama, jadi edit kedua menghapus jejak edit pertama, dan tidak mencatat
-- siapa/kapan. Tabel ini juga menampung riwayat approve / reject / unapprove.
-- -----------------------------------------------------------------------------
create table public.transaction_events (
  id             bigint generated always as identity primary key,
  transaction_id uuid not null references public.transactions (id) on delete cascade,
  actor_id       uuid not null references auth.users (id),
  action         text not null check (
                   action in ('created', 'approved', 'rejected', 'unapproved', 'amount_edited', 'note_edited')
                 ),
  amount_before  numeric(14, 2),
  amount_after   numeric(14, 2),
  reason         text,
  created_at     timestamptz not null default now()
);

create index transaction_events_transaction_idx
  on public.transaction_events (transaction_id, created_at);

-- -----------------------------------------------------------------------------
-- invitations — link undangan ke sebuah grup
--
-- CATATAN: sesuai draft skema, token bersifat SEKALI PAKAI (pending -> accepted).
-- Kalau owner mau share satu link ke grup WhatsApp dan beberapa orang join dari
-- link yang sama, model ini perlu diubah — lihat supabase/README.md.
-- -----------------------------------------------------------------------------
create table public.invitations (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.groups (id) on delete cascade,
  invited_by  uuid not null references auth.users (id),
  token       text not null unique default encode(gen_random_bytes(16), 'hex'),
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  expires_at  timestamptz not null default now() + interval '14 days',
  accepted_by uuid references auth.users (id),
  accepted_at timestamptz,
  created_at  timestamptz not null default now(),

  constraint invitations_accepted_fields_consistent
    check (
      case status
        when 'accepted' then accepted_by is not null and accepted_at is not null
        else accepted_by is null and accepted_at is null
      end
    )
);

create index invitations_group_idx
  on public.invitations (group_id, created_at desc);
