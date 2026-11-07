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

### Google Drive + Sheet (hasil OCR)

**Target operasional GBC (default di kode jika env kosong):**

| Tujuan | Link / ID |
|--------|-----------|
| Spreadsheet hasil OCR | [Sheet](https://docs.google.com/spreadsheets/d/1o2No4lV_r1Hrfi3qiyKI0ZX-VUaQaZdcxCbo4qJ1LDc/edit) — `GOOGLE_SHEET_ID=1o2No4lV_r1Hrfi3qiyKI0ZX-VUaQaZdcxCbo4qJ1LDc` |
| Folder foto Surat Jalan | [Drive](https://drive.google.com/drive/u/0/folders/1_eQPA9BXJj1RjLgfyCPnlgZEsJdpjHnA) — `GOOGLE_DRIVE_FOLDER_ID=1_eQPA9BXJj1RjLgfyCPnlgZEsJdpjHnA` |
| Tab sheet | `GOOGLE_SHEET_TAB=Sheet1` (gid=0) |

1. Buat **service account** di Google Cloud → enable **Drive API** & **Sheets API** → download JSON.
2. Simpan JSON di `secrets/` (folder di-gitignore) atau paste ke `GOOGLE_SERVICE_ACCOUNT_JSON` di Vercel.
3. **Share** folder Drive dan spreadsheet di atas ke **`gbc-inbound-export@gbc-inbound-intelligence.iam.gserviceaccount.com`** (atau email SA Anda) sebagai **Editor**.
4. `GOOGLE_EXPORT_ENABLED=true` **atau** `SHEET_ONLY_MODE=true` (export otomatis aktif di mode pilot).
5. Cek: `npm run google:test` → menu **Integrations** menampilkan status Google.
6. Setelah upload supplier + OCR Gemini: **baris per item** di sheet + **foto** di folder Drive (nama file `Surat Jalan_<tanggal>_<no SJ>.jpeg`).

**Kalau upload sukses tapi sheet target kosong:** cek env `GOOGLE_SHEET_ID` di Vercel — jika masih ID lama `1XDSWH-...`, data masuk spreadsheet **salah**. Gunakan `1o2No4lV_...` atau hapus variable itu (default kode + deploy terbaru mengabaikan ID legacy). Setelah submit, portal supplier menampilkan link **Buka spreadsheet hasil OCR**.

**Kalau Drive error *storage quota*:** service account tidak punya kuota My Drive. Folder `1_eQPA9BXJj1RjLgfyCPnlgZEsJdpjHnA` harus di **Shared Drive** dengan service account sebagai **Content manager**, atau pakai `GOOGLE_WORKSPACE_DELEGATED_USER` (delegasi Workspace). Spreadsheet tetap jalan tanpa foto di Drive.

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
| `DATABASE_URL` | Supabase: pakai **Connection pooling** (port **6543**) + `?pgbouncer=true` — lihat bawah |
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

#### Mode tanpa Supabase — `SHEET_ONLY_MODE=true`

Cocok untuk **pilot upload Surat Jalan di Vercel** tanpa PostgreSQL:

- **Bisa:** `/supplier/register` → kode email dari **nomarcengkareng@gmail.com** → login username + password → upload → OCR Gemini → spreadsheet operasional + Drive.
- Akun supplier di [Supplier Credentials](https://docs.google.com/spreadsheets/d/156m4HFAUnqubtCJumBJZ9BCCel_kNVcU_ZV9kHi4HtY), tab **Users**. Kode disimpan sebagai hash di tab **AuthCodes** (pola yang sama dengan GBC Expense Hub).
- **Supplier** → spreadsheet `SUPPLIER_SHEET_ID`; **admin internal** → `/login` + spreadsheet [Internal Users](https://docs.google.com/spreadsheets/d/1PTxO6HbOccYn30g1l7SaGpGIcV0PBcuLmqzC3me5GYM) (`INTERNAL_SHEET_ID`), tanpa Supabase.
- Buat user `admin` sekali: `npm run internal:setup` (butuh service account + share Editor ke sheet).
- Menu PP / invoice / dll. tetap butuh Supabase jika ingin data live di app; dashboard mode spreadsheet menampilkan angka 0 + petunjuk.

Env **Vercel** (Production):

| Variable | Value |
|----------|--------|
| `SHEET_ONLY_MODE` | `true` |
| `SESSION_SECRET` | Min. 32 karakter random (wajib, untuk cookie login) |
| `OCR_PROVIDER` | `gemini` |
| `GEMINI_API_KEY` | Key AI Studio (`AIza...`) |
| `GOOGLE_EXPORT_ENABLED` | `true` (opsional jika sudah `SHEET_ONLY_MODE=true`) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Isi penuh JSON service account |
| `GOOGLE_DRIVE_FOLDER_ID` | `1_eQPA9BXJj1RjLgfyCPnlgZEsJdpjHnA` (default di kode jika dikosongkan) |
| `GOOGLE_SHEET_ID` | `1o2No4lV_r1Hrfi3qiyKI0ZX-VUaQaZdcxCbo4qJ1LDc` |
| `GOOGLE_SHEET_TAB` | `Sheet1` |
| `SUPPLIER_SHEET_ID` | `156m4HFAUnqubtCJumBJZ9BCCel_kNVcU_ZV9kHi4HtY` |
| `INTERNAL_SHEET_ID` | `1PTxO6HbOccYn30g1l7SaGpGIcV0PBcuLmqzC3me5GYM` |
| `INTERNAL_SHEET_TAB` | `Sheet1` (sesuaikan nama tab) |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `nomarcengkareng@gmail.com` |
| `SMTP_PASS` | App Password Gmail akun itu (16 karakter) |
| `MAIL_FROM` | `GBC Supplier Portal <nomarcengkareng@gmail.com>` |
| `ADMIN_NOTIFY_EMAIL` | `nomarcengkareng@gmail.com` |

**Hapus atau abaikan** `DATABASE_URL` di Vercel untuk mode ini. `npm install` tidak lagi memanggil Prisma; `prisma generate` hanya saat `npm run build` (tanpa koneksi DB nyata). Login admin di `/login` butuh Supabase lagi jika `DATABASE_URL` diisi.

Urutan setup (jangan dilewati):

1. Spreadsheet Supplier Credentials → **Share** → ubah dari *Anyone with the link* menjadi **Restricted**.
2. Share sheet itu sebagai **Editor** ke email `client_email` di JSON service account (bukan ke email pribadi saja).
3. Di Google Account **nomarcengkareng@gmail.com**: aktifkan 2-Step Verification → **App passwords** → buat password untuk Mail → tempel ke `SMTP_PASS` (bukan password login Gmail).
4. Isi env di atas, **Redeploy**.
5. Supplier buka `/supplier/register`, isi perusahaan, kontak, username, email, telepon, dan password. Kode 6 digit masuk ke email mereka, pengirimnya nomarcengkareng@gmail.com.
6. Setelah verifikasi, baris `ACTIVE` muncul di tab **Users**. Login berikutnya: username + password. Lupa password: `/supplier/forgot-password`.
7. Untuk menonaktifkan supplier, ubah kolom `status` di tab Users menjadi `DISABLED`. Inbox nomarcengkareng@gmail.com juga menerima pemberitahuan akun baru.

Buka: `https://your-app.vercel.app/supplier/login`.

#### Supabase + Vercel: `Can't reach database server`

Penyebab umum:

1. **Project Supabase paused** (gratis) — buka [Supabase Dashboard](https://supabase.com/dashboard) → project → **Restore project**.
2. **Direct connection (port 5432)** sering gagal dari Vercel serverless — ganti `DATABASE_URL` di Vercel ke **Pooler**:
   - Supabase → **Connect** (atau Settings → Database) → **Connection string** → mode **URI**
   - Pilih **Transaction pooler** (port **6543**), bukan "Direct"
   - Contoh bentuk: `postgresql://postgres.gfikhmkiplymxilbwfyj:PASSWORD@....pooler.supabase.com:6543/postgres?pgbouncer=true`
   - Password dengan `!` → `%21` di URL
3. Untuk **migrate/seed dari laptop**, boleh tetap pakai **Direct** (`db....supabase.co:5432`) + `?sslmode=require`.

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
