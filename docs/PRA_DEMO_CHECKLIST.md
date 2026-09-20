# Checklist Pra-Demo SafetyOps Inspect

Dokumen ini ditujukan untuk agent/developer yang menyiapkan demo (Codex).
Baca juga [PRD_SAFETYOPS_INSPECT.md](PRD_SAFETYOPS_INSPECT.md) dan
[HANDOFF_CLAUDE_CODE.md](HANDOFF_CLAUDE_CODE.md) — keputusan produk & keamanan
di sana **tidak boleh diubah**.

---

## 0. Konteks: apa yang berubah di sesi terakhir

Empat perubahan kode sudah selesai dan sudah diuji sintaks + visual di browser:

1. **Perbaikan encoding** — `static/index.html` sebelumnya korup (mojibake).
   Karakter `✓ × ◷ ▦ ▤ ▥ ▣ ← ·` tersimpan sebagai `âœ" Ã— â—· â–¦ â† Â·`.
   Sudah dipulihkan, BOM dihapus.
2. **Perbaikan stored XSS** — semua field aset (kode, nama, tipe, lokasi,
   temuan, tanggal) kini dibungkus `esc()` sebelum di-render ke `innerHTML`.
3. **Submit inspeksi jadi atomik** — file baru
   `supabase/005_atomic_inspection_submit.sql`. Trigger lama dihapus, diganti
   fungsi `submit_inspection`.
4. **Redesign UI "Field Ops Rugged"** — palet graphite + safety yellow,
   IBM Plex Sans/Mono, ikon SVG, target sentuh 48px.

> **KONSEKUENSI PENTING:** `static/supabase-client.js` sekarang memanggil
> `sb.rpc('submit_inspection', …)`. Fungsi itu **belum ada** di database sampai
> migrasi 005 dijalankan. Selama belum dijalankan, **submit inspeksi akan
> selalu gagal** dengan pesan "Inspeksi belum tersimpan". Ini bloker demo nomor satu.

---

## 1. BLOKER — Jalankan migrasi 005 di Supabase

Buka **Supabase Dashboard → SQL Editor → New query**, paste seluruh blok di
bawah, klik **Run**. Cukup sekali.

Isi ini identik dengan `supabase/005_atomic_inspection_submit.sql`.

```sql
drop trigger if exists inspections_apply_result on public.inspections;

create or replace function public.submit_inspection(
  p_asset_id uuid,
  p_condition public.asset_condition,
  p_captured_at timestamptz,
  p_photo_storage_path text,
  p_answers jsonb,
  p_priority text default null,
  p_recommendation text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inspector_id uuid := auth.uid();
  v_inspection_id uuid;
  v_finding_count integer;
begin
  if v_inspector_id is null then
    raise exception 'Harus masuk sebagai petugas terlebih dahulu.';
  end if;

  select count(*) into v_finding_count
  from jsonb_to_recordset(p_answers) as a(question_key text, question_label text, answer_value text, is_flagged boolean, note text)
  where a.is_flagged;

  insert into public.inspections (asset_id, inspector_id, condition, finding_count, captured_at)
  values (p_asset_id, v_inspector_id, p_condition, v_finding_count, p_captured_at)
  returning id into v_inspection_id;

  insert into public.inspection_answers (inspection_id, question_key, question_label, answer_value, is_flagged, note)
  select v_inspection_id, a.question_key, a.question_label, a.answer_value, a.is_flagged, a.note
  from jsonb_to_recordset(p_answers) as a(question_key text, question_label text, answer_value text, is_flagged boolean, note text);

  insert into public.inspection_photos (inspection_id, storage_path, captured_at)
  values (v_inspection_id, p_photo_storage_path, p_captured_at);

  if v_finding_count > 0 then
    insert into public.follow_ups (asset_id, inspection_id, priority, recommendation, status)
    values (p_asset_id, v_inspection_id, coalesce(p_priority, 'Sedang'), coalesce(p_recommendation, 'Jadwalkan pemeriksaan ulang.'), 'Terbuka');
  end if;

  update public.assets
  set current_condition = p_condition,
      inspection_status = 'Completed',
      last_inspected_at = p_captured_at
  where id = p_asset_id;

  return v_inspection_id;
end;
$$;

revoke all on function public.submit_inspection(uuid, public.asset_condition, timestamptz, text, jsonb, text, text) from public;
grant execute on function public.submit_inspection(uuid, public.asset_condition, timestamptz, text, jsonb, text, text) to authenticated;
```

**Urutan migrasi lengkap** (kalau database masih kosong): `001` → `003` → `004` → `005`.
Jalankan `002` **hanya** jika `001` berhenti dengan error
`operator does not exist: text = uuid` (lihat `supabase/README.md`).

