// ============================================================
// ui-produk.js — Halaman Data Produk & Alias (per brand)
// ============================================================

const UIProduk = {
  filterBrandId: null,
  searchKeyword: '',

  async render(container) {
    container.innerHTML = `<div class="loading-screen" style="height:50vh;"><div class="loading-spinner"></div></div>`;
    await Promise.all([Brands.fetchAll(), Products.fetchAll()]);

    if (!this.filterBrandId && AppState.brands.length > 0) {
      this.filterBrandId = AppState.brands[0].id; // default ke brand pertama supaya tidak overwhelming
    }

    this._renderContent(container);
  },

  _renderContent(container) {
    const filtered = Products.search(this.searchKeyword, this.filterBrandId);
    const activeBrand = Brands.getById(this.filterBrandId);

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Data Produk</h1>
          <p class="page-subtitle">${AppState.products.length} produk dari 5 brand &middot; alias dipakai untuk membaca order dari teks WA</p>
        </div>
        <button class="btn btn-primary" id="btn-add-product">+ Tambah Produk</button>
      </div>

      <div class="brand-filter-row">
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
            <input type="text" class="search-input" id="search-produk" placeholder="Cari nama, kode, kategori, atau alias..." value="${escapeHtml(this.searchKeyword)}" />
          </div>
        </div>
        ${this._renderTable(filtered, activeBrand)}
      </div>

      <div id="modal-root"></div>
    `;

    this._bindEvents(container);
  },

  _renderTable(products, activeBrand) {
    if (products.length === 0) {
      return `
        <div class="table-empty">
          <div class="table-empty-icon">📦</div>
          <div>Belum ada produk untuk ${activeBrand ? escapeHtml(activeBrand.nama) : 'brand ini'}.</div>
        </div>`;
    }

    return `
      <div style="overflow-x:auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Nama Produk</th>
              <th>Kategori</th>
              <th>Satuan</th>
              <th>Harga</th>
              <th>Alias</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${products.map(p => this._renderRow(p)).join('')}
          </tbody>
        </table>
      </div>`;
  },

  _renderRow(p) {
    const aliases = p.product_aliases || [];
    const aliasPreview = aliases.slice(0, 2).map(a => a.alias).join(', ');
    const moreCount = aliases.length - 2;

    return `
      <tr>
        <td><span style="font-family:var(--font-mono);font-size:12.5px;color:var(--ink-400)">${escapeHtml(p.kode)}</span></td>
        <td><strong>${escapeHtml(p.nama)}</strong></td>
        <td>${p.kategori ? escapeHtml(p.kategori) : '<span style="color:var(--ink-400)">-</span>'}</td>
        <td>${escapeHtml(p.satuan)}</td>
        <td>${formatRupiah(p.harga)}</td>
        <td style="font-size:12.5px;color:var(--ink-600);">
          ${aliasPreview || '<span style="color:var(--ink-400)">Belum ada</span>'}${moreCount > 0 ? ` <span style="color:var(--ink-400)">+${moreCount}</span>` : ''}
        </td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" data-edit="${p.id}" title="Edit & Kelola Alias">✏️</button>
            <button class="icon-btn" data-deactivate="${p.id}" title="Nonaktifkan">🗑️</button>
          </div>
        </td>
      </tr>`;
  },

  _bindEvents(container) {
    container.querySelectorAll('[data-brand-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.filterBrandId = btn.dataset.brandId;
        this._renderContent(container);
      });
    });

    const searchInput = document.getElementById('search-produk');
    const debouncedSearch = debounce((val) => {
      this.searchKeyword = val;
      this._renderContent(container);
      const el = document.getElementById('search-produk');
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }, 350);
    searchInput.addEventListener('input', (e) => debouncedSearch(e.target.value));

    document.getElementById('btn-add-product').addEventListener('click', () => this._openModal(null));
    container.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => this._openModal(btn.dataset.edit));
    });
    container.querySelectorAll('[data-deactivate]').forEach(btn => {
      btn.addEventListener('click', () => this._confirmDeactivate(btn.dataset.deactivate));
    });
  },

  async _confirmDeactivate(productId) {
    const product = Products.getById(productId);
    if (!confirm(`Nonaktifkan produk "${product.nama}"? Histori order tidak akan terhapus.`)) return;

    try {
      await Products.deactivate(productId);
      showToast('Produk dinonaktifkan.', 'success');
      this.render(document.getElementById('main-content'));
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  _openModal(productId) {
    const product = productId ? Products.getById(productId) : null;
    const modalRoot = document.getElementById('modal-root');

    modalRoot.innerHTML = `
      <div class="modal-overlay" id="modal-overlay">
        <div class="modal-box">
          <div class="modal-header">
            <h3 class="modal-title">${product ? 'Edit Produk' : 'Tambah Produk Baru'}</h3>
            <button class="modal-close" id="modal-close">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-field">
              <label>Brand</label>
              <select id="f-brand" ${product ? 'disabled' : ''}>
                ${AppState.brands.map(b => `<option value="${b.id}" ${(product?.brand_id === b.id || (!product && this.filterBrandId === b.id)) ? 'selected' : ''}>${escapeHtml(b.nama)}</option>`).join('')}
              </select>
              ${product ? '<div class="form-hint">Brand tidak dapat diubah setelah produk dibuat.</div>' : ''}
            </div>
            <div class="form-field">
              <label>Nama Produk</label>
              <input type="text" id="f-nama" value="${escapeHtml(product?.nama || '')}" placeholder="Misal: Cuanki Keju Pedas" />
            </div>
            <div class="form-field">
              <label>Kategori (header pengelompokan saat parsing WA)</label>
              <input type="text" id="f-kategori" value="${escapeHtml(product?.kategori || '')}" placeholder="Misal: CUANKI" />
              <div class="form-hint">Kalau pesan WA punya header seperti "CUANKI" lalu sub-item di bawahnya, isi kategori ini supaya parser tahu menggabungkannya.</div>
            </div>
            <div class="form-row">
              <div class="form-field">
                <label>Satuan</label>
                <input type="text" id="f-satuan" value="${escapeHtml(product?.satuan || 'pcs')}" placeholder="pcs, gr, kg, pack" />
              </div>
              <div class="form-field">
                <label>Basis Satuan</label>
                <input type="number" id="f-satuan-basis" value="${product?.satuan_basis || 1}" placeholder="100" />
                <div class="form-hint">Misal harga per 100gr, isi 100.</div>
              </div>
            </div>
            <div class="form-row">
              <div class="form-field">
                <label>Harga</label>
                <input type="number" id="f-harga" value="${product?.harga || 0}" placeholder="0" />
              </div>
              <div class="form-field">
                <label>Berat (gram, untuk label)</label>
                <input type="number" id="f-berat" value="${product?.berat_gram || 0}" placeholder="0" />
              </div>
            </div>
            ${product ? this._renderAliasSection(product) : '<div class="form-hint">Alias bisa ditambahkan setelah produk disimpan.</div>'}
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

    if (product) this._bindAliasEvents(product.id);

    document.getElementById('modal-save').addEventListener('click', async () => {
      const nama = document.getElementById('f-nama').value.trim();
      if (!nama) { showToast('Nama produk wajib diisi.', 'error'); return; }

      const productData = {
        brand_id: document.getElementById('f-brand').value,
        nama,
        kategori: document.getElementById('f-kategori').value.trim(),
        satuan: document.getElementById('f-satuan').value.trim() || 'pcs',
        satuan_basis: parseFloat(document.getElementById('f-satuan-basis').value) || 1,
        harga: parseFloat(document.getElementById('f-harga').value) || 0,
        berat_gram: parseFloat(document.getElementById('f-berat').value) || 0
      };

      const saveBtn = document.getElementById('modal-save');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Menyimpan...';

      try {
        if (product) {
          await Products.update(product.id, productData);
        } else {
          const newProduct = await Products.create(productData);
          // Buka kembali modal edit supaya bisa langsung tambah alias
          closeModal();
          showToast('Produk tersimpan. Tambahkan alias jika perlu.', 'success');
          this.render(document.getElementById('main-content'));
          return;
        }
        showToast('Produk tersimpan.', 'success');
        closeModal();
        this.render(document.getElementById('main-content'));
      } catch (e) {
        showToast(e.message, 'error');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Simpan';
      }
    });
  },

  _renderAliasSection(product) {
    const aliases = product.product_aliases || [];
    return `
      <div class="form-field">
        <label>Alias / Keyword Pencocokan</label>
        <div class="alias-chip-list" id="alias-list">
          ${aliases.map(a => `
            <span class="alias-chip">
              ${escapeHtml(a.alias)}
              <button class="alias-chip-remove" data-alias-id="${a.id}">✕</button>
            </span>
          `).join('') || '<span style="color:var(--ink-400);font-size:12.5px;">Belum ada alias.</span>'}
        </div>
        <div class="alias-input-row">
          <input type="text" id="new-alias-input" placeholder="Tambah keyword, misal: keju pedas" />
          <button class="btn btn-secondary btn-sm" id="btn-add-alias">Tambah</button>
        </div>
        <div class="form-hint">Alias dipakai parser untuk mengenali nama produk dari teks WA yang variatif.</div>
      </div>`;
  },

  _bindAliasEvents(productId) {
    const addAlias = async () => {
      const input = document.getElementById('new-alias-input');
      const val = input.value.trim();
      if (!val) return;

      try {
        await Products.addAlias(productId, val);
        input.value = '';
        // Re-render hanya bagian alias supaya tidak menutup modal
        const product = Products.getById(productId);
        document.getElementById('alias-list').outerHTML = this._renderAliasSection(product).match(/<div class="alias-chip-list"[\s\S]*?<\/div>/)[0];
        this._bindAliasEvents(productId);
      } catch (e) {
        showToast(e.message, 'error');
      }
    };

    document.getElementById('btn-add-alias')?.addEventListener('click', addAlias);
    document.getElementById('new-alias-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); addAlias(); }
    });

    document.querySelectorAll('[data-alias-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await Products.removeAlias(btn.dataset.aliasId);
          const product = Products.getById(productId);
          document.getElementById('alias-list').outerHTML = this._renderAliasSection(product).match(/<div class="alias-chip-list"[\s\S]*?<\/div>/)[0];
          this._bindAliasEvents(productId);
        } catch (e) {
          showToast(e.message, 'error');
        }
      });
    });
  }
};
