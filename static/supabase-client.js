/* SafetyOps Inspect — Supabase browser integration.
 * This file intentionally contains only the publishable browser key.
 * Security is enforced by Supabase Auth and Row Level Security (RLS).
 */
const SUPABASE_URL = 'https://qrxmrvfuveoioxqtylbt.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_A3DO8McXarFCJJvpREJ-9w_v54YXH0I';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
let signedInUser = null;
let currentProfile = null;
const qrTokens = new Map();

const helmChecks = [
  ['Kondisi Fisik', [
    ['shell', 'Cangkang helm', 'Tidak retak, penyok, berubah warna, atau terkena bahan kimia.', ['Baik', 'Perlu Perhatian', 'Tidak Baik']],
    ['label', 'Label dan masa berlaku', 'Label standar dan tanggal pemeriksaan terbaca.', ['Berlaku', 'Mendekati jatuh tempo', 'Lewat jatuh tempo']]
  ]],
  ['Komponen', [
    ['suspension', 'Suspensi bagian dalam', 'Suspensi terpasang kuat dan tidak robek.', ['Baik', 'Perlu Perhatian', 'Tidak Baik']],
    ['strap', 'Chin strap', 'Tali dagu, pengunci, dan penyesuai berfungsi baik.', ['Baik', 'Perlu Perhatian', 'Tidak Baik']]
  ]]
];
const shoeChecks = [
  ['Kondisi Fisik', [
    ['upper', 'Bagian atas sepatu', 'Tidak robek, lepas, atau terkontaminasi bahan berbahaya.', ['Baik', 'Perlu Perhatian', 'Tidak Baik']],
    ['sole', 'Sol anti-slip', 'Sol tidak aus berlebihan dan tidak terlepas.', ['Baik', 'Perlu Perhatian', 'Tidak Baik']]
  ]],
  ['Komponen Pelindung', [
    ['toe', 'Pelindung ujung kaki', 'Toe cap tidak penyok atau retak.', ['Baik', 'Perlu Perhatian', 'Tidak Baik']],
    ['laces', 'Tali dan pengunci', 'Tali sepatu atau pengunci berfungsi baik.', ['Baik', 'Perlu Perhatian', 'Tidak Baik']]
  ]]
];
const aparChecks = checks;
const originalDraw = draw;
const originalList = list;
const originalDetail = detail;
const originalResult = result;

function isSupervisor() {
  return currentProfile?.role === 'supervisor';
}

function activeChecks() {
  if (chosen && chosen[I.type] === 'Helm Safety') return helmChecks;
  if (chosen && chosen[I.type] === 'Sepatu Safety') return shoeChecks;
  return aparChecks;
}

items = () => activeChecks().flatMap(section => section[1]);
checklist = function (app) {
  const done = filled();
  const total = items().length;
  const condition = done ? rule() : '';
  const type = esc(chosen[I.type]);
  app.innerHTML = `<button class="back" onclick="go('photo')">← Kembali ke foto</button><div class="panel" style="max-width:820px;margin:auto"><div class="hd"><div class="dhead"><div><h2>Checklist ${type}</h2><p>Aset ${esc(chosen[I.code])} · Langkah 3 dari 4 · ${done}/${total} pemeriksaan selesai</p></div>${condition ? cond(condition) : '<span class="sub">Belum dinilai</span>'}</div><div class="progress"><i style="width:75%"></i></div></div><div class="body"><div class="hint"><b>Isi sesuai kondisi aktual.</b> Status akhir dihitung dari checklist, bukan dari foto.</div>${activeChecks().map(section => `<section class="section"><h3>${esc(section[0])}</h3><p>Lengkapi setiap pemeriksaan pada bagian ini.</p>${section[1].map(question).join('')}</section>`).join('')}<div class="sticky"><button class="btn outline" onclick="go('photo')">← Sebelumnya</button><button class="btn" ${done === total && noteOK() ? '' : 'disabled'} onclick="go('review')">Review hasil →</button></div></div></div>`;
};

draw = function () {
  if (view === 'assetManage') return assetManager(document.querySelector('#app'));
  originalDraw();
  renderRoleControls();
  requestAnimationFrame(() => {
    if (view === 'detail') renderRealQr();
  });
};

list = function (app) {
  originalList(app);
};

detail = function (app) {
  originalDetail(app);
};

result = function (app) {
  originalResult(app);
  const closeButton = [...app.querySelectorAll('button')].find(button => button.textContent.includes('Tandai tindak lanjut selesai'));
  if (closeButton && !isSupervisor()) closeButton.remove();
};

