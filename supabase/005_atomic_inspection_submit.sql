-- SafetyOps Inspect — submit inspeksi secara atomik.
-- Jalankan setelah 004_asset_lifecycle.sql.
--
-- Masalah yang diperbaiki: sebelumnya trigger `inspections_apply_result`
-- (003) langsung memperbarui kondisi aset begitu baris `inspections`
-- ter-insert, padahal jawaban checklist, foto, dan tindak lanjut baru
-- di-insert belakangan dari browser (beberapa panggilan terpisah). Jika
-- salah satu insert berikutnya gagal (koneksi putus, constraint note
-- kosong, dsb.), aset sudah kadung ditandai selesai dengan kondisi baru
-- tanpa checklist/foto yang lengkap tersimpan.
--
-- Perbaikan: seluruh langkah (inspeksi, jawaban, foto, tindak lanjut,
-- pembaruan kondisi aset) sekarang dilakukan dalam satu fungsi Postgres,
-- sehingga satu transaksi — jika satu langkah gagal, semuanya dibatalkan
-- dan kondisi aset tidak berubah sama sekali.

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
