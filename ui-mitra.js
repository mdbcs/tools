// ============================================================
// ui-mitra.js — Halaman Data Mitra
// ============================================================

const UIMitra = {
  filterBrandId: null,
  searchKeyword: '',
  editingPartnerId: null,

  async render(container) {
    container.innerHTML = this._renderLoadingInline();

    await Promise.all([Brands.fetchAll(), Partners.fetchAll()]);
    this._renderContent(container);
  },

  _renderLoadingInline() {
    return `<div class="loading-screen" style="height:50vh;"><div class="loading-spinner"></div></div>`;
  },

  _renderContent(container) {
    const user = AppState.currentUser;
    const canEdit = user.role === 'owner' || user.role === 'cs_admin_verifikasi';

    const filtered = Partners.search(this.searchKeyword)
      .filter(p => !this.filterBrandId || (p.partner_brands || []).some(pb => pb.brand_id === this.filterBrandId && pb.aktif));

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Data Mitra</h1>
          <p class="page-subtitle">${AppState.partners.length} mitra terdaftar &middot; database tunggal untuk semua brand</p>
        </div>
        ${canEdit ? `<button class="btn btn-primary" id="btn-add-partner">+ Tambah Mitra</button>` : ''}
      </div>

      <div class="brand-filter-row">
        <button class="brand-filter-chip ${!this.filterBrandId ? 'active' : ''}" id="filter-all" style="${!this.filterBrandId ? 'background:var(--ink-900)' : ''}">Semua Brand</button>
        ${AppState.brands.map(b => `
          <button class="brand-filter-chip ${this.filterBrandId === b.id ? 'active' : ''}"
            data-brand-id="${b.id}"
            style="${this.filterBrandId === b.id ? `background:${b.warna_hex}` : ''}">
            ${escapeHtml(b.nama)}
          </button>
        `).join('')}
      </div>

      <div class="card">
        <div style="padding:16px 16px 0;">
          <div class="toolbar">
            <input type="text" class="search-input" id="search-mitra" placeholder="Cari nama, kode, atau nomor telepon..." value="${escapeHtml(this.searchKeyword)}" />
          </div>
        </div>
        ${this._renderTable(filtered, canEdit)}
      </div>

      <div id="modal-root"></div>
    `;

    this._bindEvents(container, canEdit);
  },

  _renderTable(partners, canEdit) {
    if (partners.length === 0) {
      return `
        <div class="table-empty">
          <div class="table-empty-icon">🔍</div>
          <div>Belum ada mitra yang cocok dengan pencarian ini.</div>
        </div>`;
    }

    return `
      <div style="overflow-x:auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Nama Mitra</th>
              <th>Telepon</th>
              <th>Ekspedisi</th>
              <th>Brand Terdaftar</th>
              ${canEdit ? '<th></th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${partners.map(p => this._renderRow(p, canEdit)).join('')}
          </tbody>
        </table>
      </div>`;
  },

  _renderRow(p, canEdit) {
    const brandPills = (p.partner_brands || [])
      .filter(pb => pb.aktif)
      .map(pb => {
        const brand = Brands.getById(pb.brand_id);
        if (!brand) return '';
        const diskonText = pb.diskon_nilai > 0
          ? ` · ${pb.diskon_tipe === 'persen' ? pb.diskon_nilai + '%' : formatRupiah(pb.diskon_nilai)}`
          : '';
        return `<span class="brand-pill" style="background:${brand.warna_hex}" title="${escapeHtml(brand.nama)}${diskonText}">${escapeHtml(brand.nama)}${diskonText}</span>`;
      }).join(' ');

    return `
      <tr>
        <td><span style="font-family:var(--font-mono);font-size:12.5px;color:var(--ink-400)">${escapeHtml(p.kode)}</span></td>
        <td><strong>${escapeHtml(p.nama)}</strong>${p.alamat ? `<div style="font-size:12px;color:var(--ink-400);margin-top:2px;">${escapeHtml(p.alamat)}</div>` : ''}</td>
        <td>${escapeHtml(p.telp || '-')}</td>
        <td>${escapeHtml(p.ekspedisi || '-')}</td>
        <td><div style="display:flex;gap:4px;flex-wrap:wrap;">${brandPills || '<span style="color:var(--ink-400);font-size:12.5px;">Belum ada</span>'}</div></td>
        ${canEdit ? `
          <td>
            <div class="row-actions">
              <button class="icon-btn" data-edit="${p.id}" title="Edit">✏️</button>
              <button class="icon-btn" data-deactivate="${p.id}" title="Nonaktifkan">🗑️</button>
            </div>
          </td>` : ''}
      </tr>`;
  },

  _bindEvents(container, canEdit) {
    document.getElementById('filter-all').addEventListener('click', () => {
      this.filterBrandId = null;
      this._renderContent(container);
    });

    container.querySelectorAll('[data-brand-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.filterBrandId = btn.dataset.brandId;
        this._renderContent(container);
      });
    });

    const searchInput = document.getElementById('search-mitra');
    const debouncedSearch = debounce((val) => {
      this.searchKeyword = val;
      this._renderContent(container);
      // refocus search box setelah re-render supaya user bisa lanjut ngetik
      const el = document.getElementById('search-mitra');
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }, 350);
    searchInput.addEventListener('input', (e) => debouncedSearch(e.target.value));

    if (canEdit) {
      document.getElementById('btn-add-partner')?.addEventListener('click', () => this._openModal(null));
      container.querySelectorAll('[data-edit]').forEach(btn => {
        btn.addEventListener('click', () => this._openModal(btn.dataset.edit));
      });
      container.querySelectorAll('[data-deactivate]').forEach(btn => {
        btn.addEventListener('click', () => this._confirmDeactivate(btn.dataset.deactivate));
      });
    }
  },

  async _confirmDeactivate(partnerId) {
    const partner = Partners.getById(partnerId);
    if (!confirm(`Nonaktifkan mitra "${partner.nama}"? Data histori order tidak akan terhapus.`)) return;

    try {
      await Partners.deactivate(partnerId);
      showToast('Mitra dinonaktifkan.', 'success');
      this.render(document.getElementById('main-content'));
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  _openModal(partnerId) {
    this.editingPartnerId = partnerId;
    const partner = partnerId ? Partners.getById(partnerId) : null;
    const modalRoot = document.getElementById('modal-root');

    const selectedBrandIds = new Set((partner?.partner_brands || []).filter(pb => pb.aktif).map(pb => pb.brand_id));

    modalRoot.innerHTML = `
      <div class="modal-overlay" id="modal-overlay">
        <div class="modal-box">
          <div class="modal-header">
            <h3 class="modal-title">${partner ? 'Edit Mitra' : 'Tambah Mitra Baru'}</h3>
            <button class="modal-close" id="modal-close">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-field">
              <label>Nama Mitra</label>
              <input type="text" id="f-nama" value="${escapeHtml(partner?.nama || '')}" placeholder="Misal: Toko Sumber Rejeki" />
            </div>
            <div class="form-row">
              <div class="form-field">
                <label>Nomor Telepon</label>
                <input type="text" id="f-telp" value="${escapeHtml(partner?.telp || '')}" placeholder="08xxxxxxxxxx" />
              </div>
              <div class="form-field">
                <label>Ekspedisi Langganan</label>
                <input type="text" id="f-ekspedisi" value="${escapeHtml(partner?.ekspedisi || '')}" placeholder="Misal: JNE, J&T" />
              </div>
            </div>
            <div class="form-field">
              <label>Alamat</label>
              <textarea id="f-alamat" rows="2" placeholder="Alamat lengkap pengiriman">${escapeHtml(partner?.alamat || '')}</textarea>
            </div>
            <div class="form-field">
              <label>Terdaftar di Brand</label>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                ${AppState.brands.map(b => `
                  <label style="display:flex;align-items:center;gap:6px;border:1.5px solid var(--ink-100);padding:7px 12px;border-radius:20px;cursor:pointer;font-size:13px;">
                    <input type="checkbox" data-brand-check="${b.id}" ${selectedBrandIds.has(b.id) ? 'checked' : ''} />
                    ${escapeHtml(b.nama)}
                  </label>
                `).join('')}
              </div>
              <div class="form-hint">Pilih brand mana saja yang dilayani mitra ini.</div>
            </div>
            <div class="form-field">
              <label>Catatan (opsional)</label>
              <textarea id="f-catatan" rows="2" placeholder="Catatan internal tentang mitra ini">${escapeHtml(partner?.catatan || '')}</textarea>
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
      if (!nama) { showToast('Nama mitra wajib diisi.', 'error'); return; }

      const brandIds = Array.from(document.querySelectorAll('[data-brand-check]:checked')).map(el => el.dataset.brandCheck);

      const partnerData = {
        nama,
        telp: document.getElementById('f-telp').value.trim(),
        alamat: document.getElementById('f-alamat').value.trim(),
        ekspedisi: document.getElementById('f-ekspedisi').value.trim(),
        catatan: document.getElementById('f-catatan').value.trim()
      };

      const saveBtn = document.getElementById('modal-save');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Menyimpan...';

      try {
        if (partner) {
          await Partners.update(partner.id, partnerData);
          // Sinkronkan relasi brand: aktifkan yang dicentang, nonaktifkan yang tidak
          for (const b of AppState.brands) {
            const shouldBeActive = brandIds.includes(b.id);
            const wasActive = selectedBrandIds.has(b.id);
            if (shouldBeActive !== wasActive) {
              await Partners.toggleBrandRelation(partner.id, b.id, shouldBeActive);
            }
          }
        } else {
          await Partners.create(partnerData, brandIds);
        }
        showToast('Data mitra tersimpan.', 'success');
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
