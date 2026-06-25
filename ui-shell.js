// ============================================================
// ui-shell.js — App shell: sidebar, navigasi, dan router sederhana
// ============================================================

const UIShell = {
  currentPage: 'mitra',

  // Menu per role — owner lihat semua, CS lihat sesuai tools-nya
  getMenuForRole(role) {
    const allMenus = [
      { key: 'mitra', label: 'Data Mitra', icon: '👥', roles: ['owner','cs_repeat_order','cs_follow_up','cs_admin_verifikasi'] },
      { key: 'produk', label: 'Data Produk', icon: '📦', roles: ['owner'] },
      { key: 'cs', label: 'Manajemen CS', icon: '🔑', roles: ['owner'] },
    ];
    return allMenus.filter(m => m.roles.includes(role));
  },

  render() {
    const root = document.getElementById('app');
    const user = AppState.currentUser;
    const menu = this.getMenuForRole(user.role);

    // Kalau halaman aktif tidak tersedia untuk role ini, fallback ke menu pertama
    if (!menu.find(m => m.key === this.currentPage)) {
      this.currentPage = menu[0]?.key || 'mitra';
    }

    root.innerHTML = `
      <div class="app-shell">
        <aside class="sidebar">
          <div class="sidebar-header">
            <div class="sidebar-logo">🍜 Sistem Franchise</div>
            <div class="sidebar-logo-sub">5 Brand · 1 Database</div>
          </div>
          <nav class="sidebar-nav">
            ${menu.map(m => `
              <button class="nav-item ${m.key === this.currentPage ? 'active' : ''}" data-page="${m.key}">
                <span class="nav-icon">${m.icon}</span>
                <span>${m.label}</span>
              </button>
            `).join('')}
          </nav>
          <div class="sidebar-footer">
            <div class="sidebar-user">
              <div>
                <div class="sidebar-user-name">${escapeHtml(user.nama)}</div>
                <div class="sidebar-user-role">${escapeHtml(ROLES[user.role]?.label || user.role)}</div>
              </div>
              <button class="sidebar-logout" id="btn-logout">Keluar</button>
            </div>
          </div>
        </aside>
        <main class="main-content" id="main-content"></main>
      </div>
      <div id="toast-container"></div>
    `;

    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentPage = btn.dataset.page;
        this.render();
      });
    });

    document.getElementById('btn-logout').addEventListener('click', () => {
      Realtime.stopAll();
      Auth.logout();
    });

    this.renderPage();
  },

  renderPage() {
    const container = document.getElementById('main-content');
    if (!container) return;

    switch (this.currentPage) {
      case 'mitra':
        UIMitra.render(container);
        break;
      case 'produk':
        UIProduk.render(container);
        break;
      case 'cs':
        UICs.render(container);
        break;
      default:
        container.innerHTML = `<div class="table-empty">Halaman tidak ditemukan.</div>`;
    }
  }
};

// Fungsi render global, dipanggil AppState.notify() dari modul lain
function render() {
  if (AppState.currentUser) {
    UIShell.renderPage(); // re-render konten saja, sidebar tetap (hindari flicker)
  }
}
