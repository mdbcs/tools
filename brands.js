// ============================================================
// brands.js — Data brand (master 5 brand), dipakai di mana-mana
// ============================================================

const Brands = {

  async fetchAll() {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('aktif', true)
      .order('urutan', { ascending: true });

    if (error) {
      console.error('Gagal ambil data brand:', error);
      showToast('Gagal memuat data brand.', 'error');
      return [];
    }

    // VALIDASI sebelum overwrite cache: jangan timpa data lama dengan
    // hasil kosong kalau ternyata fetch error/null (anti-pattern dari sistem lama)
    if (data) {
      AppState.brands = data;
    }
    return AppState.brands;
  },

  getById(brandId) {
    return AppState.brands.find(b => b.id === brandId) || null;
  },

  getByKode(kode) {
    return AppState.brands.find(b => b.kode === kode) || null;
  },

  // Warna brand untuk styling badge, fallback ke warna netral kalau tak ketemu
  getColor(brandId) {
    const brand = this.getById(brandId);
    return brand ? brand.warna_hex : '#6B7280';
  }
};
