-- =============================================================================
-- Owner bisa mengedit bukti transfer transaksinya sendiri
--
-- Sebelum migrasi ini, proof_path masuk daftar kolom yang sama sekali tidak
-- boleh berubah setelah insert. Aturan bisnis baru: owner boleh mengganti foto
-- bukti pada transaksi yang DIA BUAT SENDIRI (deposit maupun withdrawal),
-- selama belum rejected — sama persis batasan yang sudah berlaku untuk edit
-- nominal (lihat constraint transactions_reject_needs_reason & blok "edit
-- nominal" di trigger). Member TIDAK dapat kemampuan ini: kalau uploadnya
-- salah, jalurnya tetap reject lalu upload ulang sebagai transaksi baru.
--
-- Perubahan ini sengaja dicatat sebagai baris baru di transaction_events
-- ("proof_edited"), bukan ditampilkan di tab History — itu permintaan
-- eksplisit: log audit, bukan bagian dari riwayat transaksi yang dilihat
-- member.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. transaction_events: kolom untuk mencatat before/after path + action baru
-- -----------------------------------------------------------------------------
alter table public.transaction_events
  add column proof_path_before text,
  add column proof_path_after  text;

comment on column public.transaction_events.proof_path_before is
  'Path bukti sebelum diedit. File lama sengaja TIDAK dihapus dari Storage saat '
  'diganti — inilah jejaknya kalau perlu ditelusuri.';

alter table public.transaction_events
  drop constraint transaction_events_action_check;

alter table public.transaction_events
  add constraint transaction_events_action_check
  check (action in (
    'created', 'approved', 'rejected', 'unapproved',
    'amount_edited', 'note_edited', 'proof_edited'
  ));

-- -----------------------------------------------------------------------------
-- 2. tg_transactions_guard_update: proof_path lepas dari daftar kolom beku,
--    dapat blok penjagaan sendiri (identik dengan blok edit nominal).
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
$$;

-- -----------------------------------------------------------------------------
-- 3. tg_transactions_log_event: catat proof_edited
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
$$;
