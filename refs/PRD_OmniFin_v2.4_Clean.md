# PRODUCT REQUIREMENT DOCUMENT (PRD)

**Product Name:** OmniFin (Enterprise & Hybrid Financial Management System)

**Document Version:** 2.4

**Date:** 8 Agustus 2026

**Prepared By:** Chief Product Officer / Enterprise Architect

**Status:** Final — Ready for Engineering & Stakeholder Review

---

## 1\. Executive Summary

OmniFin adalah platform Financial Management System berbasis web modern yang dirancang sebagai *single source of truth* untuk seluruh aktivitas keuangan. Mengusung arsitektur *multi-tenant* dan *configurable engine*, OmniFin dapat digunakan oleh entitas bisnis komersial (PT, CV, UD) maupun entitas nirlaba/hybrid (Yayasan, LAZ, Masjid, Sekolah, NGO) hanya dengan penyesuaian konfigurasi *toggle* saat onboarding.

Sistem ini menggabungkan kepatuhan standar akuntansi (PSAK Bisnis, PSAK 45/ISAK 35 Nonlaba, PSAK 109 Syariah/Zakat) dengan pengalaman pengguna modern, integrasi AI, dan prinsip *Zero Learning Curve*.

---

## 2\. Product Vision & Mission

- **Vision:** Menjadi ekosistem keuangan tunggal yang mendemokratisasi sistem akuntansi kelas enterprise untuk segala jenis organisasi di Indonesia.  
- **Mission:**  
  - Menghilangkan kompleksitas operasional keuangan melalui automasi dan UI/UX yang intuitif.  
  - Menyediakan laporan *real-time* yang *audit-ready* dan *compliant* dengan standar PSAK.  
  - Memanfaatkan AI untuk efisiensi entri data dan *financial forecasting*.  
  - Memungkinkan entitas bisnis dan sosial menggunakan satu platform dengan konfigurasi yang tepat.

---

## 3\. Business Objectives

1. **Adoption:** Mengakuisisi pengguna dari segmen bisnis dan nirlaba dengan *onboarding* mandiri di bawah 15 menit.  
2. **Engagement:** Meningkatkan MAU (Monthly Active Users) dengan menjadikan sistem ini alat harian (bukan sekadar alat akhir bulan).  
3. **Efficiency:** Mengurangi waktu pemrosesan transaksi dan rekonsiliasi bank hingga 70% melalui AI OCR dan Auto-Matching.  
4. **Compliance:** 100% laporan keuangan yang dihasilkan sesuai standar PSAK yang berlaku sesuai jenis entitas.  
5. **Revenue:** Target ARR Rp 5 Miliar pada akhir tahun pertama via model SaaS (per-seat atau flat per organisasi).

---

## 4\. Scope

**In Scope:**

- Core Accounting (General Ledger, AP, AR).  
- Budgeting & Cash Advance (RAPB).  
- Asset & Depreciation Management.  
- Report Builder & Dynamic Dashboards.  
- Approval Engine & Audit Trail.  
- AI Features (OCR, Forecast, Anomaly Detection, FinBot).  
- Entity Configuration Engine (Business vs. Social toggle).  
- Donor & Fund Management (untuk entitas sosial).  
- Tax Management — PPN & PPh (untuk entitas bisnis).  
- Invoice & Billing Management.  
- Kas & Bank Management.  
- Rekonsiliasi Bank (Auto-matching).  
- Integration: Bank Statement Import, WhatsApp API, Email, Payment Gateway (untuk donasi).

**Out of Scope (MVP/Phase 1):**

- Modul HR & Payroll Processing (hanya menampung jurnal pengeluarannya saja).  
- Modul Point of Sales (POS) native (akan melalui API integrasi).  
- Inventory & Warehousing kompleks (hanya pencatatan aset/biaya).  
- Multi-currency akuntansi (akan hadir di Phase 3+).  
- Koneksi API langsung ke Core Banking (hanya import CSV/file).

---

## 5\. Stakeholder Analysis

| Stakeholder | Role / Interest | Expectation |
| :---- | :---- | :---- |
| **Sponsors/Founders** | Investor | ROI, Market share, Scalability platform. |
| **End-Users Bisnis** | PT/CV/UD | Kelola AP/AR, pajak, laba rugi real-time. |
| **End-Users Sosial** | LAZ/Yayasan/NGO | Transparansi dana, laporan per program, PSAK 109/ISAK 35\. |
| **Engineering Team** | Builder | Arsitektur jelas, API documentation, UI components. |
| **QA / Security** | Validator | Testability, Audit log, Data encryption. |
| **Regulator (OJK/BAZNAS)** | Eksternal | Kepatuhan laporan keuangan sesuai standar. |

---

## 6\. User Personas

| Persona | Entitas | Tujuan Utama | Pain Points | Kebutuhan Solusi |
| :---- | :---- | :---- | :---- | :---- |
| **1\. Finance Staff** | Bisnis & Sosial | Input transaksi harian cepat & minim salah. | Input manual dari struk/invoice makan waktu. | AI OCR, Auto-journal, UI ringkas, Command palette. |
| **2\. Accounting Staff** | Bisnis & Sosial | Tutup buku tepat waktu, jurnal balance. | Rekonsiliasi bank manual, mencari selisih angka. | Auto bank-matching, Anomaly detection, Draft offline. |
| **3\. Cashier** | Bisnis & Sosial | Menerima & mencatat uang masuk *real-time*. | Harus konfirmasi ke banyak pihak jika ada transfer. | Notifikasi instan, integrasi Mutasi Bank/QRIS. |
| **4\. Auditor** | Bisnis & Sosial | Memeriksa validitas transaksi & kepatuhan. | Sulit melacak siapa mengubah data dan kapan. | Audit Trail komprehensif, Read-only access, Attachments. |
| **5\. Manager** | Bisnis & Sosial | Pantau realisasi vs budget (RAPB) per divisi. | Laporan selalu *delay* nunggu akhir bulan. | Real-time Dashboard, Budget warning, Mobile approval. |
| **6\. Direktur** | Bisnis | Keputusan strategis berbasis *cashflow* & profitabilitas. | Terlalu banyak angka, sulit paham tren. | AI Financial Insights, Cash projection, P\&L chart. |
| **7\. Ketua Yayasan** | Sosial | Transparansi dana donatur & program sosial. | Susah memisahkan dana terikat & tidak terikat. | Fund accounting (PSAK 109/ISAK 35), Laporan per program. |
| **8\. Bendahara** | Bisnis & Sosial | Atur *cash level*, pencairan dana, CA outstanding. | Banyak Cash Advance menggantung/belum LPJ. | CA Aging report, Auto-reminder WhatsApp. |
| **9\. Amil / Program Officer** | Sosial | Mencatat donasi masuk & distribusi per mustahiq/penerima. | Rekap donasi manual di Excel, rawan selisih. | Donor management, Distribusi asnaf, Receipt digital. |
| **10\. Tax Officer** | Bisnis | Menghitung & melaporkan PPN/PPh tepat waktu. | Rekap pajak manual per transaksi sangat lama. | Tax module terintegrasi, auto-hitung DPP, laporan e-SPT. |
| **11\. Admin** | Bisnis & Sosial | Setup awal, user, & role. | Konfigurasi sistem lama sangat teknis. | Wizard setup, Role & Permission matrix visual. |
| **12\. Super Admin** | Platform | Menjaga stabilitas & keamanan sistem. | Downtime, backup data manual. | Cloud scaling, System health dashboard. |

---

## 7\. User Journey

### Skenario A: Cash Advance — Bisnis & Sosial (Universal)

Staff: Input Pengajuan CA di Register

  → Sistem: Cek Budget (RAPB)

    → \[Over Budget\] → Staff: Request Revisi / Reject

    → \[Budget OK\] → Manager: Notif WA & Approve via Mobile

      → Bendahara: Review & Proses Pencairan Bank

        → Sistem: Auto Jurnal Piutang Karyawan

          → Staff: Upload Struk via AI OCR

            → Sistem: Draft LPJ & Jurnal Biaya

              → Bendahara: Approve LPJ & Rekonsiliasi Selisih

### Skenario B: Pencatatan Donasi & Distribusi — Entitas Sosial

Donatur: Transfer via Bank/QRIS/Link

  → Sistem: Notif Mutasi Masuk (Webhook/Import)

    → Amil: Match Mutasi → Donor Record (Auto-suggest by name/amount)

      → Sistem: Auto-jurnal Penerimaan Dana (per jenis: Zakat/Infaq/Sedekah/Wakaf)

        → Program Officer: Alokasi ke Program/Fund Terikat

          → Bendahara: Cairkan Dana Distribusi

            → Sistem: Jurnal Pengeluaran Distribusi (per asnaf/mustahiq)

              → Sistem: Generate Laporan Posisi Keuangan (PSAK 109/ISAK 35\)

### Skenario C: Invoice & Pembayaran Vendor — Entitas Bisnis

Finance: Input Invoice Vendor (AP)

  → AI OCR: Ekstrak data dari PDF/foto invoice

    → Sistem: Validasi NPWP, hitung PPN 12% & PPh 23 (jika applicable)

      → Sistem: Auto-jurnal Utang Usaha & Pajak Masukan

        → Manager: Approve pembayaran

          → Finance: Proses Transfer Bank

            → Sistem: Auto-jurnal Pelunasan AP & Update Aging

              → Sistem: Generate Faktur Pajak / Bukti Potong

---

## 8\. Information Architecture & Sitemap

Struktur menu disusun linier sesuai siklus akuntansi (*Workflow-driven navigation*). Label menu akan menyesuaikan jenis entitas (Business Mode / Social Mode).

| Menu | Business Mode Label | Social Mode Label |
| :---- | :---- | :---- |
| 📊 Dashboard | Dashboard Keuangan | Dashboard Dana & Program |
| ⚙️ Master Data | Master Data | Master Data |
| 📝 Register | Register Transaksi | Register Transaksi |
| 📈 RAPB | Anggaran (RAPB) | Anggaran Program |
| 💸 Cash Advance | Cash Advance | Dana Operasional / CA |
| ✅ Approval | Approval Center | Approval Center |
| 📥 Penerimaan | Invoice AR / Pendapatan | Donasi & Penerimaan Dana |
| 📤 Pengeluaran | Invoice AP / Beban | Distribusi & Pengeluaran |
| 🏦 Kas & Bank | Kas & Bank | Kas & Bank |
| ⚖️ Rekonsiliasi | Rekonsiliasi Bank | Rekonsiliasi Bank |
| 📓 Jurnal | Jurnal | Jurnal |
| 📌 Posting | Tutup Buku | Tutup Buku |
| 📑 Laporan | Laporan Keuangan (PSAK) | Laporan Keuangan (PSAK 109/ISAK 35\) |
| 👥 Kontak | Vendor & Customer | Donatur & Mitra |
| 🧾 Pajak | Manajemen Pajak | — (disembunyikan) |
| 🌐 Program | — (disembunyikan) | Program & Dana |
| 🛠️ Setting | Setting Sistem | Setting Sistem |
| 🛡️ Audit Trail | Log Aktivitas | Log Aktivitas |

---

## 9\. Navigation Flow & UI/UX Guidelines

**Frontend Tech Stack:** ReactJS 18+, TypeScript, TailwindCSS v3, Shadcn UI, React Query (TanStack), Zustand, Zod, Framer Motion, Recharts, AG Grid (untuk data table besar).

**Backend Tech Stack:** Node.js (NestJS), PostgreSQL (per-tenant schema isolation), Redis (caching & job queue), BullMQ (background jobs: penyusutan, reminder, laporan terjadwal), MinIO/S3 (file storage), OpenAI API (AI features).

**Infrastructure:** Docker \+ Kubernetes (GKE/EKS), Nginx Ingress, Cloudflare (CDN & DDoS protection), GitHub Actions CI/CD.

**Design Philosophy:**

- **Mobile First:** Semua tabel bisa di-*swipe* atau menggunakan *card view* di layar kecil.  
- **Minimum Click:** Gunakan *Command Palette* (Cmd+K) untuk navigasi instan (contoh: ketik "Buat Jurnal").  
- **Guided Workflow:** Gunakan *Stepper* untuk proses panjang (ex: Setup Master Data, Onboarding).  
- **Floating Action:** Tombol CTA utama (+ New Transaction) selalu terlihat di bottom-right.  
- **Soft & Clean:** Latar \#F9FAFB, Card \#FFFFFF dengan shadow lembut, accent primary \#2563EB.  
- **Contextual UI:** Modul, label, dan COA template menyesuaikan jenis entitas yang dipilih saat setup.

