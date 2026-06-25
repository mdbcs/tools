// ============================================================
// ui-cs.js — Halaman Manajemen CS (khusus Owner)
// ============================================================

const UICs = {
  async render(container) {
    container.innerHTML = `<div class="loading-screen" style="height:50vh;"><div class="loading-spinner"></div></div>`;
    const users = await Auth.fetchActiveUsers();
    this._renderContent(container, users);
  },

  _renderContent(container, users) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Manajemen CS</h1>
          <p class="page-subtitle">Kelola akun CS yang bisa login ke sistem ini</p>
        </div>
        <button class="btn btn-primary" id="btn-add-cs">+ Tambah CS</button>
      </div>

      <div class="card">
        ${users.length === 0 ? `
          <div class="table-empty">
            <div class="table-empty-icon">🔑</div>
            <div>Belum ada CS terdaftar.</div>
          </div>` : `
          <table class="data-table">
            <thead>
              <tr><th>Nama</th><th>Role</th><th></th></tr>
            </thead>
            <tbody>
              ${users.map(u => `
                <tr>
                  <td><strong>${escapeHtml(u.nama)}</strong></td>
                  <td>${escapeHtml(ROLES[u.role]?.label || u.role)}</td>
                  <td>
                    <div class="row-actions">
                      ${u.id !== AppState.currentUser.id ? `<button class="icon-btn" data-deactivate="${u.id}" title="Nonaktifkan">🗑️</button>` : `<span style="font-size:12px;color:var(--ink-400);">Ini kamu</span>`}
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>`}
      </div>

      <div id="modal-root"></div>
    `;

    document.getElementById('btn-add-cs').addEventListener('click', () => this._openModal());
    container.querySelectorAll('[data-deactivate]').forEach(btn => {
      btn.addEventListener('click', () => this._confirmDeactivate(btn.dataset.deactivate));
    });
  },

  async _confirmDeactivate(userId) {
    if (!confirm('Nonaktifkan CS ini? Mereka tidak akan bisa login lagi, tapi histori order tetap tersimpan.')) return;
    try {
      await Auth.deactivateUser(userId);
      showToast('CS dinonaktifkan.', 'success');
      this.render(document.getElementById('main-content'));
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  _openModal() {
    const modalRoot = document.getElementById('modal-root');
    const roleOptions = Object.entries(ROLES).filter(([key]) => key !== 'owner');

    modalRoot.innerHTML = `
      <div class="modal-overlay" id="modal-overlay">
        <div class="modal-box">
          <div class="modal-header">
            <h3 class="modal-title">Tambah CS Baru</h3>
            <button class="modal-close" id="modal-close">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-field">
              <label>Nama CS</label>
              <input type="text" id="f-nama" placeholder="Misal: Siti Aminah" />
            </div>
            <div class="form-field">
              <label>Role / Tools</label>
              <select id="f-role">
                ${roleOptions.map(([key, val]) => `<option value="${key}">${val.label} — ${val.desc}</option>`).join('')}
              </select>
            </div>
            <div class="form-row">
              <div class="form-field">
                <label>PIN (4-6 digit)</label>
                <input type="password" id="f-pin" inputmode="numeric" maxlength="6" placeholder="1234" />
              </div>
              <div class="form-field">
                <label>Ulangi PIN</label>
                <input type="password" id="f-pin-confirm" inputmode="numeric" maxlength="6" placeholder="1234" />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="modal-cancel">Batal</button>
            <button class="btn btn-primary" id="modal-save">Simpan</button>
          </div>
        </div>
      </div>`;

    const closeModal = () => { modalRoot.innerHTML = ''; };
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-cancel').addEventListener('click', closeModal);
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'modal-overlay') closeModal();
    });

    document.getElementById('modal-save').addEventListener('click', async () => {
      const nama = document.getElementById('f-nama').value.trim();
      const role = document.getElementById('f-role').value;
      const pin = document.getElementById('f-pin').value.trim();
      const pinConfirm = document.getElementById('f-pin-confirm').value.trim();

      if (!nama) { showToast('Nama wajib diisi.', 'error'); return; }
      if (!isValidPin(pin)) { showToast('PIN harus 4-6 digit angka.', 'error'); return; }
      if (pin !== pinConfirm) { showToast('PIN tidak sama.', 'error'); return; }

      const saveBtn = document.getElementById('modal-save');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Menyimpan...';

      try {
        await Auth.createUser(nama, pin, role);
        showToast('CS baru berhasil ditambahkan.', 'success');
        closeModal();
        this.render(document.getElementById('main-content'));
      } catch (e) {
        showToast(e.message, 'error');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Simpan';
      }
    });
  }
};
