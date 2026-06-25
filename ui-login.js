// ============================================================
// ui-login.js — Render login screen & setup awal
// ============================================================

const UILogin = {
  selectedUserId: null,
  pinBuffer: '',
  errorMsg: '',
  isSetupMode: false,
  availableUsers: [],

  async init() {
    const root = document.getElementById('app');
    root.innerHTML = this._renderLoading('Memeriksa sistem...');

    const hasUser = await Auth.hasAnyUser();

    if (!hasUser) {
      this.isSetupMode = true;
      this.renderSetup();
    } else {
      this.availableUsers = await Auth.fetchActiveUsers();
      this.renderUserPicker();
    }
  },

  _renderLoading(text) {
    return `
      <div class="loading-screen">
        <div class="loading-spinner"></div>
        <div class="loading-text">${escapeHtml(text)}</div>
      </div>`;
  },

  _brandStrip() {
    const colors = ['#6B3416', '#1E4FE0', '#E8332B', '#8B1E1E', '#F2A71B'];
    return `<div class="login-brand-strip">${
      colors.map(c => `<div class="login-brand-dot" style="background:${c}"></div>`).join('')
    }</div>`;
  },

  renderSetup() {
    const root = document.getElementById('app');
    root.innerHTML = `
      <div class="login-screen">
        <div class="login-card">
          ${this._brandStrip()}
          <h1 class="login-title">Setup Awal Sistem</h1>
          <p class="login-subtitle">Belum ada akun. Buat akun Owner pertama untuk mulai memakai sistem.</p>
          <div class="setup-form">
            <div class="form-field">
              <label>Nama Owner</label>
              <input type="text" id="setup-nama" placeholder="Misal: Budi Santoso" autocomplete="off" />
            </div>
            <div class="form-field">
              <label>PIN (4-6 digit angka)</label>
              <input type="password" id="setup-pin" placeholder="Contoh: 1234" inputmode="numeric" maxlength="6" autocomplete="off" />
              <div class="form-hint">Ingat baik-baik PIN ini, dipakai untuk login setiap hari.</div>
            </div>
            <div class="form-field">
              <label>Ulangi PIN</label>
              <input type="password" id="setup-pin-confirm" placeholder="Ulangi PIN" inputmode="numeric" maxlength="6" autocomplete="off" />
            </div>
            <div class="login-error" id="setup-error"></div>
            <button class="btn btn-primary btn-block" id="setup-submit">Buat Akun Owner</button>
          </div>
        </div>
      </div>`;

    document.getElementById('setup-submit').addEventListener('click', () => this._handleSetupSubmit());
  },

  async _handleSetupSubmit() {
    const nama = document.getElementById('setup-nama').value.trim();
    const pin = document.getElementById('setup-pin').value.trim();
    const pinConfirm = document.getElementById('setup-pin-confirm').value.trim();
    const errorEl = document.getElementById('setup-error');

    if (!nama) {
      errorEl.textContent = 'Nama tidak boleh kosong.';
      return;
    }
    if (!isValidPin(pin)) {
      errorEl.textContent = 'PIN harus 4-6 digit angka.';
      return;
    }
    if (pin !== pinConfirm) {
      errorEl.textContent = 'PIN tidak sama. Coba lagi.';
      return;
    }

    errorEl.textContent = '';
    const btn = document.getElementById('setup-submit');
    btn.disabled = true;
    btn.textContent = 'Menyimpan...';

    try {
      const user = await Auth.createFirstOwner(nama, pin);
      Auth.saveSession({ id: user.id, nama: user.nama, role: user.role });
      showToast(`Selamat datang, ${user.nama}!`, 'success');
      await App.bootAfterLogin();
    } catch (e) {
      errorEl.textContent = e.message;
      btn.disabled = false;
      btn.textContent = 'Buat Akun Owner';
    }
  },

  renderUserPicker() {
    const root = document.getElementById('app');

    if (this.availableUsers.length === 0) {
      root.innerHTML = `
        <div class="login-screen">
          <div class="login-card">
            ${this._brandStrip()}
            <h1 class="login-title">Belum Ada CS Aktif</h1>
            <p class="login-subtitle">Hubungi Owner untuk ditambahkan sebagai pengguna sistem.</p>
            <button class="btn btn-secondary btn-block" id="retry-btn">Coba Lagi</button>
          </div>
        </div>`;
      document.getElementById('retry-btn').addEventListener('click', () => this.init());
      return;
    }

    root.innerHTML = `
      <div class="login-screen">
        <div class="login-card">
          ${this._brandStrip()}
          <h1 class="login-title">Selamat Datang</h1>
          <p class="login-subtitle">Pilih nama kamu untuk masuk ke sistem.</p>
          <div class="user-grid">
            ${this.availableUsers.map(u => `
              <button class="user-pick" data-user-id="${u.id}">
                <span class="user-pick-name">${escapeHtml(u.nama)}</span>
                <span class="user-pick-role">${escapeHtml(ROLES[u.role]?.label || u.role)}</span>
              </button>
            `).join('')}
          </div>
          <div id="pin-area"></div>
        </div>
      </div>`;

    document.querySelectorAll('.user-pick').forEach(btn => {
      btn.addEventListener('click', () => this._selectUser(btn.dataset.userId));
    });
  },

  _selectUser(userId) {
    this.selectedUserId = userId;
    this.pinBuffer = '';
    this.errorMsg = '';

    document.querySelectorAll('.user-pick').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.userId === userId);
    });

    this._renderPinPad();
  },

  _renderPinPad() {
    const area = document.getElementById('pin-area');
    const user = this.availableUsers.find(u => u.id === this.selectedUserId);

    area.innerHTML = `
      <div class="pin-section">
        <p class="login-subtitle" style="margin-bottom:0;text-align:center;">Masukkan PIN untuk <strong>${escapeHtml(user.nama)}</strong></p>
        <div class="pin-dots">
          ${[0,1,2,3,4,5].map(i => `<div class="pin-dot ${i < this.pinBuffer.length ? 'filled' : ''}" style="${i >= 4 && this.pinBuffer.length <= 4 ? 'opacity:0.3' : ''}"></div>`).join('')}
        </div>
        <div class="pin-keypad">
          ${[1,2,3,4,5,6,7,8,9].map(n => `<button class="pin-key" data-key="${n}">${n}</button>`).join('')}
          <button class="pin-key pin-key-action" data-key="clear">Hapus</button>
          <button class="pin-key" data-key="0">0</button>
          <button class="pin-key pin-key-action" data-key="submit">OK</button>
        </div>
        <div class="login-error">${escapeHtml(this.errorMsg)}</div>
        <button class="btn-back-link" id="back-to-list">&larr; Pilih nama lain</button>
      </div>`;

    area.querySelectorAll('.pin-key').forEach(btn => {
      btn.addEventListener('click', () => this._handlePinKey(btn.dataset.key));
    });
    document.getElementById('back-to-list').addEventListener('click', () => this.renderUserPicker());
  },

  async _handlePinKey(key) {
    if (key === 'clear') {
      this.pinBuffer = this.pinBuffer.slice(0, -1);
      this._renderPinPad();
      return;
    }
    if (key === 'submit') {
      await this._submitPin();
      return;
    }
    if (this.pinBuffer.length < 6) {
      this.pinBuffer += key;
      this._renderPinPad();
    }
    if (this.pinBuffer.length === 4) {
      // auto-submit di 4 digit untuk kecepatan, kalau salah user bisa tambah/hapus
      setTimeout(() => { if (this.pinBuffer.length === 4) this._submitPin(); }, 150);
    }
  },

  async _submitPin() {
    if (this.pinBuffer.length < 4) {
      this.errorMsg = 'PIN minimal 4 digit.';
      this._renderPinPad();
      return;
    }

    try {
      const user = await Auth.login(this.selectedUserId, this.pinBuffer);
      showToast(`Selamat datang kembali, ${user.nama}!`, 'success');
      await App.bootAfterLogin();
    } catch (e) {
      this.errorMsg = e.message;
      this.pinBuffer = '';
      this._renderPinPad();
    }
  }
};
