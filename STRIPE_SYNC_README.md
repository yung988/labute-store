# Synchronizace produktů do Stripe Product Catalog

Tento průvodce vysvětluje jak synchronizovat produkty z vašeho webu do Stripe Product Catalog.

## Co to umožní?

- **Lepší správa produktů** - všechny produkty budou viditelné v Stripe dashboard
- **Pokročilé funkce** - slevové kódy, inventory management, analytics
- **Profesionální setup** - správné propojení mezi vaším obchodem a Stripe

## Jak synchronizaci spustit?

### Možnost 1: Přes Admin rozhraní (doporučeno)

1. Přihlaste se do admin rozhraní (`/admin`)
2. Klikněte na záložku **Stripe**
3. Klikněte na tlačítko **"Synchronizovat produkty"**
4. Sledujte výsledky synchronizace

### Možnost 2: Přes příkazovou řádku

```bash
# Nainstalujte dependencies (pokud nemáte)
npm install

# Spusťte synchronizaci
node scripts/sync-products.js
```

## Co se stane během synchronizace?

Pro každý produkt se provede:

1. **Kontrola existence** - zkontroluje se zda produkt už v Stripe existuje
2. **Vytvoření/Aktualizace** - produkt se vytvoří nebo aktualizuje s:
   - Název a popis
   - Obrázky z vašeho webu
   - Cena v CZK
   - Metadata (kategorie, značka)
3. **Cena** - vytvoří se nebo aktualizuje cena v CZK

## Aktuální produkty

| Produkt | Cena | ID v Stripe |
|---------|------|-------------|
| Labutě SS6 rhinestone crystal T-shirt | 25 CZK | `labute-ss6-tshirt` |
| Labutě track top Hoodie | 45 CZK | `labute-hoodie` |
| Labutě Throwback Polo T-shirt | 22 CZK | `labute-polo` |
| Labutě SS6 rhinestone crystal tie | 18 CZK | `labute-tie` |

## Výsledky synchronizace

Po synchronizaci uvidíte:
- ✅ **Vytvořené produkty** - nové produkty přidané do Stripe
- 🔄 **Aktualizované produkty** - existující produkty aktualizované
- ❌ **Chyby** - produkty které se nepodařilo synchronizovat

## Další kroky

Po synchronizaci můžete v Stripe dashboard:

1. **Přidat slevové kódy** - vytvořit promo kódy pro vaše produkty
2. **Nastavit inventory** - sledovat skladové zásoby
3. **Analyzovat prodeje** - sledovat výkonnost jednotlivých produktů
4. **Přidat další produkty** - rozšířit katalog o nové produkty

## Řešení problémů

### Chyba "STRIPE_SECRET_KEY not found"
- Zkontrolujte že máte nastavenou proměnnou `STRIPE_SECRET_KEY` v `.env.local`
- Získat můžete v Stripe dashboard > Developers > API keys

### Chyba "Product already exists"
- Synchronizace automaticky aktualizuje existující produkty
- Pokud chcete začít znovu, smažte produkty v Stripe dashboard

### Chyba s obrázky
- Obrázky se načítají z vašeho blob storage
- Zkontrolujte že URL obrázků jsou veřejně přístupné

## Kontakt

Pokud narazíte na problémy, zkontrolujte:
1. Stripe dashboard pro detaily o chybách
2. Browser console pro JavaScript chyby
3. Server logs pro API chyby