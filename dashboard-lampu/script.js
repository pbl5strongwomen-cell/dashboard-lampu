/* =====================================================
   script.js : perilaku dashboard lampu kandang
   Alur umum: data disimpan di satu objek (data),
   lalu fungsi render... hanya menampilkannya.
   ===================================================== */

/* ----- 1. DATA CONTOH -----
   NANTI: ganti isi objek ini dengan data dari server, misalnya
   fetch('/api/status') dan fetch('/api/riwayat').
   Fungsi render di bawah tidak perlu diubah, cukup diberi data baru. */
const data = {
  perangkat: { online: true, terakhir: '3 detik lalu' },
  status: { lampu: true, mode: 'auto' },   // mode: 'auto' atau 'manual'
  riwayat: [
    { tanggal: '24 Nov 2026', jam: '06:00:00', sumber: 'Jadwal',    aksi: 'OFF', konfirmasi: 'Berhasil' },
    { tanggal: '24 Nov 2026', jam: '04:00:01', sumber: 'Jadwal',    aksi: 'ON',  konfirmasi: 'Berhasil' },
    { tanggal: '23 Nov 2026', jam: '21:40:12', sumber: 'Dashboard', aksi: 'ON',  konfirmasi: 'Berhasil' },
    { tanggal: '23 Nov 2026', jam: '20:00:00', sumber: 'Jadwal',    aksi: 'OFF', konfirmasi: 'Berhasil' }
  ]
};

/* Profil jadwal. NILAI INI HANYA CONTOH:
   sesuaikan dengan literatur yang dipakai dan arahan dosen. */
const profil = {
  layer: { onPagi: '04:00', offPagi: '06:00', onSore: '18:00', offSore: '20:00' }
};

/* Fungsi pendek untuk mengambil elemen HTML berdasarkan id */
const $ = (id) => document.getElementById(id);

const ZONA = 'Asia/Makassar';   // WITA


/* ----- 2. JAM DAN TANGGAL -----
   Sementara memakai jam perangkat yang membuka halaman.
   NANTI: ganti dengan jam_rtc yang dikirim ESP32 lewat server. */
function tickJam() {
  const now = new Date();
  $('jam').textContent = now
    .toLocaleTimeString('id-ID', { timeZone: ZONA, hour12: false })
    .replace(/\./g, ':');
  $('tanggal').textContent = now.toLocaleDateString('id-ID', {
    timeZone: ZONA, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }) + ' WITA';
}


/* ----- 3. MENAMPILKAN STATUS LAMPU DAN KONEKSI ----- */
function renderStatus() {
  const on = data.status.lampu;
  $('lampDot').classList.toggle('on', on);
  $('statusText').textContent = on ? 'Menyala' : 'Mati';
  $('btnLampu').textContent = on ? 'Matikan lampu' : 'Nyalakan lampu';

  $('badge').classList.toggle('offline', !data.perangkat.online);
  $('badgeText').textContent = data.perangkat.online
    ? 'ESP32 online, ' + data.perangkat.terakhir
    : 'ESP32 offline';
}