---

## 2. Query verifikasi — jalankan setelah migrasi

Jalankan satu per satu. Setiap query punya hasil yang diharapkan.

### 2a. Fungsi RPC harus ada dan `security definer`

```sql
select p.proname,
       pg_get_function_identity_arguments(p.oid) as args,
       p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'submit_inspection';
```

Harapan: **1 baris**, `security_definer = true`.
Kalau 0 baris → migrasi 005 belum jalan, submit akan gagal.

### 2b. Trigger lama harus sudah hilang

```sql
select tgname
from pg_trigger
where tgrelid = 'public.inspections'::regclass
  and not tgisinternal;
```

Harapan: **`inspections_apply_result` TIDAK muncul**.
Kalau masih ada, kondisi aset akan ter-update dua kali (sekali oleh trigger,
sekali oleh fungsi) — jalankan ulang baris `drop trigger` di atas.

### 2c. Guard autentikasi berfungsi

```sql
select public.submit_inspection(
  (select id from public.assets limit 1),
  'Baik'::public.asset_condition,
  now(),
  'dummy/path.jpg',
  '[]'::jsonb
);
```

Harapan: **ERROR `Harus masuk sebagai petugas terlebih dahulu.`**
Ini hasil yang benar — SQL Editor tidak punya `auth.uid()`, jadi fungsi menolak.
Tidak ada data yang tertulis. Kalau justru berhasil mengembalikan UUID, berarti
guard tidak jalan dan harus diperiksa.

### 2d. RLS aktif di semua tabel

```sql
select relname, relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in ('profiles','assets','inspections',
                  'inspection_answers','inspection_photos','follow_ups');
```

Harapan: **6 baris, `relrowsecurity = true` semua**.

### 2e. Tidak ada jalur naik pangkat sendiri

```sql
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'profiles'
order by grantee, privilege_type;
```

Harapan: role `authenticated` **hanya punya `SELECT`**.
Kalau muncul `UPDATE`/`INSERT` untuk `authenticated`, seorang Inspector bisa
mengubah `role` dirinya sendiri jadi supervisor lewat API — itu melanggar PRD
dan harus dicabut (`revoke update on public.profiles from authenticated;`).

### 2f. Aset seed tersedia

```sql
select asset_code, equipment_type, current_condition,
       inspection_status, is_archived
from public.assets
order by asset_code;
```

Harapan: minimal `APAR-RKT-01`, `HELM-PRD-01`, `SEPATU-PRD-01`, semuanya
`is_archived = false`. Tiga tipe ini yang punya checklist di aplikasi
(`APAR`, `Helm Safety`, `Sepatu Safety`) — aset dengan `equipment_type` lain
akan jatuh ke checklist APAR sebagai fallback.

---

## 3. Akun demo

Butuh **dua akun berbeda**. Jangan pakai satu akun untuk dua peran.

1. Daftar akun Inspector lewat aplikasi (tab **Daftar akun**). Biarkan
   role-nya default (`inspector`).
2. Daftar akun kedua lewat aplikasi, lalu promosikan jadi supervisor dengan
   query ini — **ganti emailnya dulu**:

```sql
update public.profiles
set role = 'supervisor'
where id = (select id from auth.users
            where email = 'GANTI_EMAIL_SUPERVISOR@contoh.com');
```

3. Verifikasi kedua akun:

```sql
select u.email, p.full_name, p.role, u.email_confirmed_at
from public.profiles p
join auth.users u on u.id = p.id
order by p.created_at;
```

Harapan: satu baris `inspector`, satu baris `supervisor`, dan
`email_confirmed_at` **terisi keduanya**. Kalau masih null, email belum
diverifikasi dan login akan ditolak dengan pesan "Email belum diverifikasi".

---

## 4. Konfigurasi Supabase Auth

- **Authentication → Providers → Email**: pastikan **aktif**.
- **Authentication → URL Configuration**: Site URL + Redirect URLs harus berisi
  - `http://127.0.0.1:4173` (uji lokal)
  - URL produksi Vercel, misalnya `https://nama-project.vercel.app`

Kalau URL produksi belum terdaftar, link verifikasi email akan mengarah ke
tujuan yang salah saat demo.

---

## 5. Deploy

- `vercel.json` harus tetap: `outputDirectory: "static"`, `buildCommand` berupa
  echo (tidak menjalankan `npm run build`). **Jangan** dikembalikan ke build
  Vite/Vinext.
- Setelah deploy, pastikan halaman yang tampil berasal dari `static/index.html`
  (cek: font IBM Plex termuat, sidebar hitam dengan garis kuning di kanan).
