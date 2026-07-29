-- =============================================================================
-- Withdrawal tidak boleh melebihi saldo pool saat ini
--
-- Menutup open question #2 di supabase/README.md: sebelum migrasi ini, saldo
-- pool bisa jadi minus karena tidak ada yang mencegah nominal penarikan lebih
-- besar dari saldo yang tersedia. Diputuskan: TIDAK boleh, di kedua jalur yang
-- bisa mengubah nominal withdrawal — insert baru dan edit nominal oleh owner.
-- =============================================================================

create or replace function public.tg_transactions_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid      uuid    := auth.uid();
  v_is_owner boolean;
  v_balance  numeric;
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

  -- Saldo pool = SUM(deposit verified) - SUM(withdrawal verified). Dihitung
  -- langsung dari transactions, bukan lewat view group_overview, supaya tidak
  -- bergantung pada RLS/security_invoker view saat dipanggil dari trigger.
  if new.type = 'withdrawal' then
    select coalesce(sum(amount) filter (where type = 'deposit'), 0)
         - coalesce(sum(amount) filter (where type = 'withdrawal'), 0)
      into v_balance
    from public.transactions
    where group_id = new.group_id
      and status = 'verified';

    if new.amount > v_balance then
      raise exception 'nominal penarikan (Rp%) melebihi saldo tersedia (Rp%)',
        new.amount, v_balance
        using errcode = '23514';
    end if;
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
  v_balance   numeric;
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
        and status = 'verified';

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
$$;