---

## 10\. Entity Configuration Engine

### 10.1 Konsep Toggle

Saat onboarding, Admin memilih **Tipe Entitas**. Pilihan ini mengaktifkan/menonaktifkan modul, mengubah label UI, memuat COA template yang sesuai, dan menentukan standar laporan PSAK yang digunakan.

| Konfigurasi | Bisnis (PT/CV/UD) | Sosial/Hybrid (Yayasan/LAZ/NGO/Masjid) |
| :---- | :---- | :---- |
| **Standar PSAK** | PSAK Bisnis Umum | PSAK 45 / ISAK 35 / PSAK 109 |
| **COA Template** | 5 kelompok standar bisnis | Kelompok Aset Neto (Terikat & Tidak Terikat) |
| **Modul Aktif** | Pajak, Invoice AR/AP, P\&L | Dana/Fund, Donor, Program, Distribusi |
| **Laporan Utama** | Neraca, L/R, Arus Kas | Lap. Posisi Keuangan, Lap. Perubahan Aset Neto, Lap. Aktivitas, Lap. Arus Kas |
| **Label "Pendapatan"** | Revenue / Pendapatan Usaha | Penerimaan Dana / Donasi |
| **Label "Pelanggan"** | Customer / Klien | Donatur / Muzakki |
| **Label "Vendor"** | Vendor / Supplier | Mitra / Vendor Pengadaan |

### 10.2 FR-CFG (Entity Configuration)

- **FR-CFG-01:** Saat registrasi tenant baru, wizard onboarding menanyakan tipe entitas (Bisnis / Sosial / Hybrid) sebelum setup COA.  
- **FR-CFG-02:** Pilihan tipe entitas mengaktifkan COA template default yang dapat dikustomisasi.  
- **FR-CFG-03:** Admin dapat mengubah tipe entitas melalui Setting → Profil Organisasi, dengan konfirmasi bahwa perubahan akan mereset konfigurasi COA yang belum digunakan.  
- **FR-CFG-04:** Entitas **Hybrid** (misal: Yayasan yang memiliki unit bisnis) dapat mengaktifkan modul dari kedua tipe sekaligus dengan pemisahan cost center yang jelas.  
- **FR-CFG-05:** Modul yang tidak relevan untuk tipe entitas disembunyikan dari menu (bukan dihapus), agar dapat diaktifkan kembali tanpa kehilangan data.

---

## 10A\. Multi-Level Organization & Konsolidasi

### 10A.1 Konsep Hierarki Organisasi

Untuk mendukung lembaga sosial maupun bisnis yang memiliki struktur berjenjang (Pusat → Wilayah → Daerah/Cabang), OmniFin menyediakan **Organization Hierarchy Engine** yang memungkinkan setiap level melihat data miliknya sendiri maupun data konsolidasi dari entitas di bawahnya.

**Struktur hierarki yang didukung (contoh 3-level):**

```
[PUSAT]
  ├── [WILAYAH A]
  │     ├── [DAERAH A1]
  │     └── [DAERAH A2]
  └── [WILAYAH B]
        ├── [DAERAH B1]
        └── [DAERAH B2]
```

Setiap node pada hierarki adalah tenant mandiri yang memiliki data, COA, dan user sendiri. Konsolidasi terjadi secara *read-only* dari atas ke bawah — level atas dapat melihat agregasi data level di bawahnya, namun **tidak dapat mengedit** data milik entitas lain.

### 10A.2 Aturan Visibilitas Data per Level

| Level | Melihat Data Sendiri | Melihat Konsolidasi |
| :---- | :---- | :---- |
| **Daerah / Cabang** | ✅ Data daerahnya saja | ❌ Tidak ada (level terbawah) |
| **Wilayah** | ✅ Data wilayah sendiri | ✅ Konsolidasi daerah di bawah wilayah ini |
| **Pusat** | ✅ Data pusat sendiri | ✅ Konsolidasi seluruh wilayah + seluruh daerah |

**Toggle Scope pada Laporan & Dashboard:**
- **Level Pusat** dapat memilih scope: *"Pusat Saja"* / *"Per Wilayah (pilih)"* / *"Konsolidasi Semua"*
- **Level Wilayah** dapat memilih scope: *"Wilayah Saja"* / *"Konsolidasi Wilayah + Daerah"*
- **Level Daerah** hanya melihat data daerahnya sendiri (tidak ada toggle)

### 10A.3 FR-ORG (Organization Hierarchy)

- **FR-ORG-01:** Saat setup, Admin Pusat dapat mengaktifkan fitur Multi-Level Organization melalui Setting → Struktur Organisasi.
- **FR-ORG-02:** Admin Pusat dapat membuat node Wilayah dan Daerah, mengundang Admin per node, serta mendefinisikan relasi hierarki (parent-child).
- **FR-ORG-03:** Setiap node (Pusat/Wilayah/Daerah) memiliki konfigurasi COA, rekening bank, user, dan budget yang terpisah dan mandiri.
- **FR-ORG-04:** Hierarki mendukung kedalaman hingga 5 level (Pusat → Wilayah → Area → Daerah → Cabang).
- **FR-ORG-05:** Admin node anak (Wilayah/Daerah) tidak dapat melihat atau mengubah konfigurasi node lain yang bukan bawahannya.
- **FR-ORG-06:** Penghapusan node hanya dapat dilakukan oleh Admin Pusat setelah seluruh transaksi pada node tersebut di-*close* atau dipindahkan.
- **FR-ORG-07:** Setiap node dapat dikonfigurasi apakah menggunakan COA bersama (shared template dari Pusat) atau COA mandiri. Jika shared, Pusat dapat men-*push* perubahan COA ke seluruh node anak.

### 10A.4 FR-KONSOL (Konsolidasi Laporan)

- **FR-KONSOL-01:** Laporan konsolidasi tersedia untuk semua laporan standar (Neraca, L/R, Laporan Posisi Keuangan, Laporan Aktivitas, dll) dengan tambahan selector scope.
- **FR-KONSOL-02:** Konsolidasi dilakukan secara **real-time** dengan meng-aggregate data dari seluruh node anak yang masuk dalam scope yang dipilih.
- **FR-KONSOL-03:** Sistem secara otomatis melakukan **eliminasi transaksi antar-entitas** (intercompany/inter-node elimination) untuk mencegah *double-counting* pada laporan konsolidasi. Contoh: transfer dana dari Pusat ke Daerah tidak muncul sebagai penerimaan di laporan konsolidasi gabungan.
- **FR-KONSOL-04:** Pada laporan konsolidasi, tersedia opsi tampilan: *"Summary"* (angka total saja) atau *"By Node"* (breakdown per Wilayah/Daerah dalam satu laporan).
- **FR-KONSOL-05:** User level Wilayah hanya dapat mengakses konsolidasi node-node yang berada di bawah wilayahnya. Tidak bisa melihat data wilayah lain.
- **FR-KONSOL-06:** Konsolidasi RAPB/Budget menggabungkan anggaran seluruh node anak dan ditampilkan sebagai Budget vs Actual lintas entitas.
- **FR-KONSOL-07:** Log akses konsolidasi tercatat di Audit Trail (scope yang dipilih, waktu akses, user) sesuai catatan global Audit Trail di Section 11.
- **FR-KONSOL-08:** Laporan konsolidasi dapat dijadwalkan pengirimannya via email/WhatsApp secara otomatis (misal: setiap awal bulan, laporan konsolidasi wilayah dikirim ke Admin Wilayah).

### 10A.5 FR-RBAC-H (RBAC Hierarki)

Selain role berbasis fungsi (Section 16), setiap user memiliki dimensi **scope** yang menentukan node mana yang dapat diakses.

| Atribut | Nilai | Keterangan |
| :---- | :---- | :---- |
| `org_id` | ID node | Organisasi/node yang dimiliki user |
| `scope_type` | `own` / `region` / `all` | Jangkauan akses data |
| `scope_ids` | Array org_id | Daftar node yang masuk dalam scope user (otomatis terisi dari hierarki) |

- **FR-RBAC-H01:** User dengan `scope_type = own` hanya dapat mengakses data milik `org_id`-nya sendiri.
- **FR-RBAC-H02:** User dengan `scope_type = region` dapat mengakses data milik node-nya sendiri + seluruh node anak secara rekursif (konsolidasi).
- **FR-RBAC-H03:** User dengan `scope_type = all` (khusus Super Admin Pusat) dapat mengakses seluruh node dalam hierarki.
- **FR-RBAC-H04:** Admin Wilayah dapat mengelola user dan role di daerah bawahannya, namun tidak dapat memberikan `scope_type = all`.
- **FR-RBAC-H05:** Perubahan scope user dicatat di Audit Trail dan memerlukan approval Admin satu level di atasnya.

### 10A.6 Dashboard Konsolidasi

Dashboard memiliki **Scope Switcher** di bagian atas halaman (hanya tampil jika user memiliki akses multi-node):

```
[ Scope: ▼ Konsolidasi Semua  |  Wilayah A  |  Wilayah B  |  Pusat Saja ]
```

- Saat scope diganti, seluruh widget dashboard (cards, chart, data grid) me-refresh menampilkan data sesuai scope yang dipilih.
- **Top Cards** pada mode konsolidasi menampilkan: Total Penerimaan Semua Node, Total Pengeluaran Semua Node, Saldo Gabungan, Jumlah Transaksi Pending Approval lintas node.
- **Tabel Perbandingan Kinerja Antar Node:** Tabel yang memperlihatkan ringkasan keuangan (Total Penerimaan, Total Pengeluaran, Saldo) masing-masing Wilayah/Daerah secara berdampingan dalam satu view — hanya tersedia di level Pusat dan Wilayah.

### 10A.7 Laporan Konsolidasi (Tambahan di Section 18)

#### Laporan Konsolidasi — Bisnis & Sosial

| Kode | Nama Laporan | Scope | Keterangan |
| :---- | :---- | :---- | :---- |
| RPT-K-01 | Neraca Konsolidasi | Pusat / Wilayah | Balance Sheet gabungan dengan eliminasi intercompany |
| RPT-K-02 | L/R Konsolidasi | Pusat / Wilayah | Laba Rugi gabungan seluruh node dalam scope |
| RPT-K-03 | Laporan Posisi Keuangan Konsolidasi | Pusat / Wilayah | Versi ISAK 35 / PSAK 109 untuk entitas sosial |
| RPT-K-04 | Laporan Aktivitas Konsolidasi | Pusat / Wilayah | Penerimaan & pengeluaran gabungan (sosial) |
| RPT-K-05 | Rekapitulasi Penerimaan per Node | Pusat / Wilayah | Breakdown penerimaan per Daerah/Wilayah dalam satu tabel |
| RPT-K-06 | Rekapitulasi Pengeluaran per Node | Pusat / Wilayah | Breakdown pengeluaran per Daerah/Wilayah |
| RPT-K-07 | Budget vs Actual Konsolidasi | Pusat / Wilayah | RAPB gabungan seluruh node vs realisasi |
| RPT-K-08 | Perbandingan Kinerja Antar Node | Pusat | Tabel komparatif seluruh Wilayah/Daerah side-by-side |
| RPT-K-09 | Laporan Dana Terikat Konsolidasi | Pusat / Wilayah | Rekap saldo Dana Terikat & Tidak Terikat lintas node (sosial) |
| RPT-K-10 | Laporan Distribusi Konsolidasi per Program | Pusat / Wilayah | Total distribusi per program/asnaf dari seluruh node (sosial) |

### 10A.8 Skema Database Tambahan

