// ============================================================
// utils.js — Fungsi bantu yang dipakai banyak modul
// ============================================================

// Hash PIN sederhana pakai Web Crypto API (SHA-256), bukan plain text.
// Catatan: ini bukan tingkat keamanan perbankan, tapi cukup untuk
// mencegah PIN terbaca langsung kalau ada yang melihat isi database.
async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode('franchise-salt-2026:' + pin); // salt statis sederhana
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Format Rupiah
function formatRupiah(angka) {
  const n = Number(angka) || 0;
  return 'Rp' + n.toLocaleString('id-ID', { maximumFractionDigits: 0 });
}

// Format tanggal Indonesia singkat (misal: 25 Jun 2026)
function formatTanggal(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const bulan = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

// Generate kode unik sederhana dengan prefix, misal kode mitra MTR-0001
function generateKode(prefix, existingCodes) {
  let n = 1;
  const set = new Set(existingCodes);
  while (set.has(`${prefix}-${String(n).padStart(4, '0')}`)) n++;
  return `${prefix}-${String(n).padStart(4, '0')}`;
}

// Debounce — supaya search/filter tidak query Supabase tiap ketikan
function debounce(fn, delay = 300) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// Tampilkan toast notifikasi sederhana
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('toast-show'));

  setTimeout(() => {
    toast.classList.remove('toast-show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Escape HTML untuk mencegah XSS sederhana saat render data user ke DOM
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

// Validasi PIN: harus 4-6 digit angka
function isValidPin(pin) {
  return /^\d{4,6}$/.test(pin);
}
