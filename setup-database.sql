-- ============================================================
-- SISTEM TERPADU FRANCHISE — SETUP DATABASE
-- Jalankan SEKALI di Supabase SQL Editor (Project > SQL Editor > New query)
-- ============================================================

-- ------------------------------------------------------------
-- 1. BRANDS — master 5 brand
-- ------------------------------------------------------------
create table brands (
  id uuid primary key default gen_random_uuid(),
  kode text unique not null,           -- 'NGEMILOH','MELUMER','GOKUAH','YAMIE','BACIGOR'
  nama text not null,                  -- 'Ngemiloh'
  kategori text not null,              -- 'kering' atau 'kuah'
  warna_hex text not null default '#1E4FE0',  -- warna khas brand untuk badge UI
  urutan int not null default 0,       -- urutan tampil di selector
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. USERS — CS & Owner (login pilih nama + PIN)
-- ------------------------------------------------------------
create table app_users (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  pin_hash text not null,              -- hash PIN, bukan plain text
  role text not null check (role in ('owner','cs_repeat_order','cs_follow_up','cs_admin_verifikasi')),
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3. PARTNERS — database tunggal mitra (shared semua brand)
-- ------------------------------------------------------------
create table partners (
  id uuid primary key default gen_random_uuid(),
  kode text unique not null,           -- kode mitra, misal 'MTR-0001'
  nama text not null,
  telp text,
  alamat text,
  ekspedisi text,                      -- ekspedisi langganan mitra
  catatan text,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_partners_nama on partners using gin (nama gin_trgm_ops);
create index idx_partners_kode on partners (kode);

-- ------------------------------------------------------------
-- 4. PARTNER_BRANDS — relasi mitra <-> brand + diskon khusus
-- ------------------------------------------------------------
create table partner_brands (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references partners(id) on delete cascade,
  brand_id uuid not null references brands(id) on delete cascade,
  diskon_tipe text check (diskon_tipe in ('persen','nominal')) default null,
  diskon_nilai numeric(12,2) default 0,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  unique (partner_id, brand_id)
);

-- ------------------------------------------------------------
-- 5. PRODUCTS — semua produk semua brand dalam satu tabel
-- ------------------------------------------------------------
create table products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  kode text not null,                  -- kode produk per brand
  nama text not null,
  kategori text,                       -- header kategori, misal 'CUANKI' (untuk parsing & grouping)
  satuan text not null default 'pcs',  -- pcs, gr, kg, pack, dll
  satuan_basis numeric(12,2) default 1, -- basis konversi, misal per 100gr -> 100
  harga numeric(12,2) not null default 0,
  berat_gram numeric(12,2) default 0,  -- untuk label berat & surat jalan
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, kode)
);

create index idx_products_brand on products (brand_id);
create index idx_products_nama on products using gin (nama gin_trgm_ops);

-- ------------------------------------------------------------
-- 6. PRODUCT_ALIASES — keyword untuk fuzzy matching teks WA
-- ------------------------------------------------------------
create table product_aliases (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  alias text not null,                 -- keyword alternatif, misal 'keju pedas', 'kjupds'
  created_at timestamptz not null default now()
);

create index idx_aliases_alias on product_aliases using gin (alias gin_trgm_ops);
create index idx_aliases_product on product_aliases (product_id);

-- ------------------------------------------------------------
-- 7. ORDERS — header order/draft
-- ------------------------------------------------------------
create table orders (
  id uuid primary key default gen_random_uuid(),
  nomor text unique,                   -- nomor order, di-generate saat finalize
  partner_id uuid not null references partners(id),
  brand_id uuid not null references brands(id),
  status text not null default 'draft' check (status in ('draft','menunggu','lunas','batal')),
  cs_id uuid references app_users(id), -- CS yang input
  diskon_tipe text check (diskon_tipe in ('persen','nominal')) default null,
  diskon_nilai numeric(12,2) default 0,
  subtotal numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  catatan text,
  raw_text text,                       -- teks WA asli (audit trail parser)
  tanggal date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_orders_partner on orders (partner_id);
create index idx_orders_brand on orders (brand_id);
create index idx_orders_status on orders (status);
create index idx_orders_tanggal on orders (tanggal);
create index idx_orders_cs on orders (cs_id);

-- ------------------------------------------------------------
-- 8. ORDER_ITEMS — detail order dengan snapshot harga
-- ------------------------------------------------------------
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id),  -- nullable: bisa manual entry kalau tak ketemu
  nama_produk_snapshot text not null,        -- snapshot nama saat order dibuat
  qty numeric(12,2) not null default 0,
  satuan_snapshot text,
  harga_satuan_snapshot numeric(12,2) not null default 0,
  subtotal numeric(12,2) not null default 0,
  urutan int default 0,
  created_at timestamptz not null default now()
);