```sql
-- Hierarki Organisasi
ALTER TABLE organizations ADD COLUMN parent_org_id UUID REFERENCES organizations(id);
ALTER TABLE organizations ADD COLUMN org_level ENUM('pusat','wilayah','area','daerah','cabang') DEFAULT 'pusat';
ALTER TABLE organizations ADD COLUMN org_path TEXT; -- materialized path: '/pusat_id/wilayah_id/daerah_id'

-- Scope pada User Role
ALTER TABLE user_roles ADD COLUMN scope_type ENUM('own','region','all') DEFAULT 'own';
ALTER TABLE user_roles ADD COLUMN scope_ids UUID[]; -- diisi otomatis dari hierarki

-- Cache Konsolidasi (untuk performa)
consolidation_snapshots (
  id, root_org_id, scope_org_ids UUID[], 
  report_type, period_start, period_end, 
  snapshot_data JSONB, generated_at, is_stale BOOLEAN
)

-- Log Transfer Antar Node (untuk eliminasi intercompany)
internode_transfers (
  id, from_org_id, to_org_id, 
  amount, transfer_date, 
  from_journal_id, to_journal_id, 
  elimination_flag BOOLEAN
)
```

### 10A.9 Business Rules Konsolidasi

1. **Eliminasi Intercompany:** Transfer dana antar node dalam satu hierarki wajib ditandai sebagai `internode_transfer`. Saat konsolidasi, transaksi ini dieliminasi dari laporan gabungan agar tidak terjadi double-counting.
2. **Read-Only Lintas Node:** User level atas (Pusat/Wilayah) hanya dapat *membaca* data node bawahnya melalui laporan konsolidasi. Tidak ada akses input/edit ke transaksi node lain.
3. **COA Mapping:** Jika node anak menggunakan COA mandiri yang berbeda dari Pusat, sistem memerlukan **COA Mapping Table** untuk memetakan akun node anak ke akun standar Pusat sebelum konsolidasi dapat dilakukan.
4. **Periode Konsolidasi:** Konsolidasi hanya mencakup periode yang sudah di-*close* (posted) atau periode berjalan secara real-time. Data Draft tidak masuk konsolidasi.
5. **Tenant Isolation Tetap Berlaku:** Meskipun ada konsolidasi, RLS PostgreSQL tetap aktif. Akses konsolidasi dilakukan melalui service layer yang memvalidasi `scope_ids` user secara eksplisit — bukan bypass RLS.

---

## 11\. Functional Requirements (Modul Utama)

> **Catatan Global — Audit Trail:** Seluruh aksi signifikan dalam sistem (input transaksi, perubahan konfigurasi, approval, closing, override, akses konsolidasi, perubahan role/scope) dicatat otomatis di Audit Trail sesuai Business Rule #7. FR yang menyebut "tercatat di Audit Trail" merujuk mekanisme yang sama.

### A. Onboarding Wizard

- **FR-OBK-01:** Wizard 5-langkah: (1) Tipe Entitas → (2) Profil Organisasi → (3) Pilih COA Template → (4) Setup Rekening Bank → (5) Undang User & Set Role.  
- **FR-OBK-02:** Setiap langkah dapat di-*skip* dan dilengkapi belakangan melalui menu Setting.  
- **FR-OBK-03:** Progress wizard ditampilkan sebagai persentase penyelesaian di dashboard ("Setup 60% — Lengkapi profil Anda").  
- **FR-OBK-04:** Template COA default disediakan untuk: PT Jasa, PT Dagang, Yayasan Pendidikan, LAZ, Masjid, NGO Umum. User dapat mengimpor COA via file Excel. *(Lihat FR-MD-01 untuk spesifikasi struktur dan format kode akun.)*  
- **FR-OBK-05:** Sistem menyediakan *sample data* opsional (transaksi demo) agar user dapat menjelajahi fitur tanpa takut mengotori data nyata.

### B. Register (Core Engine)

Semua transaksi (Penerimaan, Pengeluaran, Jurnal) berawal dari konsep "Register" sebagai wadah antrian dokumen sebelum di-posting.

- **FR-REG-01:** Sistem men-generate Nomor Register berurutan otomatis dengan format yang dapat dikonfigurasi (contoh: `TRX/2026/08/0001`).  
- **FR-REG-02:** Mendukung *versioning* dokumen dan kolom *comment* per register.  
- **FR-REG-03:** Mewajibkan unggah *attachment* (foto/PDF) untuk transaksi di atas limit nominal yang dikonfigurasi Admin.  
- **FR-REG-04:** Register memiliki status lifecycle: `Draft → Submitted → Approved → Posted → Reversed`.  
- **FR-REG-05:** Fitur *Duplicate Register* untuk transaksi berulang (contoh: bayar sewa bulanan).  
- **FR-REG-06:** Register dapat ditag ke Cost Center, Program (sosial), dan Fund/Dana.

### C. Master Data

- **FR-MD-01 (COA):** Struktur COA mendukung hingga 6 level sub-akun. Kode akun format `X.XX.XX.XX` dapat dikonfigurasi. Normal balance (Debit/Kredit) dikunci per tipe akun.  
- **FR-MD-02 (Cost Center):** Hierarki Cost Center: Divisi → Departemen → Proyek/Program.  
- **FR-MD-03 (Fund/Dana — Sosial):** Entitas sosial dapat mendefinisikan Dana Terikat (restricted) dan Dana Tidak Terikat (unrestricted). Setiap transaksi wajib ditag ke Fund.  
- **FR-MD-04 (Vendor/Donatur):** Form kontak unified menyimpan: nama, NPWP (untuk bisnis), alamat, rekening bank, WhatsApp, dan catatan. Untuk entitas sosial, field tambahan: jenis donatur (individu/lembaga), muzakki/non-muzakki.  
- **FR-MD-05 (Program — Sosial):** Master Program menyimpan: nama program, periode, target anggaran, penanggung jawab, dan Fund yang dialokasikan.  
- **FR-MD-06 (Produk/Layanan — Bisnis):** Daftar item produk/jasa dengan harga satuan, satuan ukuran, dan COA akun pendapatan/HPP yang terhubung.
- **FR-MD-07 (Konfigurasi Cutoff Tutup Buku):** Admin dapat mengatur batas tanggal (*cutoff date*) untuk proses Closing/Tutup Buku melalui menu **Setting → Konfigurasi Akuntansi → Cutoff Tutup Buku**. Lihat detail spesifikasi di Section 11.P.

### D. RAPB (Rencana Anggaran Pendapatan & Belanja)

- **FR-RAPB-01:** Pembuatan budget berdasarkan Program, Cost Center, dan Fund/Dana.  
- **FR-RAPB-02:** Fitur *Hard Lock* (transaksi ditolak jika *over-budget*) atau *Soft Lock* (butuh extra approval dari Direktur/Ketua).  
- **FR-RAPB-03:** Live "Budget vs Actual" bar chart di halaman penginputan transaksi.  
- **FR-RAPB-04:** Revisi RAPB (budget amendment) dicatat dengan histori versi dan alasan perubahan.  
- **FR-RAPB-05:** RAPB dapat dipecah per bulan (monthly spread) secara merata atau manual (seasonality).  
- **FR-RAPB-06:** Alert email/WA otomatis ketika realisasi mencapai 80% budget.

### E. Cash Advance (CA)

- **FR-CA-01:** Staff mengajukan CA dengan mengisi: tujuan, nominal, tanggal butuh, cost center/program.  
- **FR-CA-02:** Sistem otomatis mengecek sisa budget terkait sebelum CA diteruskan ke approver.  
- **FR-CA-03:** Setelah disetujui, sistem men-generate jurnal otomatis: `Debit Piutang Karyawan / Kredit Kas Bank`.  
- **FR-CA-04:** Staff mengajukan LPJ (Laporan Pertanggungjawaban) dengan upload struk via AI OCR.  
- **FR-CA-05:** LPJ menghasilkan jurnal realisasi: `Debit Beban X / Kredit Piutang Karyawan`. Selisih lebih → Pendapatan Lain, selisih kurang → Piutang CA tambahan atau Kas Kembali.  
- **FR-CA-06:** CA Aging Report menampilkan daftar CA yang belum di-LPJ-kan beserta jumlah hari tertunggak.  
- **FR-CA-07:** Pengingat otomatis WhatsApp dikirim ke staff jika LPJ belum diselesaikan dalam N hari (konfigurasi Admin).

### F. Penerimaan (AR & Donasi)

**Untuk Entitas Bisnis:**

- **FR-PRN-01 (Bisnis):** Buat Invoice AR dengan line items (produk/jasa, qty, harga, diskon). Sistem otomatis menghitung PPN (jika PKP) dan total tagihan.  
- **FR-PRN-02 (Bisnis):** Kirim Invoice ke email customer langsung dari sistem (PDF branded dengan logo organisasi).  
- **FR-PRN-03 (Bisnis):** Status Invoice: `Draft → Sent → Partial Paid → Paid → Overdue → Cancelled`.  
- **FR-PRN-04 (Bisnis):** Pembayaran sebagian (partial payment) didukung dengan riwayat cicilan.  
- **FR-PRN-05 (Bisnis):** Aging AR otomatis dikelompokkan: 0-30 hari, 31-60 hari, 61-90 hari, \>90 hari.

**Untuk Entitas Sosial:**

- **FR-PRN-06 (Sosial):** Input penerimaan donasi tunggal dengan field: donatur (lookup/baru), nominal, jenis dana (Zakat Maal, Zakat Fitrah, Infaq, Sedekah, Wakaf, Donasi Program Terikat), metode pembayaran, tanggal.  
- **FR-PRN-07 (Sosial):** Import penerimaan donasi bulk dari file Excel/CSV (untuk rekap donasi platform online seperti Kitabisa, Tokopedia).  
- **FR-PRN-08 (Sosial):** Generate & kirim otomatis **Kwitansi/Bukti Donasi** digital ke donatur via WhatsApp atau email.  
- **FR-PRN-09 (Sosial):** Donasi terikat program (restricted fund) secara otomatis ditandai dan tidak dapat digunakan untuk kebutuhan operasional umum.  
- **FR-PRN-10 (Sosial):** Rekap donasi per periode per jenis dana dengan perbandingan target campaign.

### G. Pengeluaran (AP & Distribusi)

**Untuk Entitas Bisnis:**

- **FR-PNK-01 (Bisnis):** Buat Tagihan/Bill dari Vendor (AP) dengan upload PDF invoice → AI OCR mengekstrak data.  
- **FR-PNK-02 (Bisnis):** Sistem otomatis menghitung **Pajak Masukan PPN** dan **PPh Pasal 23** (jika vendor adalah Badan dan jenis jasa kena PPh 23).  
- **FR-PNK-03 (Bisnis):** Aging AP dikelompokkan seperti AR, dengan fitur *payment scheduling*.  
- **FR-PNK-04 (Bisnis):** *Batch Payment*: proses pembayaran ke beberapa vendor sekaligus, generate ringkasan transfer ke Bank.  
- **FR-PNK-05 (Bisnis):** Status Bill: `Draft → Received → Approved → Scheduled → Paid → Overdue`.

**Untuk Entitas Sosial:**

- **FR-PNK-06 (Sosial):** Input Distribusi/Penyaluran Dana: pilih program, pilih asnaf/mustahiq (lookup), nominal, metode penyaluran (tunai, transfer, natura).  
- **FR-PNK-07 (Sosial):** Generate **Surat Keputusan Distribusi** dan **Berita Acara Penyaluran** otomatis (template dapat dikustomisasi).  
- **FR-PNK-08 (Sosial):** Sistem mencegah distribusi dari Dana Terikat ke program yang tidak sesuai (alert \+ block jika Hard Lock).  
- **FR-PNK-09 (Sosial):** Distribusi natura (barang) mencatat nama barang dan estimasi nilai rupiah untuk laporan.  
- **FR-PNK-10 (Sosial):** Laporan distribusi per asnaf/kategori penerima sesuai format pelaporan BAZNAS/LAZ.

### H. Kas & Bank

- **FR-KB-01:** Setiap rekening bank/kas dicatat sebagai akun COA tersendiri dengan saldo awal (opening balance).  
- **FR-KB-02:** Transfer antar rekening men-generate jurnal transfer otomatis: `Debit Rek. Tujuan / Kredit Rek. Asal`.  
- **FR-KB-03:** Import mutasi bank dari file CSV/OFX/XLSX (format BCA, Mandiri, BRI, BSI, BNI disediakan sebagai template parser).  
- **FR-KB-04:** Saldo per rekening ditampilkan real-time di dashboard dengan history mutasi yang dapat difilter.  
- **FR-KB-05:** Petty cash (kas kecil) dikelola dengan metode **Imprest System** (pengisian kembali ke saldo tetap).  
- **FR-KB-06:** Notifikasi WhatsApp ketika saldo rekening bank di bawah threshold minimum yang dikonfigurasi.

