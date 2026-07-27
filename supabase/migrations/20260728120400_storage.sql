-- =============================================================================
-- Nabung Bareng — Storage bucket untuk foto bukti
--
-- Bucket privat. Client upload dulu, dapat path-nya, baru insert transaksi
-- dengan proof_path itu. Untuk menampilkan, client minta signed URL.
--
-- Konvensi path (segmen pertama WAJIB group_id — policy bergantung padanya):
--   proofs/{group_id}/{user_id}/{uuid}.{ext}
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'proofs',
  'proofs',
  false,
  5 * 1024 * 1024,                                    -- 5 MB per file
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Member aktif boleh upload ke folder grupnya, di bawah folder namanya sendiri.
create policy proofs_insert_own_folder
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'proofs'
    and array_length(storage.foldername(name), 1) >= 2
    and public.is_group_member(public.safe_uuid((storage.foldername(name))[1]))
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Transparansi penuh: semua member aktif boleh melihat bukti siapa pun di grup.
create policy proofs_select_group_member
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'proofs'
    and array_length(storage.foldername(name), 1) >= 1
    and public.is_group_member(public.safe_uuid((storage.foldername(name))[1]))
  );

-- Bukti yang sudah tertaut ke transaksi tidak boleh ditimpa. Yang bisa dihapus
-- hanya file milik sendiri yang belum dipakai — misalnya user batal di tengah
-- form upload.
create policy proofs_delete_own_orphan
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'proofs'
    and array_length(storage.foldername(name), 1) >= 2
    and (storage.foldername(name))[2] = auth.uid()::text
    and not exists (
      select 1
      from public.transactions t
      where t.proof_path = storage.objects.name
    )
  );

-- Tidak ada policy UPDATE: file bukti immutable setelah diunggah.