function renderRoleControls() {
  const subtitle = document.querySelector('.subside');
  if (subtitle && signedInUser) {
    const roleLabel = isSupervisor() ? 'Supervisor' : 'Inspector';
    subtitle.innerHTML = `Sistem Inspeksi Alat K3<br><span style="color:#c5daf7">${esc(currentProfile?.full_name || signedInUser.email)} · ${roleLabel}</span><button onclick="signOutSafetyOps()" style="display:block;border:0;background:transparent;color:#94add0;padding:8px 0 0;font:inherit;cursor:pointer">Keluar</button>`;
  }
  if (view === 'assets' && isSupervisor()) {
    const header = document.querySelector('#app .top');
    const primary = header?.querySelector(':scope > .btn');
    if (header && primary && !document.querySelector('#add-asset-button')) {
      const controls = document.createElement('div');
      controls.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
      controls.innerHTML = '<button class="btn outline" id="add-asset-button" onclick="openAssetManager()">+ Tambah aset</button>';
      primary.replaceWith(controls);
      controls.append(primary);
    }
  }
  if (view === 'detail' && isSupervisor() && !document.querySelector('#archive-asset-button')) {
    const printButton = [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Cetak label');
    if (printButton) {
      const archiveButton = document.createElement('button');
      archiveButton.id = 'archive-asset-button';
      archiveButton.className = 'btn outline';
      archiveButton.style.cssText = 'display:block;width:100%;margin-top:8px;color:#9f2d23';
      archiveButton.textContent = 'Arsipkan aset';
      archiveButton.onclick = archiveChosenAsset;
      printButton.parentElement.insertBefore(archiveButton, printButton);
    }
  }
}

function openAssetManager() {
  if (!isSupervisor()) return showMessage('Hanya supervisor yang dapat menambahkan aset.', 'error');
  view = 'assetManage';
  draw();
}

function assetManager(app) {
  if (!isSupervisor()) { view = 'assets'; return draw(); }
  app.innerHTML = `<button class="back" onclick="go('assets')">← Kembali ke daftar alat</button>${head('Tambah aset K3', 'Supervisor mendaftarkan aset baru. Sistem akan membuat identitas QR unik secara otomatis.')}
    <div class="panel" style="max-width:780px"><div class="body"><div class="hint"><b>Catatan audit.</b> Aset tidak dihapus permanen. Jika sudah tidak digunakan, arsipkan aset dari halaman detail.</div>
    <form id="asset-form" onsubmit="saveAsset(event)"><div class="grid two"><label>Kode aset<input class="field" style="width:100%;margin-top:5px" name="asset_code" required maxlength="50" placeholder="Contoh: APAR-RKT-02"></label><label>Jenis alat<select class="field" style="width:100%;margin-top:5px" name="equipment_type" required><option value="APAR">APAR</option><option value="Helm Safety">Helm Safety</option><option value="Sepatu Safety">Sepatu Safety</option></select></label><label>Nama aset<input class="field" style="width:100%;margin-top:5px" name="name" required maxlength="160" placeholder="Contoh: APAR Dry Chemical 3 kg"></label><label>Lokasi<input class="field" style="width:100%;margin-top:5px" name="location" required maxlength="160" placeholder="Contoh: Area Produksi A"></label></div><label style="display:block;margin-top:14px">Detail lokasi<input class="field" style="width:100%;margin-top:5px" name="location_detail" maxlength="250" placeholder="Contoh: Dekat Panel A-03"></label><div class="actions"><button type="button" class="btn outline" onclick="go('assets')">Batal</button><button class="btn" type="submit">Simpan & buat QR</button></div></form></div></div>`;
}

async function saveAsset(event) {
  event.preventDefault();
  if (!isSupervisor()) return showMessage('Hanya supervisor yang dapat menambahkan aset.', 'error');
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form));
  const insert = await sb.from('assets').insert({
    asset_code: values.asset_code.trim().toUpperCase(), name: values.name.trim(), equipment_type: values.equipment_type,
    location: values.location.trim(), location_detail: values.location_detail.trim() || null,
    next_inspection_at: new Date().toISOString().slice(0, 10)
  }).select().single();
  if (insert.error) return showMessage(insert.error.code === '23505' ? 'Kode aset sudah dipakai. Gunakan kode lain.' : 'Aset belum dapat disimpan. Periksa data lalu coba lagi.', 'error');
  await loadRemoteData();
  chosen = assets.find(asset => asset[I.id] === insert.data.id) || assets[0];
  view = 'detail';
  draw();
  showMessage('Aset tersimpan. QR unik siap diunduh dari detail aset.');
}