### I. Rekonsiliasi Bank

- **FR-RKN-01:** Tampilan 2-kolom: *Bank Statement* (dari impor) vs *System Ledger* (jurnal dari sistem).  
- **FR-RKN-02:** **Auto-matching** berdasarkan nominal \+ tanggal ± toleransi N hari (konfigurasi).  
- **FR-RKN-03:** Matching confidence ditampilkan dalam persentase. Transaksi dengan confidence \>90% otomatis di-match (dapat dikonfigurasi ke manual review dulu).  
- **FR-RKN-04:** Transaksi bank yang tidak ditemukan padanannya di sistem dapat langsung dijurnal dari halaman rekonsiliasi.  
- **FR-RKN-05:** Rekonsiliasi di-lock per periode setelah proses tutup buku. Tidak bisa diubah kecuali melalui periode koreksi.  
- **FR-RKN-06:** Laporan Rekonsiliasi Bank dapat diekspor ke PDF/Excel sebagai dokumen audit.

### J. Jurnal & Posting

- **FR-JRN-01:** Jurnal Umum: entri manual multi-baris dengan validasi Debit \= Kredit sebelum simpan.  
- **FR-JRN-02:** Jurnal Otomatis di-generate dari Register (Penerimaan, Pengeluaran, CA, Transfer) — tidak perlu entri manual.  
- **FR-JRN-03:** **Jurnal Berulang (Recurring Journal):** Template jurnal yang dijalankan otomatis setiap tanggal tertentu (contoh: beban sewa bulanan).  
- **FR-JRN-04:** **Jurnal Pembalik (Reversing Journal):** Dibuat untuk membatalkan jurnal yang sudah diposting tanpa menghapusnya (untuk audit trail).  
- **FR-JRN-05:** **Jurnal Penyesuaian (Adjusting Entry):** Khusus untuk koreksi akhir periode sebelum tutup buku.  
- **FR-JRN-06 (Posting/Tutup Buku):** Proses Posting me-lock seluruh jurnal pada periode tersebut — sesuai Business Rule #2 (Closed Period). Perubahan setelah posting hanya bisa via Jurnal Pembalik.  
- **FR-JRN-07:** Buku Besar (General Ledger) dapat di-drill-down dari saldo sampai ke transaksi sumber.

### K. Asset & Depreciation

- **FR-AST-01:** Generate QR Code per aset untuk dicetak dan ditempel.  
- **FR-AST-02:** *Scan* QR code via *mobile browser* untuk melihat detail/histori perbaikan.  
- **FR-AST-03:** *Cron-job* otomatis setiap tanggal 28-31 untuk *generate* Jurnal Penyusutan (Straight Line, Double Declining Balance, Saldo Menurun Ganda).  
- **FR-AST-04:** Asset disposal (penjualan/penghapusan) men-generate jurnal gain/loss on disposal otomatis.  
- **FR-AST-05:** Asset revaluation dicatat dengan jurnal penyesuaian nilai buku.  
- **FR-AST-06:** Laporan Daftar Aset Tetap (Fixed Asset Register) lengkap dengan akumulasi penyusutan dan nilai buku per periode.

### L. Manajemen Pajak (Bisnis Only)

- **FR-TAX-01 (PPN):** Sistem mencatat Pajak Masukan (dari pembelian) dan Pajak Keluaran (dari penjualan) per periode. Kalkulasi PPN Kurang/Lebih Bayar otomatis.  
- **FR-TAX-02 (PPN):** Generate ringkasan Faktur Pajak Masukan dan Keluaran per masa pajak, siap diekspor ke format e-Faktur DJP.  
- **FR-TAX-03 (PPh 23):** Sistem mengidentifikasi transaksi yang wajib potong PPh 23 berdasarkan jenis layanan dan threshold (\>Rp 0 untuk badan). Hitung otomatis: tarif 2% (standar) atau 4% (tanpa NPWP).  
- **FR-TAX-04 (PPh 23):** Generate Bukti Pemotongan PPh 23 (template resmi DJP) per vendor per masa.  
- **FR-TAX-05 (PPh 21):** Modul ringkas pencatatan PPh 21 karyawan (dari data payroll yang diimpor). Tidak include kalkulasi PPh 21 penuh (out of scope MVP).  
- **FR-TAX-06:** Dashboard Pajak menampilkan: PPN terutang periode berjalan, daftar PPh 23 terpotong, dan kalender jatuh tempo pelaporan.

### M. Donor & Fund Management (Sosial Only)

- **FR-DON-01:** Database Donatur (Muzakki/Dermawan) dengan histori seluruh donasi, total kontribusi, dan segmentasi (rutin/sekali).  
- **FR-DON-02:** Kartu Donatur menampilkan: profil, histori transaksi, total donasi YTD, dan program yang pernah didukung.  
- **FR-DON-03:** **Donatur Rutin (Recurring Donor):** Setup donasi berulang bulanan. Sistem mengirimkan pengingat dan mengupdate status secara otomatis.  
- **FR-DON-04:** **Segmentasi Donatur:** Kelompokkan berdasarkan tier (biasa/loyal/major donor), frekuensi, atau program favorit — untuk keperluan CRM dan laporan.  
- **FR-DON-05:** **Laporan Donatur:** Top donatur per periode, donatur aktif vs churn (lapsed), dan analisis cohort sederhana.  
- **FR-DON-06 (Fund Accounting):** Setiap Fund/Dana memiliki saldo tersendiri yang dilacak secara independen. Transfer antar fund harus melalui jurnal fund transfer yang disetujui.  
- **FR-DON-07 (Campaign/Fundraising):** Buat halaman campaign internal dengan target, periode, dan progress bar. Donasi yang masuk dapat di-tag ke campaign.

### N. Report Builder

- **FR-RPT-01:** UI *Drag & drop* untuk memilih kolom (Dimensi: Cost Center, Program, Waktu; Metrics: Saldo, Budget, Realisasi).  
- **FR-RPT-02:** *Save as Template* untuk digunakan ulang.  
- **FR-RPT-03:** Penjadwalan email otomatis (e.g., Laba Rugi dikirim setiap Senin jam 8 pagi ke Direktur).  
- **FR-RPT-04:** Filter multi-dimensi: tanggal, cost center, program/fund, vendor, COA, tipe transaksi.  
- **FR-RPT-05:** Ekspor ke PDF (layout A4), Excel (raw data \+ pivot-ready), dan CSV.  
- **FR-RPT-06:** Komparasi antar periode (bulan ini vs bulan lalu, tahun ini vs tahun lalu) dalam satu laporan.

### P. Konfigurasi Cutoff Tutup Buku

Fitur ini mengatur **batas waktu** kapan proses Closing/Tutup Buku masih diizinkan untuk suatu periode. Dikonfigurasi di **Setting → Konfigurasi Akuntansi → Cutoff Tutup Buku**.

#### Konsep Cutoff

Cutoff adalah tanggal batas di bulan berikutnya setelah periode yang akan ditutup. Contoh:

> Cutoff = **tanggal 3**
> → Penutupan buku **Januari 2026** hanya boleh dilakukan antara tanggal **1–3 Februari 2026**.
> → Jika sudah tanggal **4 Februari 2026** ke atas, tombol Closing untuk Januari 2026 **dikunci otomatis**.

#### FR-CUTOFF-01 (Konfigurasi Master)

Admin mengatur cutoff melalui form konfigurasi dengan field:

| Field | Tipe | Keterangan |
| :---- | :---- | :---- |
| **Tanggal Cutoff** | Integer (1–28) | Tanggal batas di bulan berikutnya. Default: 10. Maksimum 28 agar valid di semua bulan termasuk Februari. |
| **Berlaku Untuk** | Scope | `Semua Node` atau per Wilayah/Daerah (jika multi-level aktif). Node anak dapat memiliki cutoff berbeda dari Pusat. |
| **Mode Cutoff** | Enum | `Strict` — Closing diblokir keras setelah cutoff. `Approval` — Closing setelah cutoff memerlukan approval khusus dari Super Admin. |
| **Override oleh** | Role | Role yang boleh melakukan override cutoff (default: Super Admin saja). |

- **FR-CUTOFF-02:** Perubahan nilai cutoff dicatat di Audit Trail dengan nilai lama, nilai baru, dan user yang mengubah.
- **FR-CUTOFF-03:** Sistem menghitung batas waktu Closing secara otomatis: `batas = tanggal [cutoff_date] bulan [periode+1] tahun [periode_year + (jika bulan=12 maka 1 else 0)]`.
- **FR-CUTOFF-04:** Sistem menampilkan informasi cutoff aktif secara kontekstual di halaman Trial Balance, di bawah toolbar: *"Batas Closing periode [Bulan Tahun]: [Tanggal Cutoff]. Sisa waktu: X hari."*
- **FR-CUTOFF-05:** Jika tanggal hari ini **≤ tanggal cutoff**, tombol Closing aktif dan dapat diklik (tetap tunduk pada validasi balance — FR-TB-06).
- **FR-CUTOFF-06:** Jika tanggal hari ini **> tanggal cutoff** dan Mode = `Strict`, tombol Closing **disabled** dengan tooltip: *"Batas Closing periode ini ([tanggal cutoff]) telah terlewat. Hubungi Super Admin untuk override."*
- **FR-CUTOFF-07:** Jika tanggal hari ini **> tanggal cutoff** dan Mode = `Approval`, tombol Closing tetap tampil namun mengirimkan **notifikasi approval** ke Super Admin. Closing baru dieksekusi setelah Super Admin menyetujui. Permintaan override dicatat di Audit Trail.
- **FR-CUTOFF-08:** Super Admin dapat melakukan **Override Manual** — membuka paksa akses Closing untuk periode tertentu meskipun cutoff sudah terlewat, dengan mengisi alasan wajib yang tersimpan di Audit Trail.
- **FR-CUTOFF-09:** Sistem mengirimkan **notifikasi pengingat** (WhatsApp + In-App) kepada user dengan role `Tutup Buku` ketika sisa waktu cutoff tinggal **3 hari** dan **1 hari** sebelum batas.
- **FR-CUTOFF-10:** Cutoff berlaku **per periode** (per bulan). Setiap bulan memiliki batas cutoff-nya masing-masing. Jika satu periode terlewat tanpa di-close, periode tersebut hanya bisa ditutup via Override (FR-CUTOFF-07/08).

#### Alur Logika Cutoff

```
User klik tombol "Closing" untuk Periode X
  → Sistem cek: apakah ada SELISIH di Trial Balance?
      → [Ada SELISIH] → BLOKIR. Tampilkan error selisih. STOP.
  → Sistem cek: tanggal hari ini vs batas cutoff periode X
      → [Dalam batas cutoff] → Lanjut proses Closing normal. ✅
      → [Melewati cutoff — Mode Strict] → BLOKIR. Tampilkan pesan cutoff terlewat. STOP. ❌
      → [Melewati cutoff — Mode Approval] → Kirim request override ke Super Admin. ⏳
          → [Super Admin Setuju] → Lanjut proses Closing. ✅
          → [Super Admin Tolak] → BLOKIR. Notifikasi penolakan ke pemohon. ❌
```

#### Schema Database Tambahan

```sql
-- Konfigurasi Cutoff per Organisasi/Node
closing_cutoff_config (
  id, org_id,
  cutoff_day        INTEGER NOT NULL,     -- tanggal batas (1-28)
  mode              ENUM('strict','approval') DEFAULT 'strict',
  override_role     VARCHAR,              -- role yang bisa override, default: super_admin
  effective_from    DATE,
  created_by        UUID,
  updated_at        TIMESTAMPTZ
)

-- Log Override Cutoff
closing_override_log (
  id, org_id,
  period_year       INTEGER,
  period_month      INTEGER,
  requested_by      UUID,
  requested_at      TIMESTAMPTZ,
  approved_by       UUID,                 -- NULL jika belum diproses
  approved_at       TIMESTAMPTZ,
  status            ENUM('pending','approved','rejected'),
  reason            TEXT NOT NULL,        -- wajib diisi pemohon
  rejection_note    TEXT                  -- diisi Super Admin jika ditolak
)
```

#### Acceptance Criteria — Cutoff Tutup Buku

