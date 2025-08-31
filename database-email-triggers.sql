-- Database Email Triggers Migration
-- Tento soubor vytvoří triggery pro automatické odesílání emailů při změnách v tabulce orders
-- Spusťte v Supabase SQL Editor

-- =====================================================================================
-- 1. VYTVOŘIT FUNKCI PRO VOLÁNÍ EDGE FUNCTION
-- =====================================================================================

-- Funkce pro volání Edge Function při změnách v orders
CREATE OR REPLACE FUNCTION notify_order_email_trigger()
RETURNS trigger AS $$
BEGIN
  -- Volání Edge Function pomocí HTTP POST
  PERFORM
    net.http_post(
      url := 'https://randrdrjzsnddhsjliig.supabase.co/functions/v1/order-email-trigger',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'type', TG_OP,
        'table', TG_TABLE_NAME,
        'schema', TG_TABLE_SCHEMA,
        'record', to_jsonb(NEW),
        'old_record', CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END
      )
    );

  -- Vždy vrátit nový nebo starý záznam podle operace
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================================
-- 2. VYTVOŘIT TRIGGERY
-- =====================================================================================

-- Smazat existující triggery (pokud existují)
DROP TRIGGER IF EXISTS order_email_trigger_insert ON orders;
DROP TRIGGER IF EXISTS order_email_trigger_update ON orders;

-- Trigger pro nové objednávky (INSERT)
CREATE TRIGGER order_email_trigger_insert
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_order_email_trigger();

-- Trigger pro změny objednávek (UPDATE)
CREATE TRIGGER order_email_trigger_update
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (
    OLD.status IS DISTINCT FROM NEW.status OR
    OLD.packeta_tracking_url IS DISTINCT FROM NEW.packeta_tracking_url OR
    OLD.packeta_shipment_id IS DISTINCT FROM NEW.packeta_shipment_id
  )
  EXECUTE FUNCTION notify_order_email_trigger();

-- =====================================================================================
-- 3. NASTAVIT KONFIGURACI PRO SERVICE ROLE KEY
-- =====================================================================================

-- Poznámka: Service role key musíte nastavit ručně v Supabase Dashboard
-- Settings > Database > Custom Configuration
-- Přidejte: app.settings.service_role_key = 'váš_service_role_key'

-- Alternativně můžete použít SQL příkaz (nahraďte YOUR_SERVICE_ROLE_KEY):
-- ALTER DATABASE postgres SET app.settings.service_role_key = 'YOUR_SERVICE_ROLE_KEY';

-- =====================================================================================
-- 4. POVOLIT HTTP EXTENSION (pokud není povolena)
-- =====================================================================================

-- Povolit http extension pro volání Edge Functions
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- =====================================================================================
-- 5. TESTOVACÍ FUNKCE
-- =====================================================================================

-- Funkce pro testování email triggerů
CREATE OR REPLACE FUNCTION test_email_trigger(test_order_id text DEFAULT NULL)
RETURNS json AS $$
DECLARE
  test_id text;
  result json;
BEGIN
  -- Použít zadané ID nebo vygenerovat nové
  test_id := COALESCE(test_order_id, 'TEST-' || extract(epoch from now())::bigint::text);

  -- Vložit testovací objednávku
  INSERT INTO orders (
    id,
    customer_email,
    customer_name,
    status,
    items,
    amount_total,
    created_at
  ) VALUES (
    test_id,
    'test@example.com',
    'Test Customer',
    'new',
    '[{"name": "Test Product", "quantity": 1, "price_cents": 99900}]'::jsonb,
    99900,
    now()
  );

  -- Simulovat změnu stavu
  UPDATE orders
  SET status = 'paid'
  WHERE id = test_id;

  -- Simulovat přidání tracking info
  UPDATE orders
  SET
    packeta_shipment_id = 'TEST123456',
    packeta_tracking_url = 'https://tracking.packeta.com/TEST123456'
  WHERE id = test_id;

  -- Vymazat testovací objednávku
  DELETE FROM orders WHERE id = test_id;

  result := json_build_object(
    'success', true,
    'message', 'Test email triggers executed successfully',
    'test_order_id', test_id
  );

  RETURN result;

EXCEPTION WHEN OTHERS THEN
  -- Vyčistit v případě chyby
  DELETE FROM orders WHERE id = test_id;

  result := json_build_object(
    'success', false,
    'error', SQLERRM,
    'test_order_id', test_id
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- 6. OVĚŘENÍ IMPLEMENTACE
-- =====================================================================================

-- Zobrazit všechny triggery na tabulce orders
SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'orders'
ORDER BY trigger_name;

-- Zobrazit funkci triggeru
SELECT
  proname as function_name,
  prosrc as function_body
FROM pg_proc
WHERE proname = 'notify_order_email_trigger';

-- =====================================================================================
-- INSTRUKCE PRO POUŽITÍ:
-- =====================================================================================
--
-- 1. Nasaďte Edge Function 'order-email-trigger' do Supabase
-- 2. Nastavte RESEND_API_KEY v Edge Function environment variables
-- 3. Nastavte app.settings.service_role_key v databázi (viz bod 3)
-- 4. Spusťte tento SQL soubor v Supabase SQL Editor
-- 5. Otestujte pomocí: SELECT test_email_trigger();
-- 6. Zkontrolujte logy Edge Function pro případné chyby
--
-- Automatické emaily se budou odesílat při:
-- - Vytvoření nové objednávky (confirmation email)
-- - Změně stavu objednávky (status update email)
-- - Přidání tracking URL (shipping email)
--
-- =====================================================================================
