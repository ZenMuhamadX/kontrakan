# Kontrakan Backend API (Bun + Hono + Supabase)

RESTful API backend dibangun dengan [Bun](https://bun.sh), [Hono](https://hono.dev), dan [@supabase/supabase-js](https://supabase.com) TypeScript untuk sistem manajemen kontrakan.

---

## 📁 Struktur Database & Bucket

- **Schema Database**: `kontrakan`
  - Table `properties`: `id` (uuid), `unit_name`, `status`, `created_at`
  - Table `tenants`: `id` (uuid), `property_id`, `full_name`, `phone`, `emergency_contact`, `ktp_url`, `kk_url`, `start_date`, `created_at`
  - Table `transactions`: `id` (uuid), `type`, `category`, `amount`, `description`, `transaction_date`, `created_at`
- **Storage Bucket**: `ktp_kk_bucket` (untuk file KTP / KK dengan batasan 5MB dan format jpg, png, webp, pdf)
- **Supabase Auth**: Autentikasi JWT (Login, Register, Refresh Token, Profile, Logout)

---

## 🚀 Menjalankan Server

1. Buka terminal di folder `BackEnd/`
2. Konfigurasi kredensial Supabase Anda di file `.env`:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-supabase-key
   SUPABASE_SCHEMA=kontrakan
   SUPABASE_STORAGE_BUCKET=ktp_kk_bucket
   PORT=3000
   ```
3. Jalankan server mode development:
   ```bash
   bun run dev
   ```

---

## 📚 Dokumentasi Lengkap API

Lihat file **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** untuk spesifikasi lengkap payload request & response untuk:
1. **Authentication (`/api/auth`)**: Login, Register, Refresh Token, Me, Logout
2. **Properties (`/api/properties`)**: CRUD Table Properties
3. **Tenants (`/api/tenants`)**: CRUD Table Tenants
4. **Transactions (`/api/transactions`)**: CRUD Table Transactions
5. **Storage (`/api/storage`)**: Upload & Manajemen File `ktp_kk_bucket`
