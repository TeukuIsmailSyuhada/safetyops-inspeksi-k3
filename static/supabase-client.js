/* SafetyOps Inspect — Supabase browser integration.
 * This file intentionally contains only the publishable browser key.
 * Security is enforced by Supabase Auth and Row Level Security (RLS).
 */
const SUPABASE_URL = 'https://qrxmrvfuveoioxqtylbt.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_A3DO8McXarFCJJvpREJ-9w_v54YXH0I';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
let signedInUser = null;
let currentProfile = null;
let authMode = 'login';
let requestedRole = 'inspector';
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
  if (closeButton && !isSupervisor()) {
    closeButton.disabled = true;
    closeButton.textContent = 'Hanya Supervisor dapat menutup tindak lanjut';
    closeButton.title = 'Akses ini tersedia untuk akun Supervisor.';
  }
};

function renderRoleControls() {
  const subtitle = document.querySelector('.subside');
  if (subtitle && signedInUser) {
    const roleLabel = isSupervisor() ? 'Supervisor' : 'Inspector';
    subtitle.innerHTML = `Sistem Inspeksi Alat K3<br><span style="color:#f2b705;font-weight:600">${esc(currentProfile?.full_name || signedInUser.email)} · ${roleLabel}</span><button onclick="signOutSafetyOps()" style="display:block;border:0;background:transparent;color:#8a94a6;padding:8px 0 0;font:inherit;cursor:pointer">Keluar</button>`;
  }
  if (view === 'assets') {
    const header = document.querySelector('#app .top');
    const primary = header?.querySelector(':scope > .btn');
    if (header && primary && !document.querySelector('#add-asset-button')) {
      const controls = document.createElement('div');
      controls.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
      controls.innerHTML = isSupervisor()
        ? '<button class="btn outline" id="add-asset-button" onclick="openAssetManager()">+ Tambah aset</button>'
        : '<button class="btn outline" id="add-asset-button" disabled title="Akses ini tersedia untuk akun Supervisor.">+ Tambah aset · Supervisor</button>';
      primary.replaceWith(controls);
      controls.append(primary);
    }
  }
  if (view === 'detail' && !document.querySelector('#archive-asset-button')) {
    const printButton = [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Cetak label');
    if (printButton) {
      const archiveButton = document.createElement('button');
      archiveButton.id = 'archive-asset-button';
      archiveButton.className = 'btn outline';
      archiveButton.style.cssText = 'display:block;width:100%;margin-top:8px;color:#b91c1c';
      archiveButton.textContent = isSupervisor() ? 'Arsipkan aset' : 'Arsipkan aset · Supervisor';
      archiveButton.disabled = !isSupervisor();
      archiveButton.title = isSupervisor() ? '' : 'Akses ini tersedia untuk akun Supervisor.';
      if (isSupervisor()) archiveButton.onclick = archiveChosenAsset;
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
  requestedRole = 'inspector';
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

function injectLandingAuthStyle() {
  if (document.querySelector('#auth-landing-style')) return;
  document.head.insertAdjacentHTML('beforeend', `<style id="auth-landing-style">
    .auth-cover{position:fixed;inset:0;z-index:20;overflow:auto;background:#e7e9ed;padding:28px;font-family:'IBM Plex Sans',"Segoe UI",Arial,sans-serif}
    .auth-layout{width:min(1080px,100%);min-height:620px;margin:auto;display:grid;grid-template-columns:1.08fr .92fr;border-radius:6px;overflow:hidden;background:#fff;box-shadow:0 24px 70px #10151f2e;border:1px solid #d9dce2}
    .auth-hero{padding:56px 54px;background:#10151f;color:#fff;display:flex;flex-direction:column;justify-content:center;border-bottom:4px solid #f2b705}.auth-hero .brand{padding:0}.auth-kicker{color:#f2b705;font-size:12px;font-weight:800;letter-spacing:.1em;margin:34px 0 12px}.auth-hero h1{font-size:36px;line-height:1.14;letter-spacing:-.02em;margin:0 0 16px}.auth-hero p{margin:0;color:#c7cfdb;max-width:430px}.auth-points{display:grid;gap:14px;margin:34px 0 0;padding:0;list-style:none}.auth-points li{display:flex;gap:10px;align-items:flex-start;color:#dfe4ea}.auth-points b{display:grid;place-items:center;flex:0 0 22px;height:22px;border-radius:3px;background:#f2b705;color:#191307;font-size:13px;font-weight:900}
    .auth-box{padding:52px 48px;display:flex;flex-direction:column;justify-content:center}.auth-box h2{font-size:26px;letter-spacing:-.015em;margin:0 0 6px;font-weight:700}.auth-box>p{color:#5b6472;margin:0 0 22px}.auth-switch{display:grid;grid-template-columns:1fr 1fr;background:#eef0f2;border-radius:3px;padding:4px;margin-bottom:20px}.auth-switch button{border:0;border-radius:2px;background:transparent;color:#5b6472;padding:9px;cursor:pointer;font-weight:700;min-height:38px}.auth-switch button.active{background:#fff;color:#151a21;box-shadow:0 1px 3px #10151f1a}.auth-role-label{font-size:12px;font-weight:750;margin:0 0 7px}.auth-role{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:17px}.auth-role button{min-height:57px;text-align:left;border:1px solid #c4ccd6;background:#fff;border-radius:3px;padding:9px 10px;cursor:pointer;color:#151a21;font-weight:750}.auth-role button span{display:block;font-size:11px;color:#5b6472;font-weight:400;margin-top:2px}.auth-role button.active{border-color:#f2b705;background:#fdf7e5;color:#151a21;box-shadow:inset 0 0 0 2px #f2b705}.auth-box label{display:block;font-size:12px;font-weight:700;margin:13px 0 5px}.auth-box input{width:100%;height:44px;border:1px solid #c4ccd6;border-radius:3px;padding:0 11px;background:#fff}.auth-box input:focus{outline:3px solid #1d4ed8;border-color:#1d4ed8}.auth-help{font-size:12px;color:#5b6472;margin-top:15px;line-height:1.5}.auth-error{min-height:18px;color:#b91c1c;font-size:12px;margin-top:12px}.auth-submit{width:100%;margin-top:8px}.auth-note{font-size:11px;color:#7b8494;margin:20px 0 0;text-align:center}
    @media(max-width:760px){.auth-cover{padding:0}.auth-layout{min-height:100vh;border:0;border-radius:0;display:block}.auth-hero{padding:30px 24px}.auth-kicker,.auth-points{display:none}.auth-hero h1{font-size:28px;margin-top:20px}.auth-box{padding:31px 24px}.auth-box h2{font-size:24px}}
  </style>`);
}

showAuth = function (message = '', mode = 'login') {
  authMode = mode;
  injectLandingAuthStyle();
  document.querySelector('#auth-cover')?.remove();
  document.body.insertAdjacentHTML('beforeend', `<section class="auth-cover" id="auth-cover" aria-label="Masuk SafetyOps Inspect"><div class="auth-layout"><aside class="auth-hero"><div class="brand"><span class="logo">✓</span>SafetyOps Inspect</div><span class="auth-kicker">SISTEM INSPEKSI ALAT K3</span><h1>Inspeksi lebih tertib, bukti lebih siap.</h1><p>Catat kondisi APAR, helm safety, dan sepatu safety secara konsisten dari perangkat apa pun.</p><ul class="auth-points"><li><b>1</b><span><strong>Scan QR aset</strong><br>Temukan identitas alat yang tepat.</span></li><li><b>2</b><span><strong>Foto & checklist</strong><br>Dokumentasi kondisi aktual di lapangan.</span></li><li><b>3</b><span><strong>Riwayat terlacak</strong><br>Data tersimpan aman untuk tindak lanjut.</span></li></ul></aside><main class="auth-box"><div class="brand" style="color:#151a21;padding:0"><span class="logo">✓</span>SafetyOps</div><h2 id="auth-title" style="margin-top:26px">Masuk ke sistem</h2><p id="auth-description">Gunakan akun petugas yang sudah terdaftar.</p><div class="auth-switch"><button type="button" id="auth-login-tab" class="active" onclick="setAuthMode('login')">Masuk</button><button type="button" id="auth-signup-tab" onclick="setAuthMode('signup')">Daftar akun</button></div><form onsubmit="submitCurrentAuth(event)"><div id="auth-name-group" style="display:none"><label for="auth-name">Nama lengkap</label><input id="auth-name" autocomplete="name" placeholder="Nama petugas"></div><label for="auth-email">Email</label><input id="auth-email" type="email" autocomplete="email" required placeholder="nama@gmail.com"><label for="auth-password">Password</label><input id="auth-password" type="password" autocomplete="current-password" required minlength="8" placeholder="Minimal 8 karakter"><div class="auth-error" id="auth-error">${esc(message)}</div><button class="btn auth-submit" id="auth-submit" type="submit">Masuk</button></form><div class="auth-help">Gunakan email dan password. Saat daftar pertama kali, verifikasi email dari Supabase sebelum masuk.</div><p class="auth-note">Tidak memakai Google Login agar MVP tetap sederhana dan stabil.</p></main></div></section>`);
  document.querySelector('.auth-switch').insertAdjacentHTML('afterend', '<div id="auth-role-wrap"><p class="auth-role-label">Masuk sebagai</p><div class="auth-role"><button type="button" id="role-inspector" onclick="setRequestedRole(\'inspector\')">Inspector<span>Foto, checklist, dan inspeksi</span></button><button type="button" id="role-supervisor" onclick="setRequestedRole(\'supervisor\')">Supervisor<span>Kelola aset dan tindak lanjut</span></button></div></div>');
  setAuthMode(mode);
};

function setAuthMode(mode) {
  authMode = mode;
  const isSignup = mode === 'signup';
  document.querySelector('#auth-title').textContent = isSignup ? 'Buat akun petugas' : 'Masuk ke sistem';
  document.querySelector('#auth-description').textContent = isSignup ? 'Akun baru akan terdaftar sebagai Inspector.' : 'Gunakan akun petugas yang sudah terdaftar.';
  document.querySelector('#auth-name-group').style.display = isSignup ? 'block' : 'none';
  document.querySelector('#auth-name').required = isSignup;
  document.querySelector('#auth-password').autocomplete = isSignup ? 'new-password' : 'current-password';
  document.querySelector('#auth-submit').textContent = isSignup ? 'Daftar akun' : 'Masuk';
  document.querySelector('#auth-login-tab').classList.toggle('active', !isSignup);
  document.querySelector('#auth-signup-tab').classList.toggle('active', isSignup);
  document.querySelector('#auth-role-wrap').style.display = isSignup ? 'none' : 'block';
  if (isSignup) requestedRole = 'inspector';
  setRequestedRole(requestedRole);
  document.querySelector('#auth-error').textContent = '';
}

function setRequestedRole(role) {
  requestedRole = role;
  document.querySelector('#role-inspector')?.classList.toggle('active', role === 'inspector');
  document.querySelector('#role-supervisor')?.classList.toggle('active', role === 'supervisor');
}

function submitCurrentAuth(event) {
  event.preventDefault();
  authSubmit(authMode);
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
    errorBox.style.color = '#15803d';
    errorBox.textContent = 'Pendaftaran berhasil. Buka email untuk verifikasi, lalu masuk.';
    return;
  }
  signedInUser = result.data.user;
  const loaded = await loadRemoteData();
  if (!loaded || !currentProfile) {
    await sb.auth.signOut();
    signedInUser = null;
    currentProfile = null;
    errorBox.textContent = 'Profil akun belum dapat dimuat. Coba masuk kembali beberapa saat lagi.';
    return;
  }
  if (mode === 'login' && currentProfile.role !== requestedRole) {
    const actualRole = currentProfile.role === 'supervisor' ? 'Supervisor' : 'Inspector';
    await sb.auth.signOut();
    signedInUser = null;
    currentProfile = null;
    showAuth(`Akun ini terdaftar sebagai ${actualRole}. Pilih peran yang sesuai untuk masuk.`, 'login');
    return;
  }
  document.querySelector('#auth-cover')?.remove();
}

function readableError(error) {
  if (/invalid login/i.test(error)) return 'Email atau password belum benar.';
  if (/email not confirmed/i.test(error)) return 'Email belum diverifikasi. Periksa inbox atau spam.';
  if (/already registered/i.test(error)) return 'Email sudah terdaftar. Gunakan tombol Masuk.';
  return 'Tidak dapat memproses permintaan. Periksa koneksi lalu coba lagi.';
}

function showMessage(message, type = 'info') {
  document.querySelector('#safetyops-message')?.remove();
  const color = type === 'error' ? '#b91c1c' : '#1e3a8a';
  const background = type === 'error' ? '#fbe7e7' : '#e8effc';
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
    return true;
  } catch (error) {
    console.error(error);
    showMessage('Data Supabase belum dapat dimuat. Periksa login dan koneksi, lalu muat ulang halaman.', 'error');
    return false;
  }
}

submit = async function () {
  if (!signedInUser) return showAuth('Silakan masuk terlebih dahulu.');
  if (!photo) return showMessage('Foto kondisi alat wajib diambil sebelum submit.', 'error');
  view = 'process'; draw();
  const capturedAt = new Date();
  const path = `${signedInUser.id}/${chosen[I.id]}-${capturedAt.getTime()}.jpg`;
  let uploadedPath = null;
  try {
    const condition = rule();
    const flaggedItems = items().filter(item => flagged(answers[item[0]]));
    const answerRows = items().map(item => ({ question_key: item[0], question_label: item[1], answer_value: answers[item[0]], is_flagged: flagged(answers[item[0]]), note: flagged(answers[item[0]]) ? notes[item[0]].trim() : null }));
    const blob = await (await fetch(photo)).blob();
    const uploaded = await sb.storage.from('inspection-evidence').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
    if (uploaded.error) throw uploaded.error;
    uploadedPath = path;
    const priority = condition === 'Tidak Layak Digunakan' ? 'Kritis' : condition === 'Perlu Perbaikan' ? 'Tinggi' : 'Sedang';
    const recommendation = condition === 'Tidak Layak Digunakan' ? 'Hentikan penggunaan sementara dan lakukan perbaikan sebelum inspeksi ulang.' : 'Jadwalkan pemeriksaan/perbaikan komponen dan lakukan inspeksi ulang.';
    // Satu panggilan RPC atomik: inspeksi, jawaban, foto, tindak lanjut, dan
    // pembaruan kondisi aset semuanya dalam satu transaksi Postgres — kalau
    // satu langkah gagal, semuanya dibatalkan (lihat 005_atomic_inspection_submit.sql).
    const rpc = await sb.rpc('submit_inspection', {
      p_asset_id: chosen[I.id],
      p_condition: condition,
      p_captured_at: capturedAt.toISOString(),
      p_photo_storage_path: path,
      p_answers: answerRows,
      p_priority: flaggedItems.length ? priority : null,
      p_recommendation: flaggedItems.length ? recommendation : null
    });
    if (rpc.error) throw rpc.error;
    record = { id: rpc.data, assetId: chosen[I.id], condition };
    await loadRemoteData();
    chosen = assets.find(asset => asset[I.id] === record.assetId) || chosen;
    view = 'result'; draw();
    showMessage('Inspeksi tersimpan dan dapat dilihat dari perangkat lain.');
  } catch (error) {
    console.error(error);
    if (uploadedPath) await sb.storage.from('inspection-evidence').remove([uploadedPath]).catch(() => {});
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
