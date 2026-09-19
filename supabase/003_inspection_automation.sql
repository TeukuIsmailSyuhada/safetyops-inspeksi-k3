-- SafetyOps Inspect — otomatisasi hasil inspeksi.
-- Jalankan setelah 001_initial_schema.sql berhasil.

create or replace function public.apply_inspection_result()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.assets
  set
    current_condition = new.condition,
    inspection_status = 'Completed',
    last_inspected_at = new.submitted_at
  where id = new.asset_id;

  return new;
end;
$$;

drop trigger if exists inspections_apply_result on public.inspections;
create trigger inspections_apply_result
after insert on public.inspections
for each row execute function public.apply_inspection_result();

drop policy if exists "Inspector creates follow ups for own inspection" on public.follow_ups;
create policy "Inspector creates follow ups for own inspection"
on public.follow_ups for insert to authenticated
with check (
  exists (
    select 1 from public.inspections i
    where i.id = inspection_id and i.inspector_id = auth.uid()
  )
);
