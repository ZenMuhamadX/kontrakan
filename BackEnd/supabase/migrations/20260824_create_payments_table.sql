-- ==============================================================================
-- MIGRASI DDL: TABEL kontrakan.payments
-- Deskripsi: Menyimpan riwayat pembayaran sewa, bukti bayar, dan nomor kwitansi unik
-- ==============================================================================

-- 1. Buat sequence untuk nomor kwitansi jika diperlukan
CREATE SEQUENCE IF NOT EXISTS kontrakan.receipt_seq START WITH 1001;

-- 2. Buat tabel kontrakan.payments
CREATE TABLE IF NOT EXISTS kontrakan.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES kontrakan.tenants(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES kontrakan.properties(id) ON DELETE CASCADE,
    receipt_number VARCHAR(50) NOT NULL UNIQUE,
    amount_paid NUMERIC(12, 2) NOT NULL CHECK (amount_paid > 0),
    payment_method VARCHAR(30) NOT NULL DEFAULT 'cash', -- 'cash', 'transfer', 'qris', 'ewallet'
    notes TEXT,
    paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Buat Index untuk performa query pencarian dan riwayat kwitansi
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON kontrakan.payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_property_id ON kontrakan.payments(property_id);
CREATE INDEX IF NOT EXISTS idx_payments_receipt_number ON kontrakan.payments(receipt_number);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON kontrakan.payments(paid_at DESC);

-- 4. Enable RLS (Row Level Security) jika Supabase mengaktifkannya
ALTER TABLE kontrakan.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-write for payments" 
ON kontrakan.payments 
FOR ALL 
USING (true) 
WITH CHECK (true);
