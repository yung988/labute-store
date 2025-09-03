# Risk Map and Mitigations - Admin Část

## Bezpečnostní rizika

### Vysoké riziko

- **Service role key exposure**: Supabase service role key je v env proměnných, pokud unikne, umožní plný přístup k databázi
  - **Mitigace**: Použít rotation klíčů, auditovat přístupy, implementovat IP whitelisting

- **Admin role bypass**: Middleware ověřuje role, ale klient-side kód může být obcházen
  - **Mitigace**: Vždy ověřovat na server-side, implementovat RBAC s granular permissions

- **API endpoint exposure**: Admin API endpointy jsou přístupné bez dostatečného ověření
  - **Mitigace**: Přidat rate limiting, input validation, audit logging

### Střední riziko

- **Session management**: JWT tokeny mohou být ukradeny
  - **Mitigace**: Krátké expirace, secure cookies, refresh token rotation

- **Data leakage**: Admin vidí všechna data, potenciální PII únik
  - **Mitigace**: Auditovat export funkcí, anonymizovat citlivá data

## Výkonnostní rizika

### Vysoké riziko

- **Heavy dashboard queries**: Dashboard načítá všechny objednávky bez pagination
  - **Mitigace**: Implementovat pagination, caching, lazy loading

- **Large components**: ConsolidatedOrdersTable má mnoho funkcí v jedné komponentě
  - **Mitigace**: Rozdělit na menší komponenty, použít virtualization pro velké tabulky

### Střední riziko

- **Multiple API calls**: Dashboard dělá několik API volání při načtení
  - **Mitigace**: Batchovat requesty, použít React Query pro caching

## Údržbové rizika

### Vysoké riziko

- **Tight coupling**: Admin je těsně spojen s e-commerce logikou
  - **Mitigace**: Extrahovat admin do samostatného modulu, použít service layer

- **Missing features**: Mnoho TODO komentářů (Packeta tracking, email logs)
  - **Mitigace**: Prioritizovat implementaci chybějících funkcí

### Střední riziko

- **Code duplication**: Opakující se kód pro API volání
  - **Mitigace**: Vytvořit shared API klienty, hooks

- **Lack of tests**: Žádné unit testy pro admin komponenty
  - **Mitigace**: Přidat testy pro kritické cesty

## Operační rizika

### Střední riziko

- **External service dependency**: Závislost na Supabase, Stripe, Packeta
  - **Mitigace**: Implementovat fallbacky, monitoring, retry logiku

- **Email delivery**: Spoléhání na Resend pro emaily
  - **Mitigace**: Přidat email queue, monitoring doručení

## Doporučení pro mitigaci

1. **Okamžité akce**:
   - Implementovat rate limiting na admin API
   - Přidat audit logging pro admin akce
   - Refaktorovat velké komponenty

2. **Krátkodobé (1-2 měsíce)**:
   - Přidat unit testy
   - Implementovat pagination na dashboard
   - Auditovat a rotovat API klíče

3. **Dlouhodobé (3-6 měsíců)**:
   - Extrahovat admin do microservice
   - Implementovat RBAC systém
   - Přidat monitoring a alerting
