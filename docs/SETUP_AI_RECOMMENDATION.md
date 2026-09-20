# Setup Rekomendasi AI SafetyOps

Fitur ini menampilkan draf rekomendasi tindak lanjut setelah inspeksi berhasil
disimpan. Model menerima jenis aset, kondisi akhir yang sudah dihitung sistem,
jawaban checklist, dan catatan temuan. Foto tidak dikirim ke AI.

## Cara kerja

1. Inspector mengirim inspeksi melalui halaman Review.
2. Supabase menyimpan inspeksi dan hasil rule-based terlebih dahulu.
3. Browser mengirim ringkasan checklist ke `/api/ai-recommendation`.
4. Vercel Function memverifikasi sesi login, lalu memanggil OpenAI Responses API.
5. Hasil tampil sebagai **Rekomendasi AI** pada halaman hasil inspeksi.
6. Supervisor tetap memverifikasi dan menutup tindak lanjut sesuai SOP K3.

Jika panggilan AI gagal, inspeksi tetap tersimpan dan rekomendasi rule-based
tetap menjadi acuan. AI tidak boleh menjadi satu-satunya mekanisme keselamatan.

## Konfigurasi Vercel

Jangan masukkan API key ke GitHub, `static/`, atau chat. Di Vercel buka:

`Project Settings -> Environment Variables`

Tambahkan:

| Name | Value | Environment |
| --- | --- | --- |
| `OPENAI_API_KEY` | API key OpenAI milik project kamu | Production, Preview, Development |
| `OPENAI_MODEL` | `gpt-5-mini` (opsional) | Production, Preview, Development |

Setelah menyimpan environment variable, lakukan redeploy. Jangan menyalin nilai
`OPENAI_API_KEY` ke screenshot atau presentasi. Bila key pernah bocor, cabut key
tersebut dan buat key baru.

## Uji demo

1. Login sebagai Inspector.
2. Pilih APAR atau Arc Flash Suit.
3. Ambil foto dan isi checklist.
4. Pilih satu kondisi `Perlu Perhatian` dan isi catatan, misalnya `Tekanan mendekati batas bawah`.
5. Submit inspeksi.
6. Pada halaman hasil, tunggu kartu **Rekomendasi AI** muncul.
7. Tunjukkan ringkasan, prioritas, tindakan, dan dasar rekomendasi.
8. Jelaskan bahwa hasil tersebut adalah draf dan Supervisor/teknisi tetap melakukan verifikasi.

## Narasi demo

> “Setelah checklist tersimpan, SafetyOps mengirim ringkasan temuan ke AI melalui
> backend yang aman. AI membantu merangkum temuan dan menyusun draf tindakan.
> Status akhir tetap dihitung oleh aturan checklist, sedangkan keputusan akhir
> tetap berada pada Supervisor dan SOP K3.”

## Catatan biaya dan privasi

Panggilan OpenAI menggunakan kuota dan biaya API project. Gunakan hanya data
yang diperlukan untuk rekomendasi, jangan mengirim foto atau data pribadi ke
prompt. Endpoint menggunakan `store: false` dan membatasi panjang input.
