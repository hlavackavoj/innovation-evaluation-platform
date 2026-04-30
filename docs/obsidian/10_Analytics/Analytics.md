# Analytics

## Stav implementace

**NEREALIZOVÁNO** – analytický modul zatím neexistuje jako samostatný dashboard.

Základní přehled je dostupný na dashboardu (`app/page.tsx`), ale pokročilé metriky nejsou.

## Plánované metriky

### MVP metriky (chybí)

- počet projektů celkem,
- počet aktivních projektů,
- projekty podle fáze (funnel),
- projekty podle potenciálu,
- projekty podle odpovědné osoby,
- počet úkolů po termínu,
- projekty bez dalšího kroku,
- projekty bez kontaktu déle než 30 dní.

### Pokročilé metriky (budoucnost)

- konverze z DISCOVERY do SPIN_OFF,
- průměrná doba ve fázi,
- nejčastější bottlenecky,
- typy generovaných doporučení,
- úspěšnost podle oboru,
- objem e-mailové komunikace per projekt.

## Co je dostupné dnes

Data pro všechny metriky **jsou v DB** (projekty, aktivity, e-mailové linky, doporučení). Chybí pouze UI a agregační dotazy.

## Klíčové Prisma dotazy pro metriky

```ts
// Projekty bez next step
prisma.project.count({ where: { nextStep: null } })

// Projekty bez kontaktu 30+ dní
prisma.project.findMany({
  where: { lastContactAt: { lt: subDays(new Date(), 30) } }
})

// Projekty podle fáze
prisma.project.groupBy({ by: ['stage'], _count: true })
```