**Story: Closing dalam Batas Cutoff**
- *Given* Cutoff dikonfigurasi tanggal 3, tanggal hari ini 2 Februari 2026, Trial Balance Januari 2026 BALANCE
- *When* Admin mengklik tombol "Closing" untuk periode Januari 2026
- *Then* Closing berhasil dieksekusi. Jurnal Januari terkunci. Saldo akhir Januari menjadi saldo awal Februari. Info cutoff di toolbar menampilkan *"Batas Closing Januari 2026: 3 Feb 2026. Sisa waktu: 1 hari."*

**Story: Closing Setelah Cutoff — Mode Strict**
- *Given* Cutoff dikonfigurasi tanggal 3, tanggal hari ini 5 Februari 2026, Mode = Strict
- *When* Admin membuka halaman Trial Balance periode Januari 2026
- *Then* Tombol "Closing" tampil dalam kondisi disabled (abu-abu). Tooltip menampilkan: *"Batas Closing periode Januari 2026 (3 Feb 2026) telah terlewat. Hubungi Super Admin untuk override."* Info cutoff di toolbar menampilkan label merah *"CUTOFF TERLEWAT"*.

**Story: Closing Setelah Cutoff — Mode Approval**
- *Given* Cutoff dikonfigurasi tanggal 3, Mode = Approval, tanggal hari ini 6 Februari 2026
- *When* Admin mengklik "Closing" untuk periode Januari 2026 dan mengisi alasan override *"Keterlambatan rekap cabang Garut"*
- *Then* Sistem mengirimkan notifikasi approval ke Super Admin via In-App dan WhatsApp. Status tombol berubah menjadi *"Menunggu Persetujuan Override"*. Jika Super Admin menyetujui, Closing dieksekusi dan seluruh proses tercatat di Audit Trail (pemohon, alasan, approver, timestamp).

**Story: Notifikasi Pengingat Cutoff**
- *Given* Cutoff dikonfigurasi tanggal 10, periode Januari 2026 belum di-close
- *When* Tanggal mencapai 7 Februari 2026 (3 hari sebelum cutoff)
- *Then* Sistem mengirim notifikasi WhatsApp + In-App ke seluruh user dengan permission `Tutup Buku`: *"⚠️ Pengingat: Batas Closing periode Januari 2026 adalah 10 Feb 2026 (3 hari lagi). Segera lakukan penutupan buku."*

---

## 12\. Workflow Diagram (Approval Engine)

Draft

  → \[Rule: Amount \> threshold (config per tipe transaksi)?\]

    → \[No\]  → Level 1: Manager Approval

    → \[Yes\] → Level 1: Manager Approval → Level 2: Director/Ketua Approval

              → \[Tipe Entitas Sosial & Dana Terikat?\] → Level 3: Program Committee Approval

\[All levels Approved\] → System: Status \= "Ready to Post" → Finance: Post / Proses Pembayaran

\[Any level Rejected\]  → System: Notif ke Pengaju → Status \= "Rejected" → Pengaju: Revisi / Cancel

**FR-APR-01:** Aturan approval dikonfigurasi per: tipe transaksi, nominal threshold, cost center, dan fund.

**FR-APR-02:** Approver dapat menyetujui/menolak via: in-app, WhatsApp Quick Reply (tombol "Setuju/Tolak"), atau email one-click.

**FR-APR-03:** Jika approver tidak merespons dalam N jam (konfigurasi), sistem mengirim eskalasi ke approver level berikutnya atau super-admin.

**FR-APR-04:** Setiap aksi approval (setuju/tolak/eskalasi/delegasi) tercatat di Audit Trail dengan informasi: siapa approver, kapan, dan komentar jika ada — sesuai catatan global Audit Trail di atas.

**FR-APR-05 (Delegasi):** Approver dapat mendelegasikan wewenangnya ke PJS selama periode tertentu (cuti, dinas luar).

---

## 13\. Business Rules

1. **Double-Entry Accounting:** Total Debit HANYA BISA disimpan jika \= Total Credit (Strict Rule). Error message: "Jurnal tidak seimbang: selisih Rp X."  
2. **Closed Period:** Transaksi pada periode yang sudah di-Posting/Tutup Buku tidak bisa diedit/dihapus, melainkan harus menggunakan Jurnal Pembalik (*Reverse Journal*).
3. **Cutoff Enforcement:** Proses Closing untuk suatu periode hanya dapat dilakukan selama tanggal hari ini masih ≤ tanggal cutoff yang dikonfigurasi di Master Setting. Melewati cutoff, Closing diblokir (Mode Strict) atau memerlukan approval Super Admin (Mode Approval). Override wajib disertai alasan dan tercatat di Audit Trail. Lihat Section 11.P untuk spesifikasi lengkap.
4. **Fund Accounting (Non-Profit):** Penerimaan Dana Zakat/Donasi Terikat tidak boleh disilangkan (*cross-fund*) untuk biaya operasional standar. Sistem memberikan alert merah dan, jika Hard Lock, menolak transaksi.  
5. **Pajak (Bisnis):** Setiap transaksi dengan PPN divalidasi apakah organisasi sudah berstatus PKP. Jika belum PKP, field PPN tersembunyi.  
6. **Budget Enforcement:** Budget yang sudah tutup buku tidak dapat direvisi. Revisi anggaran hanya pada periode berjalan dan harus melalui approval.  
7. **Audit Immutability:** Data jurnal yang sudah diposting tidak dapat dimodifikasi secara langsung di database maupun UI. Perubahan hanya melalui mekanisme Jurnal Pembalik yang tercatat.  
8. **Tenant Isolation:** Data satu organisasi tidak dapat diakses oleh organisasi lain dalam kondisi apapun. Implementasi melalui Row Level Security (RLS) PostgreSQL \+ validasi tenant\_id di setiap query.  
9. **Negative Balance Alert:** Sistem memperingatkan (tidak memblokir, kecuali dikonfigurasi) jika transaksi akan menyebabkan saldo Kas/Bank menjadi negatif.
10. **Internode Transfer Isolation:** Transfer dana antar node dalam satu hierarki (misal Pusat ke Daerah) wajib dikategorikan sebagai `internode_transfer` dan diberi flag eliminasi. Sistem menolak transfer antar node yang tidak memiliki relasi hierarki langsung.
11. **Scope Enforcement:** Seluruh query data — baik CRUD maupun laporan — wajib memvalidasi `scope_ids` user di service layer, di atas RLS PostgreSQL yang sudah aktif. Akses lintas node tanpa scope yang valid ditolak dan dicatat di Audit Trail sebagai `UNAUTHORIZED_SCOPE_ACCESS`.

---

## 14\. Integration Specifications

### 14.1 Bank Statement Import

- Format yang didukung: CSV, OFX, XLSX.  
- Parser tersedia untuk: Bank BCA, Bank Mandiri, BRI, BNI, BSI, Bank Muamalat, CIMB Niaga.  
- Parser dapat dikustomisasi Admin untuk bank lain (mapping kolom manual).

### 14.2 WhatsApp API

- Provider: Meta Cloud API (official) atau Twilio WhatsApp Business.  
- Trigger event: Approval request, LPJ reminder, saldo rendah, laporan terjadwal, kwitansi donasi.  
- Template pesan harus terdaftar dan approved di Meta Business Manager.

### 14.3 Email (SMTP/Transactional)

- Provider: SendGrid atau AWS SES.  
- Digunakan untuk: Invoice AR, laporan terjadwal, notifikasi sistem, daily digest.  
- Template email dapat dikustomisasi per organisasi (logo, warna brand).

### 14.4 Payment Gateway (Sosial — Penerimaan Donasi Online)

- Integrasi dengan: Midtrans (Snap), Xendit, atau Duitku untuk penerimaan donasi via Link Donasi.  
- Webhook otomatis mengupdate status donasi menjadi "Diterima" saat pembayaran berhasil.  
- Mendukung metode: Transfer Bank (VA), QRIS, GoPay, OVO, Dana, ShopeePay, Kartu Kredit.

### 14.5 AI Provider

- OCR & Vision: OpenAI GPT-4o Vision atau Google Document AI.  
- NLP Auto-categorization: Fine-tuned model atau few-shot prompting via OpenAI.  
- Cashflow Prediction: Python microservice (scikit-learn / statsmodels) dipanggil via internal REST API.

### 14.6 Export & External Integrations

- Ekspor laporan ke PDF (via Puppeteer server-side rendering) dan Excel (via ExcelJS).  
- API Publik (Phase 3): REST API terbuka dengan OAuth2 untuk integrasi pihak ketiga (e.g., platform fundraising, ERP HR).

---

## 15\. API & Data Model

### 15.1 API Architecture

- RESTful API JSON, versioned (`/api/v1/`).  
- GraphQL untuk Report Builder (query fleksibel multi-dimensi).  
- WebSocket (Socket.io) untuk real-time notification dan dashboard update.  
- Rate limiting: 100 req/menit per user, 1000 req/menit per tenant.

### 15.2 Core Database Schema

\-- Multi-tenant & Entity Configuration

organizations     (id, name, type ENUM\['business','ngo','hybrid'\], psak\_standard, is\_pkp, setup\_status, created\_at,
                   parent\_org\_id UUID,                                    \-- NULL jika node Pusat
                   org\_level ENUM\['pusat','wilayah','area','daerah','cabang'\],
                   org\_path TEXT)                                          \-- materialized path: '/pusat\_id/wilayah\_id/...'

entity\_config     (id, org\_id, module\_name, is\_active, label\_override, config\_json)

\-- Lihat Section 10A.8 untuk tabel tambahan: consolidation\_snapshots, internode\_transfers

\-- Chart of Accounts

coa               (id, org\_id, account\_code, account\_name, type ENUM\['asset','liability','equity','revenue','expense'\], normal\_balance, parent\_id, level, is\_active)

fund              (id, org\_id, fund\_name, fund\_type ENUM\['restricted','unrestricted'\], program\_id)  \-- Sosial only

\-- Core Transaction

registers         (id, org\_id, register\_no, type, status, total\_amount, cost\_center\_id, fund\_id, program\_id, created\_by, approved\_by, attachment\_urls, created\_at)

journals          (id, register\_id, org\_id, journal\_date, description, is\_posted, posted\_at, is\_reversed, reverse\_journal\_id)

journal\_items     (id, journal\_id, coa\_id, debit, credit, cost\_center\_id, fund\_id, narration)

\-- AR/AP

invoices          (id, org\_id, type ENUM\['AR','AP'\], contact\_id, invoice\_no, invoice\_date, due\_date, subtotal, ppn\_amount, total, status, register\_id)

invoice\_items     (id, invoice\_id, product\_id, description, qty, unit\_price, discount\_pct, ppn\_rate, line\_total)

payments          (id, invoice\_id, payment\_date, amount, bank\_account\_id, reference\_no)

\-- Donatur & Dana (Sosial)

contacts          (id, org\_id, contact\_type ENUM\['customer','vendor','donor','partner'\], name, email, phone, npwp, is\_muzakki, donor\_tier)

donations         (id, org\_id, donor\_id, donation\_date, amount, fund\_type, campaign\_id, channel, receipt\_sent\_at, register\_id)

distributions     (id, org\_id, program\_id, recipient\_id, dist\_date, amount, type ENUM\['cash','transfer','natura'\], register\_id)

\-- Cash Advance

cash\_advances     (id, org\_id, requested\_by, amount, purpose, budget\_id, status, ljp\_submitted\_at, settled\_at)

ca\_items          (id, ca\_id, coa\_id, amount, attachment\_url, ocr\_result\_json)

\-- Budgeting

budgets           (id, org\_id, period\_year, period\_month, coa\_id, cost\_center\_id, fund\_id, program\_id, amount, version)

budget\_actuals    (id, budget\_id, actual\_amount, as\_of\_date)  \-- materialized/cached

\-- Assets

assets            (id, org\_id, asset\_name, category, purchase\_date, purchase\_value, useful\_life\_months, method ENUM\['SL','DDB'\], accumulated\_depreciation, book\_value, qr\_code\_url, status)

\-- Bank & Reconciliation

bank\_accounts     (id, org\_id, bank\_name, account\_no, account\_name, coa\_id, current\_balance)

bank\_statements   (id, bank\_account\_id, txn\_date, amount, description, source\_ref, matched\_journal\_item\_id, status ENUM\['unmatched','matched','excluded'\])

\-- Tax (Bisnis)

