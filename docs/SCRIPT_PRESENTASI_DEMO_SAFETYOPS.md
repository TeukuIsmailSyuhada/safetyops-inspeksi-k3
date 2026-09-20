# Naskah Presentasi Demo - SafetyOps Inspect

Durasi target: 7 menit

## Judul demo

**SafetyOps Inspect - MVP Aplikasi Web Inspeksi Alat K3 Berbasis QR dengan Rekomendasi Tindak Lanjut**

## 1. Pembukaan - 30 detik

> Selamat pagi/siang. Kami memperkenalkan SafetyOps Inspect, yaitu MVP aplikasi web untuk membantu proses inspeksi alat K3 di area industri.
>
> Masalah yang ingin kami selesaikan adalah identitas alat yang sulit ditelusuri, bukti foto yang tidak terdokumentasi rapi, checklist yang tidak konsisten, serta temuan yang berisiko terlupakan.
>
> Dengan SafetyOps Inspect, setiap alat memiliki QR unik. Petugas dapat membuka identitas alat, mengambil foto kondisi aktual, mengisi checklist, dan menyimpan hasil inspeksi beserta tindak lanjutnya.

## 2. Penjelasan solusi - 45 detik

> Sistem ini memiliki dua role utama.
>
> Pertama adalah Inspector. Inspector berfokus pada pekerjaan lapangan: membuka aset, mengambil foto, mengisi checklist, dan menyimpan inspeksi.
>
> Kedua adalah Supervisor. Supervisor dapat menambahkan aset baru, membuat QR unik, melihat riwayat serta rekap, memantau temuan, dan menutup tindak lanjut.
>
> Inspector tidak melihat kontrol pengelolaan aset. Namun keamanan sebenarnya tetap dijaga oleh Supabase Row Level Security, bukan hanya dengan menyembunyikan tombol.

## 3. Slide alur sistem - 30 detik

Tunjukkan diagram:

~~~
QR aset -> Foto kondisi -> Checklist -> Status alat
       -> Rekomendasi -> Tindak lanjut Supervisor
~~~

Kalimat:

> Alur sistem dimulai dari QR aset. Setelah aset ditemukan, Inspector mengambil foto kondisi aktual, mengisi checklist sesuai jenis alat, lalu sistem menghitung status kondisi.
>
> Jika ada temuan, sistem membuat tindak lanjut. Setelah inspeksi tersimpan, AI membantu membuat draf rekomendasi yang harus diverifikasi oleh Supervisor.

## 4. Demo Supervisor: tambah aset - 1 menit

Aksi:

1. Login sebagai Supervisor.
2. Buka **Daftar Alat**.
3. Klik **Tambah aset**.
4. Isi:
   - Kode: 'AFS-PRD-01'
   - Jenis: 'Arc Flash Suit'
   - Nama: 'Arc Flash Suit 8 cal/cm²'
   - Lokasi: 'Panel Listrik A'
   - Detail: 'Loker APD Listrik'
5. Klik **Simpan & buat QR**.
6. Tunjukkan QR dan tombol **Download QR PNG**.

Kalimat:

> Sebagai Supervisor, saya menambahkan aset Arc Flash Suit. Setelah disimpan, database membuat QR token yang unik secara otomatis.
>
> QR ini dapat diunduh dan ditempel pada objek fisik, termasuk objek 3D yang kami gunakan untuk demo. Ketika dipindai, QR membuka detail aset yang tepat.

## 5. Demo Inspector: inspeksi - 2 menit

Aksi:

1. Logout.
2. Login sebagai Inspector.
3. Buka 'AFS-PRD-01'.
4. Klik **Mulai Inspeksi**.
5. Ambil foto melalui kamera.
6. Isi checklist.
7. Pilih satu jawaban 'Perlu Perhatian'.
8. Isi catatan: 'Label arc rating mulai memudar'.
9. Klik **Review hasil**.
10. Klik **Submit inspeksi**.

Kalimat:

> Sekarang saya masuk sebagai Inspector. Terlihat bahwa kontrol tambah atau arsip aset tidak tersedia karena bukan kewenangan Inspector.
>
> Saya mulai inspeksi Arc Flash Suit dan mengambil foto langsung dari kamera perangkat. Foto ini berfungsi sebagai dokumentasi kondisi aktual dan waktu pengambilan.
>
> Saya mengisi checklist sesuai jenis Arc Flash Suit. Karena label arc rating mulai memudar, saya memilih Perlu Perhatian dan menambahkan catatan temuan.

## 6. Penjelasan status - 30 detik

> Status kondisi pada MVP ini ditentukan dengan aturan checklist yang transparan.
>
> Jika semua jawaban aman, hasilnya Baik. Jika ada Perlu Perhatian, hasilnya Perlu Perhatian. Jika terdapat kerusakan serius atau masa berlaku terlewat, alat dapat diberi status Tidak Layak Digunakan.
>
> Dengan cara ini, hasil dapat dijelaskan kembali berdasarkan jawaban checklist dan tidak bergantung pada keputusan yang tidak transparan.

