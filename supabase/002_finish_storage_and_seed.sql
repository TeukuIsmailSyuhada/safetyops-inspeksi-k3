-- Jalankan file ini JIKA 001_initial_schema.sql berhenti dengan error
-- "operator does not exist: text = uuid" pada Supabase SQL Editor.
-- File ini melanjutkan bagian Storage dan data demo tanpa mengulang tabel utama.

drop policy if exists "Authenticated users read evidence" on storage.objects;
drop policy if exists "Users upload their own evidence" on storage.objects;
drop policy if exists "Users delete their own evidence" on storage.objects;

create policy "Authenticated users read evidence"
on storage.objects for select to authenticated
using (bucket_id = 'inspection-evidence');

create policy "Users upload their own evidence"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'inspection-evidence'
  and owner_id = auth.uid()::text
);

create policy "Users delete their own evidence"
on storage.objects for delete to authenticated
using (
  bucket_id = 'inspection-evidence'
  and owner_id = auth.uid()::text
);

insert into public.assets (
  asset_code, name, equipment_type, location, location_detail,
  current_condition, inspection_status, next_inspection_at
) values
  ('APAR-RKT-01', 'APAR Dry Chemical 3 kg', 'APAR', 'Area Produksi A', 'Dekat Panel A-03', 'Baik', 'Due', current_date),
  ('HELM-PRD-01', 'Helm Safety Putih', 'Helm Safety', 'Area Produksi A', 'Rak APD Utama', 'Baik', 'Due', current_date),
  ('SEPATU-PRD-01', 'Sepatu Safety Toe Cap', 'Sepatu Safety', 'Area Produksi A', 'Loker APD', 'Baik', 'Due', current_date)
on conflict (asset_code) do nothing;
