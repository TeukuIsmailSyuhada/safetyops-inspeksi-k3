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
const arcFlashChecks = [
  ['Kondisi Pakaian', [
    ['fabric', 'Material pelindung', 'Tidak robek, berlubang, terbakar, atau terkontaminasi bahan berbahaya.', ['Baik', 'Perlu Perhatian', 'Tidak Baik']],
    ['closure', 'Jahitan dan penutup', 'Jahitan, ritsleting, kancing, dan penutup utuh serta berfungsi.', ['Baik', 'Perlu Perhatian', 'Tidak Baik']]
  ]],
  ['Identifikasi dan Penyimpanan', [
    ['rating', 'Label arc rating dan ukuran', 'Label arc rating serta ukuran terbaca dan sesuai kebutuhan pekerjaan.', ['Berlaku', 'Mendekati jatuh tempo', 'Lewat jatuh tempo']],
    ['storage', 'Kebersihan dan penyimpanan', 'Pakaian bersih, kering, dan disimpan sesuai ketentuan.', ['Baik', 'Perlu Perhatian', 'Tidak Baik']]
  ]]
];
const aparChecks = checks;
const originalDraw = draw;
const originalList = list;
const originalDetail = detail;
const originalResult = result;
const originalGo = go;
let remoteLoadPromise = null;
let realtimeChannel = null;

function isSupervisor() {
  return currentProfile?.role === 'supervisor';
}

function activeChecks() {
  if (chosen && chosen[I.type] === 'Helm Safety') return helmChecks;
  if (chosen && chosen[I.type] === 'Sepatu Safety') return shoeChecks;
  if (chosen && chosen[I.type] === 'Arc Flash Suit') return arcFlashChecks;
  return aparChecks;
}

// Checklist UI lives in index.html; only the question set depends on the equipment type.
sections = activeChecks;
RENDER.assetManage = app => assetManager(app);

draw = function () {
  originalDraw();
  renderRoleControls();
  requestAnimationFrame(() => {
    if (view === 'detail') renderRealQr();
  });
};

// Segarkan halaman data saat navigasi agar perubahan Supabase langsung terlihat.
go = function (nextView) {
  originalGo(nextView);
  if (signedInUser && ['dashboard', 'assets', 'history', 'recap'].includes(nextView)) {
    void loadRemoteData();
  }
};

list = function (app) {
  originalList(app);
};

detail = function (app) {
  originalDetail(app);
};

result = function (app) {
  originalResult(app);
  renderAiCard(app);
  const closeButton = [...app.querySelectorAll('button')].find(button => button.textContent.includes('Tandai tindak lanjut selesai'));
  if (closeButton && !isSupervisor()) {
    closeButton.remove();
  }
};

function renderAiCard(app) {
  if (!record?.aiState || record.assetId !== chosen?.[I.id]) return;
  const sticky = app.querySelector('.sticky');
  if (!sticky) return;
  const card = document.createElement('section');
  card.className = 'panel ai';
  card.style.cssText = 'margin:16px 0';
  if (record.aiState === 'loading') {
    card.innerHTML = `<div class="hd"><div><h2>${icon('sparkle', 18)}Rekomendasi AI sedang disusun…</h2><p>AI merangkum checklist dan catatan temuan.</p></div></div><div class="body"><div class="spin"></div></div>`;
  } else if (record.aiState === 'done') {
    const ai = record.aiRecommendation;
    const level = /kritis/i.test(ai.priority) ? 'unsafe' : /tinggi/i.test(ai.priority) ? 'repair' : /sedang/i.test(ai.priority) ? 'attention' : 'completed';
    card.innerHTML = `<div class="hd"><div><h2>${icon('sparkle', 18)}${esc(ai.summary)}</h2><p>Draf tindak lanjut untuk ${esc(chosen[I.code])}</p></div><span class="pill ${level}">${icon('warn', 13)}Prioritas ${esc(ai.priority)}</span></div><div class="body"><p style="margin:0"><b>Tindakan:</b> ${esc(ai.action)}</p><p class="sub" style="margin:8px 0 0"><b>Dasar:</b> ${esc(ai.rationale)}</p></div><div class="aifoot">${icon('info', 16)}<span>Draf AI · wajib diverifikasi Supervisor atau teknisi sesuai SOP K3.</span></div>`;
  } else {
    card.innerHTML = `<div class="hd"><div><h2>${icon('sparkle', 18)}Rekomendasi AI belum tersedia</h2></div></div><div class="body"><p class="sub" style="margin:0">Rekomendasi rule-based dari checklist tetap menjadi acuan sementara. Periksa konfigurasi AI lalu coba lagi dari hasil inspeksi ini.</p></div>`;
  }
  sticky.parentElement.insertBefore(card, sticky);
}

