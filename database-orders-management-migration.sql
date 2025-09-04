-- Orders Management Migration
-- Tento soubor obsahuje SQL příkazy pro rozšíření orders tabulky pro kompletní správu objednávek
-- Spusťte v Supabase SQL Editor nebo pomocí supabase db push

-- =====================================================================================
-- 1. PŘIDAT CHYBĚJÍCÍ SLOUPCE PRO SPRÁVU OBJEDNÁVEK
-- =====================================================================================

-- Přidat sloupec pro poznámky admina
ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_notes text;

-- Přidat sloupec pro fakturační adresu (oddělená od dodací)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_address text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_city text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_postal_code text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_country text DEFAULT 'CZ';

-- Přidat sloupec pro interní poznámky (viditelné pouze adminům)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS internal_notes text;

-- =====================================================================================
-- 2. PŘIDAT INDEXY PRO VÝKON
-- =====================================================================================

-- Index na status pro rychlé filtrování
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Index na created_at pro řazení podle data
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Index na customer_id pro rychlé vyhledávání objednávek uživatele
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);

-- Index na updated_at pro sledování nedávných změn
CREATE INDEX IF NOT EXISTS idx_orders_updated_at ON orders(updated_at DESC);

-- =====================================================================================
-- 3. AKTUALIZOVAT STATUS ENUM (POKUD POTŘEBNÉ)
-- =====================================================================================

-- Přidat constraint pro status hodnoty (pokud neexistuje)
-- Poznámka: Současný default je 'new', takže zachováme kompatibilitu
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'orders_status_check'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_status_check
    CHECK (status IN ('new', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'));
  END IF;
END $$;

-- =====================================================================================
-- 4. PŘIDAT KOMENTÁŘE K TABULCE A SLOUPCŮM
-- =====================================================================================

COMMENT ON TABLE orders IS 'Customer orders with full management capabilities';
COMMENT ON COLUMN orders.admin_notes IS 'Notes visible to customer and admin';
COMMENT ON COLUMN orders.internal_notes IS 'Internal notes visible only to admins';
COMMENT ON COLUMN orders.billing_address IS 'Billing address (separate from delivery)';
COMMENT ON COLUMN orders.status IS 'Order status: new, pending, processing, shipped, delivered, cancelled';

-- =====================================================================================
-- 5. OVĚŘENÍ IMPLEMENTACE
-- =====================================================================================

-- Zobrazit aktualizované schéma
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'orders'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Zobrazit indexy
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'orders'
ORDER BY indexname;

-- =====================================================================================
-- INSTRUKCE PRO SPUŠTĚNÍ:
-- =====================================================================================
--
-- 1. Zálohujte databázi před spuštěním
-- 2. Spusťte tento soubor v Supabase SQL Editor
-- 3. Zkontrolujte výsledky ověřovacích dotazů na konci
-- 4. Otestujte aplikaci s novými poli
-- 5. Pokud něco nefunguje, vraťte se k záloze
--
-- =====================================================================================