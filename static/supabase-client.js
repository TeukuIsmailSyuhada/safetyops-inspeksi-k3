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

function isSupervisor() {
  return currentProfile?.role === 'supervisor';
}

function activeChecks() {
  if (chosen && chosen[I.type] === 'Helm Safety') return helmChecks;
  if (chosen && chosen[I.type] === 'Sepatu Safety') return shoeChecks;
  if (chosen && chosen[I.type] === 'Arc Flash Suit') return arcFlashChecks;
  return aparChecks;
}

items = () => activeChecks().flatMap(section => section[1]);
checklist = function (app) {
  const done = filled();
  const total = items().length;
  const condition = done ? rule() : '';
  const type = esc(chosen[I.type]);
  app.innerHTML = `<button class="back" onclick="go('photo')">${icon('left',16)}Kembali ke foto</button><div class="panel" style="max-width:820px;margin:auto"><div class="hd"><div class="dhead"><div><h2>Checklist ${type}</h2><p>Aset ${esc(chosen[I.code])} · Langkah 3 dari 4 · ${done}/${total} pemeriksaan selesai</p></div>${condition ? cond(condition) : '<span class="sub">Belum dinilai</span>'}</div><div class="progress"><i style="width:75%"></i></div></div><div class="body"><div class="hint">${icon('info', 17)}<span><b>Isi sesuai kondisi aktual.</b> Status akhir dihitung dari checklist, bukan dari foto.</span></div>${activeChecks().map(section => `<section class="section"><h3>${esc(section[0])}</h3><p>Lengkapi setiap pemeriksaan pada bagian ini.</p>${section[1].map(question).join('')}</section>`).join('')}<div class="sticky"><button class="btn outline" onclick="go('photo')">← Sebelumnya</button><button class="btn" ${done === total && noteOK() ? '' : 'disabled'} onclick="go('review')">Review hasil →</button></div></div></div>`;
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
  if (subtitle && signedInUser) {
    const roleLabel = isSupervisor() ? 'Supervisor' : 'Inspector';
    subtitle.innerHTML = `Sistem Inspeksi Alat K3<br><b>${esc(currentProfile?.full_name || signedInUser.email)} · ${roleLabel}</b><button class="signout" onclick="signOutSafetyOps()">${icon('logout', 15)}Keluar</button>`;
  }
  if (view === 'assets') {
    const header = document.querySelector('#app .top');
    const primary = header?.querySelector(':scope > .btn');
    if (header && primary && isSupervisor() && !document.querySelector('#add-asset-button')) {
      const controls = document.createElement('div');
      controls.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
      controls.innerHTML = isSupervisor()
        ? `<button class="btn outline" id="add-asset-button" onclick="openAssetManager()">${icon('plus', 18)}Tambah aset</button>`
        : '<button class="btn outline" id="add-asset-button" disabled title="Akses ini tersedia untuk akun Supervisor.">+ Tambah aset · Supervisor</button>';
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
  app.innerHTML = `<button class="back" onclick="go('assets')">${icon('left',16)}Kembali ke daftar alat</button>${head('Tambah aset K3', 'Supervisor mendaftarkan aset baru. Sistem akan membuat identitas QR unik secara otomatis.')}
    <div class="panel" style="max-width:780px"><div class="body"><div class="hint">${icon('info', 17)}<span><b>Catatan audit.</b> Aset tidak dihapus permanen. Jika sudah tidak digunakan, arsipkan aset dari halaman detail.</span></div>
    <form id="asset-form" onsubmit="saveAsset(event)"><div class="grid two"><label>Kode aset<input class="field" style="width:100%;margin-top:5px" name="asset_code" required maxlength="50" placeholder="Contoh: APAR-RKT-02"></label><label>Jenis alat<select class="field" style="width:100%;margin-top:5px" name="equipment_type" required><option value="APAR">APAR</option><option value="Helm Safety">Helm Safety</option><option value="Sepatu Safety">Sepatu Safety</option><option value="Arc Flash Suit">Arc Flash Suit</option></select></label><label>Nama aset<input class="field" style="width:100%;margin-top:5px" name="name" required maxlength="160" placeholder="Contoh: APAR Dry Chemical 3 kg"></label><label>Lokasi<input class="field" style="width:100%;margin-top:5px" name="location" required maxlength="160" placeholder="Contoh: Area Produksi A"></label></div><label style="display:block;margin-top:14px">Detail lokasi<input class="field" style="width:100%;margin-top:5px" name="location_detail" maxlength="250" placeholder="Contoh: Dekat Panel A-03"></label><div class="actions"><button type="button" class="btn outline" onclick="go('assets')">Batal</button><button class="btn" type="submit">${icon('qr', 18)}Simpan &amp; buat QR</button></div></form></div></div>`;
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
    downloadButton.className = 'btn outline';
    downloadButton.style.cssText = 'display:block;width:100%;margin-top:8px';
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
    .auth-cover{position:fixed;inset:0;z-index:20;overflow:auto;background:#061a3f;font-family:'IBM Plex Sans',"Segoe UI",Arial,sans-serif;color:#0d1521}
    .auth-layout{min-height:100vh;display:grid;grid-template-columns:minmax(0,1.06fr) minmax(0,.94fr)}

    /* ---- LEFT: industrial hero ---- */
    .auth-hero{position:relative;display:flex;flex-direction:column;justify-content:space-between;padding:52px 56px;color:#fff;overflow:hidden;background:#0a2a63}
    .auth-hero>*{position:relative;z-index:2}
    .auth-hero:before{content:"";position:absolute;inset:0;z-index:0;background:linear-gradient(158deg,#124a9e 0%,#0a2f70 44%,#061a3f 100%)}
    .auth-hero:after{content:"";position:absolute;inset:0;z-index:1;opacity:.5;background-image:linear-gradient(#ffffff14 1px,transparent 1px),linear-gradient(90deg,#ffffff14 1px,transparent 1px),url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 300' preserveAspectRatio='none'%3E%3Cg fill='%23041229'%3E%3Crect x='0' y='214' width='1200' height='86'/%3E%3Crect x='38' y='120' width='74' height='94'/%3E%3Crect x='58' y='58' width='22' height='62'/%3E%3Crect x='148' y='152' width='112' height='62'/%3E%3Crect x='298' y='88' width='38' height='126'/%3E%3Crect x='358' y='140' width='92' height='74'/%3E%3Crect x='498' y='48' width='28' height='166'/%3E%3Crect x='556' y='118' width='124' height='96'/%3E%3Crect x='718' y='160' width='82' height='54'/%3E%3Crect x='838' y='78' width='34' height='136'/%3E%3Crect x='898' y='130' width='104' height='84'/%3E%3Crect x='1048' y='168' width='114' height='46'/%3E%3C/g%3E%3C/svg%3E");background-size:52px 52px,52px 52px,100% 42%;background-position:0 0,0 0,bottom center;background-repeat:repeat,repeat,no-repeat}
    .auth-hero .brand{display:flex;gap:11px;align-items:center;color:#fff;font-weight:700;font-size:16px;padding:0}
    .auth-hero .logo{display:grid;place-items:center;width:36px;height:36px;flex:none;border-radius:7px;background:#ffc21a;color:#1a1204}
    .auth-hero-in{margin:auto 0}
    .auth-kicker{display:flex;align-items:center;gap:12px;color:#ffc21a;font-size:11.5px;font-weight:800;letter-spacing:.14em;margin:0 0 18px}
    .auth-kicker i{display:block;width:46px;height:3px;background:#ffc21a;border-radius:2px}
    .auth-hero h1{font-size:clamp(34px,3.6vw,52px);line-height:1.06;letter-spacing:-.03em;margin:0 0 20px;font-weight:700;text-transform:uppercase}
    .auth-hero h1 em{display:block;font-style:italic;color:#ffc21a}
    .auth-hero>.auth-hero-in>p{margin:0;color:#c3d3ec;max-width:440px;font-size:15px;line-height:1.6}
    .auth-hero p b{display:block;margin-top:6px;color:#fff;font-weight:600;letter-spacing:.01em}
    .auth-chips{display:flex;gap:12px;flex-wrap:wrap;margin:38px 0 0}
    .auth-chips .chip{border:1px solid #ffffff2e;background:#ffffff14;backdrop-filter:blur(3px);border-radius:8px;padding:12px 16px;min-width:132px}
    .auth-chips b{display:block;font-size:13.5px;font-weight:700;color:#fff}
    .auth-chips span{display:block;font-size:11.5px;color:#a9c0e0;margin-top:2px}
    .auth-copy{font-size:10.5px;letter-spacing:.09em;color:#7f9ac4;font-weight:600}

    /* ---- RIGHT: form panel ---- */
    .auth-box{display:flex;flex-direction:column;justify-content:space-between;background:#fff;padding:44px 52px 28px}
    .auth-box-in{margin:auto 0;width:100%;max-width:390px;margin-left:auto;margin-right:auto}
    .auth-mark{display:flex;gap:10px;align-items:center;font-weight:700;font-size:19px;letter-spacing:-.02em;color:#0b2f6b;margin-bottom:30px}
    .auth-mark .logo{display:grid;place-items:center;width:34px;height:34px;flex:none;border-radius:7px;background:#ffc21a;color:#1a1204}
    .auth-box h2{font-size:27px;letter-spacing:-.025em;margin:0 0 6px;font-weight:700}
    .auth-box>.auth-box-in>p{color:#5d6b7f;margin:0 0 22px;font-size:13.5px;line-height:1.55}
    .auth-switch{display:grid;grid-template-columns:1fr 1fr;background:#eef1f5;border-radius:8px;padding:4px;margin-bottom:20px}
    .auth-switch button{border:0;border-radius:6px;background:transparent;color:#5d6b7f;padding:10px;cursor:pointer;font:inherit;font-weight:700;font-size:13.5px;min-height:40px;transition:background .18s,color .18s}
    .auth-switch button.active{background:#fff;color:#0b2f6b;box-shadow:0 1px 3px #0d152122}
    .auth-role-label{font-size:12px;font-weight:700;margin:0 0 8px}
    .auth-role{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:18px}
    .auth-role button{display:flex;flex-direction:column;align-items:flex-start;gap:3px;min-height:62px;text-align:left;border:1.5px solid #d3dae5;background:#fff;border-radius:8px;padding:10px 12px;cursor:pointer;color:#0d1521;font:inherit;font-weight:700;font-size:13px;transition:border-color .18s,background .18s}
    .auth-role button:hover{border-color:#9fb0c9}
    .auth-role button span{font-size:11px;color:#5d6b7f;font-weight:400;line-height:1.35}
    .auth-role button.active{border-color:#0b2f6b;background:#f2f6fd;box-shadow:inset 0 0 0 1px #0b2f6b}
    .auth-box label{display:block;font-size:12.5px;font-weight:700;margin:15px 0 6px}
    .auth-box label i{color:#dc2626;font-style:normal}
    .auth-input{position:relative}
    .auth-box input{width:100%;height:48px;border:1.5px solid #d3dae5;border-radius:8px;padding:0 13px;background:#fff;font:inherit;font-size:14px;color:#0d1521}
    .auth-box input::placeholder{color:#9aa7b8}
    .auth-box input:hover{border-color:#9fb0c9}
    .auth-box input:focus{outline:3px solid #1d4ed833;border-color:#0b2f6b}
    .auth-input input{padding-right:46px}
    .auth-eye{position:absolute;right:4px;top:4px;width:40px;height:40px;display:grid;place-items:center;border:0;background:transparent;color:#5d6b7f;cursor:pointer;border-radius:6px}
    .auth-eye:hover{color:#0b2f6b;background:#eef1f5}
    .auth-forgot{display:block;text-align:right;margin-top:8px;font-size:12px;color:#0b2f6b;font-weight:600;background:0;border:0;padding:0;cursor:pointer}
    .auth-forgot:hover{text-decoration:underline}
    .auth-error{min-height:18px;color:#b91c1c;font-size:12.5px;font-weight:600;margin-top:12px}
    .auth-submit{width:100%;margin-top:6px;min-height:50px;background:#0b2f6b;border:2px solid #0b2f6b;color:#fff;border-radius:8px;font:inherit;font-weight:700;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:background .18s,border-color .18s}
    .auth-submit:hover{background:#123e88;border-color:#123e88}
    .auth-submit:focus-visible,.auth-switch button:focus-visible,.auth-role button:focus-visible,.auth-eye:focus-visible,.auth-forgot:focus-visible{outline:3px solid #1d4ed8;outline-offset:2px}
    .auth-sep{display:flex;align-items:center;gap:12px;margin:22px 0 14px;color:#8a97a8;font-size:11.5px;font-weight:700}
    .auth-sep:before,.auth-sep:after{content:"";flex:1;height:1px;background:#e2e7ee}
    .auth-help{display:flex;gap:9px;align-items:flex-start;font-size:12px;color:#5d6b7f;line-height:1.55;background:#f6f8fb;border:1px solid #e2e7ee;border-radius:8px;padding:11px 13px}
    .auth-foot{display:flex;justify-content:space-between;gap:12px;font-size:11px;color:#8a97a8;padding-top:20px;border-top:1px solid #eef1f5;margin-top:24px}

    @media(max-width:900px){.auth-layout{grid-template-columns:1fr}.auth-hero{padding:34px 26px 30px;min-height:auto}.auth-hero h1{font-size:30px}.auth-chips,.auth-copy{display:none}.auth-hero-in{margin:22px 0 0}.auth-box{padding:30px 24px 22px}.auth-box-in{max-width:none}.auth-kicker{font-size:10.5px;letter-spacing:.1em;gap:9px;margin-bottom:14px}.auth-kicker i{width:26px;height:2px}}
    @media(prefers-reduced-motion:reduce){.auth-cover *{transition-duration:.01ms!important}}
  </style>`);
}

showAuth = function (message = '', mode = 'login') {
  authMode = mode;
  injectLandingAuthStyle();
  document.querySelector('#auth-cover')?.remove();
  document.body.insertAdjacentHTML('beforeend', `<section class="auth-cover" id="auth-cover" aria-label="Masuk SafetyOps Inspect"><div class="auth-layout">
    <aside class="auth-hero">
      <div class="brand"><span class="logo">${icon('shield', 21)}</span>SafetyOps Inspect</div>
      <div class="auth-hero-in">
        <p class="auth-kicker"><i></i>KESELAMATAN &amp; KEPATUHAN K3</p>
        <h1>Satu Platform<em>Untuk Semua</em>Inspeksi Alat K3.</h1>
        <p>Sistem inspeksi berbasis QR Code untuk APAR, Hydrant, P3K, Eyewash, dan APD di seluruh area kerja.<b>Scan. Periksa. Terdokumentasi.</b></p>
        <div class="auth-chips">
          <div class="chip"><b>Scan QR</b><span>Identitas alat</span></div>
          <div class="chip"><b>Foto &amp; Checklist</b><span>Bukti lapangan</span></div>
          <div class="chip"><b>Riwayat</b><span>Tersimpan aman</span></div>
        </div>
      </div>
      <div class="auth-copy">© 2026 SAFETYOPS INSPECT · SISTEM INSPEKSI ALAT K3</div>
    </aside>
    <main class="auth-box">
      <div class="auth-box-in">
        <div class="auth-mark"><span class="logo">${icon('shield', 20)}</span>SafetyOps</div>
        <h2 id="auth-title">Selamat Datang!</h2>
        <p id="auth-description">Masukkan email dan password petugas untuk mengakses Dashboard SafetyOps.</p>
        <div class="auth-switch"><button type="button" id="auth-login-tab" class="active" onclick="setAuthMode('login')">Masuk</button><button type="button" id="auth-signup-tab" onclick="setAuthMode('signup')">Daftar Akun</button></div>
        <div id="auth-role-wrap"><p class="auth-role-label">Masuk sebagai</p><div class="auth-role"><button type="button" id="role-inspector" onclick="setRequestedRole('inspector')">Inspector<span>Foto, checklist, dan inspeksi</span></button><button type="button" id="role-supervisor" onclick="setRequestedRole('supervisor')">Supervisor<span>Kelola aset dan tindak lanjut</span></button></div></div>
        <form onsubmit="submitCurrentAuth(event)">
          <div id="auth-name-group" style="display:none"><label for="auth-name">Nama lengkap <i>*</i></label><input id="auth-name" autocomplete="name" placeholder="Nama petugas K3"></div>
          <label for="auth-email">Email <i>*</i></label>
          <input id="auth-email" type="email" autocomplete="email" required placeholder="nama@perusahaan.com">
          <label for="auth-password">Password <i>*</i></label>
          <div class="auth-input"><input id="auth-password" type="password" autocomplete="current-password" required minlength="8" placeholder="Masukkan password"><button type="button" class="auth-eye" id="auth-eye" onclick="togglePassword()" aria-label="Tampilkan password" title="Tampilkan password">${icon('eye', 19)}</button></div>
          <button type="button" class="auth-forgot" id="auth-forgot" onclick="forgotPassword()">Lupa password?</button>
          <div class="auth-error" id="auth-error" role="alert">${esc(message)}</div>
          <button class="auth-submit" id="auth-submit" type="submit">Masuk</button>
        </form>
        <div class="auth-sep">PETUGAS BARU?</div>
        <div class="auth-help">${icon('info', 16)}<span>Daftar akun terlebih dahulu, lalu verifikasi email dari Supabase sebelum masuk. Akun baru otomatis berperan <b>Inspector</b>.</span></div>
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
  document.querySelector('#auth-title').textContent = isSignup ? 'Buat Akun Petugas' : 'Selamat Datang!';
  document.querySelector('#auth-description').textContent = isSignup ? 'Akun baru terdaftar sebagai Inspector dan perlu verifikasi email sebelum dapat masuk.' : 'Masukkan email dan password petugas untuk mengakses Dashboard SafetyOps.';
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
    // Data contoh (40 aset) tetap dipertahankan bila Supabase belum berisi aset,
    // supaya dashboard, rekap, dan demo tidak tampil kosong.
    if (remoteAssets.length) assets.splice(0, assets.length, ...remoteAssets);
    else showMessage('Supabase belum berisi aset. Menampilkan 40 aset contoh untuk demo.');
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
