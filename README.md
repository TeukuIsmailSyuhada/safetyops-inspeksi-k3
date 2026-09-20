# SafetyOps Inspect

MVP aplikasi inspeksi alat K3 berbasis QR untuk mini hackathon. Aplikasi membantu inspektor mengidentifikasi alat, mengambil foto kondisi aktual, mengisi checklist, dan mencatat tindak lanjut.

## Fitur MVP

- Dashboard kondisi operasional dan tindak lanjut prioritas.
- Daftar alat dengan pencarian dan filter.
- Detail aset, identitas QR, kondisi, dan tindak lanjut.
- Login berbasis peran: **Inspector** membuat inspeksi; **Supervisor** menambah dan mengarsipkan aset serta menutup tindak lanjut.
- CRUD aman: aset baru dibuat oleh Supervisor dan otomatis memiliki QR unik; inspeksi bersifat append-only; aset tidak dihapus, melainkan diarsipkan.
- Scan QR mode demo.
- Dokumentasi wajib melalui kamera perangkat; tidak mendukung unggah dari galeri.
- Checklist APAR, catatan temuan, review, dan status berbasis aturan.
- Riwayat inspeksi serta rekap kondisi alat.

## Backend Supabase

Versi terintegrasi memakai Supabase untuk login, database, foto privat, dan data lintas perangkat.

1. Jalankan file SQL berurutan di folder [supabase](supabase/): `001_initial_schema.sql`, `003_inspection_automation.sql`, `004_asset_lifecycle.sql`, lalu `005_atomic_inspection_submit.sql`.
2. Pastikan provider **Email** aktif di Supabase Authentication.
3. Tambahkan URL aplikasi lokal dan domain Vercel ke **Authentication → URL Configuration** sebelum mendaftarkan akun pertama.

Publishable key Supabase dipakai di aplikasi browser dan aman hanya karena seluruh tabel serta Storage dilindungi Row Level Security. Jangan pernah menambahkan `service_role` atau database password ke aplikasi maupun GitHub.

## Peran saat login

- Pada layar **Masuk**, pengguna memilih mode `Inspector` atau `Supervisor`.
- Pilihan tersebut harus sesuai dengan role akun pada Supabase; pilihan di browser tidak dapat menaikkan hak akses.
- Akun baru selalu dibuat sebagai **Inspector**. Supervisor ditetapkan sekali lewat SQL pada profil akun yang sudah terdaftar.
- Inspector tidak melihat kontrol kelola aset atau tutup tindak lanjut. Kebijakan RLS tetap menjadi perlindungan utama bila ada upaya memanggil API secara langsung.

## Teknologi

- HTML5, CSS3, dan Vanilla JavaScript.
- Browser `MediaDevices/getUserMedia` untuk kamera.
- Supabase Auth, Postgres, dan Storage privat dengan Row Level Security untuk data lintas perangkat.
- Tanpa framework runtime: antarmuka memakai HTML, CSS, dan JavaScript murni.

## Menjalankan lokal

Karena ini aplikasi statis, jalankan melalui server lokal agar izin kamera dapat bekerja:

```bash
npx serve static
```

Lalu buka alamat yang ditampilkan, biasanya `http://localhost:3000`.

## Deploy ke Vercel

1. Impor repository ini di Vercel.
2. Konfigurasi `vercel.json` sudah mengarahkan Vercel ke folder `static`.
3. Tidak perlu menjalankan build command atau memasang dependency.
4. Setelah deploy, buka situs menggunakan HTTPS agar akses kamera diizinkan browser.

## Catatan penting

- Status alat ditentukan secara **rule-based dari checklist**, bukan dari AI atau analisis foto.
- Foto adalah bukti dokumentasi inspeksi.
- Detail aset menampilkan QR asli yang dapat diunduh. QR membuka deep link aset; scan memakai kamera bawaan HP adalah cara demo paling stabil.
- Jangan gunakan aplikasi ini sebagai pengganti SOP resmi atau keputusan profesional K3.

Panduan presentasi lengkap tersedia di [docs/PANDUAN_DEMO_SAFETYOPS_INSPECT.md](docs/PANDUAN_DEMO_SAFETYOPS_INSPECT.md).
Gunakan [docs/PRA_DEMO_CHECKLIST.md](docs/PRA_DEMO_CHECKLIST.md) sebelum demo untuk memverifikasi database, akun, dan alur inspeksi.
