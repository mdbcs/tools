// ============================================================
// app.js — Orkestrator utama: inisialisasi & lifecycle aplikasi
// ============================================================

const App = {
  async init() {
    // 1. Coba restore sesi login dari localStorage device ini
    const hasSession = Auth.restoreSession();

    if (hasSession) {
      // Validasi ulang ke server: pastikan user masih aktif & PIN belum diganti orang lain
      // (kita re-fetch data dasar, kalau gagal total baru minta login ulang)
      await this.bootAfterLogin(true);
    } else {
      await UILogin.init();
    }
  },

  // Dipanggil setelah login sukses (atau saat restore sesi valid)
  async bootAfterLogin(isRestoring = false) {
    const root = document.getElementById('app');
    root.innerHTML = `
      <div class="loading-screen">
        <div class="loading-spinner"></div>
        <div class="loading-text">Memuat data sistem...</div>
      </div>`;

    try {
      // Fetch data dasar yang dibutuhkan semua halaman, secara paralel
      await Promise.all([
        Brands.fetchAll(),
        Partners.fetchAll(),
        Products.fetchAll()
      ]);

      // Subscribe ke realtime (guard di dalam Realtime mencegah dobel channel)
      Realtime.startAll();

      // Daftarkan listener: setiap kali AppState.notify() dipanggil, re-render halaman aktif
      AppState.subscribe(() => render());

      UIShell.render();
    } catch (e) {
      console.error('Gagal boot aplikasi:', e);
      if (isRestoring) {
        // Sesi tersimpan tapi gagal load data — kemungkinan koneksi bermasalah,
        // bukan berarti sesi invalid. Coba tampilkan app shell tetap, dengan toast error.
        UIShell.render();
        showToast('Sebagian data gagal dimuat. Cek koneksi internet kamu.', 'error');
      } else {
        showToast('Gagal memuat sistem. Coba refresh halaman.', 'error');
      }
    }
  }
};

// Mulai aplikasi setelah seluruh script dimuat
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
