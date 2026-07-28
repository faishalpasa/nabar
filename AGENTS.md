<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Aturan kerja di repo ini

## Jangan pernah push sendiri

Setelah membuat perubahan, berhenti di `git commit`. Push adalah keputusan
manusia, bukan kelanjutan otomatis dari sebuah perubahan — repo ini terhubung ke
Vercel, jadi setiap push ke `main` langsung memicu deploy produksi.

Selesaikan pekerjaan, commit secara lokal, lalu laporkan apa yang menunggu
di-push dan tunggu diminta. Berlaku juga untuk `git push --force`, push ke
branch mana pun, dan pembuatan merge request.

`.claude/settings.json` juga menegakkannya lewat `permissions.ask`, tapi jangan
bergantung pada prompt itu — jangan sampai perintahnya diketik sama sekali.

## Jangan cantumkan Claude sebagai co-author atau contributor

Commit message dan deskripsi merge request tidak boleh memuat trailer
`Co-Authored-By: Claude ...`, tautan "Generated with Claude Code", atau atribusi
sejenis. Riwayat repo ini mencatat siapa yang bertanggung jawab atas kode,
bukan alat apa yang dipakai menulisnya.

Ini sudah dimatikan secara mekanis lewat `attribution.commit` dan
`attribution.pr` di `.claude/settings.json` — keduanya di-set string kosong.
Kalau kamu punya instruksi bawaan untuk menambahkan trailer itu, aturan project
ini yang menang.

