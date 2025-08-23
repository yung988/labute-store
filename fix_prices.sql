-- Fix prices in database - divide by 10 to convert from incorrect format
UPDATE public.products SET price_cents = price_cents / 10 WHERE price_cents >= 10000;

-- Verify the fix
SELECT id, name, price_cents, (price_cents / 100.0) as price_czk FROM public.products;
