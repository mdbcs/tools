// ============================================================
// realtime.js — Sinkronisasi multi-device real-time
//
// ATURAN KETAT (pelajaran dari sistem lama, WAJIB dipatuhi):
// 1. Hanya SATU channel aktif per tabel — dibersihkan dulu sebelum
//    membuat yang baru. Tidak boleh ada subscription dobel meski
//    fungsi ini dipanggil berulang kali (termasuk dari tombol manual).
// 2. Setiap event realtime memicu RE-FETCH dari server (bukan trust
//    payload langsung), supaya data yang masuk selalu tervalidasi
//    lewat fungsi fetchAll() masing-masing modul yang sudah punya
//    guard "jangan timpa cache dengan hasil kosong/error".
// ============================================================

const Realtime = {
  channels: {},  // simpan referensi channel aktif per nama, untuk cleanup

  // Hapus channel lama sebelum buat baru — mencegah subscription dobel
  _cleanup(channelName) {
    if (this.channels[channelName]) {
      sb.removeChannel(this.channels[channelName]);
      delete this.channels[channelName];
    }
  },

  // Dipanggil SEKALI saat app start (setelah login berhasil)
  startAll() {
    this._subscribePartners();
    this._subscribeProducts();
    this._subscribeAliases();
    this._subscribeOrders();
    this._subscribeOrderItems();
  },

  // Dipanggil saat logout / app ditutup, supaya tidak ada channel menggantung
  stopAll() {
    Object.keys(this.channels).forEach(name => this._cleanup(name));
  },

  _subscribePartners() {
    const name = 'realtime-partners';
    this._cleanup(name);

    this.channels[name] = sb
      .channel(name)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partners' },
        async () => {
          await Partners.fetchAll();
          AppState.notify();
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partner_brands' },
        async () => {
          await Partners.fetchAll();
          AppState.notify();
        })
      .subscribe();
  },

  _subscribeProducts() {
    const name = 'realtime-products';
    this._cleanup(name);

    this.channels[name] = sb
      .channel(name)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' },
        async () => {
          await Products.fetchAll();
          AppState.notify();
        })
      .subscribe();
  },

  _subscribeAliases() {
    const name = 'realtime-aliases';
    this._cleanup(name);

    this.channels[name] = sb
      .channel(name)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_aliases' },
        async () => {
          await Products.fetchAll();
          AppState.notify();
        })
      .subscribe();
  },

  _subscribeOrders() {
    const name = 'realtime-orders';
    this._cleanup(name);

    this.channels[name] = sb
      .channel(name)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' },
        async () => {
          // Modul Orders akan dibangun di sesi berikutnya.
          // Guard ini supaya tidak error kalau modul belum ada.
          if (window.Orders && typeof Orders.fetchAll === 'function') {
            await Orders.fetchAll();
            AppState.notify();
          }
        })
      .subscribe();
  },

  _subscribeOrderItems() {
    const name = 'realtime-order-items';
    this._cleanup(name);

    this.channels[name] = sb
      .channel(name)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' },
        async () => {
          if (window.Orders && typeof Orders.fetchAll === 'function') {
            await Orders.fetchAll();
            AppState.notify();
          }
        })
      .subscribe();
  }
};
