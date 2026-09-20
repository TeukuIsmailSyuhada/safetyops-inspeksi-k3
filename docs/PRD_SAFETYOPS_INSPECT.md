# PRD — SafetyOps Inspect

## 1. Ringkasan produk

SafetyOps Inspect adalah MVP web untuk inspeksi alat K3 berbasis QR pada mini hackathon dua hari. Petugas menemukan aset melalui QR, mengambil foto kondisi memakai kamera perangkat, mengisi checklist, lalu menyimpan hasil inspeksi dan tindak lanjut ke Supabase.

Objek demo: **APAR**, **helm safety**, dan **sepatu safety**.

## 2. Masalah yang diselesaikan

- Identitas alat K3 dan riwayat pemeriksaan sulit ditelusuri di lapangan.
- Bukti foto, checklist, dan tindak lanjut sering tersebar atau tidak terdokumentasi konsisten.
- Supervisor membutuhkan ringkasan kondisi aset dan temuan prioritas.

## 3. Sasaran MVP

1. Membuktikan alur inspeksi end-to-end dari QR sampai hasil tersimpan.
2. Menunjukkan pembatasan akses antara Inspector dan Supervisor.
3. Menjaga data inspeksi dan foto dapat dibuka dari perangkat lain setelah login.

## 4. Peran pengguna

| Peran | Hak akses |
| --- | --- |
| Inspector | Melihat aset/QR/riwayat, scan QR, mengambil foto, mengisi checklist, dan membuat inspeksi baru. |
| Supervisor | Semua kemampuan baca Inspector, menambah aset, mengunduh QR, mengarsipkan aset, dan menyelesaikan tindak lanjut. |

Aturan keamanan: akun baru selalu berperan sebagai **Inspector**. Pilihan role di layar masuk hanya memverifikasi mode masuk dan **tidak boleh** menaikkan hak akses. Role asli berasal dari `public.profiles.role` di Supabase.

## 5. Ruang lingkup fitur

### A. Login

- Landing page login email + password memakai Supabase Auth.
- Daftar akun, verifikasi email, masuk, dan keluar.
- Mode login Inspector/Supervisor harus sesuai role database.
- Tidak memakai Google OAuth untuk menjaga MVP tetap sederhana.

### B. CRUD aman

- **Create:** Supervisor menambahkan APAR/helm/sepatu. Database membuat `qr_token` unik; aplikasi menampilkan dan mengunduh QR PNG.
- **Read:** Semua pengguna login melihat aset, kondisi, riwayat, dan tindak lanjut.
- **Update:** Inspector menambah record inspeksi baru (append-only). Supervisor memperbarui/menutup tindak lanjut dan mengarsipkan aset.
- **Delete:** Tidak ada hapus inspeksi. Aset tidak dihapus permanen; gunakan `is_archived` dan `archived_at`.

### C. Alur inspeksi

1. Scan QR atau pilih aset.
2. Ambil foto kondisi lewat kamera perangkat.
3. Isi checklist sesuai tipe aset.
4. Review hasil.
5. Simpan inspeksi, jawaban checklist, foto, dan tindak lanjut bila ada temuan.
6. Database menghitung pembaruan kondisi aset dari hasil inspeksi.

## 6. Aturan bisnis yang sudah dikunci

- Foto **wajib** dan diambil langsung dari kamera perangkat; foto hanya dokumentasi, bukan unggahan galeri atau analisis AI.
- Status kondisi alat ditentukan **rule-based dari checklist**, bukan AI atau analisis foto.
- Aturan kondisi: seluruh jawaban lulus = `Baik`; observasi minor/jatuh tempo mendekat = `Perlu Perhatian`; komponen tidak terpasang = `Perlu Perbaikan`; kerusakan, tekanan tidak normal, akses tidak tersedia, atau masa berlaku lewat = `Tidak Layak Digunakan`.
- QR mewakili aset dan membuka deep link aset di aplikasi.
- Tombol manajemen pada Inspector tampil abu-abu/nonaktif sebagai penanda akses, tetapi keamanan sebenarnya tetap ditegakkan oleh Supabase RLS.
- Jangan menaruh `service_role`, database password, atau secret lain di browser/GitHub.

## 7. Non-goals MVP

- Login Google/OAuth.
- Role teknisi terpisah di UI.
- AI computer vision untuk menilai kondisi alat.
- Hard delete aset/inspeksi.
- Workflow penugasan atau approval yang kompleks.

## 8. Kriteria demo berhasil

1. Login Supervisor → tambah aset atau tunjukkan tombol manajemen aktif.
2. Download QR dan gunakan pada objek 3D/PPT.
3. Login Inspector → tombol manajemen berwarna abu-abu/nonaktif.
4. Inspector scan QR → foto kamera → checklist → submit.
5. Supervisor kembali masuk → melihat riwayat/temuan dan menutup tindak lanjut.
