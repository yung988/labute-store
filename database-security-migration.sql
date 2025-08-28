-- Database Security Migration
-- Tento soubor obsahuje SQL příkazy pro implementaci RLS bezpečnostních opatření
-- Spusťte v Supabase SQL Editor nebo pomocí supabase db push

-- =====================================================================================
-- 1. PŘIDAT SLOUPEC customer_id DO ORDERS
-- =====================================================================================

-- Přidat sloupec customer_id odkazující na auth.users
ALTER TABLE orders ADD COLUMN customer_id uuid REFERENCES auth.users(id);

-- Naplnit customer_id z customer_email (předpokládá že email odpovídá auth.users.email)
UPDATE orders
SET customer_id = auth.users.id
FROM auth.users
WHERE orders.customer_email = auth.users.email
AND orders.customer_id IS NULL;

-- Nastavit NOT NULL po naplnění
ALTER TABLE orders ALTER COLUMN customer_id SET NOT NULL;

-- =====================================================================================
-- 2. SMAZAT STARÉ POLITIKY
-- =====================================================================================

-- Smazat všechny existující politiky
DROP POLICY IF EXISTS "Allow anonymous insert for webhooks" ON orders;
DROP POLICY IF EXISTS "Service role full access" ON orders;
DROP POLICY IF EXISTS "Shopmanager full access to orders" ON orders;
DROP POLICY IF EXISTS "Superadmin full access to orders" ON orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Allow public read" ON products;
DROP POLICY IF EXISTS "Allow public read" ON skus;
DROP POLICY IF EXISTS "Allow public read" ON product_images;

-- =====================================================================================
-- 3. VYTVOŘIT NOVÉ POLITIKY PRO VEŘEJNÝ PŘÍSTUP
-- =====================================================================================

-- Products - veřejné čtení základních údajů
CREATE POLICY "Public read products" ON products
FOR SELECT TO anon
USING (true)
WITH CHECK (false);

-- SKUs - veřejné čtení
CREATE POLICY "Public read skus" ON skus
FOR SELECT TO anon
USING (true)
WITH CHECK (false);

-- Product images - veřejné čtení
CREATE POLICY "Public read product_images" ON product_images
FOR SELECT TO anon
USING (true)
WITH CHECK (false);

-- =====================================================================================
-- 4. POLITIKY PRO PŘIHLÁŠENÉ UŽIVATELE
-- =====================================================================================

-- Uživatelé mohou číst své objednávky
CREATE POLICY "Users read own orders" ON orders
FOR SELECT TO authenticated
USING (customer_id = auth.uid());

-- Uživatelé mohou vytvářet objednávky
CREATE POLICY "Users create orders" ON orders
FOR INSERT TO authenticated
WITH CHECK (customer_id = auth.uid());

-- Uživatelé mohou měnit své objednávky
CREATE POLICY "Users update own orders" ON orders
FOR UPDATE TO authenticated
USING (customer_id = auth.uid())
WITH CHECK (customer_id = auth.uid());

-- Uživatelé mohou mazat své objednávky
CREATE POLICY "Users delete own orders" ON orders
FOR DELETE TO authenticated
USING (customer_id = auth.uid());

-- =====================================================================================
-- 5. POLITIKY PRO ADMIN ROLE
-- =====================================================================================

-- Shopmanager - plný přístup k orders
CREATE POLICY "Shopmanager orders access" ON orders
FOR ALL TO authenticated
USING (
  auth.jwt() ->> 'role' = 'shopmanager' OR
  (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'shopmanager' OR
  (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'shopmanager'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'shopmanager' OR
  (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'shopmanager' OR
  (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'shopmanager'
);

-- Superadmin - plný přístup k orders
CREATE POLICY "Superadmin orders access" ON orders
FOR ALL TO authenticated
USING (
  auth.jwt() ->> 'role' = 'superadmin' OR
  (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'superadmin' OR
  (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'superadmin'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'superadmin' OR
  (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'superadmin' OR
  (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'superadmin'
);

-- Service role - plný přístup
CREATE POLICY "Service role full access" ON orders
FOR ALL TO authenticated
USING ((auth.jwt() ->> 'role') = 'service_role')
WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- =====================================================================================
-- 6. PŘIDAT INDEXY PRO VÝKON
-- =====================================================================================

-- Index na customer_id pro rychlé vyhodnocení RLS
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);

-- Index na customer_email (pro zpětnou kompatibilitu)
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);

-- =====================================================================================
-- 7. OMEZENÝ WEBHOOK INSERT
-- =====================================================================================

-- Vytvořit tabulku pro webhook events (pokud neexistuje)
CREATE TABLE IF NOT EXISTS webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Politika pro webhook insert s token kontrolou
CREATE POLICY "Webhook insert with token" ON webhook_events
FOR INSERT TO anon
WITH CHECK ((payload->>'token') = 'your-secret-webhook-token');

-- =====================================================================================
-- 8. OVĚŘENÍ IMPLEMENTACE
-- =====================================================================================

-- Zobrazit všechny politiky
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Zobrazit indexy
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- =====================================================================================
-- INSTRUKCE PRO SPUŠTĚNÍ:
-- =====================================================================================
--
-- 1. Zálohujte databázi před spuštěním
-- 2. Spusťte tento soubor v Supabase SQL Editor
-- 3. Zkontrolujte výsledky ověřovacích dotazů na konci
-- 4. Otestujte aplikaci s různými rolemi
-- 5. Pokud něco nefunguje, vraťte se k záloze
--
-- =====================================================================================