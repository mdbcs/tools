// ============================================================
// auth.js — Login (pilih nama + PIN) & manajemen sesi
// ============================================================

const Auth = {

  // Cek apakah ada user yang sudah login tersimpan di sesi browser ini
  restoreSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return false;
      const session = JSON.parse(raw);
      if (session && session.id && session.nama && session.role) {
        AppState.currentUser = session;
        return true;
      }
    } catch (e) {
      console.warn('Gagal restore session:', e);
    }
    return false;
  },

  saveSession(user) {
    AppState.currentUser = user;
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  },

  logout() {
    AppState.currentUser = null;
    localStorage.removeItem(SESSION_KEY);
    AppState.notify();
    render();
  },

  // Ambil daftar user aktif untuk ditampilkan di layar pilih nama
  async fetchActiveUsers() {
    const { data, error } = await sb
      .from('app_users')
      .select('id, nama, role')
      .eq('aktif', true)
      .order('nama', { ascending: true });

    if (error) {
      console.error('Gagal ambil daftar user:', error);
      showToast('Gagal memuat daftar CS. Cek koneksi internet.', 'error');
      return [];
    }
    return data || [];
  },

  // Cek apakah sistem sudah punya user sama sekali (untuk setup awal)
  async hasAnyUser() {
    const { count, error } = await sb
      .from('app_users')
      .select('id', { count: 'exact', head: true });

    if (error) {
      console.error('Gagal cek user:', error);
      return true; // anggap sudah ada user supaya tidak salah masuk mode setup
    }
    return (count || 0) > 0;
  },

  // Buat user Owner pertama kali (mode setup awal)
  async createFirstOwner(nama, pin) {
    const pinHash = await hashPin(pin);
    const { data, error } = await sb
      .from('app_users')
      .insert({ nama, pin_hash: pinHash, role: 'owner', aktif: true })
      .select()
      .single();

    if (error) {
      console.error('Gagal buat owner:', error);
      throw new Error('Gagal membuat akun Owner. Coba lagi.');
    }
    return data;
  },

  // Login: validasi PIN untuk user yang dipilih
  async login(userId, pin) {
    const pinHash = await hashPin(pin);

    const { data, error } = await sb
      .from('app_users')
      .select('id, nama, role, pin_hash')
      .eq('id', userId)
      .eq('aktif', true)
      .single();

    if (error || !data) {
      throw new Error('User tidak ditemukan.');
    }

    if (data.pin_hash !== pinHash) {
      throw new Error('PIN salah. Coba lagi.');
    }

    const user = { id: data.id, nama: data.nama, role: data.role };
    this.saveSession(user);
    return user;
  },

  // Tambah user CS baru (hanya bisa dilakukan Owner, divalidasi juga di UI)
  async createUser(nama, pin, role) {
    const pinHash = await hashPin(pin);
    const { data, error } = await sb
      .from('app_users')
      .insert({ nama, pin_hash: pinHash, role, aktif: true })
      .select()
      .single();

    if (error) {
      console.error('Gagal buat user:', error);
      throw new Error('Gagal membuat user baru. Mungkin nama sudah dipakai.');
    }
    return data;
  },

  // Nonaktifkan user (bukan hapus, supaya histori order tetap utuh)
  async deactivateUser(userId) {
    const { error } = await sb
      .from('app_users')
      .update({ aktif: false })
      .eq('id', userId);

    if (error) {
      console.error('Gagal nonaktifkan user:', error);
      throw new Error('Gagal menonaktifkan user.');
    }
  }
};
