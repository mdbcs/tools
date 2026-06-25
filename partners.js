// ============================================================
// partners.js — Manajemen Mitra (database tunggal, shared semua brand)
// ============================================================

const Partners = {

  async fetchAll() {
    const { data, error } = await sb
      .from('partners')
      .select(`
        *,
        partner_brands (
          id, brand_id, diskon_tipe, diskon_nilai, aktif
        )
      `)
      .order('nama', { ascending: true });

    if (error) {
      console.error('Gagal ambil data mitra:', error);
      showToast('Gagal memuat data mitra.', 'error');
      return AppState.partners; // jangan timpa cache lama dengan kosong
    }

    if (data) {
      AppState.partners = data;
    }
    return AppState.partners;
  },

  getById(partnerId) {
    return AppState.partners.find(p => p.id === partnerId) || null;
  },

  search(keyword) {
    if (!keyword) return AppState.partners;
    const kw = keyword.toLowerCase();
    return AppState.partners.filter(p =>
      p.nama.toLowerCase().includes(kw) ||
      (p.kode && p.kode.toLowerCase().includes(kw)) ||
      (p.telp && p.telp.includes(kw))
    );
  },

  // Filter mitra yang terdaftar di brand tertentu
  filterByBrand(brandId) {
    if (!brandId) return AppState.partners;
    return AppState.partners.filter(p =>
      (p.partner_brands || []).some(pb => pb.brand_id === brandId && pb.aktif)
    );
  },

  async create(partnerData, brandIds) {
    // Generate kode otomatis kalau belum diisi
    let kode = partnerData.kode;
    if (!kode) {
      const existingCodes = AppState.partners.map(p => p.kode);
      kode = generateKode('MTR', existingCodes);
    }

    const { data: partner, error } = await sb
      .from('partners')
      .insert({
        kode,
        nama: partnerData.nama,
        telp: partnerData.telp || null,
        alamat: partnerData.alamat || null,
        ekspedisi: partnerData.ekspedisi || null,
        catatan: partnerData.catatan || null
      })
      .select()
      .single();

    if (error) {
      console.error('Gagal buat mitra:', error);
      throw new Error('Gagal menyimpan data mitra. Kode mungkin sudah dipakai.');
    }

    // Relasi ke brand yang dipilih
    if (brandIds && brandIds.length > 0) {
      const rows = brandIds.map(brandId => ({ partner_id: partner.id, brand_id: brandId }));
      const { error: pbError } = await sb.from('partner_brands').insert(rows);
      if (pbError) {
        console.error('Gagal hubungkan mitra ke brand:', pbError);
        showToast('Mitra tersimpan, tapi gagal menghubungkan ke beberapa brand.', 'error');
      }
    }

    await this.fetchAll();
    return partner;
  },

  async update(partnerId, partnerData) {
    const { error } = await sb
      .from('partners')
      .update({
        nama: partnerData.nama,
        telp: partnerData.telp || null,
        alamat: partnerData.alamat || null,
        ekspedisi: partnerData.ekspedisi || null,
        catatan: partnerData.catatan || null
      })
      .eq('id', partnerId);

    if (error) {
      console.error('Gagal update mitra:', error);
      throw new Error('Gagal menyimpan perubahan data mitra.');
    }

    await this.fetchAll();
  },

  async setDiskon(partnerId, brandId, diskonTipe, diskonNilai) {
    // Cek apakah relasi sudah ada
    const partner = this.getById(partnerId);
    const existing = partner?.partner_brands?.find(pb => pb.brand_id === brandId);

    if (existing) {
      const { error } = await sb
        .from('partner_brands')
        .update({ diskon_tipe: diskonTipe, diskon_nilai: diskonNilai })
        .eq('id', existing.id);
      if (error) throw new Error('Gagal update diskon.');
    } else {
      const { error } = await sb
        .from('partner_brands')
        .insert({ partner_id: partnerId, brand_id: brandId, diskon_tipe: diskonTipe, diskon_nilai: diskonNilai });
      if (error) throw new Error('Gagal menyimpan diskon.');
    }

    await this.fetchAll();
  },

  async toggleBrandRelation(partnerId, brandId, isActive) {
    const partner = this.getById(partnerId);
    const existing = partner?.partner_brands?.find(pb => pb.brand_id === brandId);

    if (existing) {
      const { error } = await sb
        .from('partner_brands')
        .update({ aktif: isActive })
        .eq('id', existing.id);
      if (error) throw new Error('Gagal mengubah status brand mitra.');
    } else if (isActive) {
      const { error } = await sb
        .from('partner_brands')
        .insert({ partner_id: partnerId, brand_id: brandId, aktif: true });
      if (error) throw new Error('Gagal menghubungkan mitra ke brand.');
    }

    await this.fetchAll();
  },

  async deactivate(partnerId) {
    const { error } = await sb
      .from('partners')
      .update({ aktif: false })
      .eq('id', partnerId);
    if (error) throw new Error('Gagal menonaktifkan mitra.');
    await this.fetchAll();
  },

  // Deteksi duplikat berdasarkan nama + telp (dipakai saat import Excel)
  findDuplicate(nama, telp) {
    return AppState.partners.find(p =>
      p.nama.trim().toLowerCase() === (nama || '').trim().toLowerCase() ||
      (telp && p.telp && p.telp.replace(/\D/g, '') === telp.replace(/\D/g, ''))
    );
  }
};