async function archiveChosenAsset() {
  if (!isSupervisor()) return showMessage('Hanya supervisor yang dapat mengarsipkan aset.', 'error');
  if (!window.confirm(`Arsipkan ${chosen[I.code]}? Riwayat inspeksi tetap tersimpan dan aset dapat dipulihkan dari database.`)) return;
  const archived = await sb.from('assets').update({ is_archived: true, archived_at: new Date().toISOString() }).eq('id', chosen[I.id]);
  if (archived.error) return showMessage('Aset belum dapat diarsipkan.', 'error');
  view = 'assets';
  await loadRemoteData();
  showMessage('Aset diarsipkan. Riwayat inspeksinya tidak dihapus.');
}

async function signOutSafetyOps() {
  await sb.auth.signOut();
  signedInUser = null;
  currentProfile = null;
  showAuth();
}

function renderRealQr() {
  const holder = document.querySelector('.qr');
  const token = qrTokens.get(chosen[I.id]);
  if (!holder || !token || !window.QRCode) return;
  holder.innerHTML = '';
  holder.style.background = '#fff';
  const deepLink = `${window.location.origin}${window.location.pathname}?asset=${encodeURIComponent(token)}`;
  new window.QRCode(holder, { text: deepLink, width: 140, height: 140, correctLevel: window.QRCode.CorrectLevel.M });
  const printButton = [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Cetak label');
  if (printButton && !document.querySelector('#download-qr')) {
    const downloadButton = document.createElement('button');
    downloadButton.id = 'download-qr';
    downloadButton.className = 'btn outline';
    downloadButton.style.cssText = 'display:block;width:100%;margin-top:8px';
    downloadButton.textContent = 'Download QR PNG';
    downloadButton.onclick = downloadQr;
    printButton.parentElement.insertBefore(downloadButton, printButton);
  }
}

function downloadQr() {
  const canvas = document.querySelector('.qr canvas');
  const image = document.querySelector('.qr img');
  const url = canvas ? canvas.toDataURL('image/png') : image?.src;
  if (!url) return showMessage('QR belum siap. Coba lagi beberapa detik.', 'error');
  const link = document.createElement('a');
  link.href = url;
  link.download = `${chosen[I.code]}-qr.png`;
  link.click();
}

function injectAuthStyle() {
  if (document.querySelector('#auth-style')) return;
  document.head.insertAdjacentHTML('beforeend', `<style id="auth-style">
    .auth-cover{position:fixed;inset:0;background:#10213be8;z-index:20;display:grid;place-items:center;padding:18px}
    .auth-box{width:min(430px,100%);background:#fff;border-radius:8px;padding:25px;border:1px solid #d9e2ee;box-shadow:0 18px 50px #0005}
    .auth-box h1{font-size:22px;margin:0 0 5px}.auth-box p{color:#61718a;margin:0 0 18px}.auth-box label{display:block;font-size:12px;font-weight:700;margin:12px 0 5px}.auth-box input{width:100%;height:42px;border:1px solid #c8d4e1;border-radius:4px;padding:0 10px}.auth-help{font-size:12px;color:#61718a;margin-top:12px}.auth-error{min-height:18px;color:#b42318;font-size:12px;margin-top:10px}
  </style>`);
}

function showAuth(message = '') {
  injectAuthStyle();
  document.querySelector('#auth-cover')?.remove();
  document.body.insertAdjacentHTML('beforeend', `<div class="auth-cover" id="auth-cover"><div class="auth-box"><div class="brand" style="color:#152238;padding:0"><span class="logo">✓</span>SafetyOps Inspect</div><h1 style="margin-top:18px">Masuk untuk mulai inspeksi</h1><p>Gunakan akun petugas agar data inspeksi tersimpan dan dapat dipakai lintas perangkat.</p><label for="auth-name">Nama lengkap <span style="font-weight:400">(saat daftar)</span></label><input id="auth-name" autocomplete="name" placeholder="Nama petugas"><label for="auth-email">Email</label><input id="auth-email" type="email" autocomplete="email" placeholder="nama@perusahaan.com"><label for="auth-password">Password</label><input id="auth-password" type="password" autocomplete="current-password" minlength="8" placeholder="Minimal 8 karakter"><div class="auth-error" id="auth-error">${esc(message)}</div><div class="actions" style="margin-top:12px"><button class="btn outline" onclick="authSubmit('signup')">Daftar</button><button class="btn" onclick="authSubmit('login')">Masuk</button></div><div class="auth-help">Saat pendaftaran pertama, cek email verifikasi dari Supabase. Password dan service key tidak pernah disimpan di website.</div></div></div>`);
}

async function authSubmit(mode) {
  const name = document.querySelector('#auth-name')?.value.trim();
  const email = document.querySelector('#auth-email')?.value.trim();
  const password = document.querySelector('#auth-password')?.value;
  const errorBox = document.querySelector('#auth-error');
  if (!email || !password || (mode === 'signup' && !name)) {
    errorBox.textContent = 'Lengkapi nama, email, dan password minimal 8 karakter.';
    return;
  }
  errorBox.textContent = 'Memproses…';
  const result = mode === 'signup'
    ? await sb.auth.signUp({ email, password, options: { data: { full_name: name }, emailRedirectTo: window.location.origin } })
    : await sb.auth.signInWithPassword({ email, password });
  if (result.error) {
    errorBox.textContent = readableError(result.error.message);
    return;
  }
  if (mode === 'signup' && !result.data.session) {
    errorBox.style.color = '#137a47';
    errorBox.textContent = 'Pendaftaran berhasil. Buka email untuk verifikasi, lalu masuk.';
    return;
  }
  signedInUser = result.data.user;
  document.querySelector('#auth-cover')?.remove();
  await loadRemoteData();
}

function readableError(error) {
  if (/invalid login/i.test(error)) return 'Email atau password belum benar.';
  if (/email not confirmed/i.test(error)) return 'Email belum diverifikasi. Periksa inbox atau spam.';
  if (/already registered/i.test(error)) return 'Email sudah terdaftar. Gunakan tombol Masuk.';
  return 'Tidak dapat memproses permintaan. Periksa koneksi lalu coba lagi.';
}

function showMessage(message, type = 'info') {
  document.querySelector('#safetyops-message')?.remove();
  const color = type === 'error' ? '#b42318' : '#24518b';
  const background = type === 'error' ? '#fff0ef' : '#eef5ff';
  document.body.insertAdjacentHTML('beforeend', `<div id="safetyops-message" style="position:fixed;right:16px;bottom:72px;z-index:30;max-width:360px;padding:11px 13px;border:1px solid ${color};border-radius:5px;background:${background};color:${color};font-size:13px">${esc(message)}</div>`);
  setTimeout(() => document.querySelector('#safetyops-message')?.remove(), 5000);
}

function formatDate(value) {
  if (!value) return 'Belum diperiksa';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

async function loadRemoteData() {
  try {
    const [profileResult, assetResult, followResult, inspectionResult] = await Promise.all([
      sb.from('profiles').select('full_name,role').eq('id', signedInUser.id).single(),
      sb.from('assets').select('*').order('asset_code'),
      sb.from('follow_ups').select('asset_id,status,recommendation,created_at').order('created_at', { ascending: false }),
      sb.from('inspections').select('*,assets(asset_code,name),inspection_answers(*),inspection_photos(storage_path,captured_at),follow_ups(status)').order('submitted_at', { ascending: false })
    ]);
    if (profileResult.error) throw profileResult.error;
    if (assetResult.error) throw assetResult.error;
    if (inspectionResult.error) throw inspectionResult.error;
    currentProfile = profileResult.data;
    const latestFollow = new Map();
    (followResult.data || []).forEach(row => { if (!latestFollow.has(row.asset_id)) latestFollow.set(row.asset_id, row); });
    qrTokens.clear();
    const remoteAssets = (assetResult.data || []).filter(row => !row.is_archived).map(row => {
      const follow = latestFollow.get(row.id);
      qrTokens.set(row.id, row.qr_token);
      return [row.id, row.asset_code, row.name, row.equipment_type, row.location, row.location_detail || '—', row.current_condition, row.inspection_status, formatDate(row.last_inspected_at), row.next_inspection_at || '—', 'Petugas K3', follow?.recommendation || 'Tidak ada', follow?.status || 'Tidak ada'];
    });
    assets.splice(0, assets.length, ...remoteAssets);
    const remoteHistory = await Promise.all((inspectionResult.data || []).map(async row => {
      const photoRow = Array.isArray(row.inspection_photos) ? row.inspection_photos[0] : row.inspection_photos;
      let signedPhoto = '';
      if (photoRow?.storage_path) {
        const signed = await sb.storage.from('inspection-evidence').createSignedUrl(photoRow.storage_path, 3600);
        signedPhoto = signed.data?.signedUrl || '';
      }
      const answerMap = {}, noteMap = {};
      (row.inspection_answers || []).forEach(answer => { answerMap[answer.question_key] = answer.answer_value; if (answer.note) noteMap[answer.question_key] = answer.note; });
      const asset = Array.isArray(row.assets) ? row.assets[0] : row.assets;
      const followUp = Array.isArray(row.follow_ups) ? row.follow_ups[0] : row.follow_ups;
      return { id: row.id, assetId: row.asset_id, code: asset?.asset_code || 'Aset', name: asset?.name || '', date: formatDate(row.submitted_at), inspector: 'Petugas K3', condition: row.condition, findings: row.finding_count, follow: followUp?.status || 'Tidak ada', photo: signedPhoto, captured: formatDate(photoRow?.captured_at || row.captured_at), answers: answerMap, notes: noteMap };
    }));
    history.splice(0, history.length, ...remoteHistory);
    const token = new URLSearchParams(window.location.search).get('asset');
    const fromQr = token && assets.find(asset => qrTokens.get(asset[I.id]) === token);
    if (fromQr) { chosen = fromQr; view = 'detail'; }
    else if (!assets.find(asset => asset[I.id] === chosen[I.id])) chosen = assets[0];
    draw();
  } catch (error) {
    console.error(error);
    showMessage('Data Supabase belum dapat dimuat. Periksa login dan koneksi, lalu muat ulang halaman.', 'error');
  }
}

submit = async function () {
  if (!signedInUser) return showAuth('Silakan masuk terlebih dahulu.');
  if (!photo) return showMessage('Foto kondisi alat wajib diambil sebelum submit.', 'error');
  view = 'process'; draw();
  try {
    const condition = rule();
    const flaggedItems = items().filter(item => flagged(answers[item[0]]));
    const capturedAt = new Date();
    const inserted = await sb.from('inspections').insert({ asset_id: chosen[I.id], inspector_id: signedInUser.id, condition, finding_count: flaggedItems.length, captured_at: capturedAt.toISOString() }).select().single();
    if (inserted.error) throw inserted.error;
    const inspectionId = inserted.data.id;
    const answerRows = items().map(item => ({ inspection_id: inspectionId, question_key: item[0], question_label: item[1], answer_value: answers[item[0]], is_flagged: flagged(answers[item[0]]), note: flagged(answers[item[0]]) ? notes[item[0]].trim() : null }));
    const answersInserted = await sb.from('inspection_answers').insert(answerRows);
    if (answersInserted.error) throw answersInserted.error;
    const blob = await (await fetch(photo)).blob();
    const path = `${signedInUser.id}/${inspectionId}.jpg`;
    const uploaded = await sb.storage.from('inspection-evidence').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
    if (uploaded.error) throw uploaded.error;
    const photoInserted = await sb.from('inspection_photos').insert({ inspection_id: inspectionId, storage_path: path, captured_at: capturedAt.toISOString() });
    if (photoInserted.error) throw photoInserted.error;
    if (flaggedItems.length) {
      const priority = condition === 'Tidak Layak Digunakan' ? 'Kritis' : condition === 'Perlu Perbaikan' ? 'Tinggi' : 'Sedang';
      const recommendation = condition === 'Tidak Layak Digunakan' ? 'Hentikan penggunaan sementara dan lakukan perbaikan sebelum inspeksi ulang.' : 'Jadwalkan pemeriksaan/perbaikan komponen dan lakukan inspeksi ulang.';
      const followInserted = await sb.from('follow_ups').insert({ asset_id: chosen[I.id], inspection_id: inspectionId, priority, recommendation, status: 'Terbuka' });
      if (followInserted.error) throw followInserted.error;
    }
    record = { id: inspectionId, assetId: chosen[I.id], condition };
    await loadRemoteData();
    chosen = assets.find(asset => asset[I.id] === record.assetId) || chosen;
    view = 'result'; draw();
    showMessage('Inspeksi tersimpan dan dapat dilihat dari perangkat lain.');
  } catch (error) {
    console.error(error);
    view = 'review'; draw();
    showMessage('Inspeksi belum tersimpan. Periksa koneksi dan coba submit kembali.', 'error');
  }
};

closeFollowup = async function () {
  if (!record?.id) return showMessage('Buka hasil inspeksi yang tersimpan terlebih dahulu.', 'error');
  const updated = await sb.from('follow_ups').update({ status: 'Selesai', resolved_at: new Date().toISOString() }).eq('inspection_id', record.id);
  if (updated.error) return showMessage('Hanya supervisor atau teknisi yang dapat menutup tindak lanjut.', 'error');
  await loadRemoteData();
  showMessage('Tindak lanjut ditandai selesai.');
};

async function bootstrapSupabase() {
  const session = await sb.auth.getSession();
  if (!session.data.session) return showAuth();
  signedInUser = session.data.session.user;
  await loadRemoteData();
}

sb.auth.onAuthStateChange((_event, session) => {
  if (!session) { signedInUser = null; showAuth(); }
});
bootstrapSupabase();