create index idx_order_items_order on order_items (order_id);

-- ------------------------------------------------------------
-- 9. INVOICES — satu per order
-- ------------------------------------------------------------
create table invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid unique not null references orders(id) on delete cascade,
  nomor_invoice text unique not null,
  tanggal_invoice date not null default current_date,
  status text not null default 'menunggu' check (status in ('menunggu','lunas')),
  total numeric(12,2) not null default 0,
  dicetak_oleh uuid references app_users(id),
  created_at timestamptz not null default now()
);

create index idx_invoices_order on invoices (order_id);

-- ------------------------------------------------------------
-- 10. AUDIT minimal: histori perubahan status order (opsional tapi membantu)
-- ------------------------------------------------------------
create table order_status_log (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  status_lama text,
  status_baru text not null,
  changed_by uuid references app_users(id),
  created_at timestamptz not null default now()
);

-- ============================================================
-- EXTENSIONS — diperlukan untuk fuzzy search (gin_trgm_ops)
-- ============================================================
create extension if not exists pg_trgm;

-- ============================================================
-- TRIGGER: auto-update updated_at
-- ============================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_partners_updated_at before update on partners
  for each row execute function set_updated_at();

create trigger trg_products_updated_at before update on products
  for each row execute function set_updated_at();

create trigger trg_orders_updated_at before update on orders
  for each row execute function set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- Catatan: karena login custom (bukan Supabase Auth), kita pakai
-- anon key untuk semua akses, jadi RLS dibuat permissive tapi AKTIF
-- (lebih baik aktif-permissive daripada nonaktif total).
-- Nanti bisa diperketat lagi setelah Supabase Auth diterapkan.
-- ============================================================
alter table brands enable row level security;
alter table app_users enable row level security;
alter table partners enable row level security;
alter table partner_brands enable row level security;
alter table products enable row level security;
alter table product_aliases enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table invoices enable row level security;
alter table order_status_log enable row level security;

create policy "allow all brands" on brands for all using (true) with check (true);
create policy "allow all app_users" on app_users for all using (true) with check (true);
create policy "allow all partners" on partners for all using (true) with check (true);
create policy "allow all partner_brands" on partner_brands for all using (true) with check (true);
create policy "allow all products" on products for all using (true) with check (true);
create policy "allow all product_aliases" on product_aliases for all using (true) with check (true);
create policy "allow all orders" on orders for all using (true) with check (true);
create policy "allow all order_items" on order_items for all using (true) with check (true);
create policy "allow all invoices" on invoices for all using (true) with check (true);
create policy "allow all order_status_log" on order_status_log for all using (true) with check (true);

-- ============================================================
-- REALTIME — aktifkan publication untuk tabel yang butuh sync live
-- ============================================================
alter publication supabase_realtime add table partners;
alter publication supabase_realtime add table products;
alter publication supabase_realtime add table product_aliases;
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table order_items;
alter publication supabase_realtime add table invoices;

-- ============================================================
-- SEED DATA — 5 brand sesuai logo & warna asli
-- ============================================================
insert into brands (kode, nama, kategori, warna_hex, urutan) values
  ('NGEMILOH', 'Ngemiloh', 'kering', '#6B3416', 1),
  ('MELUMER',  'Melumer',  'kering', '#1E4FE0', 2),
  ('GOKUAH',   'Gokuah',   'kuah',   '#E8332B', 3),
  ('YAMIE',    'Yamie Curry', 'kuah', '#8B1E1E', 4),
  ('BACIGOR',  'Bacigor Mamang', 'kuah', '#F2A71B', 5);

-- ============================================================
-- SEED DATA — user awal (Owner). PIN default: 1234
-- GANTI PIN INI setelah login pertama kali!
-- Hash dihasilkan dengan SHA-256 sederhana (lihat fungsi di app)
-- ============================================================
-- Catatan: hash di bawah ini untuk PIN "1234"
-- Kita isi lewat app nanti agar konsisten dengan fungsi hash JS,
-- supaya tidak ada mismatch antara hash SQL vs hash JS.
-- (User Owner akan dibuat lewat halaman setup pertama di app)

-- ============================================================
-- SELESAI. Lanjut buka index.html dan ikuti langkah setup awal.
-- ============================================================