tax\_records       (id, org\_id, type ENUM\['PPN\_IN','PPN\_OUT','PPH23','PPH21'\], register\_id, tax\_period, base\_amount, tax\_rate, tax\_amount, npwp, status)

\-- Audit

audit\_logs        (id, org\_id, user\_id, action, entity\_type, entity\_id, before\_json, after\_json, ip\_address, created\_at)

---

## 16\. Role & Permission Matrix (RBAC)

| Feature | Super Admin | Admin Org | Finance / Accounting | Manager | Amil / Tax Officer | Viewer / Auditor |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| Setup Organisasi | ✅ | ✅ | ❌ | ❌ | ❌ | 👁️ |
| Master Data | ✅ | ✅ | ❌ | ❌ | ❌ | 👁️ |
| Input Transaksi | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Posting Jurnal | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approve Transaksi | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Kelola Budget/RAPB | ✅ | ✅ | ✅ | 👁️ | ❌ | 👁️ |
| Tutup Buku/Posting | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manajemen Pajak | ✅ | ✅ | ✅ | ❌ | ✅ | 👁️ |
| Donatur & Dana | ✅ | ✅ | ✅ | ❌ | ✅ | 👁️ |
| View Laporan | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Export Laporan | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Setting COA/Rule | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Kelola User/Role | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Audit Trail | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| System Config | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

> **Catatan:** Role dapat dikustomisasi per organisasi. Kolom di atas adalah default template.
> **Catatan Hierarki:** Setiap role di atas juga memiliki dimensi **scope** (`own` / `region` / `all`) yang menentukan node mana yang dapat diakses dalam struktur multi-level. Lihat FR-RBAC-H di Section 10A.5 untuk detail.

---

## 17\. Dashboard Specifications

Dashboard bersifat modular; widget yang ditampilkan disesuaikan dengan **Role** dan **Tipe Entitas**.

### Dashboard Bisnis

- **Top Cards:** Saldo Kas Total, Saldo Bank Agregat, MTD Revenue, MTD Expenses, Net Profit MTD.  
- **Charts:** Cash Flow Trend (Line Chart 30 hari), Budget vs Actual per Cost Center (Bar Chart), AR Aging (Donut Chart).  
- **Data Grids:** Approval Pending (actionable), AP Jatuh Tempo Minggu Ini, Top Outstanding CA.  
- **AI Insight Panel:** Narasi AI ("Arus kas positif Rp X bulan ini; waspadai jatuh tempo vendor Y senilai Rp Z minggu depan").  
- **Tax Reminder Widget:** PPN masa pajak berjalan, jadwal SPT terdekat.

### Dashboard Sosial

- **Top Cards:** Total Penerimaan Donasi MTD, Total Distribusi MTD, Saldo Dana Terikat, Saldo Dana Tidak Terikat, Pencapaian Campaign Aktif (%).  
- **Charts:** Penerimaan per Jenis Dana (Bar/Pie), Donasi Harian (Sparkline), Distribusi per Program (Treemap).  
- **Data Grids:** Donasi Menunggu Konfirmasi, CA Belum LPJ, Program Over-Budget.  
- **AI Insight Panel:** Narasi AI ("Donasi Zakat Maal naik 20% dibanding bulan lalu; saldo Dana Kesehatan mencapai target pada estimasi 12 hari lagi").

---

## 18\. Report Specifications

### 18.1 Laporan Standar — Entitas Bisnis

| Kode | Nama Laporan | Standar | Frekuensi Umum |
| :---- | :---- | :---- | :---- |
| RPT-B-01 | Neraca (Balance Sheet) | PSAK Bisnis | Bulanan, Tahunan |
| RPT-B-02 | Laporan Laba Rugi (P\&L) | PSAK Bisnis | Bulanan, Tahunan |
| RPT-B-03 | Laporan Arus Kas | PSAK Bisnis | Bulanan, Tahunan |
| RPT-B-04 | Laporan Perubahan Ekuitas | PSAK Bisnis | Tahunan |
| RPT-B-05 | Trial Balance (Neraca Saldo) | Universal | Bulanan — lihat spesifikasi detail Section 18.3 |
| RPT-B-06 | Buku Besar (General Ledger) | Universal | Sesuai Kebutuhan |
| RPT-B-07 | Aging AR / AP | Universal | Mingguan |
| RPT-B-08 | Budget vs Actual | Universal | Bulanan |
| RPT-B-09 | Rekap PPN Masa | DJP | Bulanan |
| RPT-B-10 | Daftar Bukti Potong PPh 23 | DJP | Bulanan |
| RPT-B-11 | Daftar Aset Tetap & Penyusutan | Universal | Bulanan |
| RPT-B-12 | Cash Advance Aging | Universal | Mingguan |

### 18.2 Laporan Standar — Entitas Sosial

| Kode | Nama Laporan | Standar | Frekuensi Umum |
| :---- | :---- | :---- | :---- |
| RPT-S-01 | Laporan Posisi Keuangan | ISAK 35 / PSAK 109 | Bulanan, Tahunan |
| RPT-S-02 | Laporan Aktivitas (Pendapatan & Beban) | ISAK 35 | Bulanan, Tahunan |
| RPT-S-03 | Laporan Perubahan Aset Neto | ISAK 35 | Tahunan |
| RPT-S-04 | Laporan Arus Kas | ISAK 35 | Bulanan, Tahunan |
| RPT-S-05 | Laporan Penerimaan & Penggunaan Dana | PSAK 109 | Bulanan, Tahunan |
| RPT-S-06 | Laporan Dana Terikat & Tidak Terikat | PSAK 109 | Bulanan |
| RPT-S-07 | Laporan Distribusi per Program / Asnaf | BAZNAS Format | Bulanan |
| RPT-S-08 | Laporan Donatur (Top, Aktif, Lapsed) | Internal | Bulanan |
| RPT-S-09 | Buku Besar per Fund/Dana | Universal | Sesuai Kebutuhan |
| RPT-S-10 | Budget Program vs Realisasi | Universal | Bulanan |
| RPT-S-11 | Rekap Campaign Fundraising | Internal | Per Campaign |
| RPT-S-12 | Cash Advance Aging | Universal | Mingguan |
| RPT-S-13 | Trial Balance (Neraca Saldo) | Universal | Bulanan — lihat spesifikasi detail Section 18.3 |

### 18.3 Spesifikasi Detail — Trial Balance (Neraca Saldo)

Trial Balance adalah fitur **controlling utama** untuk memastikan tidak ada selisih (imbalance) dalam pembukuan. Berbeda dari laporan lain, Trial Balance bersifat interaktif — setiap baris akun dapat di-drill-down untuk melihat detail transaksi sumbernya secara langsung di halaman yang sama.

#### 18.3.1 Struktur Kolom Trial Balance

| Kolom | Keterangan |
| :---- | :---- |
| **#** | Nomor urut baris; ikon folder untuk akun grup, ikon dokumen untuk akun leaf |
| **Kode Akun** | Kode COA (format `X.XX.XXX.XXX`); akun yang belum ditutup ditampilkan warna merah/strikethrough |
| **Nama Akun** | Nama akun sesuai COA |
| **Saldo Awal** | Saldo penutupan periode sebelumnya (diambil dari proses *Closing* periode lalu) |
| **Debet Mutasi** | Total mutasi debet dalam periode yang dipilih |
| **Kredit Mutasi** | Total mutasi kredit dalam periode yang dipilih |
| **Neraca Saldo** | Saldo akhir = Saldo Awal + Debet Mutasi − Kredit Mutasi (atau sebaliknya sesuai normal balance). Warna **hijau** = sudah ditutup; warna **pink/merah muda** = belum ditutup |
| **Debet Disesuaikan** | Saldo debet setelah jurnal penyesuaian (*adjusting entry*) |
| **Kredit Disesuaikan** | Saldo kredit setelah jurnal penyesuaian |

#### 18.3.2 Baris Summary / Validasi Balance

Di bawah tabel akun, sistem menampilkan baris-baris validasi otomatis:

| Label | Isi | Status |
| :---- | :---- | :---- |
| **Saldo Awal [Asset Vs (Kewajiban+SD)]** | Total Saldo Awal Aset vs Total (Kewajiban + Saldo Dana) | `BALANCE` / `SELISIH Rp X` |
| **Mutasi [Debet Vs Kredit]** | Total Debet Mutasi vs Total Kredit Mutasi | `BALANCE` / `SELISIH Rp X` |
| **Penyesuaian [Debet Vs Kredit]** | Total Debet Disesuaikan vs Total Kredit Disesuaikan | `BALANCE` / `SELISIH Rp X` |
| **Saldo Akhir [Asset Vs (Kewajiban+SD)]** | Total Neraca Saldo Aset vs Total (Kewajiban + Saldo Dana) | `BALANCE` / `SELISIH Rp X` |

- Jika **BALANCE**: label ditampilkan hijau tebal.
- Jika **SELISIH**: label ditampilkan merah tebal + banner alert di atas tabel ("⚠️ Trial Balance tidak seimbang — selisih Rp X. Periksa jurnal pada periode ini.").

#### 18.3.3 Functional Requirements — Trial Balance

**FR-TB-01 (Filter & Scope):**
- Filter **Tahun** dan **Bulan** (atau rentang bulan) di toolbar atas.
- Filter **Kantor/Node** (dropdown Pusat / Wilayah / Daerah — hanya tampil jika fitur multi-level aktif).
- Filter **All COA** untuk memilih kelompok akun tertentu (Aset, Kewajiban, Saldo Dana, Penerimaan, Penyaluran, atau All).
- Filter **All Level** untuk mengontrol kedalaman tampilan COA (Level 1, Level 2, Level 3, atau All Level).
- Filter **Group** untuk mengelompokkan tampilan berdasarkan dimensi tertentu (misal: per Program, per Cost Center).

**FR-TB-02 (Hierarki COA & Expand/Collapse):**
- Akun COA ditampilkan secara hierarkis (tree view) menggunakan struktur induk–anak sesuai level COA.
- Toolbar menyediakan tombol **CollapseAll** (lipat semua ke level 1) dan **ExpandAll** (buka semua level).
- Tombol **ExpandTo** dengan selector level (Level 1–6) untuk membuka hierarki sampai kedalaman tertentu.
- Klik ikon panah (▶/▼) pada baris akun grup untuk expand/collapse subtree akun tersebut.
- Saldo akun grup adalah **agregasi otomatis** dari seluruh akun anak di bawahnya secara rekursif.

**FR-TB-03 (Drill-Down Transaksi — Fitur Utama):**
- Setiap baris akun **leaf** (akun akhir, bukan akun grup) dapat di-klik untuk membuka panel/modal detail transaksi.
- Panel detail menampilkan seluruh jurnal yang membentuk mutasi akun tersebut dalam periode yang dipilih.
- Kolom detail transaksi: **Tanggal**, **COA** (akun lawan), **Keterangan/Narasi**, **Nominal**, **COA Buku** (akun buku besar).
- Header panel mencantumkan nama akun + nomor rekening (jika akun bank) + periode, contoh: *"Jurnal Akun BCA Syariah SMB 0354333999, Tahun 2026"*.
- Panel detail dapat **ditutup** dengan tombol ✕ di pojok kanan atas atau klik di luar panel.

**FR-TB-04 (Paginasi Detail Transaksi):**
- Detail transaksi per akun ditampilkan dengan **paginasi 100 baris per halaman**.
- Navigasi halaman: tombol Prev / Next + indikator halaman (misal: "Halaman 1 dari 5 — 487 transaksi").
- Paginasi diterapkan di sisi **server** (*server-side pagination*) agar performa tetap optimal meski volume transaksi besar (jutaan baris).
- User dapat mengubah jumlah baris per halaman: pilihan 50 / 100 / 250 baris (default 100).

**FR-TB-05 (Status Penutupan — Warna Indikator):**
- Kolom **Neraca Saldo** menampilkan warna berbeda:
  - **Hijau** → Akun/periode sudah melalui proses *Closing* (tutup buku) — data final dan terkunci.
  - **Pink/Merah Muda** → Akun/periode belum ditutup — data masih dapat berubah.
- Note/keterangan warna ditampilkan di bawah tabel sebagai legenda.