/* ----- 4. MENAMPILKAN TABEL RIWAYAT ----- */
function renderRiwayat() {
  const tbody = $('riwayat');
  tbody.replaceChildren();                       // kosongkan tabel dulu

  data.riwayat.forEach((r) => {
    const tr = document.createElement('tr');
    [r.tanggal, r.jam, r.sumber, r.aksi, r.konfirmasi].forEach((nilai, i) => {
      const td = document.createElement('td');
      td.textContent = nilai;
      if (i === 4) td.className = nilai === 'Berhasil' ? 'ok' : 'wait';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}


/* ----- 5. MODE OTOMATIS / MANUAL ----- */
function setMode(mode) {
  const auto = mode === 'auto';
  data.status.mode = mode;

  $('btnAuto').setAttribute('aria-pressed', auto);
  $('btnManual').setAttribute('aria-pressed', !auto);
  $('modeAktif').textContent = auto ? 'Otomatis' : 'Manual';
  $('modeHint').textContent = auto
    ? 'Lampu mengikuti jadwal ON/OFF di bawah.'
    : 'Lampu dikendalikan langsung lewat tombol manual.';

  // Panel yang tidak aktif diredupkan dan tidak bisa diklik
  $('panelAuto').classList.toggle('dim', !auto);
  $('panelAuto').inert = !auto;
  $('panelManual').classList.toggle('dim', auto);
  $('panelManual').inert = auto;
}


/* ----- 6. JADWAL: HITUNG TOTAL JAM LAMPU MENYALA ----- */

// Ubah "04:30" menjadi jumlah menit sejak tengah malam (270)
function menit(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// Lama lampu menyala antara jam ON dan OFF (dalam menit)
function durasi(on, off) {
  let d = menit(off) - menit(on);
  if (d < 0) d += 24 * 60;       // jadwal yang melewati tengah malam
  return d;
}

function hitungTotal() {
  const total = durasi($('onPagi').value, $('offPagi').value)
              + durasi($('onSore').value, $('offSore').value);
  $('total').textContent = 'Lampu buatan menyala ' + Math.floor(total / 60) + ' jam'
    + (total % 60 ? ' ' + (total % 60) + ' menit' : '') + ' per hari.';
}

// Mengisi form dengan profil yang dipilih
function pakaiProfil() {
  const p = profil[$('profil').value];
  if (!p) return;                                 // "Kustom": tidak mengubah apa pun
  Object.keys(p).forEach((k) => { $(k).value = p[k]; });
  hitungTotal();
}


/* ----- 7. FUNGSI PEMBANTU ----- */

// Tanggal dan jam saat ini (untuk baris riwayat baru)
function waktuSekarang() {
  const now = new Date();
  return {
    tanggal: now.toLocaleDateString('id-ID', {
      timeZone: ZONA, day: 'numeric', month: 'short', year: 'numeric'
    }),
    jam: now.toLocaleTimeString('id-ID', { timeZone: ZONA, hour12: false })
      .replace(/\./g, ':')
  };
}

// Pesan singkat di bawah layar
function toast(pesan) {
  const t = $('toast');
  t.textContent = pesan;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}


/* ----- 8. EVENT: APA YANG TERJADI SAAT DIKLIK ----- */

// Pilih mode
$('btnAuto').addEventListener('click', () => setMode('auto'));
$('btnManual').addEventListener('click', () => setMode('manual'));

// Mengubah jam di form: profil kembali "Kustom" dan total dihitung ulang
['onPagi', 'offPagi', 'onSore', 'offSore'].forEach((id) => {
  $(id).addEventListener('input', () => {
    $('profil').value = 'kustom';
    hitungTotal();
  });
});
$('profil').addEventListener('change', pakaiProfil);

// Simpan jadwal
$('btnSimpan').addEventListener('click', () => {
  /* NANTI: kirim ke server, misalnya
     fetch('/api/pengaturan', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         mode: data.status.mode,
         on_pagi: $('onPagi').value,  off_pagi: $('offPagi').value,
         on_sore: $('onSore').value,  off_sore: $('offSore').value
       })
     }); */
  toast('Jadwal disimpan (demo, belum terhubung server)');
});

// Tombol manual nyalakan / matikan lampu
$('btnLampu').addEventListener('click', () => {
  data.status.lampu = !data.status.lampu;

  const w = waktuSekarang();
  const baris = {
    tanggal: w.tanggal,
    jam: w.jam,
    sumber: 'Dashboard',
    aksi: data.status.lampu ? 'ON' : 'OFF',
    konfirmasi: 'Menunggu'
  };
  data.riwayat.unshift(baris);                    // taruh di paling atas

  renderStatus();
  renderRiwayat();

  /* Simulasi konfirmasi dari ESP32 setelah 1 detik.
     NANTI: konfirmasi datang dari server, bukan dari setTimeout. */
  setTimeout(() => { baris.konfirmasi = 'Berhasil'; renderRiwayat(); }, 1000);
});


/* ----- 9. MULAI ----- */
tickJam();
setInterval(tickJam, 1000);    // perbarui jam tiap 1 detik
renderStatus();
renderRiwayat();
setMode('auto');
hitungTotal();
