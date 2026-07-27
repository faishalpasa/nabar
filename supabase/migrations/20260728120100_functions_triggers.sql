-- =============================================================================
-- Nabung Bareng — helper function, trigger penegak business rule, dan RPC
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper keanggotaan
--
-- SECURITY DEFINER dipakai supaya function ini membaca `memberships` tanpa
-- melewati RLS. Tanpa itu, policy di `memberships` yang memanggil helper ini
-- akan memicu rekursi infinite ("infinite recursion detected in policy").
-- -----------------------------------------------------------------------------
create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.memberships m
    where m.group_id = p_group_id
      and m.user_id  = auth.uid()
      and m.status   = 'active'
  );
$$;

create or replace function public.is_group_owner(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.memberships m
    where m.group_id = p_group_id
      and m.user_id  = auth.uid()
      and m.role     = 'owner'
      and m.status   = 'active'
  );
$$;

-- Cast aman untuk segmen path Storage: nama folder yang bukan UUID valid
-- menghasilkan null (yang bikin is_group_member() mengembalikan false) alih-alih
-- melempar error dan menggagalkan evaluasi policy.
create or replace function public.safe_uuid(p_text text)
returns uuid
language plpgsql
immutable
set search_path = pg_temp
as $$
begin
  return p_text::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

revoke execute on function public.is_group_member(uuid) from public;
revoke execute on function public.is_group_owner(uuid)  from public;
grant   execute on function public.is_group_member(uuid) to authenticated;
grant   execute on function public.is_group_owner(uuid)  to authenticated;
grant   execute on function public.safe_uuid(text)       to authenticated;

-- -----------------------------------------------------------------------------
-- profiles: isi otomatis dari metadata Google Sign-In
-- -----------------------------------------------------------------------------
create or replace function public.tg_sync_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, display_name, avatar_url, email, updated_at)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      split_part(coalesce(new.email, 'Pengguna'), '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    ),
    new.email,
    now()
  )
  on conflict (id) do update
    set display_name = excluded.display_name,
        avatar_url   = excluded.avatar_url,
        email        = excluded.email,
        updated_at   = now();

  return new;
end;
$$;

create trigger sync_profile_on_auth_user_change
  after insert or update of raw_user_meta_data, email on auth.users
  for each row execute function public.tg_sync_profile_from_auth();

-- Backfill user yang sudah ada sebelum trigger ini dipasang. Tanpa ini, user
-- lama tidak punya baris profiles, dan karena view menampilkan nama lewat join
-- ke profiles, transaksi mereka bisa hilang dari tab History padahal tetap
-- dihitung ke saldo pool.
insert into public.profiles (id, display_name, avatar_url, email)
select
  u.id,
  coalesce(
    nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
    split_part(coalesce(u.email, 'Pengguna'), '@', 1)
  ),
  coalesce(
    u.raw_user_meta_data ->> 'avatar_url',
    u.raw_user_meta_data ->> 'picture'
  ),
  u.email
from auth.users u
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- groups: pembuat otomatis jadi owner + membership aktif
-- -----------------------------------------------------------------------------
create or replace function public.tg_groups_set_owner()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- owner_id selalu diambil dari sesi, bukan dari payload client
  new.owner_id := auth.uid();

  if new.owner_id is null then
    raise exception 'harus login untuk membuat tabungan'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger groups_set_owner
  before insert on public.groups
  for each row execute function public.tg_groups_set_owner();

create or replace function public.tg_groups_create_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.memberships (group_id, user_id, role, status, joined_at)
  values (new.id, new.owner_id, 'owner', 'active', now());

  return new;
end;
$$;

create trigger groups_create_owner_membership
  after insert on public.groups
  for each row execute function public.tg_groups_create_owner_membership();

-- Owner tidak bisa dipindah di v1 (single owner, belum ada transfer ownership).
create or replace function public.tg_groups_guard_update()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.owner_id <> old.owner_id then
    raise exception 'transfer ownership belum didukung'
      using errcode = '42501';
  end if;

  if new.type <> old.type then
    raise exception 'tipe tabungan tidak bisa diubah setelah dibuat'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger groups_guard_update
  before update on public.groups
  for each row execute function public.tg_groups_guard_update();

