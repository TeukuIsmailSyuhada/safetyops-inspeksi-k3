# Panduan Demo SafetyOps Inspect

## Ringkasan

SafetyOps Inspect adalah MVP aplikasi web inspeksi alat K3. Sistem menghubungkan alat fisik, bukti foto aktual, checklist digital, status kondisi yang dapat dijelaskan, dan tindak lanjut.

## Alur demo

```text
Dashboard → Scan QR/pilih alat → Foto kamera → Checklist → Review → Submit → Hasil → Riwayat/Rekap
```

1. Buka **Dashboard** untuk menunjukkan alat jatuh tempo dan temuan prioritas.
2. Buka **Daftar Alat**, cari `APAR-RKT-01`, lalu masuk ke detail aset.
3. Tekan **Mulai Inspeksi** atau gunakan tombol **Scan QR & Mulai Inspeksi**.
4. Pada layar scan, gunakan simulasi QR jika label fisik belum ditempel.
5. Ambil foto kondisi alat dari kamera. Foto wajib dan waktu pengambilannya dicatat.
6. Isi checklist APAR: kondisi tabung, label/masa berlaku, segel/pin, tekanan, selang/nozzle, serta akses/penempatan.
7. Pilih satu jawaban bermasalah untuk memperlihatkan catatan temuan wajib.
8. Review hasil, submit inspeksi, lalu tunjukkan rekomendasi tindak lanjut.
9. Buka **Riwayat** dan **Rekap** untuk menunjukkan hasil tersimpan.

## Cara status ditentukan

| Hasil | Contoh kondisi |
| --- | --- |
| Baik | Semua checklist normal. |
| Perlu Perhatian | Masa berlaku mendekati habis. |
| Perlu Perbaikan | Segel tidak terpasang atau selang perlu perhatian. |
| Tidak Layak Digunakan | Tekanan tidak normal, tabung rusak, akses terhalang, atau masa berlaku lewat. |

## Penjelasan AI

AI membantu proses pengembangan: menyusun alur, menyederhanakan checklist MVP, merancang UI/UX, dan menyusun rekomendasi. Pada MVP ini, AI **tidak** menentukan status keselamatan dan tidak menganalisis foto. Keputusan kondisi berasal dari checklist rule-based agar transparan, dapat diaudit, dan sesuai SOP.

## Stack teknis

- HTML5 untuk struktur.
- CSS3 responsif untuk tampilan desktop dan mobile.
- Vanilla JavaScript untuk navigasi, filter, validasi, aturan kondisi, riwayat, dan rekap.
- `getUserMedia` untuk akses kamera perangkat.
- `localStorage` untuk penyimpanan lokal MVP.

## Batasan MVP

- Riwayat tersimpan pada browser/perangkat yang digunakan.
- Scan QR masih menggunakan mode simulasi.
- Tidak ada login, database pusat, notifikasi, atau penugasan teknisi.
- Checklist detail saat ini berfokus pada APAR.

## Jawaban singkat untuk juri

**“Apakah foto dianalisis AI?”** Tidak. Foto menjadi bukti inspeksi; kondisi alat ditentukan dari checklist yang dapat dijelaskan.

**“Mengapa belum menggunakan AI?”** Keputusan K3 harus tervalidasi dan dapat diaudit. Rule-based checklist adalah pendekatan paling aman dan realistis untuk MVP dua hari.

**“Apa pengembangan berikutnya?”** Database pusat, login berbasis peran, scanner QR produksi, checklist untuk jenis alat lain, penugasan teknisi, notifikasi, dan analitik pola temuan.
