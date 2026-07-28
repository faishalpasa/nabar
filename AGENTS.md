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

## Judul pull request / merge request

Judul PR/MR harus persis sama dengan nama branch sumbernya (mis. branch
`feature/happy-hour` → judul `feature/happy-hour`), berlaku ke branch target
manapun.

# Konvensi kode

Diadaptasi dari `.claude/` milik `reklub/member-dashboard`, disesuaikan ke
Next.js App Router + Supabase (project itu Vite + TanStack Router + axios —
arsitekturnya beda, jadi bukan sekadar disalin). Detail lengkap ada di
`.claude/rules/`; baris @import di bawah membuatnya termuat otomatis di setiap
sesi, bukan cuma tersimpan sebagai referensi yang harus dibuka manual.

@.claude/rules/tech-stack.md
@.claude/rules/architecture.md
@.claude/rules/folder-structure.md
@.claude/rules/conventions.md
@.claude/rules/code-standards.md
@.claude/rules/testing.md

Agent khusus (`bug-hunter`, `frontend-reviewer`, `refactorer`), skill
(`create-component`, `create-hook`, `create-page`), command
(`/project:new-page`, `/project:new-action`), template, dan catatan
keputusan/known-issues ada di `.claude/agents/`, `.claude/skills/`,
`.claude/commands/`, `.claude/templates/`, dan `.claude/memory/` —
tidak di-@import ke sini karena masing-masing dipakai sesuai konteksnya
sendiri (agent dipanggil eksplisit, memory diperbarui seiring waktu),
bukan dimuat penuh di setiap giliran.

