# Vojta – Nasazení Innovation Evaluation Platform na Vercel + Neon

Tento dokument je tvůj krok-za-krokem průvodce. Postupuj přesně v tomto pořadí.

---

## Krok 1 – GitHub: Nahraj projekt do nového privátního repozitáře

1. Jdi na [github.com](https://github.com) → **New repository**
2. Název: `innovation-evaluation-platform`
3. Viditelnost: **Private**
4. **Nevybírej** README, .gitignore ani licenci (projekt už je má)
5. Klikni **Create repository**

GitHub ti ukáže instrukce. Spusť v terminálu v kořeni projektu:

```bash
git remote add origin https://github.com/<tvuj-username>/innovation-evaluation-platform.git
git branch -M main
git push -u origin main
```

Ověření: Na GitHubu uvidíš všechny soubory projektu.

---

## Krok 2 – Databáze: Získej DATABASE_URL z Neon.tech

> Doporučuji **Neon** (má štědrý free tier a skvělou integraci s Vercelem).
> Alternativa: Supabase – postup je podobný, URL najdeš v Settings → Database → Connection String.

### Neon.tech

1. Jdi na [neon.tech](https://neon.tech) → **Sign up** (nebo přihlas se přes GitHub)
2. Klikni **New Project** → zadej název (např. `iep-prod`)
3. Region: **Frankfurt (EU)** nebo nejbližší
4. Po vytvoření projektu klikni na záložku **Connection Details**
5. Vyber mód: **Pooled connection** (důležité pro serverless!)
6. Zkopíruj celý řetězec ve formátu:
   ```
   postgresql://username:password@ep-xxxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
   Toto je tvůj `DATABASE_URL`.

> Pozor: Neon ti dá dvě URL – přímou a poolovanou (`-pooler`). Na Vercelu vždy použij **poolovanou**.

---

## Krok 3 – Vercel: Připoj GitHub repozitář

1. Jdi na [vercel.com](https://vercel.com) → **Add New Project**
2. Vyber **Import Git Repository** → přihlas se přes GitHub
3. Najdi `innovation-evaluation-platform` → klikni **Import**
4. Framework: Vercel automaticky detekuje **Next.js** ✓
5. **Neklikej ještě na Deploy** – nejdřív nastav proměnné prostředí (Krok 4)

---

## Krok 4 – Environment Variables: Vyplň v Vercelu

V sekci **Environment Variables** (na stránce importu projektu nebo v Settings → Environment Variables) přidej tyto klíče:

| Klíč | Hodnota | Popis |
|------|---------|-------|
| `DATABASE_URL` | `postgresql://...` (poolovaná URL z Neau) | Připojení k databázi |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` | URL Supabase projektu pro Storage |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` (service role key) | Server-side klíč pro upload souborů do Storage |
| `NEXTAUTH_URL` | `https://tvoje-app.vercel.app` | Produkční URL tvé aplikace (zjistíš po prvním deployi) |
| `NEXTAUTH_SECRET` | *(viz níže jak vygenerovat)* | Tajný klíč pro NextAuth sessions |
| `AUTH_GOOGLE_ID` | *(z Google Cloud Console)* | Client ID pro Google OAuth (pokud používáš) |
| `AUTH_GOOGLE_SECRET` | *(z Google Cloud Console)* | Client Secret pro Google OAuth (pokud používáš) |

### Jak vygenerovat NEXTAUTH_SECRET

Spusť v terminálu:

```bash
openssl rand -base64 32
```

Zkopíruj výstup (40+ znaků) a vlož jako hodnotu `NEXTAUTH_SECRET`.

### Prostředí

Nastav všechny proměnné pro: ✅ Production ✅ Preview ✅ Development

### Supabase Storage (Document Uploads)

1. V Supabase otevři **Storage** → **Create bucket**
2. Název bucketu: `project-documents`
3. Visibility: **Public** (aplikace ukládá public download URL)
4. Ve Vercelu nastav `NEXT_PUBLIC_SUPABASE_URL` a `SUPABASE_SERVICE_ROLE_KEY`
5. `SUPABASE_SERVICE_ROLE_KEY` dávej pouze do server environments, nikdy do klientského kódu

### Poznámka k NEXTAUTH_URL

- Po prvním deployi Vercel přiřadí URL ve tvaru `innovation-evaluation-platform-xyz.vercel.app`
- Pokud máš vlastní doménu, použij ji
- Tuto hodnotu aktualizuj, jakmile znáš finální URL

---

## Krok 5 – První nasazení a migrace databáze

### Spusť deploy

Po vyplnění proměnných klikni **Deploy**. Vercel automaticky spustí:

```
prisma generate → prisma migrate deploy → next build
```

Migrace se aplikují na Neon databázi automaticky během buildu.

### Ověření po deployi

1. Otevři URL aplikace → měla by se načíst bez chyb
2. Jdi na `https://tvoje-app.vercel.app/api/health` → zkontroluj, že API odpovídá

### Pokud chceš naseed-ovat data (volitelné)

V lokálním prostředí nastav `DATABASE_URL` na produkční Neon URL a spusť:

```bash
DATABASE_URL="postgresql://...neon..." npx tsx prisma/seed.ts
```

> Pozor: Tím přepíšeš produkční data. Dělej to jen při prvním spuštění.

---

## Rychlý přehled – Co kde najdeš

| Věc | Kde |
|-----|-----|
| Logy z buildu | Vercel → projekt → Deployments → klikni na deployment |
| Logy z runtime | Vercel → projekt → Logs |
| Databázové tabulky | Neon → projekt → Tables |
| Přidat novou env var | Vercel → projekt → Settings → Environment Variables |
| Spustit nový deploy | Push do `main` větve na GitHubu (automaticky) |

---

## Checklist před spuštěním

- [ ] Kód pushnut na GitHub (Krok 1)
- [ ] Neon projekt vytvořen, poolovaná DATABASE_URL zkopírována (Krok 2)
- [ ] GitHub repo importován do Vercelu (Krok 3)
- [ ] Všechny environment variables vyplněny ve Vercelu (Krok 4)
- [ ] Deploy proběhl úspěšně – zelená fajfka v Deployment logu (Krok 5)
- [ ] Aplikace se otevírá v prohlížeči bez chyby 500
