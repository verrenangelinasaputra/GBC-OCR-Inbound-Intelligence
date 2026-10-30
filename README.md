# GBC Inbound Intelligence

Aplikasi web untuk **OCR Surat Jalan**, **NKB (Notifikasi Kedatangan Barang)**, mapping SKU, **PP (Pesanan Pembelian)**, **penerimaan barang**, discrepancy, **Master Harga Beli**, invoice, dan **Accounts Payable** — fondasi modular untuk operasi inbound GBC.

> **Pilot supplier:** SSC (data demo — bukan harga/kode produksi nyata).

## Tech stack

- **Next.js 16** (App Router) + **React** + **TypeScript**
- **Tailwind CSS 4**
- **PostgreSQL** + **Prisma ORM**
- Auth: **cookie session (JWT)** + **bcrypt**
- Storage: adapter **local** (dev); siap diganti object storage
- OCR: **Google Gemini Vision** (schema Surat Jalan sama seperti Apps Script) + fallback **demo** jika API key kosong

## Cara menjalankan (local)

### Prasyarat

- Node.js 20+
- **PostgreSQL** — via Docker Desktop (`docker compose up -d`) **atau** PostgreSQL terinstall lokal / cloud (Neon, Supabase, dll.)

> Di mesin development ini Docker belum terdeteksi. Anda tetap bisa install PostgreSQL for Windows, buat database `gbc_inbound`, lalu sesuaikan `DATABASE_URL` di `.env`.

### Langkah

```powershell
cd "d:\Engku Yanto\2 - GBC OCR\gbc-inbound-intelligence"

# 1. Environment
copy .env.example .env
# Edit SESSION_SECRET (min. 32 karakter) jika perlu

# 2. Database PostgreSQL (pilih salah satu)

# Opsi A — Docker (hanya jika `docker` dikenali di PowerShell)
docker compose up -d

# Opsi B — Tanpa Docker (Windows, jika muncul error "docker is not recognized")
# 1) Install PostgreSQL, mis. via winget:
#    winget install PostgreSQL.PostgreSQL.16
# 2) Buat database & user (pgAdmin atau psql), atau pakai user postgres default.
# 3) Sesuaikan DATABASE_URL di .env, contoh:
#    DATABASE_URL="postgresql://postgres:PASSWORD_ANDA@localhost:5432/gbc_inbound?schema=public"
# 4) Buat database kosong: CREATE DATABASE gbc_inbound;

# Opsi C — Cloud gratis (Neon / Supabase): copy connection string ke DATABASE_URL

# 3. Install & migrate
npm install
npx prisma migrate dev --name init
npm run db:seed

# 4. Jalankan app
npm run dev
```

Buka:

- **Internal:** http://localhost:3000/login  
- **Supplier portal:** http://localhost:3000/supplier/login  

### Akun demo (dari seed — ganti di production)

| Role | Username | Password (default `.env.example`) |
|------|----------|-----------------------------------|
| Admin / DBM | `admin` | `AdminGBC!2026` |
| Supplier SSC | `fauzi_ssc` | `SupplierSSC!2026` |
| Warehouse | `warehouse_demo` | `Warehouse!2026` |

## Alur uji end-to-end (demo)

1. Login **fauzi_ssc** → upload foto Surat Jalan → dapat **submission ref** + **NKB ref**.
2. Login **admin** → **Surat Jalan** / **OCR Review** → koreksi baris → mapping SKU (line 2 perlu approve manual via API/UI suggest).
3. **Prepare PP** → **Approve PP**.
4. Login **warehouse_demo** (atau admin) → **Goods Receiving** → input qty received.
5. **Prepare Purchase Invoice** → pilih **payment term** → **Verify** → record **Accounts Payable**.

## Environment variables

Lihat [.env.example](./.env.example).

| Variable | Fungsi |
|----------|--------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Signing session cookie |
| `OCR_PROVIDER` | `demo` \| `manual` \| (cloud placeholder) |
| `OCR_CONFIDENCE_THRESHOLD` | Ambang confidence |
| `STORAGE_LOCAL_PATH` | Folder upload lokal |
| `TELEGRAM_*` / `WHATSAPP_*` | Opsional — kosong = not configured |
| `ACCURATE_INTEGRATION_ENABLED` | `false` sampai API diverifikasi |
| `GOOGLE_EXPORT_*` | Drive folder + Sheet ID + path JSON service account (lihat `.env.example`) |

