# Kontrakan Web Application (Production & Development Guide)

Aplikasi Web Manajemen Kontrakan lengkap dengan **FrontEnd (React + Tailwind CSS + Bun)** dan **BackEnd (Hono + TypeScript + Supabase)**.

---

## 🐳 Menjalankan dengan Docker (Production / Beta)

Untuk menjalankan seluruh sistem (FrontEnd & BackEnd) secara bersamaan dengan Docker:

### 1. Prasyarat
- Pastikan Docker & Docker Compose sudah terpasang di komputer/server Anda.
- Pastikan file `BackEnd/.env` sudah memiliki konfigurasi kredensial Supabase.

### 2. Build & Jalankan Container
Dari root folder `KONTRAKAN/`:
```bash
docker compose up -d --build
```

### 3. Akses Aplikasi
- **FrontEnd Web**: [http://localhost:4001](http://localhost:4001)
- **BackEnd API**: [http://localhost:3000](http://localhost:3000)
- **Cek Status Container**:
  ```bash
  docker compose ps
  ```
- **Melihat Log**:
  ```bash
  docker compose logs -f
  ```
- **Menghentikan Container**:
  ```bash
  docker compose down
  ```

---

## 💻 Menjalankan Secara Lokal (Development Mode)

Jika ingin menjalankan tanpa Docker untuk development:

### 1. BackEnd
```bash
cd BackEnd
bun install
bun run dev
```
API berjalan di: `http://localhost:3000`

### 2. FrontEnd
```bash
cd FrontEnd
bun install
bun run dev
```
Web berjalan di: `http://localhost:4001`