async function generateAiRecommendation(answerRows, condition) {
  if (!record) return;
  record.aiState = 'loading';
  if (view === 'result') draw();
  try {
    const session = await sb.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) throw new Error('Sesi login tidak tersedia.');
    const response = await fetch('/api/ai-recommendation', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({
        asset: { code: chosen[I.code], name: chosen[I.name], type: chosen[I.type], location: chosen[I.location] },
        condition,
        answers: answerRows.map(answer => ({ question: answer.question_label, value: answer.answer_value, flagged: answer.is_flagged, note: answer.note || '' }))
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.recommendation) throw new Error(data.error || 'AI belum tersedia.');
    record.aiRecommendation = data.recommendation;
    record.aiState = 'done';
  } catch (error) {
    console.error('AI recommendation failed', error);
    record.aiState = 'error';
  }
  if (view === 'result') draw();
}

function renderRoleControls() {
  const subtitle = document.querySelector('.subside');
  const mobileUser = document.querySelector('#muser');
  if (signedInUser) {
    const roleLabel = isSupervisor() ? 'Supervisor' : 'Inspector';
    const name = currentProfile?.full_name || signedInUser.email;
    const initials = String(name).split(/[\s@.]+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('');
    if (subtitle) subtitle.innerHTML = `<div class="user"><span class="avatar" aria-hidden="true">${esc(initials)}</span><span class="grow"><b>${esc(name)}</b><span>${roleLabel}</span></span></div><button class="signout" onclick="signOutSafetyOps()">${icon('logout', 18)}Keluar</button>`;
    if (mobileUser) mobileUser.innerHTML = `<span class="avatar" title="${esc(name)} · ${roleLabel}" aria-hidden="true">${esc(initials)}</span><button class="signout" onclick="signOutSafetyOps()" aria-label="Keluar dari ${esc(name)}">${icon('logout', 18)}Keluar</button>`;
  }
  if (view === 'assets') {
    const header = document.querySelector('#app .top');
    const primary = header?.querySelector(':scope > .btn');
    if (header && primary && isSupervisor() && !document.querySelector('#add-asset-button')) {
      const controls = document.createElement('div');
      controls.className = 'topbtns';
      controls.innerHTML = `<button class="btn outline" id="add-asset-button" onclick="openAssetManager()">${icon('plus', 18)}Tambah aset</button>`;
      primary.replaceWith(controls);
      controls.append(primary);
    }
  }
  if (view === 'detail' && isSupervisor() && !document.querySelector('#archive-asset-button')) {
    const printButton = [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Cetak label');
    if (printButton) {
      const archiveButton = document.createElement('button');
      archiveButton.id = 'archive-asset-button';
      archiveButton.className = 'btn outline danger block';
      archiveButton.textContent = 'Arsipkan aset';
      archiveButton.onclick = archiveChosenAsset;
      printButton.parentElement.append(archiveButton);
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
  app.innerHTML = `<button class="back" onclick="go('assets')">${icon('left', 18)}Daftar alat</button>${head('Tambah aset K3', 'Sistem membuat identitas QR unik secara otomatis setelah aset disimpan.')}
    <div class="panel" style="max-width:780px"><div class="body"><div class="hint" style="margin-top:0">${icon('info', 18)}<span><b>Catatan audit.</b> Aset tidak dihapus permanen. Jika sudah tidak digunakan, arsipkan aset dari halaman detail.</span></div>
    <form id="asset-form" onsubmit="saveAsset(event)"><div class="grid two"><label class="fl">Kode aset <i>*</i><input class="field" name="asset_code" required maxlength="50" placeholder="Contoh: APAR-RKT-02" autocomplete="off"></label><label class="fl">Jenis alat <i>*</i><select class="field" name="equipment_type" required><option value="APAR">APAR</option><option value="Helm Safety">Helm Safety</option><option value="Sepatu Safety">Sepatu Safety</option><option value="Arc Flash Suit">Arc Flash Suit</option></select></label><label class="fl">Nama aset <i>*</i><input class="field" name="name" required maxlength="160" placeholder="Contoh: APAR Dry Chemical 3 kg"></label><label class="fl">Lokasi <i>*</i><input class="field" name="location" required maxlength="160" placeholder="Contoh: Area Produksi A"></label></div><label class="fl" style="margin-top:16px">Detail lokasi<input class="field" name="location_detail" maxlength="250" placeholder="Contoh: Dekat Panel A-03"></label><div class="actions"><button type="button" class="btn outline" onclick="go('assets')">Batal</button><button class="btn" type="submit">${icon('qr', 18)}Simpan &amp; buat QR</button></div></form></div></div>`;
}

async function saveAsset(event) {
  event.preventDefault();
  if (!isSupervisor()) return showMessage('Hanya supervisor yang dapat menambahkan aset.', 'error');
  const form = event.currentTarget;
  const submitButton = form.querySelector('[type="submit"]');
  if (submitButton) submitButton.disabled = true;
  const values = Object.fromEntries(new FormData(form));
  const insert = await sb.from('assets').insert({
    asset_code: values.asset_code.trim().toUpperCase(), name: values.name.trim(), equipment_type: values.equipment_type,
    location: values.location.trim(), location_detail: values.location_detail.trim() || null,
    next_inspection_at: new Date().toISOString().slice(0, 10)
  }).select().single();
  if (insert.error && submitButton) submitButton.disabled = false;
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
  if (realtimeChannel) { await sb.removeChannel(realtimeChannel); realtimeChannel = null; }
  await sb.auth.signOut();
  signedInUser = null;
  currentProfile = null;
  requestedRole = 'inspector';
  showAuth();
}

function renderRealQr() {
  const holder = document.querySelector('.qr');
  // Aset contoh belum punya qr_token dari Supabase; pakai id-nya agar QR demo tetap nyata.
  const token = qrTokens.get(chosen[I.id]) || chosen[I.id];
  if (!holder || !token || !window.QRCode) return;
  holder.innerHTML = '';
  holder.style.background = '#fff';
  const deepLink = `${window.location.origin}${window.location.pathname}?asset=${encodeURIComponent(token)}`;
  new window.QRCode(holder, { text: deepLink, width: 140, height: 140, correctLevel: window.QRCode.CorrectLevel.M });
  const printButton = [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Cetak label');
  if (printButton && !document.querySelector('#download-qr')) {
    const downloadButton = document.createElement('button');
    downloadButton.id = 'download-qr';
    downloadButton.className = 'btn outline block';
    downloadButton.innerHTML = icon('download', 18) + 'Download QR PNG';
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
    .auth-cover{position:fixed;inset:0;z-index:var(--z-auth);overflow:auto;background:var(--bg);color:var(--text);font-family:var(--sans)}
    .auth-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);min-height:100vh}

    /* ---- LEFT: value proposition ---- */
    .auth-hero{position:relative;display:flex;flex-direction:column;justify-content:space-between;gap:32px;padding:48px 56px;overflow:hidden;background:var(--primary);color:#fff}
    .auth-hero:after{content:"";position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(rgb(255 255 255/.06) 1px,transparent 1px),linear-gradient(90deg,rgb(255 255 255/.06) 1px,transparent 1px);background-size:48px 48px}
    .auth-hero>*{position:relative;z-index:1}
    .auth-hero .brand{padding:0;color:#fff}
    .auth-hero .brand small{color:#bfdbfe}
    .auth-hero .logo{background:#fff;color:var(--primary)}
    .auth-hero-in{max-width:480px;margin:auto 0}
    .auth-kicker{display:inline-flex;align-items:center;gap:8px;margin:0 0 20px;padding:6px 12px;border-radius:999px;background:rgb(255 255 255/.12);color:#dbeafe;font-size:14px;font-weight:600}
    .auth-hero h1{margin:0 0 16px;font-size:clamp(32px,3.4vw,46px);font-weight:700;line-height:1.12;letter-spacing:-.025em}
    .auth-hero-in>p{color:#dbeafe;font-size:17px;line-height:1.6}
    .auth-steps{display:grid;gap:12px;margin:32px 0 0;padding:0;list-style:none}
    .auth-steps li{display:flex;align-items:center;gap:14px;padding:14px 16px;border:1px solid rgb(255 255 255/.16);border-radius:12px;background:rgb(255 255 255/.08)}
    .auth-steps .n{display:grid;place-items:center;width:42px;height:42px;flex:none;border-radius:10px;background:#fff;color:var(--primary)}
    .auth-steps b{display:block;font-size:16px}
    .auth-steps span span{display:block;color:#bfdbfe;font-size:14px}
    .auth-copy{color:#bfdbfe;font-size:13px}

    /* ---- RIGHT: form ---- */
    .auth-box{display:flex;flex-direction:column;justify-content:space-between;padding:48px 56px 28px;background:var(--surface)}
    .auth-box-in{width:100%;max-width:400px;margin:auto}
    .auth-box h2{margin:0 0 6px;font-size:28px;letter-spacing:-.02em}
    .auth-box-in>p{margin:0 0 24px;color:var(--muted);font-size:15px}
    .auth-switch{display:grid;grid-template-columns:1fr 1fr;margin-bottom:20px;padding:4px;border-radius:10px;background:var(--sunken)}
    .auth-switch button{min-height:44px;border:0;border-radius:8px;background:transparent;color:var(--muted);font-weight:600;font-size:15px;cursor:pointer;transition:background .15s,color .15s}
    .auth-switch button.active{background:var(--surface);color:var(--text);box-shadow:0 1px 3px rgb(15 23 42/.12)}
    .auth-role-label{margin:0 0 8px;font-size:14px;font-weight:600}
    .auth-role{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:4px}
    .auth-role button{display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-height:64px;padding:12px 14px;border:1.5px solid var(--line-strong);border-radius:10px;background:var(--surface);text-align:left;font-weight:600;font-size:15px;cursor:pointer;transition:border-color .15s,background .15s}
    .auth-role button:hover{border-color:var(--subtle)}
    .auth-role button span{color:var(--muted);font-size:13px;font-weight:400;line-height:1.4}
    .auth-role button.active{border-color:var(--primary);background:var(--primary-soft);box-shadow:inset 0 0 0 1px var(--primary)}
    .auth-box label{display:block;margin:16px 0 6px;font-size:14px;font-weight:600}
    .auth-box label i{color:var(--bad);font-style:normal}
    .auth-input{position:relative}
    .auth-box input{width:100%;height:48px;padding:0 14px;border:1px solid var(--line-strong);border-radius:var(--r);background:var(--surface);font-size:16px}
    .auth-box input::placeholder{color:var(--subtle)}
    .auth-box input:hover{border-color:var(--subtle)}
    .auth-box input:focus{outline:3px solid rgb(37 99 235/.25);outline-offset:0;border-color:var(--ring)}
    .auth-input input{padding-right:52px}
    .auth-eye{position:absolute;top:2px;right:2px;display:grid;place-items:center;width:44px;height:44px;border:0;border-radius:6px;background:transparent;color:var(--muted);cursor:pointer}
    .auth-eye:hover{background:var(--sunken);color:var(--text)}
    .auth-forgot{display:block;min-height:44px;margin:4px 0 0 auto;padding:0;border:0;background:none;color:var(--primary);font-size:14px;font-weight:600;cursor:pointer}
    .auth-forgot:hover{text-decoration:underline}
    .auth-error{min-height:22px;margin:4px 0 8px;color:var(--bad);font-size:14px;font-weight:600}
    .auth-help{display:flex;align-items:flex-start;gap:10px;margin-top:24px;padding:12px 14px;border-radius:var(--r);background:var(--sunken);color:var(--muted);font-size:14px}
    .auth-help .ic{margin-top:1px}
    .auth-foot{display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;margin-top:28px;padding-top:16px;border-top:1px solid var(--line);color:var(--subtle);font-size:13px}
    @media(max-width:900px){.auth-layout{grid-template-columns:1fr}.auth-hero{gap:16px;padding:24px 20px}.auth-hero-in{margin:0}.auth-hero h1{margin-bottom:8px;font-size:26px}.auth-hero-in>p{font-size:15px}.auth-kicker,.auth-steps,.auth-copy{display:none}.auth-box{padding:28px 20px 20px}}
  </style>`);
}

showAuth = function (message = '', mode = 'login') {
  authMode = mode;
  injectLandingAuthStyle();
  document.querySelector('#auth-cover')?.remove();
  document.body.insertAdjacentHTML('beforeend', `<section class="auth-cover" id="auth-cover" aria-label="Masuk SafetyOps Inspect"><div class="auth-layout">
    <aside class="auth-hero">
      <div class="brand"><span class="logo">${icon('shield', 21)}</span><span>SafetyOps<small>Inspeksi Alat K3</small></span></div>
      <div class="auth-hero-in">
        <p class="auth-kicker">${icon('shield', 16)}Keselamatan &amp; kepatuhan K3</p>
        <h1>Inspeksi alat K3 cukup dari HP.</h1>
        <p>Scan QR pada APAR, hydrant, P3K, eyewash, dan APD. Ambil foto, isi checklist, dan semua tercatat otomatis.</p>
        <ol class="auth-steps">
          <li><span class="n">${icon('scan', 22)}</span><span><b>Scan QR alat</b><span>Identitas alat langsung terbuka</span></span></li>
          <li><span class="n">${icon('camera', 22)}</span><span><b>Foto &amp; checklist</b><span>Bukti kondisi di lapangan</span></span></li>
          <li><span class="n">${icon('history', 22)}</span><span><b>Riwayat tersimpan</b><span>Bisa dilihat dari perangkat lain</span></span></li>
        </ol>
      </div>
      <div class="auth-copy">© 2026 SafetyOps Inspect</div>
    </aside>
    <main class="auth-box">
      <div class="auth-box-in">
        <h2 id="auth-title">Selamat datang</h2>
        <p id="auth-description">Masuk dengan email dan password petugas.</p>
        <div class="auth-switch" role="group" aria-label="Pilih mode"><button type="button" id="auth-login-tab" class="active" onclick="setAuthMode('login')">Masuk</button><button type="button" id="auth-signup-tab" onclick="setAuthMode('signup')">Daftar akun</button></div>
        <div id="auth-role-wrap"><p class="auth-role-label" id="auth-role-label">Masuk sebagai</p><div class="auth-role" role="group" aria-labelledby="auth-role-label"><button type="button" id="role-inspector" onclick="setRequestedRole('inspector')">Inspector<span>Foto, checklist, dan inspeksi</span></button><button type="button" id="role-supervisor" onclick="setRequestedRole('supervisor')">Supervisor<span>Kelola aset dan tindak lanjut</span></button></div></div>
        <form onsubmit="submitCurrentAuth(event)" novalidate>
          <div id="auth-name-group" style="display:none"><label for="auth-name">Nama lengkap <i>*</i></label><input id="auth-name" autocomplete="name" placeholder="Nama petugas K3"></div>
          <label for="auth-email">Email <i>*</i></label>
          <input id="auth-email" type="email" inputmode="email" autocomplete="email" required placeholder="nama@perusahaan.com">
          <label for="auth-password">Password <i>*</i></label>
          <div class="auth-input"><input id="auth-password" type="password" autocomplete="current-password" required minlength="8" placeholder="Minimal 8 karakter" aria-describedby="auth-error"><button type="button" class="auth-eye" id="auth-eye" onclick="togglePassword()" aria-label="Tampilkan password" title="Tampilkan password">${icon('eye', 20)}</button></div>
          <button type="button" class="auth-forgot" id="auth-forgot" onclick="forgotPassword()">Lupa password?</button>
          <div class="auth-error" id="auth-error" role="alert">${esc(message)}</div>
          <button class="btn lg block" id="auth-submit" type="submit">Masuk</button>
        </form>
        <div class="auth-help">${icon('info', 18)}<span>Petugas baru? Pilih <b>Daftar akun</b>, lalu verifikasi email sebelum masuk. Akun baru otomatis berperan <b>Inspector</b>.</span></div>
      </div>
      <div class="auth-foot"><span>© 2026 SafetyOps Inspect</span><span>Data dilindungi Row Level Security</span></div>
    </main>
  </div></section>`);
  setAuthMode(mode);
};

function togglePassword() {
  const input = document.querySelector('#auth-password');
  const button = document.querySelector('#auth-eye');
  if (!input || !button) return;
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  button.innerHTML = icon(show ? 'eye-off' : 'eye', 19);
  button.setAttribute('aria-label', show ? 'Sembunyikan password' : 'Tampilkan password');
  button.title = show ? 'Sembunyikan password' : 'Tampilkan password';
}

async function forgotPassword() {
  const email = document.querySelector('#auth-email')?.value.trim();
  const errorBox = document.querySelector('#auth-error');
  if (!email) {
    errorBox.style.color = '';
    errorBox.textContent = 'Isi email terlebih dahulu, lalu tekan Lupa password.';
    return;
  }
  errorBox.style.color = '';
  errorBox.textContent = 'Mengirim tautan…';
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname });
  if (error) {
    errorBox.textContent = 'Tautan atur ulang password belum dapat dikirim. Periksa email lalu coba lagi.';
    return;
  }
  errorBox.style.color = '#14833b';
  errorBox.textContent = `Tautan atur ulang password dikirim ke ${email}. Periksa inbox atau folder spam.`;
}

function setAuthMode(mode) {
  authMode = mode;
  const isSignup = mode === 'signup';
  document.querySelector('#auth-title').textContent = isSignup ? 'Buat akun petugas' : 'Selamat datang';
  document.querySelector('#auth-description').textContent = isSignup ? 'Akun baru terdaftar sebagai Inspector dan perlu verifikasi email sebelum dapat masuk.' : 'Masuk dengan email dan password petugas.';
  document.querySelector('#auth-forgot').style.display = isSignup ? 'none' : 'block';
  document.querySelector('#auth-name-group').style.display = isSignup ? 'block' : 'none';
  document.querySelector('#auth-name').required = isSignup;
  document.querySelector('#auth-password').autocomplete = isSignup ? 'new-password' : 'current-password';
  document.querySelector('#auth-submit').textContent = isSignup ? 'Daftar akun' : 'Masuk';
  document.querySelector('#auth-login-tab').classList.toggle('active', !isSignup);
  document.querySelector('#auth-signup-tab').classList.toggle('active', isSignup);
  document.querySelector('#auth-role-wrap').style.display = isSignup ? 'none' : 'block';
  if (isSignup) requestedRole = 'inspector';
  setRequestedRole(requestedRole);
  const errorBox = document.querySelector('#auth-error');
  errorBox.style.color = '';
  errorBox.textContent = '';
}

function setRequestedRole(role) {
  requestedRole = role;
  ['inspector', 'supervisor'].forEach(name => {
    const button = document.querySelector(`#role-${name}`);
    button?.classList.toggle('active', role === name);
    button?.setAttribute('aria-pressed', role === name);
  });
}

function setAuthBusy(busy) {
  const button = document.querySelector('#auth-submit');
  if (!button) return;
  button.disabled = busy;
  button.textContent = busy ? 'Memproses…' : authMode === 'signup' ? 'Daftar akun' : 'Masuk';
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
  errorBox.style.color = '';
  if (mode === 'signup' && !name) return void (errorBox.textContent = 'Isi nama lengkap petugas.');
  if (!/^\S+@\S+\.\S+$/.test(email || '')) return void (errorBox.textContent = 'Isi email yang valid, contoh: nama@perusahaan.com.');
  if (!password || password.length < 8) return void (errorBox.textContent = 'Password minimal 8 karakter.');
  errorBox.textContent = '';
  setAuthBusy(true);
  const result = mode === 'signup'
    ? await sb.auth.signUp({ email, password, options: { data: { full_name: name }, emailRedirectTo: window.location.origin } })
    : await sb.auth.signInWithPassword({ email, password });
  if (mode === 'signup' || result.error) setAuthBusy(false);
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
    setAuthBusy(false);
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
  const isError = type === 'error';
  document.body.insertAdjacentHTML('beforeend', `<div id="safetyops-message" class="toast${isError ? ' error' : ''}" role="${isError ? 'alert' : 'status'}">${icon(isError ? 'warn' : 'info', 18)}<span>${esc(message)}</span></div>`);
  clearTimeout(showMessage.timer);
  showMessage.timer = setTimeout(() => document.querySelector('#safetyops-message')?.remove(), 5000);
}

function formatDate(value) {
  if (!value) return 'Belum diperiksa';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

async function loadRemoteData() {
  if (!signedInUser) return false;
  if (remoteLoadPromise) return remoteLoadPromise;
  remoteLoadPromise = (async () => {
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
    // Setelah pengguna terautentikasi, Supabase adalah sumber data tunggal.
    // Jangan mempertahankan/mengembalikan aset demo ketika query menghasilkan
    // nol baris; hal itu membuat aset baru terlihat sesaat lalu menghilang.
    assets.splice(0, assets.length, ...remoteAssets);
    if (!remoteAssets.length) showMessage('Belum ada aset aktif di Supabase untuk akun ini.');
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
    else if (!assets.find(asset => asset[I.id] === chosen?.[I.id])) chosen = assets[0] || null;
    finishBoot();
    subscribeRealtime();
    return true;
  } catch (error) {
    console.error(error);
    // Jangan jatuh ke data contoh: tampilkan status gagal agar tidak dikira data asli.
    if (booting) { bootError = true; draw(); }
    showMessage('Data Supabase belum dapat dimuat. Periksa login dan koneksi, lalu muat ulang halaman.', 'error');
    return false;
  }
  })();
  try { return await remoteLoadPromise; } finally { remoteLoadPromise = null; }
}

function subscribeRealtime() {
  if (realtimeChannel || !signedInUser) return;
  realtimeChannel = sb.channel(`safetyops-${signedInUser.id}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, () => { void loadRemoteData(); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'inspections' }, () => { void loadRemoteData(); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'follow_ups' }, () => { void loadRemoteData(); })
    .subscribe();
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
    generateAiRecommendation(answerRows, condition);
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
