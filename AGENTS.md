<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Aturan kerja di repo ini

## Jangan pernah commit atau push sendiri

Setelah membuat perubahan, berhenti di situ — jangan `git add`, `git commit`,
atau `git push`. User mau mengecek diff-nya dulu sebelum ada apa pun yang
tercatat di riwayat git. **Selesai mengerjakan sesuatu bukan berarti izin untuk
commit** — itu dua keputusan terpisah.

Selesaikan pekerjaan dengan working tree yang berubah tapi belum di-commit,
laporkan ringkas apa yang berubah, lalu tunggu diminta. Baru commit kalau user
eksplisit bilang ("commit", "commit changes"), dan baru push kalau eksplisit
diminta lagi setelah itu ("push", "git push") — dua permintaan terpisah,
kecuali user memang minta keduanya sekaligus dalam satu kalimat. Berlaku juga
untuk `git push --force`, push ke branch mana pun, dan pembuatan merge
request. Repo ini terhubung ke Vercel, jadi push ke `main` langsung memicu
deploy produksi.

`.claude/settings.json` juga menegakkannya lewat `permissions.ask` untuk
`git commit` dan `git push`, tapi jangan bergantung pada prompt itu — jangan
sampai perintahnya diketik sama sekali.

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