### Google Drive + Sheet (Opsi A)

1. Buat **service account** di Google Cloud → enable **Drive API** & **Sheets API** → download JSON.
2. Simpan JSON di `secrets/google-service-account.json` (folder di-gitignore).
3. **Share** folder Drive dan spreadsheet ke email service account (`...@....iam.gserviceaccount.com`) sebagai **Editor**.
4. Di `.env`: `GOOGLE_EXPORT_ENABLED=true`, ID folder/sheet (sudah ada contoh di `.env.example`).
5. Cek: `npm run google:test` → lalu **Integrations** di app menampilkan email SA.
6. Setelah OCR Gemini sukses: foto di-upload ke Drive + baris per item di sheet (kolom template GBC). Retry export: hapus `googleSheetExportedAt` di DB atau fitur re-export belum ada — dokumen hanya export sekali.

## Integrasi: real vs demo

| Integrasi | Status v1 |
|-----------|-----------|
| OCR Gemini Vision | **Live** jika `GEMINI_API_KEY` + `OCR_PROVIDER=gemini` |
| OCR demo | Aktif hanya jika `OCR_PROVIDER=demo` dan key kosong |
| Telegram / WhatsApp | **Not configured** — in-app notifications aktif |
| Accurate API | **Export CSV PP** — bukan sync/API claim |
| Google Drive + Sheets | **Live** jika `GOOGLE_EXPORT_ENABLED=true` + service account (export otomatis setelah OCR) |

## Tests

```powershell
npm test
```

## Production build

```powershell
npm run build
npm start
```

Gunakan PostgreSQL managed + object storage persisten untuk file Surat Jalan (bukan filesystem ephemeral).

### Deploy Vercel — environment variables

File di `secrets/` **tidak** ikut deploy. Copy-paste **hanya path** (`GOOGLE_SERVICE_ACCOUNT_JSON_PATH=./secrets/....json`) di Vercel **tidak akan jalan**.

| Variable | Vercel |
|----------|--------|
| `DATABASE_URL` | Connection string **Neon / Supabase** (bukan `localhost`) |
| `SESSION_SECRET` | Min. 32 karakter random |
| `GEMINI_API_KEY` | Key dari [Google AI Studio](https://aistudio.google.com/apikey) — biasanya **`AIza...`**, bukan format `AQ....` |
| `OCR_PROVIDER` | `gemini` |
| `GOOGLE_EXPORT_ENABLED` | `true` jika perlu export |
| `GOOGLE_DRIVE_FOLDER_ID` / `GOOGLE_SHEET_ID` / `GOOGLE_SHEET_TAB` | Sama seperti lokal |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | **Isi penuh** file service account (JSON), atau pakai `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64` |
| `GOOGLE_SERVICE_ACCOUNT_JSON_PATH` | Hanya untuk **lokal** — abaikan di Vercel |

Setelah DB cloud terhubung, jalankan sekali dari mesin Anda:

```powershell
$env:DATABASE_URL="postgresql://..."   # URL production
npx prisma migrate deploy
npm run db:seed
```

Tanpa migrate + seed, login `admin` / password seed akan gagal (user belum ada di DB production).

## Struktur penting

- `prisma/schema.prisma` — schema DB lengkap
- `src/lib/providers/` — OCR, storage, notifications
- `src/lib/workflow/` — state machine Surat Jalan
- `src/app/supplier/` — portal eksternal terpisah
- `storage/uploads/` — file lokal (gitignored)

## Limitasi & next steps

- OCR cloud, bounding-box highlight, preprocessing gambar advanced
- UI approve mapping one-click + semantic AI adapter
- Accurate / WhatsApp / Telegram test-connection nyata
- Partial receipt aggregation per line PP
- Encryption at-rest untuk integration secrets
- Hardening production (rate limit, CSRF, virus scan)
