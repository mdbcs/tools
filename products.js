// ============================================================
// products.js — Manajemen Produk & Alias per brand
// ============================================================

const Products = {

  async fetchAll() {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_aliases ( id, alias )
      `)
      .order('nama', { ascending: true });

    if (error) {
      console.error('Gagal ambil data produk:', error);
      showToast('Gagal memuat data produk.', 'error');
      return AppState.products;
    }

    if (data) {
      AppState.products = data;
    }
    return AppState.products;
  },

  getById(productId) {
    return AppState.products.find(p => p.id === productId) || null;
  },

  filterByBrand(brandId) {
    if (!brandId) return AppState.products;
    return AppState.products.filter(p => p.brand_id === brandId);
  },

  search(keyword, brandId) {
    let list = this.filterByBrand(brandId);
    if (!keyword) return list;
    const kw = keyword.toLowerCase();
    return list.filter(p =>
      p.nama.toLowerCase().includes(kw) ||
      (p.kode && p.kode.toLowerCase().includes(kw)) ||
      (p.kategori && p.kategori.toLowerCase().includes(kw)) ||
      (p.product_aliases || []).some(a => a.alias.toLowerCase().includes(kw))
    );
  },

  async create(productData) {
    let kode = productData.kode;
    if (!kode) {
      const existingCodes = AppState.products
        .filter(p => p.brand_id === productData.brand_id)
        .map(p => p.kode);
      kode = generateKode('PRD', existingCodes);
    }

    const { data, error } = await supabase
      .from('products')
      .insert({
        brand_id: productData.brand_id,
        kode,
        nama: productData.nama,
        kategori: productData.kategori || null,
        satuan: productData.satuan || 'pcs',
        satuan_basis: productData.satuan_basis || 1,
        harga: productData.harga || 0,
        berat_gram: productData.berat_gram || 0
      })
      .select()
      .single();

    if (error) {
      console.error('Gagal buat produk:', error);
      throw new Error('Gagal menyimpan produk. Kode mungkin sudah dipakai di brand ini.');
    }

    await this.fetchAll();
    return data;
  },

  async update(productId, productData) {
    const { error } = await supabase
      .from('products')
      .update({
        nama: productData.nama,
        kategori: productData.kategori || null,
        satuan: productData.satuan || 'pcs',
        satuan_basis: productData.satuan_basis || 1,
        harga: productData.harga || 0,
        berat_gram: productData.berat_gram || 0
      })
      .eq('id', productId);

    if (error) {
      console.error('Gagal update produk:', error);
      throw new Error('Gagal menyimpan perubahan produk.');
    }

    await this.fetchAll();
  },

  async deactivate(productId) {
    const { error } = await supabase
      .from('products')
      .update({ aktif: false })
      .eq('id', productId);
    if (error) throw new Error('Gagal menonaktifkan produk.');
    await this.fetchAll();
  },

  // --- Alias management ---

  async addAlias(productId, alias) {
    const aliasTrim = alias.trim().toLowerCase();
    if (!aliasTrim) return;

    const { error } = await supabase
      .from('product_aliases')
      .insert({ product_id: productId, alias: aliasTrim });

    if (error) {
      console.error('Gagal tambah alias:', error);
      throw new Error('Gagal menambahkan alias.');
    }

    await this.fetchAll();
  },

  async removeAlias(aliasId) {
    const { error } = await supabase
      .from('product_aliases')
      .delete()
      .eq('id', aliasId);

    if (error) {
      console.error('Gagal hapus alias:', error);
      throw new Error('Gagal menghapus alias.');
    }

    await this.fetchAll();
  },

  // Cek duplikat kode produk dalam brand yang sama (dipakai saat import)
  findDuplicateInBrand(brandId, kode, nama) {
    return AppState.products.find(p =>
      p.brand_id === brandId &&
      (p.kode.toLowerCase() === (kode || '').toLowerCase() ||
       p.nama.trim().toLowerCase() === (nama || '').trim().toLowerCase())
    );
  }
};
