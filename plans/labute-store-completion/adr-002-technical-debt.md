# ADR-002: Technický dluh a refaktoring strategie

## Status
Navrženo

## Kontext
Během analýzy kódu Labute Store byly identifikovány oblasti technického dluhu, které mohou ovlivnit maintainability, performance a scalability aplikace. Tyto problémy je třeba adresovat před přidáním nových funkcionalit.

## Rozhodnutí

### 1. Database Security Migration
**Problém**: Soubor `database-security-migration.sql` existuje, ale nebyl aplikován na produkční databázi.

**Rozhodnutí**: Okamžitě aplikovat security migration:
- Implementovat RLS (Row Level Security) politiky
- Přidat customer_id sloupec do orders tabulky
- Nastavit proper indexy pro performance
- Otestovat všechny admin a user permissions

**Důvody**:
- **Security**: Aktuální setup může umožnit unauthorized přístup
- **Compliance**: RLS je best practice pro multi-tenant aplikace
- **Performance**: Chybějící indexy zpomalují queries
- **Scalability**: Proper security model je nutný pro růst

### 2. Debug kód v produkci
**Problém**: Nalezen debug kód v produkčních souborech (např. `console.log` v Packeta API).

**Rozhodnutí**: Implementovat proper logging strategy:
- Odstranit všechny debug console.log statements
- Implementovat structured logging s různými levels
- Použít environment-based logging (dev vs prod)
- Přidat monitoring a alerting pro errors

**Důvody**:
- **Performance**: Console.log může zpomalit aplikaci
- **Security**: Debug info může odhalit sensitive data
- **Professionalism**: Clean production code
- **Debugging**: Proper logging je lepší než console.log

### 3. Error handling konzistence
**Problém**: Nekonzistentní error handling napříč aplikací.

**Rozhodnutí**: Standardizovat error handling:
- Vytvořit centralized error handling middleware
- Implementovat consistent error response format
- Přidat proper error boundaries v React komponentách
- Implementovat retry mechanismy pro external API calls

**Důvody**:
- **UX**: Konzistentní error messages pro uživatele
- **Debugging**: Easier troubleshooting
- **Reliability**: Graceful handling of failures
- **Monitoring**: Better error tracking

### 4. Type safety improvements
**Problém**: Některé části kódu používají `any` nebo mají weak typing.

**Rozhodnutí**: Zlepšit type safety:
- Odstranit všechny `any` types
- Přidat proper interfaces pro všechny API responses
- Implementovat runtime type validation (Zod)
- Přidat strict TypeScript config

**Důvody**:
- **Reliability**: Catch errors at compile time
- **Developer experience**: Better IDE support
- **Maintainability**: Self-documenting code
- **Refactoring safety**: Easier to make changes

### 5. Performance optimizations
**Problém**: Neoptimalizované queries a missing caching.

**Rozhodnutí**: Implementovat performance optimizations:
- Přidat database query optimization
- Implementovat caching strategy (Redis/Vercel KV)
- Optimize image loading a delivery
- Implement code splitting a lazy loading

**Důvody**:
- **User experience**: Faster page loads
- **SEO**: Better search rankings
- **Costs**: Lower server costs
- **Scalability**: Handle more traffic

## Implementační plán

### Fáze 1: Kritické security fixes (Týden 1)
```sql
-- Aplikovat database-security-migration.sql
-- Otestovat RLS politiky
-- Ověřit admin přístup
```

### Fáze 2: Logging a error handling (Týden 1-2)
```typescript
// Implementovat centralized logger
// Odstranit debug kód
// Přidat error boundaries
```

### Fáze 3: Type safety (Týden 2-3)
```typescript
// Přidat Zod schemas
// Odstranit any types
// Zlepšit interfaces
```

### Fáze 4: Performance (Týden 3-4)
```typescript
// Implementovat caching
// Optimalizovat queries
// Přidat lazy loading
```

## Důsledky

### Pozitivní
- **Vyšší bezpečnost**: RLS politiky ochrání data
- **Lepší performance**: Optimalizace zrychlí aplikaci
- **Easier maintenance**: Clean code je snazší udržovat
- **Fewer bugs**: Better typing a error handling
- **Better monitoring**: Proper logging umožní better insights

### Negativní
- **Development time**: Refaktoring zabere čas
- **Potential regressions**: Changes mohou způsobit bugs
- **Learning curve**: Team musí se naučit nové patterns
- **Testing overhead**: Více kódu k testování

### Rizika
- **Breaking changes**: Refaktoring může rozbít existující funkcionalitu
- **Performance regressions**: Nové patterns mohou být pomalejší
- **Over-engineering**: Příliš komplexní řešení
- **Timeline delays**: Refaktoring může zdržet nové features

## Metriky úspěchu

### Security metriky
- Zero unauthorized data access incidents
- All RLS policies properly tested
- Security audit score > 95%

### Performance metriky
- Page load time < 2 seconds
- API response time < 500ms
- Database query time < 100ms
- Cache hit rate > 80%

### Code quality metriky
- TypeScript strict mode enabled
- Zero `any` types in production code
- Test coverage > 80%
- ESLint/Prettier compliance 100%

## Alternativy zvážené

### Alternativa 1: Postupný refaktoring
- Refaktorovat pouze při přidávání nových features
- **Částečně přijato**: Některé non-critical improvements

### Alternativa 2: Kompletní rewrite
- Přepsat aplikaci od začátku
- **Zamítnuto**: Příliš risky a time-consuming

### Alternativa 3: Outsource refaktoring
- Najmout external team pro refaktoring
- **Zamítnuto**: Knowledge transfer issues

## Implementační guidelines

### Code review requirements
- Všechny changes musí projít code review
- Security changes vyžadují security review
- Performance changes vyžadují performance testing

### Testing strategy
- Unit tests pro všechny refaktorované funkce
- Integration tests pro API changes
- E2E tests pro critical user flows
- Performance tests pro optimizations

### Rollback plan
- Všechny database changes musí mít rollback scripts
- Feature flags pro major changes
- Monitoring alerts pro regressions
- Quick rollback procedure documented

## Poznámky
- Refaktoring bude probíhat paralelně s feature development
- Critical security fixes mají nejvyšší prioritu
- Performance optimizations budou měřeny před a po implementaci
- Team training bude poskytnut pro nové patterns a tools

---

*Datum: 29. srpna 2025*
*Autor: Tech Lead*
*Reviewers: Development Team, Security Team*