-- -----------------------------------------------------------------------------
-- transactions: INSERT
--
-- Status & field verifikasi ditentukan server, bukan client:
--   deposit oleh owner   -> verified   (auto-verified)
--   deposit oleh member  -> pending    (nunggu approval owner)
--   withdrawal           -> verified, dan hanya owner yang boleh
-- -----------------------------------------------------------------------------
create or replace function public.tg_transactions_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid      uuid    := auth.uid();
  v_is_owner boolean;
begin
  if v_uid is null then
    raise exception 'harus login untuk mencatat transaksi'
      using errcode = '42501';
  end if;

  -- Selalu ditentukan server, bukan payload client. Tanpa ini, PostgREST
  -- meneruskan created_at kiriman client dan member bisa memalsukan urutan
  -- History (default `now()` hanya berlaku kalau kolomnya tidak dikirim).
  new.user_id    := v_uid;
  new.created_at := now();

  -- Bukti harus file yang diunggah sendiri, di folder grup ini. Tanpa cek ini
  -- member bisa mencantumkan path bukti transfer member lain (dia punya akses
  -- baca ke seluruh folder grup) dan mengklaimnya sebagai setoran sendiri.
  if new.proof_path not like new.group_id::text || '/' || v_uid::text || '/%' then
    raise exception 'proof_path harus berada di folder grup dan user sendiri'
      using errcode = '42501';
  end if;

  if not public.is_group_member(new.group_id) then
    raise exception 'bukan member aktif dari tabungan ini'
      using errcode = '42501';
  end if;

  v_is_owner := public.is_group_owner(new.group_id);

  if new.type = 'withdrawal' and not v_is_owner then
    raise exception 'hanya owner yang bisa menarik dana'
      using errcode = '42501';
  end if;

  new.reject_reason := null;

  if new.type = 'withdrawal' or v_is_owner then
    new.status      := 'verified';
    new.verified_by := v_uid;
    new.verified_at := now();
  else
    new.status      := 'pending';
    new.verified_by := null;
    new.verified_at := null;
  end if;

  return new;
end;
$$;

create trigger transactions_before_insert
  before insert on public.transactions
  for each row execute function public.tg_transactions_before_insert();

-- -----------------------------------------------------------------------------
-- transactions: UPDATE
--
-- Transisi status yang diizinkan (owner saja):
--   pending  -> verified   approve
--   pending  -> rejected   reject       (wajib alasan)
--   verified -> rejected   unapprove    (wajib alasan)
-- `rejected` bersifat final — member upload ulang sebagai transaksi baru.
--
-- Edit nominal: hanya oleh pemilik transaksi, dan sesuai spec v1 pemilik itu
-- harus owner grup. Tidak boleh pada transaksi yang sudah rejected.
-- -----------------------------------------------------------------------------
create or replace function public.tg_transactions_guard_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid       uuid    := auth.uid();
  v_is_owner  boolean := public.is_group_owner(old.group_id);
  v_is_author boolean := (old.user_id = v_uid);
begin
  if v_uid is null then
    raise exception 'harus login' using errcode = '42501';
  end if;

  -- Kolom yang tidak boleh berubah sama sekali.
  if new.id         <> old.id
     or new.group_id   <> old.group_id
     or new.user_id    <> old.user_id
     or new.type       <> old.type
     or new.created_at <> old.created_at
     or new.proof_path <> old.proof_path
  then
    raise exception 'kolom id, group_id, user_id, type, created_at, dan proof_path tidak bisa diubah'
      using errcode = '42501';
  end if;

  -- Field verifikasi hanya boleh bergerak bersama perubahan status, dan nilainya
  -- ditetapkan di blok di bawah. Tanpa penjagaan ini, member bisa mengirim
  -- PATCH { verified_at, verified_by } ke setorannya sendiri yang masih pending
  -- dan barisnya akan tampil seolah sudah di-approve — tanpa jejak di
  -- transaction_events, karena log hanya mencatat delta status/amount/note.
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
  end if;

  -- ---- edit catatan -----------------------------------------------------
  if new.note is distinct from old.note and not v_is_author then
    raise exception 'catatan hanya bisa diubah oleh pembuat transaksi'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger transactions_guard_update
  before update on public.transactions
  for each row execute function public.tg_transactions_guard_update();