**FR-TB-06 (Tombol Closing):**
- Tombol **Closing** di toolbar digunakan untuk menutup "Neraca Disesuaikan" menjadi saldo akhir per bulan/tahun/kantor.
- Closing hanya dapat dilakukan oleh user dengan role Admin atau Finance dengan permission `Tutup Buku`.
- Sebelum Closing, sistem menjalankan dua validasi secara berurutan:
  1. **Validasi Balance** — jika ada baris `SELISIH`, proses Closing **diblokir** dan menampilkan pesan error dengan daftar akun yang tidak balance.
  2. **Validasi Cutoff** — sistem mengecek apakah tanggal hari ini masih dalam batas cutoff yang dikonfigurasi di Setting. Jika melewati batas cutoff, berlaku aturan Mode Strict atau Mode Approval sesuai konfigurasi (lihat detail FR-CUTOFF-05 s/d FR-CUTOFF-08 di Section 11.P).
- Informasi batas cutoff aktif ditampilkan di bawah toolbar secara kontekstual.
- Setelah Closing berhasil, seluruh jurnal periode tersebut ter-lock sesuai Business Rule #2 — perubahan hanya melalui Jurnal Pembalik.

**FR-TB-07 (Export):**
- Tombol **Export** di toolbar dengan pilihan format: PDF (layout landscape A3/A4) dan Excel (raw data + kolom lengkap).
- Export mencakup seluruh data sesuai filter aktif, bukan hanya halaman yang sedang ditampilkan.
- Nama file export otomatis menyertakan nama organisasi, periode, dan timestamp, contoh: `TrialBalance_LAZ-Percikan-Iman_2026-01_20260808.xlsx`.

**FR-TB-08 (Search):**
- Fitur **Search** di toolbar untuk mencari akun berdasarkan Kode Akun atau Nama Akun.
- Hasil pencarian meng-highlight baris yang cocok dan otomatis mengexpand hierarki induknya.

**FR-TB-09 (Alert Imbalance Real-time):**
- Setiap kali filter periode/scope diubah, sistem me-refresh validasi balance secara otomatis.
- Jika terdeteksi selisih, sistem menampilkan **banner alert merah** di atas tabel (tidak perlu reload halaman — reaktif via WebSocket / React Query).
- Alert menampilkan: nilai selisih, kolom mana yang tidak balance (Saldo Awal / Mutasi / Penyesuaian / Saldo Akhir), dan tombol shortcut "Lihat Jurnal Bermasalah" yang langsung memfilter Jurnal dengan flag anomali.

**FR-TB-10 (Konteks Multi-Node — jika fitur hierarki aktif):**
- Dropdown **Kantor** di pojok kanan atas memungkinkan user level Wilayah/Pusat untuk melihat Trial Balance per node individual atau konsolidasi.
- Pada mode konsolidasi, baris summary validasi mencerminkan total gabungan seluruh node dalam scope.
- Detail drill-down pada mode konsolidasi menampilkan kolom tambahan **Node/Kantor** untuk membedakan asal transaksi.

#### 18.3.4 Acceptance Criteria — Trial Balance

**Story: Drill-Down Transaksi**
- *Given* User membuka Trial Balance periode Januari 2026, akun "BCA Syariah SMB 0354333999" memiliki 487 transaksi
- *When* User mengklik baris akun tersebut
- *Then* Panel detail terbuka menampilkan 100 transaksi pertama (halaman 1 dari 5), dengan kolom Tanggal, COA, Keterangan, Nominal, COA Buku — diurutkan dari transaksi terbaru. Indikator "487 transaksi — Halaman 1 dari 5" tampil di bawah tabel.

**Story: Validasi Imbalance**
- *Given* Terdapat jurnal yang tidak seimbang akibat import data eksternal di periode Maret 2026
- *When* User membuka Trial Balance bulan Maret 2026
- *Then* Baris "Mutasi [Debet Vs Kredit]" menampilkan label merah "SELISIH Rp 500.000", banner alert merah muncul di atas tabel, dan tombol Closing untuk periode tersebut dinonaktifkan (disabled) dengan tooltip "Selesaikan selisih sebelum melakukan Closing".

**Story: Closing Periode**
- *Given* Trial Balance bulan Februari 2026 menunjukkan BALANCE di semua baris validasi
- *When* Admin mengklik tombol "Closing" dan mengkonfirmasi
- *Then* Neraca Saldo bulan Februari berubah warna menjadi hijau, saldo akhir menjadi saldo awal bulan Maret, dan seluruh jurnal Februari ter-lock. Proses Closing tercatat di Audit Trail dengan timestamp dan nama user.

**Story: Export Trial Balance**
- *Given* User memfilter Trial Balance Tahun 2026 semua bulan, scope Konsolidasi Semua
- *When* User mengklik Export → Excel
- *Then* File Excel ter-download dalam \< 10 detik dengan nama `TrialBalance_LAZ-Percikan-Iman_2026-All_[timestamp].xlsx`, memuat seluruh akun semua level dengan kolom lengkap dan baris summary validasi di bagian bawah.

---

## 19\. Notification Specifications

| Channel | Trigger Event | Entitas |
| :---- | :---- | :---- |
| **In-App (Bell)** | Semua aktivitas real-time | Bisnis & Sosial |
| **WhatsApp** | Approval request, LPJ reminder, saldo rendah, kwitansi donasi, laporan terjadwal, **cutoff closing reminder (H-3 & H-1)** | Bisnis & Sosial |
| **Email** | Invoice AR terkirim, Daily Digest, Laporan terjadwal, Registrasi akun | Bisnis & Sosial |
| **Push Notification (PWA)** | Approval menunggu, budget alert 80%, jatuh tempo AR/AP | Bisnis & Sosial |

**Konfigurasi Notifikasi:** Setiap user dapat mengatur channel mana yang diaktifkan per jenis event melalui menu Profil → Notifikasi.

---

## 20\. AI Feature Specifications

- **AI OCR Invoice/Struk (Vision):** Upload foto/PDF → AI ekstrak: Total, Tanggal, Nama Vendor/Donatur, Nomor Invoice, PPN (jika ada). Confidence score ditampilkan. User selalu bisa edit sebelum disimpan.  
- **AI Auto-Categorization (NLP):** Deskripsi transaksi → AI rekomendasikan COA. Sistem belajar dari koreksi user (feedback loop). Contoh: "Beli Token Listrik PLN" → "Biaya Utilitas \- Listrik".  
- **AI Cashflow Predictor:** Linear Regression / Prophet (Time Series) untuk prediksi saldo 30-90 hari ke depan berdasarkan histori penerimaan dan pengeluaran. Divisualisasikan sebagai confidence interval chart.  
- **AI Anomaly Detection:** Menandai transaksi yang tidak biasa (jumlah outlier, vendor baru, jam input tidak wajar) dengan flag kuning di Register.  
- **FinBot (AI Chat Assistant):** Widget chat pojok kanan bawah. Contoh pertanyaan yang dapat dijawab: "Berapa sisa budget marketing bulan ini?", "Siapa donatur terbesar tahun ini?", "Kapan jatuh tempo invoice vendor BCD?". AI men-query database dan membalas dengan angka akurat \+ link ke halaman terkait.  
- **AI Donor Churn Predictor (Sosial):** Mengidentifikasi donatur rutin yang berpotensi berhenti berdonasi (tidak ada donasi \>60 hari dari jadwal biasanya), sehingga tim dapat melakukan outreach proaktif.

---

## 21\. Security Requirements

- **Authentication:** JWT (JSON Web Tokens) dengan refresh token rotation. Mendukung OAuth2/SSO (Google Workspace, Microsoft 365). 2FA wajib untuk role Admin ke atas (TOTP via Google Authenticator/Authy).  
- **Data Protection:** Enkripsi AES-256 untuk file lampiran (KTP, Kontrak, Faktur). Database terisolasi per *tenant* via PostgreSQL Row Level Security. Koneksi database via TLS.  
- **Vulnerability Protection:** Rate limiting (100 req/min per user), perlindungan XSS (React auto-escape \+ DOMPurify), CSRF tokens, SQL injection prevention (ORM parameterized query), Helmet.js HTTP headers.  
- **Data Residency:** Data disimpan di data center Indonesia (AWS ap-southeast-3 Jakarta atau GCP asia-southeast2).  
- **Backup & Recovery:** Automated backup harian ke S3 dengan retensi 30 hari. Point-in-time recovery (PITR) untuk PostgreSQL. RTO \< 4 jam, RPO \< 1 jam.  
- **Penetration Testing:** Wajib dilakukan sebelum go-live dan setiap 6 bulan sekali oleh vendor keamanan independen.

---

## 22\. Non-Functional Requirements (NFR)

| Kategori | Parameter | Spesifikasi |
| :---- | :---- | :---- |
| **Performance** | Load Time | \< 1.5 detik (LCP) untuk render dashboard. |
|  | API Response | \< 200ms (P95) untuk operasi CRUD standar. |
|  | Report Generation | \< 5 detik untuk laporan periode 1 tahun. |
| **Availability** | Uptime | 99.9% SLA dengan arsitektur Cloud Kubernetes (Auto-scaling). Maintenance window: Minggu dini hari 01.00-03.00 WIB. |
| **Usability** | Offline Mode | PWA ready. Transaksi dapat di-save sebagai *Offline Draft* di IndexedDB dan sync saat online. |
|  | Onboarding | Setup mandiri selesai \< 15 menit untuk konfigurasi dasar. |
| **Accessibility** | Standard | WCAG 2.1 AA Compliant (Screen reader support, Dark Mode, Contrast ratio minimum 4.5:1). |
| **Scalability** | Tenant | Mendukung hingga 10.000 tenant aktif dengan horizontal scaling. |
|  | Transaksi | Mendukung hingga 1 juta baris journal\_items per tenant per tahun tanpa degradasi performa. |
|  | Hierarki Org | Konsolidasi real-time mendukung hingga 500 node aktif dalam satu hierarki. Untuk hierarki \>100 node, konsolidasi menggunakan *snapshot cache* yang diperbarui setiap 15 menit. |
| **Data Retention** | Audit Log | Disimpan minimum 7 tahun sesuai ketentuan pajak Indonesia. |

---

## 23\. Testing Requirements

### 23.1 Unit & Integration Testing

- Minimum coverage: 80% untuk business logic layer (service & domain).  
- Setiap Functional Requirement memiliki minimal 1 automated test case.  
- Framework: Jest (unit), Supertest (API integration).

### 23.2 End-to-End Testing

- Skenario wajib (E2E): Onboarding, Input Transaksi → Approval → Posting, Rekonsiliasi Bank, Generate Laporan PSAK.  
- Framework: Playwright.

### 23.3 Performance Testing

- Load test sebelum go-live: simulasi 500 concurrent users selama 30 menit tanpa error rate \>1%.  
- Tool: k6 / Artillery.

### 23.4 User Acceptance Testing (UAT)

- UAT dilakukan bersama minimal 3 organisasi pilot: 1 bisnis (PT/CV), 1 LAZ/Yayasan, 1 entitas hybrid.  
- Kriteria kelulusan UAT: semua scenario *must-have* di section 26 lulus tanpa blocker.

---

## 24\. Acceptance Criteria (Given-When-Then)

**Story: AI OCR Struk**

- *Given* Finance staff berada di menu "Pengeluaran → Buat Pengeluaran"  
- *When* Staff mengunggah foto struk bensin Shell  
- *Then* Sistem mengisi otomatis field: Nominal, Tanggal, dan merekomendasikan COA "Biaya Transportasi" dalam waktu maksimal 3 detik, dengan semua field dapat diedit sebelum disimpan.

**Story: Soft Lock Budget**

- *Given* Sisa budget "Event A" adalah Rp 1.000.000  
- *When* Staff membuat Cash Advance senilai Rp 1.500.000 untuk "Event A"  
- *Then* Sistem memunculkan alert kuning "Budget Overrun Rp 500.000", tidak menolak form, tetapi menambahkan "Direktur" sebagai approver wajib tambahan.

**Story: Fund Accounting Cross-Fund Alert (Sosial)**

- *Given* Organisasi entitas sosial dengan Dana Zakat (terikat) dan Dana Operasional (tidak terikat)  
- *When* Finance mencoba membuat pengeluaran "Gaji Karyawan" dan men-tag ke COA Dana Zakat  
- *Then* Sistem menampilkan warning merah "Dana Zakat tidak dapat digunakan untuk Beban Operasional" dan mencegah penyimpanan hingga user mengganti tag dana.

