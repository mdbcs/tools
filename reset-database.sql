-- ============================================================
-- RESET DATABASE — HAPUS SEMUA TABEL LAMA
-- Jalankan INI DULU sebelum menjalankan setup-database.sql
-- supaya tidak ada konflik "tabel sudah ada" dari percobaan sebelumnya.
--
-- AMAN dijalankan walau tabel belum ada (pakai "if exists").
-- ============================================================

drop table if exists order_status_log cascade;
drop table if exists invoices cascade;
drop table if exists order_items cascade;
drop table if exists orders cascade;
drop table if exists product_aliases cascade;
drop table if exists products cascade;
drop table if exists partner_brands cascade;
drop table if exists partners cascade;
drop table if exists app_users cascade;
drop table if exists brands cascade;

-- Selesai. Sekarang jalankan isi file setup-database.sql secara utuh.
