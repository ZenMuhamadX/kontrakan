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

## ⚡ Menjalankan Secara Lokal / Development (Tanpa Docker & Super Cepat)

Tidak perlu rebuild Docker setiap kali edit kode! Backend & Frontend sudah dilengkapi **Hot Module Replacement (HMR)** dan **Auto Reverse-Proxy**:

### Cara 1: Sekali Klik (Windows Batch File)
Cukup double-click file **`dev.bat`** di folder root `KONTRAKAN/`.
File ini akan otomatis membuka 2 window terminal:
- **Backend API**: `http://localhost:3000` (Auto reload saat edit file backend)
- **Frontend Web**: `http://localhost:4001` (Instant Hot-Reload saat edit file frontend / styling)

---

### Cara 2: Lewat 1 Perintah Terminal (Root Folder)
```bash
bun run dev:all
```

---

### Cara 3: Terminal Terpisah
1. **Backend**:
   ```bash
   cd Backend
   bun run dev
   ```
2. **Frontend**:
   ```bash
   cd Frontend
   bun run dev
   ```
   *Frontend dev server otomatis mem-forward request `/api/*` langsung ke `http://localhost:3000` tanpa perlu konfigurasi CORS tambahan.*

