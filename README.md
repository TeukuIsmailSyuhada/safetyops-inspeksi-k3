# SafetyOps Inspect

MVP aplikasi inspeksi alat K3 berbasis QR untuk mini hackathon. Aplikasi membantu inspektor mengidentifikasi alat, mengambil foto kondisi aktual, mengisi checklist, dan mencatat tindak lanjut.

## Fitur MVP

- Dashboard kondisi operasional dan tindak lanjut prioritas.
- Daftar alat dengan pencarian dan filter.
- Detail aset, identitas QR, kondisi, dan tindak lanjut.
- Scan QR mode demo.
- Dokumentasi wajib melalui kamera perangkat; tidak mendukung unggah dari galeri.
- Checklist APAR, catatan temuan, review, dan status berbasis aturan.
- Riwayat inspeksi serta rekap kondisi alat.

## Teknologi

- HTML5, CSS3, dan Vanilla JavaScript.
- Browser `MediaDevices/getUserMedia` untuk kamera.
- Browser `localStorage` untuk riwayat MVP pada perangkat yang sama.
- Tanpa backend dan tanpa framework runtime pada aplikasi final.

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
- Mode scan QR pada MVP adalah simulasi; decoder QR produksi dapat ditambahkan pada tahap berikutnya.
- Jangan gunakan aplikasi ini sebagai pengganti SOP resmi atau keputusan profesional K3.

Panduan presentasi lengkap tersedia di [docs/PANDUAN_DEMO_SAFETYOPS_INSPECT.md](docs/PANDUAN_DEMO_SAFETYOPS_INSPECT.md).
