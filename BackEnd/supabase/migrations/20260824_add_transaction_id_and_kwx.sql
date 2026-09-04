-- ==============================================================================
-- MIGRASI DDL: TABEL kontrakan.payments (Tambahkan kolom transaction_id FK)
-- Aturan:
-- 1. payments.transaction_id -> FK ke kontrakan.transactions(id)
-- 2. payments.receipt_number -> Format KWX-XXXXXXXXXXXX
-- ==============================================================================

-- 1. Tambahkan kolom transaction_id ke tabel kontrakan.payments (jika belum ada)
ALTER TABLE kontrakan.payments 
ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES kontrakan.transactions(id) ON DELETE SET NULL;

-- 2. Buat index untuk foreign key transaction_id agar join query cepat
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON kontrakan.payments(transaction_id);

-- 3. Pastikan kolom receipt_number memiliki index unik dan index pencarian
CREATE INDEX IF NOT EXISTS idx_payments_receipt_number ON kontrakan.payments(receipt_number);