**Story: Auto-Matching Rekonsiliasi Bank**

- *Given* File mutasi bank BCA diimpor dengan 50 baris transaksi  
- *When* Sistem menjalankan proses auto-matching  
- *Then* Minimum 70% transaksi ter-match otomatis dalam waktu \< 10 detik, sisanya ditandai "Perlu Review Manual".

**Story: Kwitansi Donasi Otomatis (Sosial)**

- *Given* Donasi dari Ibu Siti sebesar Rp 500.000 via QRIS berhasil dikonfirmasi  
- *When* Sistem menerima webhook konfirmasi pembayaran  
- *Then* Dalam waktu \< 60 detik, kwitansi donasi berformat PDF dikirim ke nomor WhatsApp Ibu Siti yang terdaftar, dengan nomor kwitansi unik dan data donasi yang benar.

**Story: Invoice AR dengan PPN (Bisnis)**

- *Given* Organisasi berstatus PKP membuat invoice ke customer  
- *When* Finance menambahkan item jasa dengan harga Rp 10.000.000  
- *Then* Sistem otomatis menghitung PPN 12% \= Rp 1.200.000, menampilkan total Rp 11.200.000, dan membuat dua baris jurnal otomatis: Debit Piutang Usaha Rp 11.200.000 / Kredit Pendapatan Jasa Rp 10.000.000 / Kredit Utang PPN Keluaran Rp 1.200.000.

**Story: Laporan PSAK 109 (Sosial)**

- *Given* LAZ telah mencatat transaksi penerimaan zakat dan distribusi selama 1 bulan  
- *When* Bendahara membuka menu Laporan → Laporan Penerimaan & Penggunaan Dana (PSAK 109\)  
- *Then* Laporan menampilkan pemisahan yang benar antara: Zakat, Infaq/Sedekah, Dana Amil, dan Dana Sosial Keagamaan, sesuai format PSAK 109 paragraf 37\.

---

## 25\. Risks & Assumptions

| Tipe | Deskripsi | Mitigasi |
| :---- | :---- | :---- |
| **Risk** | Akurasi AI OCR rendah pada struk kusam/tulisan tangan | Selalu sediakan UI manual override. Tampilkan confidence score per field. |
| **Risk** | Kompleksitas konfigurasi entitas hybrid membingungkan pengguna | Wizard onboarding dengan penjelasan sederhana; default konfigurasi yang aman. |
| **Risk** | Perubahan regulasi pajak (tarif PPN, format e-Faktur) membutuhkan update cepat | Arsitektur tarif pajak sebagai konfigurasi (bukan hardcode). Tim siap patch \< 7 hari kerja. |
| **Risk** | Integrasi webhook payment gateway gagal menyebabkan donasi tidak tercatat | Queue-based webhook processing (BullMQ) dengan retry 3x \+ alert ke admin jika gagal. |
| **Risk** | Pengguna UKM memiliki koneksi internet fluktuatif | React Query optimistic updates \+ IndexedDB offline draft. |
| **Assumption** | Pengguna entitas bisnis sudah familiar dengan konsep dasar akuntansi | Sediakan tooltip kontekstual dan panduan singkat per halaman; bukan kursus akuntansi lengkap. |
| **Assumption** | Pengguna entitas sosial mengutamakan kemudahan input donasi dan kejelasan laporan dana | Prioritaskan UX alur donasi dan laporan per fund di atas kompleksitas akuntansi. |

---

## 26\. MVP Scope & Future Roadmap

### Phase 1 — MVP (Bulan 1–4): Pondasi Core

- Onboarding Wizard \+ Entity Configuration Toggle.  
- Master Data: COA (template bisnis & sosial), Cost Center, Kontak.  
- Register Transaksi: Penerimaan & Pengeluaran (jurnal otomatis).  
- Jurnal Umum manual \+ Posting/Tutup Buku.  
- RBAC (Role & Permission).  
- Laporan PSAK dasar: Neraca & L/R (bisnis) \+ Lap. Posisi Keuangan (sosial).  
- Dashboard minimal (saldo, recent transactions).  
- Export PDF & Excel.

### Phase 2 — Growth (Bulan 5–8): Operasional Lengkap

- RAPB (Budgeting \+ Budget vs Actual).  
- Cash Advance \+ LPJ Workflow.  
- Approval Engine (multi-level \+ WA Quick Reply).  
- Kas & Bank Management \+ Transfer antar rekening.  
- Rekonsiliasi Bank (import CSV \+ auto-matching).  
- Asset Management \+ Auto-Depreciation.  
- AR Invoice (Bisnis) \+ Donasi Management (Sosial).  
- AP Bill (Bisnis) \+ Distribusi Dana (Sosial).  
- Notifikasi WhatsApp & Email.  
- **Multi-Level Organization:** Setup hierarki Pusat → Wilayah → Daerah, RBAC scope, Dashboard Konsolidasi, dan Laporan Konsolidasi dasar (RPT-K-01 s/d RPT-K-07).

### Phase 3 — Enterprise & AI (Bulan 9–12): Intelligence

- **Konsolidasi Lanjutan:** COA Mapping lintas node, Laporan Perbandingan Kinerja Antar Node (RPT-K-08), Laporan Dana Terikat Konsolidasi (RPT-K-09 & RPT-K-10), Intercompany Elimination Engine, Jadwal laporan konsolidasi otomatis.
- AI OCR Invoice/Struk.  
- AI Auto-Categorization COA.  
- AI Cashflow Predictor.  
- AI Anomaly Detection.  
- FinBot Chat Assistant.  
- Report Builder (Drag & Drop custom report).  
- Laporan Terjadwal (email otomatis).  
- Tax Module: PPN & PPh 23 (Bisnis).  
- Donor CRM & Campaign Fundraising (Sosial).  
- Payment Gateway Integration untuk donasi online.  
- Public API (untuk integrasi pihak ketiga).

### Phase 4 — Expansion (Bulan 13+): Ekosistem

- Multi-currency support.  
- Koneksi langsung API Bank (Open Banking).  
- Modul HR/Payroll terintegrasi.  
- Marketplace integrasi (Tokopedia, Shopee untuk rekap penjualan).  
- White-label untuk mitra distribusi.

---

## 27\. Product Backlog (MoSCoW Prioritization — Sprint 1–2 Focus)

- **Must Have:** Authentication (JWT \+ 2FA), Setup COA Wizard, Entity Type Selection, Input Jurnal Umum, View Neraca & L/R (bisnis) / Lap. Posisi Keuangan (sosial), RBAC dasar.  
- **Should Have:** Dashboard Saldo, Ekspor Laporan PDF/Excel, Input Penerimaan & Pengeluaran sederhana.  
- **Could Have:** Dark mode, Command Palette (Cmd+K), Avatar user, Notifikasi in-app.  
- **Won't Have (Sprint 1-2):** AI features, Integrasi bank langsung, WhatsApp API, Tax module, Payment gateway.

---

## 28\. Deployment Architecture

Internet → Cloudflare (CDN \+ WAF \+ DDoS)

  → Load Balancer (Nginx / GCP Load Balancer)

    → Kubernetes Cluster (GKE / EKS)

      → \[Frontend Pods\] React SPA (served via Nginx)

      → \[API Pods\] NestJS API (auto-scale berdasarkan CPU/RPS)

      → \[Worker Pods\] BullMQ Job Workers (penyusutan, notifikasi, laporan)

      → \[AI Service\] Python FastAPI (OCR, Forecast, NLP)

    → PostgreSQL (Cloud SQL / RDS) — Multi-AZ, RLS per tenant

    → Redis (Elasticache / Memorystore) — Session, Cache, Job Queue

    → MinIO / AWS S3 — File Storage (attachment, generated PDF)

    → SendGrid — Email Transactional

    → WhatsApp Meta Cloud API — Notifikasi WA

**Environment:** Development → Staging → Production (terpisah, migrasi via GitHub Actions CI/CD).

---

## 29\. Glosarium

| Istilah | Definisi |
| :---- | :---- |
| **COA** | Chart of Accounts — Daftar struktur akun buku besar (Aktiva, Kewajiban, Ekuitas, Pendapatan, Beban). |
| **RAPB** | Rencana Anggaran Pendapatan dan Belanja — dokumen perencanaan keuangan tahunan. |
| **Cash Advance (CA)** | Uang muka kerja yang diberikan kepada staf dan harus dipertanggungjawabkan via LPJ. |
| **LPJ** | Laporan Pertanggungjawaban — bukti penggunaan Dana Cash Advance. |
| **Trial Balance** | Neraca Saldo — daftar semua saldo akun buku besar untuk memastikan Debit \= Kredit. |
| **PSAK** | Pernyataan Standar Akuntansi Keuangan — standar akuntansi resmi Indonesia. |
| **ISAK 35** | Interpretasi Standar Akuntansi Keuangan 35 — tentang penyajian laporan keuangan entitas berorientasi nonlaba. |
| **PSAK 109** | Standar akuntansi untuk Zakat, Infaq, dan Sedekah — berlaku untuk LAZ dan OPZ. |
| **LAZ** | Lembaga Amil Zakat — lembaga resmi pengelola zakat di Indonesia. |
| **Fund Accounting** | Metode akuntansi yang memisahkan dan melacak dana berdasarkan tujuan/sumber (terikat vs tidak terikat). |
| **Dana Terikat** | Restricted Fund — dana yang penggunaannya dibatasi oleh pemberi (untuk program/tujuan tertentu). |
| **Dana Tidak Terikat** | Unrestricted Fund — dana yang dapat digunakan untuk kebutuhan operasional umum. |
| **Asnaf** | 8 golongan penerima zakat sesuai Al-Quran Surah At-Taubah: 60\. |
| **Muzakki** | Individu yang wajib dan telah membayar zakat. |
| **PKP** | Pengusaha Kena Pajak — status wajib pajak yang diwajibkan memungut dan menyetor PPN. |
| **PPN** | Pajak Pertambahan Nilai — pajak atas konsumsi barang/jasa (tarif 12% per 2025). |
| **PPh 23** | Pajak Penghasilan Pasal 23 — pajak yang dipotong atas penghasilan berupa jasa dari wajib pajak badan. |
| **e-Faktur** | Faktur Pajak elektronik yang diterbitkan melalui sistem DJP Online. |
| **QRIS** | Quick Response Code Indonesian Standard — standar QR Code untuk pembayaran digital di Indonesia. |
| **RTO** | Recovery Time Objective — waktu maksimum yang dibutuhkan untuk memulihkan sistem setelah gangguan. |
| **RPO** | Recovery Point Objective — titik waktu data terakhir yang dapat dipulihkan setelah gangguan. |
| **RLS** | Row Level Security — fitur PostgreSQL untuk membatasi baris data yang dapat diakses per sesi/role. |
| **MAU** | Monthly Active Users — pengguna unik yang aktif dalam satu bulan. |
| **P95** | Persentil ke-95 dari distribusi waktu respons — metrik performa yang umum digunakan. |
| **WCAG 2.1** | Web Content Accessibility Guidelines — standar aksesibilitas konten web internasional. |
| **Node** | Satu entitas/unit dalam hierarki organisasi (Pusat, Wilayah, Daerah, atau Cabang). |
| **Konsolidasi** | Proses penggabungan laporan keuangan dari beberapa node menjadi satu laporan terpadu. |
| **Intercompany / Internode Elimination** | Proses menghilangkan transaksi antar-node (transfer dana, pinjaman internal) dari laporan konsolidasi agar tidak terjadi double-counting. |
| **Scope** | Jangkauan akses data seorang user: `own` (node sendiri), `region` (node sendiri + node bawahnya), atau `all` (seluruh hierarki). |
| **Materialized Path** | Teknik penyimpanan hierarki di database menggunakan string path (misal `/pusat_id/wilayah_id/daerah_id`) untuk mempercepat query relasi parent-child. |
| **COA Mapping** | Tabel pemetaan akun COA antara node anak dan node Pusat, digunakan saat node anak memiliki COA mandiri yang berbeda — wajib ada agar konsolidasi dapat dilakukan. |

---

*Document Owner: Chief Product Officer* *Review Cycle: Setiap Sprint (2 minggu) atau setelah perubahan requirement signifikan* *Next Review: 21 Agustus 2026*  
