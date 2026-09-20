# Setup Supabase SafetyOps Inspect

## Langkah yang dilakukan di dashboard Supabase

1. Buka **SQL Editor** pada project `safetyops-inspect`.
2. Buat query baru.
3. Salin seluruh isi file [001_initial_schema.sql](001_initial_schema.sql), lalu klik **Run** sekali.
   - Jika muncul error `operator does not exist: text = uuid`, jangan jalankan ulang file pertama. Jalankan file [002_finish_storage_and_seed.sql](002_finish_storage_and_seed.sql) sekali untuk menyelesaikan bagian Storage dan data demo.
4. Setelah 001 berhasil, jalankan [003_inspection_automation.sql](003_inspection_automation.sql) sekali agar hasil inspeksi otomatis memperbarui kondisi alat.
5. Jalankan [004_asset_lifecycle.sql](004_asset_lifecycle.sql) sekali agar fitur arsip aset aktif dan browser tidak dapat menghapus aset permanen.
5. Buka **Authentication → Providers → Email** dan pastikan Email aktif.
6. Buka **Authentication → URL Configuration**.
   - Tambahkan URL lokal: `http://127.0.0.1:4173`
   - Setelah Vercel selesai, tambahkan URL produksi Vercel, misalnya `https://nama-project.vercel.app`.
6. Login satu kali ke aplikasi nanti menggunakan email kamu.
7. Jalankan perintah `update public.profiles ...` yang ada di bagian akhir file SQL untuk menjadikan akun kamu sebagai `supervisor`.

## Aturan keamanan yang dipasang

- Setiap tabel mengaktifkan Row Level Security (RLS).
- Pengguna harus login untuk melihat data aset dan inspeksi.
- Inspector hanya dapat membuat inspeksi atas akun sendiri.
- Hanya supervisor/teknisi yang dapat mengubah aset dan tindak lanjut.
- Foto berada di bucket Storage privat `inspection-evidence`.
- Jangan memasukkan Database Password, `service_role`, atau Secret Key ke GitHub, browser, maupun chat.

## Konfigurasi aplikasi nanti

Nilai yang dipakai aplikasi browser hanya:

```text
SUPABASE_URL=https://qrxmrvfuveoioxqtylbt.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Publishable key dirancang untuk dipakai aplikasi browser. Keamanannya bergantung pada RLS. `service_role` adalah secret server dan tidak boleh dimasukkan ke frontend.