- Folder `app/`, `components/`, `dist/`, `.next/`, `.wrangler/`, `vite.config.ts`,
  `next.config.ts` adalah sisa scaffold yang **tidak dipakai** produksi. Aman
  diabaikan; boleh dihapus kalau mau bersih, tapi jangan dijadikan sumber build.

---

## 6. Uji penerimaan manual (wajib dilakukan di browser sungguhan)

Lakukan di desktop **dan** HP. Kamera butuh HTTPS atau `localhost` — di HP
gunakan URL Vercel (HTTPS), bukan IP lokal.

| # | Langkah | Hasil yang benar |
| --- | --- | --- |
| 1 | Login sebagai **Supervisor** | Tombol "+ Tambah aset" aktif |
| 2 | Tambah aset baru | Tersimpan, diarahkan ke detail, QR muncul |
| 3 | Klik "Download QR PNG" | File PNG terunduh, bisa di-scan |
| 4 | Logout, login sebagai **Inspector** | Tombol "+ Tambah aset" abu-abu/disabled |
| 5 | Inspector: Scan QR → foto → checklist → submit | Muncul "Inspeksi tersimpan…" |
| 6 | Cek kondisi aset setelah submit | Berubah sesuai hasil checklist |
| 7 | Buka Riwayat dari **perangkat lain** | Inspeksi + foto tampil |
| 8 | Inspector coba tutup tindak lanjut | Tombol disabled bertuliskan "Hanya Supervisor…" |
| 9 | Login Supervisor → tutup tindak lanjut | Status berubah jadi "Selesai" |
| 10 | Salah pilih peran saat login | Ditolak: "Akun ini terdaftar sebagai …" |

### Uji keamanan (penting, ini yang membedakan MVP serius)

11. Login sebagai **Inspector**, buka DevTools Console, jalankan:

```js
await sb.from('assets').insert({
  asset_code: 'TEST-RLS-01', name: 'Uji RLS',
  equipment_type: 'APAR', location: 'Uji'
});
```

Harapan: **gagal** dengan error RLS (`new row violates row-level security policy`).
Ini membuktikan tombol disabled bukan satu-satunya pengaman — sesuai PRD pasal 6.

12. Masih sebagai Inspector, coba naik pangkat:

```js
await sb.from('profiles').update({ role: 'supervisor' }).eq('id', signedInUser.id);
```

Harapan: **gagal** (tidak ada grant UPDATE untuk `authenticated`).

---

## 7. Batasan yang tidak boleh dilanggar

Dari PRD & handoff, jangan diubah tanpa keputusan produk baru:

- RLS tetap jadi otorisasi utama; tombol disabled **bukan** kontrol keamanan.
- Tidak ada UI untuk pengguna mempromosikan dirinya sendiri jadi Supervisor.
- Tidak ada hard delete aset maupun inspeksi — gunakan `is_archived`.
- Kondisi alat dihitung **rule-based dari checklist**, bukan dari foto/AI.
- Foto wajib dari kamera perangkat, bukan upload galeri.
- Jangan pernah menaruh `service_role` key atau database password di frontend
  maupun di repo. Yang boleh di browser hanya publishable key.

---

## 8. Sisa pekerjaan opsional (kalau waktu masih ada)

Bukan bloker demo, urut dari yang paling berdampak:

1. **Nama inspektor di riwayat masih hardcoded** `'Petugas K3'`
   (`supabase-client.js`, fungsi `loadRemoteData`). Seharusnya join ke
   `profiles.full_name`. Perlu diperhatikan: policy `profiles` saat ini hanya
   mengizinkan Inspector membaca profil sendiri, jadi join ini butuh
   penyesuaian policy — putuskan dulu apakah nama inspektor boleh dilihat
   semua orang.
2. **Kedip role saat login gagal** — `authSubmit()` memanggil `loadRemoteData()`
   (yang memanggil `draw()`) sebelum mengecek kecocokan role, jadi UI sempat
   ter-render sekejap sebelum user ditendang balik ke login. Bukan celah
   keamanan, tapi mengganggu saat demo. Perbaikannya: cek role dulu, baru
   render.
3. Halaman arsip aset + opsi pulihkan untuk Supervisor.
4. Detail tindak lanjut dari halaman Riwayat (sekarang hanya dari hasil
   inspeksi terbaru).

---

## Ringkasan satu baris

Kalau hanya sempat melakukan **satu** hal sebelum demo: **jalankan migrasi 005**
(bagian 1), lalu verifikasi dengan query 2a. Tanpa itu, submit inspeksi pasti gagal.
