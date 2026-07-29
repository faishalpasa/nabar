-- =============================================================================
-- Naikkan batas ukuran bukti transfer dari 5 MB ke 25 MB.
--
-- Client sekarang mengompres foto (quality 0.5) sebelum upload, tapi validasi
-- ukuran di sisi client tetap dicek terhadap file ASLI (sebelum kompresi) —
-- limit bucket ini harus ikut naik supaya tidak menolak file yang sudah lolos
-- validasi client tapi belum sempat terkompresi cukup kecil.
-- =============================================================================

update storage.buckets
set file_size_limit = 25 * 1024 * 1024
where id = 'proofs';
