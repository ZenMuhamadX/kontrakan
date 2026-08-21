# 📖 API Documentation - Kontrakan Management System

Dokumentasi lengkap RESTful API untuk Sistem Manajemen Kontrakan berbasis **Bun**, **Hono**, **TypeScript**, dan **Supabase**.

---

## 🌐 Base URL & Header

- **Base URL**: `http://localhost:3000` (atau URL server Anda)
- **Standard Headers**:
  ```http
  Content-Type: application/json
  ```
- **Protected Endpoint Header**:
  ```http
  Authorization: Bearer <ACCESS_TOKEN>
  ```

---

## 🔐 1. Authentication (`/api/auth`)

### 1.1. Login User
- **Endpoint**: `POST /api/auth/login`
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response Success (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Login berhasil",
    "data": {
      "user": {
        "id": "c1f722a0-4f9e-4b61-9c80-e8893d56ef83",
        "email": "user@example.com",
        "user_metadata": { "full_name": "Admin Kontrakan" }
      },
      "session": {
        "access_token": "eyJhbGciOi...",
        "refresh_token": "xWzK9...",
        "expires_in": 3600
      }
    }
  }
  ```

### 1.2. Register User Baru
- **Endpoint**: `POST /api/auth/register`
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "fullName": "Budi Santoso"
  }
  ```
- **Response Success (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Registrasi akun berhasil",
    "data": { ... }
  }
  ```

### 1.3. Refresh Access Token
- **Endpoint**: `POST /api/auth/refresh`
- **Body**:
  ```json
  {
    "refresh_token": "xWzK9..."
  }
  ```

### 1.4. Get Current Profile (`Protected`)
- **Endpoint**: `GET /api/auth/me`
- **Headers**: `Authorization: Bearer <access_token>`

### 1.5. Logout (`Protected`)
- **Endpoint**: `POST /api/auth/logout`
- **Headers**: `Authorization: Bearer <access_token>`

---

## 🏢 2. Properties (`/api/properties`)

### 2.1. List Semua Properties
- **Endpoint**: `GET /api/properties`
- **Query Params**:
  - `status` (string, opsional): e.g. `available`, `occupied`
  - `search` (string, opsional): pencarian nama unit
  - `page` (number, default: `1`)
  - `limit` (number, default: `50`)
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "11111111-1111-1111-1111-111111111111",
        "unit_name": "Kamar 01",
        "status": "available",
        "created_at": "2026-08-21T00:00:00Z",
        "tenants": []
      }
    ],
    "meta": {
      "total": 1,
      "page": 1,
      "limit": 50,
      "totalPages": 1
    }
  }
  ```

### 2.2. Detail Single Property
- **Endpoint**: `GET /api/properties/:id`

### 2.3. Tambah Property
- **Endpoint**: `POST /api/properties`
- **Body**:
  ```json
  {
    "unit_name": "Kamar 02 - AC",
    "status": "available"
  }
  ```

### 2.4. Update Property
- **Endpoint**: `PUT /api/properties/:id`
- **Body**:
  ```json
  {
    "status": "occupied"
  }
  ```

### 2.5. Hapus Property
- **Endpoint**: `DELETE /api/properties/:id`

---

## 👥 3. Tenants (`/api/tenants`)

### 3.1. List Semua Tenants
- **Endpoint**: `GET /api/tenants`
- **Query Params**:
  - `property_id` (uuid, opsional)
  - `search` (string, opsional)
  - `page`, `limit`

### 3.2. Detail Tenant
- **Endpoint**: `GET /api/tenants/:id`

### 3.3. Tambah Tenant
- **Endpoint**: `POST /api/tenants`
- **Body**:
  ```json
  {
    "property_id": "11111111-1111-1111-1111-111111111111",
    "full_name": "Ahmad Dani",
    "phone": "081234567890",
    "emergency_contact": "089876543210",
    "ktp_url": "https://.../ktp/ktp-sample.jpg",
    "kk_url": "https://.../kk/kk-sample.jpg",
    "start_date": "2026-09-01"
  }
  ```

### 3.4. Update Tenant
- **Endpoint**: `PUT /api/tenants/:id`

### 3.5. Hapus Tenant
- **Endpoint**: `DELETE /api/tenants/:id`

---

## 💰 4. Transactions (`/api/transactions`)

### 4.1. List Transaksi
- **Endpoint**: `GET /api/transactions`
- **Query Params**:
  - `type` (enum: `income`, `expense`, `pemasukan`, `pengeluaran`)
  - `category` (string, filter nama kategori)
  - `startDate` (format `YYYY-MM-DD`)
  - `endDate` (format `YYYY-MM-DD`)
  - `page`, `limit`

### 4.2. Detail Transaksi
- **Endpoint**: `GET /api/transactions/:id`

### 4.3. Tambah Transaksi
- **Endpoint**: `POST /api/transactions`
- **Body**:
  ```json
  {
    "type": "income",
    "category": "Sewa Kamar",
    "amount": 1500000,
    "description": "Pembayaran sewa kamar 01 bulan September 2026",
    "transaction_date": "2026-09-01"
  }
  ```

### 4.4. Update Transaksi
- **Endpoint**: `PUT /api/transactions/:id`

### 4.5. Hapus Transaksi
- **Endpoint**: `DELETE /api/transactions/:id`

---

## 📂 5. Storage (`/api/storage` - Bucket `ktp_kk_bucket`)

### 5.1. Upload File (KTP / KK)
- **Endpoint**: `POST /api/storage/upload`
- **Content-Type**: `multipart/form-data`
- **Form Data Fields**:
  - `file`: (File binary, format `.jpg`, `.jpeg`, `.png`, `.webp`, `.pdf`, max 5MB)
  - `folder`: (string, opsional e.g. `ktp`, `kk`, `documents`)
- **Response Success (201 Created)**:
  ```json
  {
    "success": true,
    "message": "File berhasil diupload",
    "data": {
      "bucket": "ktp_kk_bucket",
      "path": "ktp/1724217600000-abc1234.jpg",
      "fullPath": "ktp_kk_bucket/ktp/1724217600000-abc1234.jpg",
      "publicUrl": "https://your-supabase.co/storage/v1/object/public/ktp_kk_bucket/ktp/1724217600000-abc1234.jpg"
    }
  }
  ```

### 5.2. Hapus File dari Storage
- **Endpoint**: `DELETE /api/storage/delete`
- **Body / Query**:
  ```json
  {
    "path": "ktp/1724217600000-abc1234.jpg"
  }
  ```

### 5.3. Dapatkan Signed URL Sementara
- **Endpoint**: `GET /api/storage/signed-url?path=ktp/1724217600000-abc1234.jpg&expiresIn=3600`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "signedUrl": "https://your-supabase.co/storage/v1/object/sign/ktp_kk_bucket/ktp/...",
      "expiresIn": 3600
    }
  }
  ```

---

## 🛑 Standard Error Response

Jika terjadi kegagalan validasi (Status `400 Bad Request`):
```json
{
  "success": false,
  "message": "Validasi data gagal",
  "errors": [
    {
      "field": "email",
      "message": "Format email tidak valid"
    }
  ]
}
```
Jika token tidak valid (Status `401 Unauthorized`):
```json
{
  "success": false,
  "message": "Akses ditolak: Token Authorization (Bearer token) tidak ditemukan atau tidak valid"
}
```