-- Ledger bersifat append-only: koreksi lewat unapprove/reject, bukan DELETE.
create or replace function public.tg_transactions_block_delete()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'transaksi tidak bisa dihapus — gunakan unapprove/reject'
    using errcode = '42501';
end;
$$;

create trigger transactions_block_delete
  before delete on public.transactions
  for each row execute function public.tg_transactions_block_delete();

-- -----------------------------------------------------------------------------
-- transaction_events: audit log otomatis
-- -----------------------------------------------------------------------------
create or replace function public.tg_transactions_log_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := coalesce(auth.uid(), new.user_id);
begin
  if tg_op = 'INSERT' then
    insert into public.transaction_events (transaction_id, actor_id, action, amount_after)
    values (new.id, v_uid, 'created', new.amount);
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

  if new.note is distinct from old.note then
    insert into public.transaction_events (transaction_id, actor_id, action)
    values (new.id, v_uid, 'note_edited');
  end if;

  return new;
end;
$$;

create trigger transactions_log_event
  after insert or update on public.transactions
  for each row execute function public.tg_transactions_log_event();

-- -----------------------------------------------------------------------------
-- invitations
-- -----------------------------------------------------------------------------
create or replace function public.tg_invitations_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.invited_by  := auth.uid();
  new.status      := 'pending';
  new.accepted_by := null;
  new.accepted_at := null;

  if not public.is_group_owner(new.group_id) then
    raise exception 'hanya owner yang bisa mengundang member'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger invitations_before_insert
  before insert on public.invitations
  for each row execute function public.tg_invitations_before_insert();

-- Satu-satunya perubahan yang boleh dilakukan owner pada undangan adalah
-- mencabutnya. Tanpa penjagaan ini, policy UPDATE owner cukup untuk
-- mengembalikan status 'accepted' -> 'pending' (membuat token sekali-pakai jadi
-- bisa dipakai berulang), mengganti token dengan nilai yang mudah ditebak, atau
-- memperpanjang expires_at sesukanya.
create or replace function public.tg_invitations_guard_update()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  -- Ditandai oleh accept_invitation() supaya transisi 'accepted' hanya mungkin
  -- lewat RPC itu, bukan lewat PATCH langsung ke tabel.
  v_accepting boolean :=
    coalesce(current_setting('nabar.accepting_invitation', true), 'off') = 'on';
begin
  -- Tidak pernah boleh berubah, lewat jalur mana pun.
  if new.id         <> old.id
     or new.group_id   <> old.group_id
     or new.invited_by <> old.invited_by
     or new.token      <> old.token
     or new.expires_at <> old.expires_at
     or new.created_at <> old.created_at
  then
    raise exception 'kolom identitas undangan tidak bisa diubah'
      using errcode = '42501';
  end if;

  if v_accepting then
    if not (old.status = 'pending' and new.status = 'accepted'
            and new.accepted_by is not null
            and new.accepted_at is not null) then
      raise exception 'transisi undangan tidak valid'
        using errcode = '42501';
    end if;

    return new;
  end if;

  -- Jalur owner: satu-satunya aksi yang diizinkan adalah mencabut.
  if new.accepted_by is distinct from old.accepted_by
     or new.accepted_at is distinct from old.accepted_at
     or (new.status is distinct from old.status
         and not (old.status = 'pending' and new.status = 'revoked'))
  then
    raise exception 'undangan hanya bisa dicabut (status pending -> revoked)'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger invitations_guard_update
  before update on public.invitations
  for each row execute function public.tg_invitations_guard_update();

