# Panduan Pemahaman dan Presentasi - SafetyOps Inspect

Dokumen ini adalah bahan belajar dan naskah pendamping demo. Gunakan penjelasan di sini agar presentasi sesuai dengan fitur yang benar-benar ada pada aplikasi.

## 1. Identitas produk

**Nama produk:** SafetyOps Inspect

**Penyebutan yang disarankan:**

> SafetyOps Inspect adalah **MVP aplikasi web inspeksi alat K3 berbasis QR** yang membantu petugas mendokumentasikan kondisi alat, mengisi checklist, dan menghasilkan rekomendasi tindak lanjut berbasis aturan.

### Arti istilah

| Istilah | Arti sederhana |
| --- | --- |
| Aplikasi web | Aplikasi yang dibuka dengan browser di laptop atau HP, tanpa instalasi dari Play Store. |
| MVP | Minimum Viable Product: versi produk paling kecil yang sudah cukup membuktikan solusi inti. |
| K3 | Keselamatan dan Kesehatan Kerja. |
| Aset K3 | Alat keselamatan yang diperiksa, seperti APAR, helm safety, sepatu safety, dan Arc Flash Suit. |
| QR aset | Kode QR unik yang mewakili satu aset dan membuka detail aset yang tepat. |
| Checklist | Daftar poin pemeriksaan agar cara menilai alat lebih konsisten. |
| Temuan | Kondisi pada alat yang tidak memenuhi standar checklist. |
| Tindak lanjut | Pekerjaan yang perlu ditangani setelah ada temuan; bukan perbaikan otomatis oleh aplikasi. |
| Jejak audit | Riwayat siapa melakukan tindakan, apa hasilnya, dan kapan dilakukan. |

## 2. Masalah dan solusi

Di lapangan, identitas alat K3 dapat sulit ditemukan, bukti inspeksi tidak rapi, dan temuan bisa terlupa sebelum diperbaiki. Supervisor akhirnya sulit mengetahui alat mana yang aman atau prioritas.

SafetyOps Inspect menyatukan identitas aset, foto kondisi, checklist, riwayat, dan tindak lanjut dalam satu alur:

    QR aset -> detail aset -> foto kamera -> checklist -> status kondisi
           -> riwayat inspeksi + tindak lanjut jika ada temuan

Nilai utama yang dibuktikan MVP:

1. **Identitas tepat:** QR membantu petugas membuka aset yang benar.
2. **Bukti lebih rapi:** foto dan waktu pengambilan disimpan bersama inspeksi.
3. **Penilaian konsisten:** status dihitung dari jawaban checklist.
4. **Temuan tidak hilang:** masalah membuat tindak lanjut terbuka.
5. **Data lintas perangkat:** data ada di Supabase, tidak hanya di satu laptop.

## 3. Peran pengguna

| Aktivitas | Inspector | Supervisor |
| --- | --- | --- |
| Melihat dashboard, aset, QR, riwayat, dan rekap | Ya | Ya |
| Memulai dan menyimpan inspeksi | Ya | Ya, untuk verifikasi/kebutuhan operasional |
| Mengambil foto dan mengisi checklist | Ya | Ya |
| Menambah aset dan membuat QR | Tidak; kontrol tidak tampil | Ya |
| Mengarsipkan aset | Tidak; kontrol tidak tampil | Ya |
| Menutup tindak lanjut | Tidak | Ya |

Akun baru otomatis menjadi **Inspector**. Role asli tersimpan di database. Pilihan Inspector/Supervisor pada login hanya memverifikasi mode masuk, bukan cara menaikkan hak akses.

## 4. Fitur MVP

### A. Login dan akses role

- Daftar dan masuk menggunakan email/password melalui Supabase Auth.
- Terdapat role Inspector dan Supervisor.
- Kontrol khusus Supervisor tidak tampil untuk Inspector agar layar inspeksi lebih fokus.
- Database tetap menjadi lapisan keamanan utama, bukan hanya tampilan.

### B. Kelola aset dan QR

- Supervisor membuat aset dengan kode, nama, jenis, dan lokasi.
- Jenis alat disimpan sebagai **pilihan teks**, bukan integer: APAR, Helm Safety, Sepatu Safety, atau Arc Flash Suit.
- Database membuat token QR unik otomatis.
- Detail aset menampilkan QR dan tombol **Download QR PNG**.
- Aset tidak dihapus permanen; aset diarsipkan agar riwayat tetap dapat diaudit.