## 7. Tunjukkan hasil AI - 1 menit

Tunggu kartu **Rekomendasi AI** muncul.

Kalimat:

> Setelah inspeksi tersimpan, sistem mengirim ringkasan checklist dan catatan temuan ke endpoint backend yang aman.
>
> AI tidak menerima foto dan tidak menentukan status akhir alat. AI membantu merangkum temuan serta membuat draf prioritas dan rekomendasi tindakan.
>
> Pada contoh ini, AI menyarankan agar kondisi label diperiksa oleh Supervisor, alat dipantau, dan pemeriksaan ulang dijadwalkan bila keterbacaan label semakin buruk.
>
> Rekomendasi ini tetap harus diverifikasi oleh Supervisor atau teknisi sesuai SOP K3.

Jika kartu AI tidak muncul:

> Inspeksi tetap berhasil tersimpan. Sistem masih memiliki rekomendasi rule-based sebagai fallback. Kartu AI membutuhkan konfigurasi API key OpenAI di environment Vercel.

## 8. Tunjukkan riwayat dan rekap - 45 detik

Aksi:

1. Buka **Riwayat**.
2. Tunjukkan inspeksi 'AFS-PRD-01'.
3. Buka **Rekap**.

Kalimat:

> Semua inspeksi tersimpan sebagai riwayat baru dan tidak menimpa catatan sebelumnya.
>
> Supervisor dapat melihat kondisi alat, jumlah temuan, status tindak lanjut, serta rekap kondisi aset.
>
> Jika masalah sudah ditangani, Supervisor dapat menandai tindak lanjut sebagai Selesai. Aset tidak dihapus permanen, melainkan diarsipkan agar jejak audit tetap tersedia.

## 9. Penjelasan teknologi - 45 detik

> Frontend SafetyOps dibuat menggunakan HTML, CSS, dan Vanilla JavaScript. Frontend menangani tampilan, kamera, QR, checklist, dan navigasi.
>
> Supabase digunakan sebagai backend-as-a-service. Supabase menyediakan login, database PostgreSQL, dan storage foto privat.
>
> Vercel digunakan untuk hosting website melalui HTTPS sekaligus menjalankan endpoint backend untuk AI.
>
> OpenAI digunakan untuk menghasilkan draf rekomendasi dari checklist dan catatan temuan. API key hanya disimpan sebagai environment secret di Vercel, bukan di browser atau GitHub.

## 10. Penutup - 30 detik

> Jadi, SafetyOps Inspect membantu menghubungkan objek fisik dengan data inspeksi digital melalui QR.
>
> Inspector dapat melakukan inspeksi secara lebih terstruktur, sedangkan Supervisor dapat memantau kondisi, riwayat, dan tindak lanjut.
>
> Nilai utama MVP ini adalah inspeksi lebih tertib, bukti lebih siap, dan temuan lebih mudah ditindaklanjuti.
>
> Terima kasih.

# Jawaban singkat untuk pertanyaan juri

## Apakah ini web app atau MVP?

> Keduanya. Bentuk produknya adalah aplikasi web, sedangkan tahap produknya adalah MVP untuk membuktikan alur inspeksi K3 berbasis QR.

## Apakah AI menganalisis foto?

> Belum. Foto digunakan sebagai dokumentasi. AI menerima data checklist dan catatan temuan untuk membuat draf rekomendasi.

## Apakah AI menentukan alat aman atau tidak?

> Tidak. Status akhir ditentukan oleh aturan checklist. AI hanya membantu merangkum temuan dan menyusun draf tindakan.

## Mengapa foto wajib?

> Foto menjadi bukti kondisi aktual dan mendukung audit inspeksi. Foto tidak digunakan sebagai satu-satunya dasar keputusan.

## Mengapa aset tidak dihapus?

> Karena riwayat inspeksi merupakan data audit. Aset diarsipkan agar riwayatnya tetap dapat ditelusuri.

## Apakah Inspector dapat menambah aset?

> Tidak. Inspector fokus pada inspeksi. Penambahan, pengarsipan aset, dan penutupan tindak lanjut adalah kewenangan Supervisor.

## Apa keunggulan SafetyOps Inspect?

> Identitas alat lebih mudah ditemukan melalui QR, inspeksi memiliki bukti foto dan checklist, tindak lanjut tidak mudah terlupakan, dan data dapat diakses lintas perangkat setelah login.

## Jika ditanya pengembangan berikutnya

> Pengembangan berikutnya dapat mencakup penyimpanan permanen rekomendasi AI, ringkasan otomatis untuk Supervisor, analisis tren temuan, dan analisis foto sebagai bantuan tambahan. Namun keputusan akhir tetap berada pada petugas K3 dan teknisi.

