-- SafetyOps Inspect — lifecycle aset untuk MVP.
-- Jalankan setelah 003_inspection_automation.sql.

alter table public.assets
  add column if not exists is_archived boolean not null default false,
  add column if not exists archived_at timestamptz;

create index if not exists assets_active_idx
on public.assets (is_archived, asset_code);

-- Aset tidak dihapus permanen agar riwayat inspeksi tetap dapat diaudit.
-- Ganti policy awal "FOR ALL" agar tidak ada akses DELETE dari browser.
drop policy if exists "Managers manage assets" on public.assets;

create policy "Managers create assets"
on public.assets for insert to authenticated
with check (public.has_management_role());

create policy "Managers update assets"
on public.assets for update to authenticated
using (public.has_management_role())
with check (public.has_management_role());

revoke delete on public.assets from authenticated;