### C. Alur inspeksi

1. Petugas membuka aset dari QR atau daftar aset.
2. Petugas mengambil foto kondisi langsung dari kamera perangkat. Foto wajib sebagai dokumentasi.
3. Petugas menjawab checklist sesuai jenis alat.
4. Bila terdapat masalah, petugas wajib menulis catatan temuan.
5. Petugas mereview hasil lalu menyimpan inspeksi.
6. Sistem menyimpan data dan membuat tindak lanjut jika ada temuan.

### D. Checklist per jenis aset

| Jenis aset | Contoh pemeriksaan |
| --- | --- |
| APAR | tabung, label/masa berlaku, segel/pin, tekanan, selang/nozzle, penempatan |
| Helm Safety | cangkang, label, suspensi, chin strap |
| Sepatu Safety | bagian atas, sol anti-slip, toe cap, tali/pengunci |
| Arc Flash Suit | material pelindung, jahitan/penutup, arc rating/ukuran, kebersihan/penyimpanan |

### E. Status kondisi dan rekomendasi

Status akhir tidak dibuat oleh AI. Aplikasi menjalankan aturan yang transparan:

| Jawaban checklist | Status akhir | Rekomendasi |
| --- | --- | --- |
| Semua jawaban aman, normal, atau berlaku | **Baik** | Alat dapat digunakan sesuai SOP dan tetap diperiksa rutin. |
| Ada Perlu Perhatian atau Mendekati jatuh tempo | **Perlu Perhatian** | Pantau kondisi dan jadwalkan pemeriksaan. |
| Ada Tidak Terpasang | **Perlu Perbaikan** | Jadwalkan perbaikan lalu inspeksi ulang. |
| Ada Tidak Baik, Tidak Normal, Tidak, atau Lewat jatuh tempo | **Tidak Layak Digunakan** | Hentikan penggunaan sementara dan hubungi penanggung jawab K3/teknisi. |

Mengapa rule-based tepat untuk MVP? Karena hasilnya cepat, konsisten, mudah dijelaskan, dan dapat diaudit dari checklist. AI tidak perlu dipaksakan untuk label yang sudah jelas aturannya.

### F. Tindak lanjut

Tindak lanjut muncul otomatis bila ada temuan. Informasinya berupa prioritas, rekomendasi, dan status **Terbuka**. Supervisor menandainya **Selesai** setelah masalah ditangani.

Kalimat demo:

> “Tindak lanjut bukan berarti aplikasi memperbaiki alat otomatis. Sistem memastikan temuan tercatat, memiliki prioritas, dan tidak terlupakan sampai Supervisor menutupnya.”

### G. Riwayat dan rekap

- **Riwayat** menyimpan inspeksi terdahulu dan hasilnya.
- **Rekap** menunjukkan kondisi aset serta tindak lanjut yang masih terbuka.
- **Pencarian dan filter** mempercepat pencarian aset berdasarkan kode, nama, lokasi, jenis, kondisi, atau status inspeksi.

## 5. Teknologi yang digunakan

| Bagian | Teknologi | Fungsi |
| --- | --- | --- |
| Tampilan | HTML5 dan CSS3 | Membuat struktur halaman dan desain responsif desktop/HP. |
| Logika aplikasi | Vanilla JavaScript | Mengatur halaman, checklist, aturan kondisi, QR, dan interaksi. |
| Kamera | Browser MediaDevices / getUserMedia | Membuka kamera perangkat untuk foto kondisi. |
| Login | Supabase Auth | Pendaftaran, login email/password, dan sesi pengguna. |
| Database | Supabase Postgres | Menyimpan akun, aset, inspeksi, jawaban, dan tindak lanjut. |
| Foto | Supabase Storage privat | Menyimpan bukti foto inspeksi secara terproteksi. |
| QR | qrcodejs dari CDN | Membuat QR asli dan QR PNG yang dapat diunduh. |
| Hosting | Vercel | Menayangkan aplikasi melalui HTTPS agar kamera browser bisa digunakan. |

**Framework:** aplikasi ini tidak memakai React, Vue, atau Angular pada runtime. Ini adalah aplikasi statis menggunakan **Vanilla JavaScript**. Pilihan ini sesuai mini hackathon dua hari: ringan, cepat dideploy, dan fokus membuktikan alur bisnis.

### Cara menjelaskan tools saat demo

Gunakan kalimat ini:

> “Frontend SafetyOps dibuat dengan HTML, CSS, dan Vanilla JavaScript. Frontend
> menangani tampilan dashboard, login, QR, kamera, checklist, dan navigasi.
> Backend menggunakan Supabase untuk autentikasi, database PostgreSQL, dan
> penyimpanan foto. Vercel digunakan untuk hosting website sekaligus menjalankan
> endpoint backend kecil untuk rekomendasi AI. OpenAI digunakan untuk merangkum
> temuan dan membuat draf rekomendasi tindak lanjut. Database tetap menentukan
> status checklist dan hak akses melalui RLS.”

### Pembagian frontend dan backend

| Lapisan | Komponen | Tanggung jawab |
| --- | --- | --- |
| Frontend | HTML5, CSS3, Vanilla JavaScript | Menampilkan halaman, menerima input, membuka kamera, membuat QR, menjalankan aturan status, dan mengirim data. |
| Backend data | Supabase Auth + Postgres + Storage | Login, role, data aset, inspeksi, jawaban, foto privat, dan tindak lanjut. |
| Backend AI | Vercel Function `/api/ai-recommendation` | Memverifikasi sesi, menjaga API key, mengirim ringkasan checklist ke OpenAI, dan mengembalikan hasil terstruktur. |
| AI service | OpenAI Responses API dengan `gpt-5-mini` | Membuat ringkasan temuan, prioritas, tindakan, dan dasar rekomendasi. |
| Hosting | Vercel | Menayangkan frontend melalui HTTPS dan menjalankan Vercel Function. |

### Alur data saat rekomendasi AI

    Inspector mengisi checklist
           -> Supabase menyimpan inspeksi terlebih dahulu
           -> frontend mengirim data checklist tanpa foto
           -> Vercel Function memverifikasi sesi login
           -> OpenAI membuat draf rekomendasi
           -> hasil tampil di halaman Hasil Inspeksi
           -> Supervisor memverifikasi dan menutup tindak lanjut

Tekankan bahwa **AI tidak menghitung status akhir alat**. Status `Baik`, `Perlu
Perhatian`, `Perlu Perbaikan`, atau `Tidak Layak Digunakan` tetap dihitung dari
aturan checklist. AI hanya membantu merangkum temuan dan menyusun draf tindakan.

## 6. Arsitektur sederhana

    Browser: HTML + CSS + JavaScript
      |-- Supabase Auth: login dan sesi
      |-- Supabase Postgres: aset, inspeksi, jawaban, tindak lanjut
      |-- Supabase Storage: bukti foto
      '-- QR deep link: membuka detail aset yang tepat

    Vercel: hosting aplikasi statis melalui HTTPS

Tabel data utama:

| Tabel | Isi |
| --- | --- |
| profiles | nama dan role pengguna |
| assets | identitas aset, lokasi, QR token, kondisi terkini, dan status arsip |
| inspections | satu catatan untuk setiap inspeksi |
| inspection_answers | jawaban dan catatan setiap pertanyaan checklist |
| inspection_photos | metadata file foto dan waktu pengambilan |
| follow_ups | prioritas, rekomendasi, dan status penyelesaian temuan |

## 7. Keamanan dan kualitas data

- **Supabase Auth:** pengguna harus login sebelum mengakses data.
- **Row Level Security (RLS):** kebijakan database membatasi tindakan menurut role. Inspector tidak dapat membuat aset melalui API.
- **Storage privat:** foto bukan file publik terbuka.
- **Tidak ada hard delete aset:** aset diarsipkan agar riwayat audit terjaga.
- **Inspeksi append-only:** inspeksi baru menambah catatan, bukan menimpa inspeksi lama.
- **Transaksi atomik:** saat submit, inspeksi, jawaban, foto, tindak lanjut, dan update aset disimpan sebagai satu kesatuan. Bila satu langkah gagal, database membatalkan proses agar tidak ada data setengah tersimpan.
- **Publishable key saja di browser:** service-role key dan password database tidak dimasukkan ke frontend/GitHub.

## 8. Peran AI secara jujur

**AI tidak menentukan status akhir pada MVP.** Foto adalah dokumentasi, bukan input analisis AI. Status dan rekomendasi berasal dari aturan checklist agar transparan dan dapat diaudit.

AI berkontribusi pada tahap pengembangan: brainstorming masalah, PRD, rancangan UI/UX, penyusunan checklist, dokumentasi, dan percepatan coding.

