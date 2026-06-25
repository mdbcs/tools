// ============================================================
// config.js — Koneksi Supabase & konstanta global
// ============================================================

const SUPABASE_URL = 'https://qjfsshalpntcaxycemfl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqZnNzaGFscG50Y2F4eWNlbWZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMjMzMjEsImV4cCI6MjA5Nzg5OTMyMX0.U8onuh2JA-cQAvklV-dIERdnDRm60MLf7LYodUkXc2U';

// Inisialisasi client Supabase sekali, dipakai di semua modul.
// PENTING: nama variabel sengaja "sb" (bukan "supabase") karena SDK CDN
// sudah memakai nama global "supabase" (window.supabase) untuk dirinya
// sendiri — pakai nama yang sama bisa memicu konflik deklarasi di
// beberapa browser/kondisi loading.
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Role yang tersedia di sistem
const ROLES = {
  owner: { label: 'Owner', desc: 'Akses penuh ke semua fitur' },
  cs_repeat_order: { label: 'CS - Repeat Order', desc: 'Input order berulang dari mitra' },
  cs_follow_up: { label: 'CS - Follow Up', desc: 'Follow up mitra & status order' },
  cs_admin_verifikasi: { label: 'CS - Admin/Verifikasi', desc: 'Verifikasi & administrasi order' }
};

// Key untuk localStorage (session login disimpan lokal per device)
const SESSION_KEY = 'franchise_app_session';

// ============================================================
// STATE GLOBAL — single source of truth, dipakai semua modul
// ============================================================
const AppState = {
  currentUser: null,     // { id, nama, role }
  brands: [],            // cache daftar brand
  partners: [],          // cache daftar mitra
  products: [],          // cache daftar produk (semua brand)
  aliases: [],           // cache alias produk
  isLoading: false,

  listeners: [],         // subscriber pattern sederhana untuk re-render UI

  subscribe(fn) {
    this.listeners.push(fn);
  },

  notify() {
    this.listeners.forEach(fn => fn());
  }
};