-- -----------------------------------------------------------------------------
-- RPC: preview undangan
--
-- Dipakai di layar 7a/7b. Pemanggil belum jadi member, jadi RLS `groups` masih
-- menutup datanya. Function ini SECURITY DEFINER supaya bisa membuka informasi
-- minimum yang perlu ditampilkan di dialog konfirmasi — dan hanya kalau
-- pemanggil memegang token yang benar.
-- -----------------------------------------------------------------------------
-- Mengembalikan satu objek jsonb, bukan `returns table`: PostgREST
-- menyerialisasi function yang mengembalikan tabel sebagai ARRAY, sehingga
-- client harus menulis `data[0].state`. Objek tunggal membuat kontraknya
-- `data.state` seperti yang diharapkan.
--
-- Token tidak ditemukan juga dikembalikan sebagai state, bukan exception —
-- link yang salah ketik/terpotong adalah kasus paling umum, dan layar 7b perlu
-- menampilkan pesan yang ramah, bukan HTTP 404.
create or replace function public.get_invitation_preview(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_inv   public.invitations;
  v_group public.groups;
  v_state text;
begin
  select * into v_inv from public.invitations i where i.token = p_token;

  if not found then
    return jsonb_build_object('state', 'not_found');
  end if;

  select * into v_group from public.groups g where g.id = v_inv.group_id;

  v_state := case
    when auth.uid() is not null and exists (
      select 1 from public.memberships m
      where m.group_id = v_inv.group_id
        and m.user_id  = auth.uid()
        and m.status   = 'active'
    )                              then 'already_member'
    when v_inv.status = 'revoked'  then 'revoked'
    when v_inv.status = 'accepted' then 'used'
    when v_inv.expires_at <= now() then 'expired'
    else 'ok'
  end;

  return jsonb_build_object(
    'state',           v_state,
    'group_id',        v_group.id,
    'group_name',      v_group.name,
    'group_type',      v_group.type,
    'goal_amount',     v_group.goal_amount,
    'goal_deadline',   v_group.goal_deadline,
    'invited_by_name', (select p.display_name from public.profiles p where p.id = v_inv.invited_by)
  );
end;
$$;

-- Bisa dipanggil sebelum login (layar 7b menampilkan nama grup & pengundang
-- di atas tombol "Daftar dengan Google").
grant execute on function public.get_invitation_preview(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- RPC: terima undangan
-- -----------------------------------------------------------------------------
create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_inv public.invitations;
begin
  if v_uid is null then
    raise exception 'harus login untuk bergabung' using errcode = '42501';
  end if;

  -- Lock barisnya supaya dua orang tidak bisa menukar token sekali-pakai
  -- yang sama secara bersamaan.
  select * into v_inv
  from public.invitations i
  where i.token = p_token
  for update;

  if not found then
    raise exception 'undangan tidak ditemukan' using errcode = 'P0002';
  end if;

  -- Sudah jadi member: idempotent, tinggal kembalikan grupnya.
  if exists (
    select 1 from public.memberships m
    where m.group_id = v_inv.group_id
      and m.user_id  = v_uid
      and m.status   = 'active'
  ) then
    return v_inv.group_id;
  end if;

  if v_inv.status = 'revoked' then
    raise exception 'undangan sudah dibatalkan' using errcode = '42501';
  end if;

  if v_inv.status = 'accepted' then
    raise exception 'undangan sudah dipakai' using errcode = '42501';
  end if;

  if v_inv.expires_at <= now() then
    raise exception 'undangan sudah kedaluwarsa' using errcode = '42501';
  end if;

  insert into public.memberships (group_id, user_id, role, status, joined_at)
  values (v_inv.group_id, v_uid, 'member', 'active', now())
  on conflict (group_id, user_id) do update
    set status    = 'active',
        joined_at = coalesce(memberships.joined_at, now());

  -- Buka gerbang di tg_invitations_guard_update untuk transaksi ini saja
  -- (parameter ketiga `true` = transaction-local).
  perform set_config('nabar.accepting_invitation', 'on', true);

  update public.invitations
     set status      = 'accepted',
         accepted_by = v_uid,
         accepted_at = now()
   where id = v_inv.id;

  perform set_config('nabar.accepting_invitation', 'off', true);

  return v_inv.group_id;
end;
$$;

grant execute on function public.accept_invitation(text) to authenticated;