Pengembangan berikutnya dapat memakai AI sebagai asisten untuk merangkum banyak temuan, menemukan pola masalah, atau menulis draft rekomendasi. AI tetap tidak boleh menggantikan SOP atau keputusan petugas K3.

## 9. Batas MVP

- Scan QR di dalam aplikasi masih mode simulasi. Untuk demo fisik paling stabil, gunakan kamera bawaan HP atau Google Lens untuk membuka QR deep link.
- Rekomendasi belum berasal dari analisis foto AI.
- Aplikasi mendukung proses dokumentasi dan tindak lanjut, bukan pengganti SOP resmi atau keputusan profesional K3.
- Checklist difokuskan pada empat jenis alat demo.

## 10. Isi Canva PPT

### Slide solusi: Inspector dan Supervisor

**Judul:**

> Solusi: SafetyOps Inspect

**Subjudul:**

> MVP aplikasi web inspeksi alat K3 berbasis QR untuk memastikan alat teridentifikasi, diperiksa, dan ditindaklanjuti.

**Bagian Inspector:**

- Scan QR untuk menemukan aset
- Ambil foto kondisi aktual
- Isi checklist sesuai alat
- Simpan inspeksi dan temuan

**Bagian Supervisor:**

- Tambah aset dan buat QR unik
- Pantau kondisi dan riwayat
- Kelola temuan/tindak lanjut
- Arsipkan aset tanpa hapus audit

**Screenshot untuk slide ini:** pakai halaman **detail aset** yang menunjukkan QR, kondisi alat, jadwal inspeksi, temuan/tindak lanjut, dan tombol Mulai Inspeksi. Pakai satu screenshot kecil saja sebagai bukti visual.

### Urutan slide yang disarankan

| Slide | Tujuan | Visual |
| --- | --- | --- |
| 1 | Judul SafetyOps Inspect | Logo/QR kecil. |
| 2 | Masalah inspeksi alat K3 | Poin masalah atau ilustrasi proses manual. |
| 3 | Solusi: Inspector vs Supervisor | Screenshot detail aset. |
| 4 | Alur inspeksi tertib | QR -> foto -> checklist -> hasil -> tindak lanjut. |
| 5 | Fitur MVP | Screenshot dashboard dan daftar aset. |
| 6 | Demo langsung | Tambah Arc Flash Suit -> QR -> inspeksi Inspector. |
| 7 | Teknologi dan keamanan data | Diagram arsitektur sederhana. |
| 8 | Penutup | “Inspeksi lebih tertib, bukti lebih siap, tindak lanjut lebih terlacak.” |

## 11. Urutan demo 7 menit

1. **Pembuka (30 detik):** masalah identitas alat, bukti inspeksi, dan temuan yang sulit dipantau.
2. **Solusi (45 detik):** SafetyOps Inspect dan dua role pengguna.
3. **Supervisor (1 menit):** tambah AFS-PRD-01 sebagai Arc Flash Suit, lalu tunjukkan QR.
4. **QR (30 detik):** pindai QR pada objek 3D/PPT dengan kamera HP atau Google Lens sampai detail aset terbuka.
5. **Inspector (2 menit):** ambil foto, isi checklist Arc Flash Suit, dan buat satu temuan Perlu Perhatian dengan catatan.
6. **Hasil (1 menit):** tunjukkan status, rekomendasi, tindak lanjut terbuka, riwayat, dan rekap.
7. **Penutup (30 detik):** data lintas perangkat, akses dibatasi, dan riwayat tidak dihapus.

## 12. Jawaban singkat untuk juri

**“Apakah ini web app atau MVP?”**  
“Keduanya. Bentuk produknya aplikasi web; tahap produknya MVP untuk membuktikan alur inspeksi K3 berbasis QR.”

**“Apakah AI menentukan alat aman?”**  
“Belum. Keputusan MVP berbasis aturan checklist agar transparan dan sesuai proses inspeksi. AI cocok menjadi asisten pada tahap berikutnya.”

**“Mengapa foto wajib?”**  
“Foto adalah bukti kondisi aktual untuk dokumentasi dan audit, bukan bahan analisis AI.”

**“Mengapa aset tidak dihapus?”**  
“Karena inspeksi adalah data audit. Aset diarsipkan agar riwayatnya tetap dapat ditelusuri.”

**“Apa manfaat QR?”**  
“QR menghubungkan objek fisik ke identitas digital yang tepat dengan cepat, mengurangi salah pilih aset, dan membuka riwayat inspeksinya.”
