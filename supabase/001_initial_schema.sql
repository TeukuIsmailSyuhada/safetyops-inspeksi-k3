-- SafetyOps Inspect — initial Supabase schema
-- Jalankan seluruh file ini satu kali pada Supabase Dashboard > SQL Editor.
-- Jangan pernah memasukkan service_role key ke aplikasi browser.

create extension if not exists pgcrypto;

create type public.user_role as enum ('inspector', 'supervisor', 'technician');
create type public.asset_condition as enum (
  'Baik',
  'Perlu Perhatian',
  'Perlu Perbaikan',
  'Tidak Layak Digunakan'
);
create type public.inspection_state as enum ('Due', 'Overdue', 'Completed');
create type public.follow_up_state as enum ('Tidak ada', 'Terbuka', 'Ditugaskan', 'Selesai');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'Petugas K3',
  role public.user_role not null default 'inspector',
  created_at timestamptz not null default now()
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  asset_code text not null unique,
  name text not null,
  equipment_type text not null,
  location text not null,
  location_detail text,
  qr_token uuid not null unique default gen_random_uuid(),
  current_condition public.asset_condition not null default 'Baik',
  inspection_status public.inspection_state not null default 'Due',
  last_inspected_at timestamptz,
  next_inspection_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inspections (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete restrict,
  inspector_id uuid not null references public.profiles(id) on delete restrict,
  condition public.asset_condition not null,
  finding_count integer not null default 0 check (finding_count >= 0),
  captured_at timestamptz not null,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.inspection_answers (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  question_key text not null,
  question_label text not null,
  answer_value text not null,
  is_flagged boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  unique (inspection_id, question_key),
  check ((is_flagged = false) or (note is not null and length(trim(note)) > 0))
);

create table public.inspection_photos (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null unique references public.inspections(id) on delete cascade,
  storage_path text not null unique,
  captured_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete restrict,
  inspection_id uuid not null unique references public.inspections(id) on delete cascade,
  priority text not null check (priority in ('Rendah', 'Sedang', 'Tinggi', 'Kritis')),
  recommendation text not null,
  status public.follow_up_state not null default 'Terbuka',
  assigned_to uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  check ((status = 'Selesai' and resolved_at is not null) or status <> 'Selesai')
);

create index inspections_asset_submitted_idx on public.inspections(asset_id, submitted_at desc);
create index inspections_inspector_idx on public.inspections(inspector_id, submitted_at desc);
create index follow_ups_status_idx on public.follow_ups(status, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger assets_set_updated_at
before update on public.assets
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', 'Petugas K3'))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.has_management_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('supervisor', 'technician')
  );
$$;

-- Semua tabel API dilindungi RLS.
alter table public.profiles enable row level security;
alter table public.assets enable row level security;
alter table public.inspections enable row level security;
alter table public.inspection_answers enable row level security;
alter table public.inspection_photos enable row level security;
alter table public.follow_ups enable row level security;

revoke all on public.profiles, public.assets, public.inspections,
  public.inspection_answers, public.inspection_photos, public.follow_ups
  from anon;
grant select on public.profiles, public.assets, public.inspections,
  public.inspection_answers, public.inspection_photos, public.follow_ups
  to authenticated;
grant insert on public.inspections, public.inspection_answers,
  public.inspection_photos to authenticated;
grant insert, update, delete on public.assets, public.follow_ups to authenticated;

create policy "Users read own profile"
on public.profiles for select to authenticated
using (id = auth.uid() or public.has_management_role());

create policy "Authenticated users read assets"
on public.assets for select to authenticated using (true);

create policy "Managers manage assets"
on public.assets for all to authenticated
using (public.has_management_role())
with check (public.has_management_role());

create policy "Authenticated users read inspections"
on public.inspections for select to authenticated using (true);

create policy "Inspectors insert their own inspections"
on public.inspections for insert to authenticated
with check (inspector_id = auth.uid());

create policy "Authenticated users read answers"
on public.inspection_answers for select to authenticated using (true);

create policy "Inspector inserts answers for own inspection"
on public.inspection_answers for insert to authenticated
with check (
  exists (
    select 1 from public.inspections i
    where i.id = inspection_id and i.inspector_id = auth.uid()
  )
);

create policy "Authenticated users read inspection photo metadata"
on public.inspection_photos for select to authenticated using (true);

create policy "Inspector inserts photo metadata for own inspection"
on public.inspection_photos for insert to authenticated
with check (
  exists (
    select 1 from public.inspections i
    where i.id = inspection_id and i.inspector_id = auth.uid()
  )
);

create policy "Authenticated users read follow ups"
on public.follow_ups for select to authenticated using (true);

create policy "Managers manage follow ups"
on public.follow_ups for all to authenticated
using (public.has_management_role())
with check (public.has_management_role());

-- Bucket foto privat. File hanya dapat diakses pengguna terautentikasi.
insert into storage.buckets (id, name, public)
values ('inspection-evidence', 'inspection-evidence', false)
on conflict (id) do nothing;

create policy "Authenticated users read evidence"
on storage.objects for select to authenticated
using (bucket_id = 'inspection-evidence');

create policy "Users upload their own evidence"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'inspection-evidence'
  and owner_id = auth.uid()
);

create policy "Users delete their own evidence"
on storage.objects for delete to authenticated
using (
  bucket_id = 'inspection-evidence'
  and owner_id = auth.uid()
);

-- Data awal untuk demo: tiga objek 3D yang akan diberi label QR.
insert into public.assets (
  asset_code, name, equipment_type, location, location_detail,
  current_condition, inspection_status, next_inspection_at
) values
  ('APAR-RKT-01', 'APAR Dry Chemical 3 kg', 'APAR', 'Area Produksi A', 'Dekat Panel A-03', 'Baik', 'Due', current_date),
  ('HELM-PRD-01', 'Helm Safety Putih', 'Helm Safety', 'Area Produksi A', 'Rak APD Utama', 'Baik', 'Due', current_date),
  ('SEPATU-PRD-01', 'Sepatu Safety Toe Cap', 'Sepatu Safety', 'Area Produksi A', 'Loker APD', 'Baik', 'Due', current_date)
on conflict (asset_code) do nothing;

-- Setelah akun pertama login, jadikan akun itu supervisor lewat SQL berikut.
-- Ganti emailnya, lalu jalankan sekali:
-- update public.profiles
-- set role = 'supervisor'
-- where id = (select id from auth.users where email = 'email-kamu@example.com');
