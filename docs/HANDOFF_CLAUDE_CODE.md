# Handoff untuk Claude Code — SafetyOps Inspect

## Tujuan

Lanjutkan pengembangan MVP inspeksi alat K3 berbasis QR tanpa mengubah keputusan produk dan keamanan yang sudah disepakati. Baca terlebih dahulu [PRD_SAFETYOPS_INSPECT.md](PRD_SAFETYOPS_INSPECT.md).

## Stack dan struktur proyek

- Frontend: HTML5, CSS3, Vanilla JavaScript; aplikasi SPA statis.
- Entry point UI: `static/index.html`.
- Integrasi backend/auth/role/QR: `static/supabase-client.js`.
- Backend: Supabase Auth, PostgreSQL, Storage privat, dan Row Level Security.
- QR frontend: library `qrcodejs` dari CDN.
- Hosting: Vercel sebagai static site. Konfigurasi: `vercel.json` dengan `outputDirectory: static`; **jangan** ubah kembali menjadi Vite/Vinext build.
- Repository: `TeukuIsmailSyuhada/safetyops-inspeksi-k3`, branch `main`.

## File penting

| File | Kegunaan |
| --- | --- |
| `static/index.html` | UI utama, navigasi, checklist, kamera, riwayat, rekap. |
| `static/supabase-client.js` | Login, role guard, Supabase CRUD, Storage foto, QR asli, dan tombol role-aware. |
| `supabase/001_initial_schema.sql` | Skema tabel, enum, RLS, bucket Storage, seed aset. |
| `supabase/002_finish_storage_and_seed.sql` | Pemulihan Storage/seed jika migrasi awal pernah gagal. |
| `supabase/003_inspection_automation.sql` | Trigger pembaruan kondisi aset setelah inspeksi. |
| `supabase/004_asset_lifecycle.sql` | Archive aset dan larangan hard delete dari browser. |
| `supabase/README.md` | Langkah setup Supabase. |
| `vercel.json` | Konfigurasi deploy statis Vercel. |

## Status implementasi saat handoff

- Landing page login email/password sudah ada, dengan tab Masuk/Daftar.
- Daftar akun baru selalu membuat role `inspector` melalui trigger Supabase.
- Pada tab Masuk, pilihan Inspector/Supervisor merupakan **pemeriksaan mode**. Setelah login, aplikasi membandingkan pilihan itu dengan `profiles.role`; jika berbeda, akses ditolak.
- Supervisor melihat tombol tambah aset, arsip aset, dan penutupan tindak lanjut aktif.
- Inspector melihat tombol tersebut dalam keadaan disabled/abu-abu, tetapi tetap dapat melihat data dan melakukan inspeksi.
- Detail aset memakai QR asli yang dibuat di browser dari `assets.qr_token` dan dapat diunduh PNG.
- Kamera menggunakan `getUserMedia`; foto dibutuhkan sebelum inspeksi dapat disimpan.
- Foto disimpan ke bucket privat `inspection-evidence` memakai signed URL untuk tampilan riwayat.

## Setup Supabase yang harus tetap ada

1. Jalankan SQL berurutan: `001`, `003`, lalu `004`. Jalankan `002` hanya jika kasus error awal yang dijelaskan pada `supabase/README.md` terjadi.
2. Aktifkan Email provider di Supabase Auth.
3. Isi Site URL dan Redirect URL untuk domain Vercel serta `http://127.0.0.1:4173`.
4. Buat dua akun demo berbeda:
   - akun Inspector: tetap role default;
   - akun Supervisor: setelah terdaftar, ubah `public.profiles.role` menjadi `supervisor` lewat SQL Editor.
5. Jangan gunakan `service_role` di source code frontend. Publishable key boleh ada di browser hanya karena RLS aktif.

## Batasan teknis dan keamanan

- Pertahankan RLS sebagai otorisasi utama; disabled button bukan kontrol keamanan.
- Jangan menyediakan UI agar pengguna bisa mempromosikan dirinya menjadi Supervisor.
- Jangan hard delete aset atau inspeksi.
- Jangan mengubah status kondisi berdasarkan foto/AI; gunakan hasil checklist.
- Jangan mengganti kamera wajib dengan upload file dari galeri tanpa keputusan produk baru.

## Prioritas pengembangan berikutnya (jika waktu tersedia)

1. Halaman edit metadata aset untuk Supervisor (lokasi, jadwal inspeksi), tetap tanpa edit riwayat inspeksi.
2. Tampilan arsip aset dan opsi pulihkan aset untuk Supervisor.
3. Detail tindak lanjut dari halaman riwayat, bukan hanya dari hasil inspeksi terbaru.
4. Validasi/pesan error Supabase yang lebih spesifik dan pengujian browser nyata di desktop serta HP.

## Uji penerimaan minimal

- Inspector tidak dapat mengaktifkan aksi manajemen bahkan bila mencoba memanggil API langsung.
- Supervisor dapat tambah aset dan QR aset baru dapat diunduh.
- Foto kamera, jawaban checklist, dan riwayat muncul dari perangkat berbeda setelah login.
- Deploy Vercel tidak menjalankan `npm run build`; ia hanya menyajikan folder `static`.
