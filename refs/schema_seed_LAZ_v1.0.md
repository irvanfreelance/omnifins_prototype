# Database Schema & Seed Data — OmniFin (Versi LAZ)

**Konfigurasi:**
- Single Tenant (LAZ Percikan Iman Sedekahku)
- PostgreSQL 15+
- Primary key: `BIGSERIAL` (bukan UUID)
- Tipe enum diganti `VARCHAR` + CHECK constraint
- Optimasi indexing untuk high-traffic queries
- Hierarki multi-level: Pusat → Wilayah → Daerah
- Seed data saling berkorelasi FK end-to-end

---

## URUTAN EKSEKUSI

```
1. DDL Schema (jalankan berurutan sesuai dependensi FK)
   A. org_nodes
   B. users, roles, user_roles
   C. coa, cost_centers, funds, programs
   D. bank_accounts
   E. contacts
   F. budgets
   G. registers, journals, journal_items
   H. donations, distributions
   I. cash_advances, ca_items
   J. assets, asset_depreciations
   K. bank_statements, recon_matches
   L. closing_periods, closing_cutoff_config, closing_override_log
   M. consolidation_snapshots, internode_transfers
   N. audit_logs, notifications

2. SEED Data (jalankan setelah semua DDL)
```

---

## DDL SCHEMA

### A. Hierarki Organisasi

```sql
-- ============================================================
-- A. ORG_NODES — hierarki Pusat / Wilayah / Daerah / Cabang
-- ============================================================
CREATE TABLE org_nodes (
    id              BIGSERIAL       PRIMARY KEY,
    name            VARCHAR(200)    NOT NULL,
    short_code      VARCHAR(20)     NOT NULL UNIQUE,          -- 'PUSAT','WIL-JBR','DAE-BDG'
    org_level       VARCHAR(20)     NOT NULL                  -- 'pusat','wilayah','area','daerah','cabang'
                        CHECK (org_level IN ('pusat','wilayah','area','daerah','cabang')),
    parent_id       BIGINT          REFERENCES org_nodes(id) ON DELETE RESTRICT,
    org_path        VARCHAR(500)    NOT NULL,                 -- '/1/3/7' materialized path
    entity_type     VARCHAR(20)     NOT NULL DEFAULT 'ngo'
                        CHECK (entity_type IN ('business','ngo','hybrid')),
    psak_standard   VARCHAR(30)     NOT NULL DEFAULT 'PSAK109'
                        CHECK (psak_standard IN ('PSAK_BISNIS','PSAK109','ISAK35','HYBRID')),
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    address         TEXT,
    phone           VARCHAR(30),
    email           VARCHAR(150),
    logo_url        VARCHAR(500),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_org_nodes_parent     ON org_nodes(parent_id);
CREATE INDEX idx_org_nodes_path       ON org_nodes USING GIST (org_path gist_trgm_ops);  -- trigram for LIKE '/1/%'
CREATE INDEX idx_org_nodes_level      ON org_nodes(org_level);

-- Aktifkan ekstensi untuk path search & trigram
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gist;
```

---

### B. Users, Roles & RBAC

```sql
-- ============================================================
-- B1. ROLES
-- ============================================================
CREATE TABLE roles (
    id              BIGSERIAL       PRIMARY KEY,
    role_name       VARCHAR(50)     NOT NULL UNIQUE,          -- 'super_admin','admin_org','finance','manager','amil','viewer'
    description     VARCHAR(300),
    is_system       BOOLEAN         NOT NULL DEFAULT FALSE,   -- TRUE = tidak bisa dihapus
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ============================================================
-- B2. PERMISSIONS
-- ============================================================
CREATE TABLE permissions (
    id              BIGSERIAL       PRIMARY KEY,
    perm_code       VARCHAR(80)     NOT NULL UNIQUE,          -- 'journal.post','closing.execute','report.export'
    module          VARCHAR(50)     NOT NULL,
    description     VARCHAR(300)
);

CREATE TABLE role_permissions (
    role_id         BIGINT          NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id   BIGINT          NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX idx_role_perms_role ON role_permissions(role_id);

-- ============================================================
-- B3. USERS
-- ============================================================
CREATE TABLE users (
    id              BIGSERIAL       PRIMARY KEY,
    org_node_id     BIGINT          NOT NULL REFERENCES org_nodes(id),
    full_name       VARCHAR(200)    NOT NULL,
    email           VARCHAR(150)    NOT NULL UNIQUE,
    phone_wa        VARCHAR(30),
    password_hash   VARCHAR(255)    NOT NULL,
    avatar_url      VARCHAR(500),
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    totp_secret     VARCHAR(100),                             -- 2FA
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_org       ON users(org_node_id);
CREATE INDEX idx_users_email     ON users(email);

-- ============================================================
-- B4. USER_ROLES — scope hierarki
-- ============================================================
CREATE TABLE user_roles (
    id              BIGSERIAL       PRIMARY KEY,
    user_id         BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id         BIGINT          NOT NULL REFERENCES roles(id),
    org_node_id     BIGINT          NOT NULL REFERENCES org_nodes(id),  -- node yg dikelola user ini
    scope_type      VARCHAR(10)     NOT NULL DEFAULT 'own'
                        CHECK (scope_type IN ('own','region','all')),
    scope_node_ids  BIGINT[],                                -- diisi otomatis dari hierarki
    valid_from      DATE            NOT NULL DEFAULT CURRENT_DATE,
    valid_until     DATE,                                    -- NULL = permanen
    delegated_from  BIGINT          REFERENCES user_roles(id),  -- untuk fitur delegasi cuti
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, role_id, org_node_id)
);

CREATE INDEX idx_user_roles_user  ON user_roles(user_id);
CREATE INDEX idx_user_roles_node  ON user_roles(org_node_id);
CREATE INDEX idx_user_roles_scope ON user_roles(scope_type);
```

---

### C. COA, Cost Center, Fund & Program

```sql
-- ============================================================
-- C1. COA — Chart of Accounts (hingga 6 level)
-- ============================================================
CREATE TABLE coa (
    id              BIGSERIAL       PRIMARY KEY,
    org_node_id     BIGINT          NOT NULL REFERENCES org_nodes(id),
    account_code    VARCHAR(30)     NOT NULL,
    account_name    VARCHAR(200)    NOT NULL,
    account_type    VARCHAR(20)     NOT NULL
                        CHECK (account_type IN ('asset','liability','equity','revenue','expense','fund_balance')),
    normal_balance  VARCHAR(6)      NOT NULL
                        CHECK (normal_balance IN ('debit','credit')),
    parent_id       BIGINT          REFERENCES coa(id) ON DELETE RESTRICT,
    coa_level       SMALLINT        NOT NULL DEFAULT 1 CHECK (coa_level BETWEEN 1 AND 6),
    coa_path        VARCHAR(300)    NOT NULL,                -- '/1/10/101' materialized path
    is_group        BOOLEAN         NOT NULL DEFAULT FALSE,  -- TRUE = folder, FALSE = leaf (bisa dijurnal)
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    is_locked       BOOLEAN         NOT NULL DEFAULT FALSE,  -- dikunci setelah ada transaksi
    description     TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (org_node_id, account_code)
);

CREATE INDEX idx_coa_node         ON coa(org_node_id);
CREATE INDEX idx_coa_parent       ON coa(parent_id);
CREATE INDEX idx_coa_type         ON coa(org_node_id, account_type);
CREATE INDEX idx_coa_path         ON coa(coa_path);
CREATE INDEX idx_coa_active       ON coa(org_node_id, is_active) WHERE is_active = TRUE;

-- ============================================================
-- C2. COST_CENTERS
-- ============================================================
CREATE TABLE cost_centers (
    id              BIGSERIAL       PRIMARY KEY,
    org_node_id     BIGINT          NOT NULL REFERENCES org_nodes(id),
    code            VARCHAR(30)     NOT NULL,
    name            VARCHAR(200)    NOT NULL,
    parent_id       BIGINT          REFERENCES cost_centers(id),
    cc_level        VARCHAR(20)     NOT NULL DEFAULT 'departemen'
                        CHECK (cc_level IN ('divisi','departemen','proyek','program')),
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    UNIQUE (org_node_id, code)
);

CREATE INDEX idx_cc_node   ON cost_centers(org_node_id);
CREATE INDEX idx_cc_parent ON cost_centers(parent_id);

-- ============================================================
-- C3. FUNDS — Dana Terikat / Tidak Terikat (LAZ: wajib)
-- ============================================================
CREATE TABLE funds (
    id              BIGSERIAL       PRIMARY KEY,
    org_node_id     BIGINT          NOT NULL REFERENCES org_nodes(id),
    fund_code       VARCHAR(30)     NOT NULL,
    fund_name       VARCHAR(200)    NOT NULL,
    fund_type       VARCHAR(20)     NOT NULL
                        CHECK (fund_type IN ('restricted','unrestricted','temporarily_restricted')),
    zakat_type      VARCHAR(30),                             -- 'zakat_maal','zakat_fitrah','infaq','sedekah','wakaf',NULL
    hard_lock       BOOLEAN         NOT NULL DEFAULT FALSE,  -- TRUE = blokir keras jika cross-fund
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    UNIQUE (org_node_id, fund_code)
);

CREATE INDEX idx_funds_node ON funds(org_node_id);
CREATE INDEX idx_funds_type ON funds(org_node_id, fund_type);

-- ============================================================
-- C4. PROGRAMS — Program sosial/penyaluran
-- ============================================================
CREATE TABLE programs (
    id              BIGSERIAL       PRIMARY KEY,
    org_node_id     BIGINT          NOT NULL REFERENCES org_nodes(id),
    fund_id         BIGINT          REFERENCES funds(id),
    cost_center_id  BIGINT          REFERENCES cost_centers(id),
    program_code    VARCHAR(30)     NOT NULL,
    program_name    VARCHAR(300)    NOT NULL,
    description     TEXT,
    pic_user_id     BIGINT          REFERENCES users(id),   -- penanggung jawab
    target_amount   NUMERIC(18,2)   NOT NULL DEFAULT 0,
    period_start    DATE,
    period_end      DATE,
    status          VARCHAR(20)     NOT NULL DEFAULT 'active'
                        CHECK (status IN ('draft','active','closed','cancelled')),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (org_node_id, program_code)
);

CREATE INDEX idx_programs_node   ON programs(org_node_id);
CREATE INDEX idx_programs_fund   ON programs(fund_id);
CREATE INDEX idx_programs_status ON programs(org_node_id, status);
```

---

### D. Bank Accounts

```sql
-- ============================================================
-- D. BANK_ACCOUNTS
-- ============================================================
CREATE TABLE bank_accounts (
    id              BIGSERIAL       PRIMARY KEY,
    org_node_id     BIGINT          NOT NULL REFERENCES org_nodes(id),
    coa_id          BIGINT          NOT NULL REFERENCES coa(id),
    bank_name       VARCHAR(100)    NOT NULL,
    account_no      VARCHAR(50)     NOT NULL,
    account_name    VARCHAR(200)    NOT NULL,
    account_type    VARCHAR(20)     NOT NULL DEFAULT 'tabungan'
                        CHECK (account_type IN ('tabungan','giro','deposito','kas')),
    currency        VARCHAR(5)      NOT NULL DEFAULT 'IDR',
    current_balance NUMERIC(18,2)   NOT NULL DEFAULT 0,
    min_balance     NUMERIC(18,2)   NOT NULL DEFAULT 0,     -- threshold alert saldo rendah
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    UNIQUE (org_node_id, account_no)
);

CREATE INDEX idx_bank_acc_node ON bank_accounts(org_node_id);
CREATE INDEX idx_bank_acc_coa  ON bank_accounts(coa_id);
```

---

### E. Contacts (Donatur, Vendor, Mitra, Mustahiq)

```sql
-- ============================================================
-- E. CONTACTS
-- ============================================================
CREATE TABLE contacts (
    id              BIGSERIAL       PRIMARY KEY,
    org_node_id     BIGINT          NOT NULL REFERENCES org_nodes(id),
    contact_type    VARCHAR(20)     NOT NULL
                        CHECK (contact_type IN ('donor','vendor','partner','mustahiq','employee')),
    name            VARCHAR(300)    NOT NULL,
    email           VARCHAR(150),
    phone           VARCHAR(30),
    phone_wa        VARCHAR(30),
    address         TEXT,
    npwp            VARCHAR(25),
    nik             VARCHAR(20),
    is_muzakki      BOOLEAN         NOT NULL DEFAULT FALSE,
    donor_tier      VARCHAR(20)     DEFAULT 'regular'
                        CHECK (donor_tier IN ('regular','silver','gold','platinum')),
    asnaf_category  VARCHAR(30),                            -- 'fakir','miskin','amil','muallaf','riqab','gharim','fisabilillah','ibnu_sabil'
    bank_name       VARCHAR(100),
    bank_account_no VARCHAR(50),
    bank_account_name VARCHAR(200),
    notes           TEXT,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contacts_node   ON contacts(org_node_id);
CREATE INDEX idx_contacts_type   ON contacts(org_node_id, contact_type);
CREATE INDEX idx_contacts_name   ON contacts USING GIN (to_tsvector('indonesian', name));  -- full-text search
CREATE INDEX idx_contacts_muzakki ON contacts(org_node_id, is_muzakki) WHERE is_muzakki = TRUE;
```

---

### F. Budgets / RAPB

```sql
-- ============================================================
-- F1. BUDGETS
-- ============================================================
CREATE TABLE budgets (
    id              BIGSERIAL       PRIMARY KEY,
    org_node_id     BIGINT          NOT NULL REFERENCES org_nodes(id),
    coa_id          BIGINT          NOT NULL REFERENCES coa(id),
    cost_center_id  BIGINT          REFERENCES cost_centers(id),
    fund_id         BIGINT          REFERENCES funds(id),
    program_id      BIGINT          REFERENCES programs(id),
    period_year     SMALLINT        NOT NULL,
    period_month    SMALLINT        NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    amount          NUMERIC(18,2)   NOT NULL DEFAULT 0,
    version         SMALLINT        NOT NULL DEFAULT 1,     -- budget amendment
    lock_mode       VARCHAR(10)     NOT NULL DEFAULT 'soft'
                        CHECK (lock_mode IN ('soft','hard','none')),
    notes           TEXT,
    created_by      BIGINT          NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (org_node_id, coa_id, fund_id, program_id, period_year, period_month, version)
);

CREATE INDEX idx_budgets_node    ON budgets(org_node_id);
CREATE INDEX idx_budgets_period  ON budgets(org_node_id, period_year, period_month);
CREATE INDEX idx_budgets_coa     ON budgets(coa_id);
CREATE INDEX idx_budgets_program ON budgets(program_id);

-- ============================================================
-- F2. BUDGET_ACTUALS — materialized cache realisasi vs budget
-- ============================================================
CREATE TABLE budget_actuals (
    id              BIGSERIAL       PRIMARY KEY,
    budget_id       BIGINT          NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    actual_amount   NUMERIC(18,2)   NOT NULL DEFAULT 0,
    as_of_date      DATE            NOT NULL,
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_budget_actuals_budget ON budget_actuals(budget_id);
```

---

### G. Registers, Journals & Journal Items

```sql
-- ============================================================
-- G1. REGISTERS — Antrian transaksi sebelum posting
-- ============================================================
CREATE TABLE registers (
    id              BIGSERIAL       PRIMARY KEY,
    org_node_id     BIGINT          NOT NULL REFERENCES org_nodes(id),
    register_no     VARCHAR(50)     NOT NULL,               -- 'TRX/2026/01/0001'
    register_type   VARCHAR(30)     NOT NULL
                        CHECK (register_type IN ('penerimaan','pengeluaran','jurnal_umum','transfer','ca_pencairan','ca_ljp','distribusi','donasi')),
    status          VARCHAR(20)     NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','submitted','approved','posted','reversed','cancelled')),
    total_amount    NUMERIC(18,2)   NOT NULL DEFAULT 0,
    cost_center_id  BIGINT          REFERENCES cost_centers(id),
    fund_id         BIGINT          REFERENCES funds(id),
    program_id      BIGINT          REFERENCES programs(id),
    contact_id      BIGINT          REFERENCES contacts(id),
    bank_account_id BIGINT          REFERENCES bank_accounts(id),
    description     TEXT,
    txn_date        DATE            NOT NULL DEFAULT CURRENT_DATE,
    attachment_urls TEXT[],
    ocr_result_json JSONB,
    created_by      BIGINT          NOT NULL REFERENCES users(id),
    submitted_at    TIMESTAMPTZ,
    approved_by     BIGINT          REFERENCES users(id),
    approved_at     TIMESTAMPTZ,
    posted_by       BIGINT          REFERENCES users(id),
    posted_at       TIMESTAMPTZ,
    is_locked       BOOLEAN         NOT NULL DEFAULT FALSE, -- TRUE setelah closing
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (org_node_id, register_no)
);

CREATE INDEX idx_reg_node        ON registers(org_node_id);
CREATE INDEX idx_reg_status      ON registers(org_node_id, status);
CREATE INDEX idx_reg_type        ON registers(org_node_id, register_type);
CREATE INDEX idx_reg_date        ON registers(org_node_id, txn_date DESC);
CREATE INDEX idx_reg_fund        ON registers(fund_id);
CREATE INDEX idx_reg_program     ON registers(program_id);
CREATE INDEX idx_reg_contact     ON registers(contact_id);
CREATE INDEX idx_reg_created_by  ON registers(created_by);

-- ============================================================
-- G2. APPROVAL_FLOWS — riwayat approval per register
-- ============================================================
CREATE TABLE approval_flows (
    id              BIGSERIAL       PRIMARY KEY,
    register_id     BIGINT          NOT NULL REFERENCES registers(id) ON DELETE CASCADE,
    approver_id     BIGINT          NOT NULL REFERENCES users(id),
    approval_level  SMALLINT        NOT NULL DEFAULT 1,
    status          VARCHAR(20)     NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','approved','rejected','escalated','delegated')),
    notes           TEXT,
    responded_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_approval_register  ON approval_flows(register_id);
CREATE INDEX idx_approval_approver  ON approval_flows(approver_id, status);

-- ============================================================
-- G3. JOURNALS — Header jurnal akuntansi
-- ============================================================
CREATE TABLE journals (
    id              BIGSERIAL       PRIMARY KEY,
    org_node_id     BIGINT          NOT NULL REFERENCES org_nodes(id),
    register_id     BIGINT          REFERENCES registers(id),
    journal_no      VARCHAR(50)     NOT NULL,               -- 'JRN/2026/01/0001'
    journal_date    DATE            NOT NULL,
    period_year     SMALLINT        NOT NULL,
    period_month    SMALLINT        NOT NULL,
    description     TEXT,
    journal_type    VARCHAR(30)     NOT NULL DEFAULT 'umum'
                        CHECK (journal_type IN ('umum','penerimaan','pengeluaran','penyesuaian','penutup','pembalik','transfer','internode')),
    is_posted       BOOLEAN         NOT NULL DEFAULT FALSE,
    posted_at       TIMESTAMPTZ,
    posted_by       BIGINT          REFERENCES users(id),
    is_reversed     BOOLEAN         NOT NULL DEFAULT FALSE,
    reverse_of_id   BIGINT          REFERENCES journals(id),
    is_locked       BOOLEAN         NOT NULL DEFAULT FALSE,
    total_debit     NUMERIC(18,2)   NOT NULL DEFAULT 0,     -- denormalized untuk validasi cepat
    total_credit    NUMERIC(18,2)   NOT NULL DEFAULT 0,
    created_by      BIGINT          NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (org_node_id, journal_no)
);

CREATE INDEX idx_journals_node    ON journals(org_node_id);
CREATE INDEX idx_journals_period  ON journals(org_node_id, period_year, period_month);
CREATE INDEX idx_journals_date    ON journals(org_node_id, journal_date DESC);
CREATE INDEX idx_journals_posted  ON journals(org_node_id, is_posted);
CREATE INDEX idx_journals_reg     ON journals(register_id);
CREATE INDEX idx_journals_locked  ON journals(org_node_id, is_locked);

-- ============================================================
-- G4. JOURNAL_ITEMS — Baris debit/kredit
-- ============================================================
CREATE TABLE journal_items (
    id              BIGSERIAL       PRIMARY KEY,
    journal_id      BIGINT          NOT NULL REFERENCES journals(id) ON DELETE CASCADE,
    org_node_id     BIGINT          NOT NULL REFERENCES org_nodes(id),  -- denormalized untuk query langsung
    coa_id          BIGINT          NOT NULL REFERENCES coa(id),
    cost_center_id  BIGINT          REFERENCES cost_centers(id),
    fund_id         BIGINT          REFERENCES funds(id),
    program_id      BIGINT          REFERENCES programs(id),
    debit           NUMERIC(18,2)   NOT NULL DEFAULT 0,
    credit          NUMERIC(18,2)   NOT NULL DEFAULT 0,
    narration       TEXT,
    line_order      SMALLINT        NOT NULL DEFAULT 1,
    CHECK (debit >= 0 AND credit >= 0),
    CHECK (NOT (debit > 0 AND credit > 0))  -- tidak boleh isi keduanya
);

-- Index paling kritis — query Trial Balance & General Ledger
CREATE INDEX idx_ji_journal      ON journal_items(journal_id);
CREATE INDEX idx_ji_coa          ON journal_items(coa_id);
CREATE INDEX idx_ji_org_coa      ON journal_items(org_node_id, coa_id);  -- GB / Trial Balance per akun
CREATE INDEX idx_ji_fund         ON journal_items(fund_id);
CREATE INDEX idx_ji_program      ON journal_items(program_id);
CREATE INDEX idx_ji_cost_center  ON journal_items(cost_center_id);
-- Composite index untuk laporan periode (paling sering dipakai)
CREATE INDEX idx_ji_org_journal  ON journal_items(org_node_id, journal_id);
```

---

### H. Donations & Distributions (LAZ Core)

```sql
-- ============================================================
-- H1. CAMPAIGNS — Kampanye fundraising
-- ============================================================
CREATE TABLE campaigns (
    id              BIGSERIAL       PRIMARY KEY,
    org_node_id     BIGINT          NOT NULL REFERENCES org_nodes(id),
    fund_id         BIGINT          NOT NULL REFERENCES funds(id),
    program_id      BIGINT          REFERENCES programs(id),
    campaign_code   VARCHAR(30)     NOT NULL,
    campaign_name   VARCHAR(300)    NOT NULL,
    description     TEXT,
    target_amount   NUMERIC(18,2)   NOT NULL DEFAULT 0,
    start_date      DATE            NOT NULL,
    end_date        DATE,
    status          VARCHAR(20)     NOT NULL DEFAULT 'active'
                        CHECK (status IN ('draft','active','closed','cancelled')),
    banner_url      VARCHAR(500),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (org_node_id, campaign_code)
);

CREATE INDEX idx_campaigns_node   ON campaigns(org_node_id);
CREATE INDEX idx_campaigns_fund   ON campaigns(fund_id);
CREATE INDEX idx_campaigns_status ON campaigns(org_node_id, status);

-- ============================================================
-- H2. DONATIONS — Penerimaan donasi
-- ============================================================
CREATE TABLE donations (
    id              BIGSERIAL       PRIMARY KEY,
    org_node_id     BIGINT          NOT NULL REFERENCES org_nodes(id),
    register_id     BIGINT          NOT NULL REFERENCES registers(id),
    donor_id        BIGINT          NOT NULL REFERENCES contacts(id),
    campaign_id     BIGINT          REFERENCES campaigns(id),
    fund_id         BIGINT          NOT NULL REFERENCES funds(id),
    program_id      BIGINT          REFERENCES programs(id),
    donation_date   DATE            NOT NULL,
    amount          NUMERIC(18,2)   NOT NULL,
    channel         VARCHAR(30)     NOT NULL DEFAULT 'transfer'
                        CHECK (channel IN ('cash','transfer','qris','gopay','ovo','dana','shopeepay','cc','platform_online','lainnya')),
    payment_ref     VARCHAR(100),                           -- nomor referensi transfer/VA
    bank_account_id BIGINT          REFERENCES bank_accounts(id),
    receipt_no      VARCHAR(50),
    receipt_sent_at TIMESTAMPTZ,
    is_anonymous    BOOLEAN         NOT NULL DEFAULT FALSE,
    notes           TEXT,
    created_by      BIGINT          NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_donations_node     ON donations(org_node_id);
CREATE INDEX idx_donations_date     ON donations(org_node_id, donation_date DESC);
CREATE INDEX idx_donations_donor    ON donations(donor_id);
CREATE INDEX idx_donations_fund     ON donations(org_node_id, fund_id);
CREATE INDEX idx_donations_campaign ON donations(campaign_id);
CREATE INDEX idx_donations_register ON donations(register_id);
-- High-traffic: rekap per periode
CREATE INDEX idx_donations_period   ON donations(org_node_id, date_trunc('month', donation_date::TIMESTAMPTZ));

-- ============================================================
-- H3. DISTRIBUTIONS — Penyaluran dana ke mustahiq / program
-- ============================================================
CREATE TABLE distributions (
    id              BIGSERIAL       PRIMARY KEY,
    org_node_id     BIGINT          NOT NULL REFERENCES org_nodes(id),
    register_id     BIGINT          NOT NULL REFERENCES registers(id),
    program_id      BIGINT          NOT NULL REFERENCES programs(id),
    fund_id         BIGINT          NOT NULL REFERENCES funds(id),
    recipient_id    BIGINT          NOT NULL REFERENCES contacts(id),  -- mustahiq
    dist_date       DATE            NOT NULL,
    amount          NUMERIC(18,2)   NOT NULL,
    dist_type       VARCHAR(20)     NOT NULL DEFAULT 'transfer'
                        CHECK (dist_type IN ('cash','transfer','natura','voucher')),
    asnaf_category  VARCHAR(30)     NOT NULL,               -- 'fakir','miskin','amil', dst
    bank_account_id BIGINT          REFERENCES bank_accounts(id),
    payment_ref     VARCHAR(100),
    sk_no           VARCHAR(100),                           -- nomor SK distribusi
    berita_acara_url VARCHAR(500),
    natura_desc     TEXT,                                   -- deskripsi barang jika natura
    natura_value    NUMERIC(18,2),                         -- estimasi nilai rupiah natura
    notes           TEXT,
    created_by      BIGINT          NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dist_node      ON distributions(org_node_id);
CREATE INDEX idx_dist_date      ON distributions(org_node_id, dist_date DESC);
CREATE INDEX idx_dist_program   ON distributions(program_id);
CREATE INDEX idx_dist_fund      ON distributions(org_node_id, fund_id);
CREATE INDEX idx_dist_recipient ON distributions(recipient_id);
CREATE INDEX idx_dist_register  ON distributions(register_id);
CREATE INDEX idx_dist_asnaf     ON distributions(org_node_id, asnaf_category);
```

---

### I. Cash Advance

```sql
-- ============================================================
-- I1. CASH_ADVANCES
-- ============================================================
CREATE TABLE cash_advances (
    id              BIGSERIAL       PRIMARY KEY,
    org_node_id     BIGINT          NOT NULL REFERENCES org_nodes(id),
    register_id     BIGINT          NOT NULL REFERENCES registers(id),
    requested_by    BIGINT          NOT NULL REFERENCES users(id),
    cost_center_id  BIGINT          REFERENCES cost_centers(id),
    fund_id         BIGINT          REFERENCES funds(id),
    program_id      BIGINT          REFERENCES programs(id),
    budget_id       BIGINT          REFERENCES budgets(id),
    ca_no           VARCHAR(50)     NOT NULL,               -- 'CA/2026/01/001'
    purpose         VARCHAR(500)    NOT NULL,
    amount_requested NUMERIC(18,2)  NOT NULL,
    amount_disbursed NUMERIC(18,2)  NOT NULL DEFAULT 0,
    amount_realized  NUMERIC(18,2)  NOT NULL DEFAULT 0,     -- diisi saat LPJ
    amount_returned  NUMERIC(18,2)  NOT NULL DEFAULT 0,
    status          VARCHAR(20)     NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','submitted','approved','disbursed','ljp_submitted','settled','cancelled')),
    need_date       DATE            NOT NULL,
    disbursed_at    TIMESTAMPTZ,
    ljp_submitted_at TIMESTAMPTZ,
    settled_at      TIMESTAMPTZ,
    overdue_days    SMALLINT        GENERATED ALWAYS AS (
                        CASE WHEN status NOT IN ('settled','cancelled') AND ljp_submitted_at IS NULL
                        THEN GREATEST(0, CURRENT_DATE - need_date)
                        ELSE 0 END
                    ) STORED,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (org_node_id, ca_no)
);

CREATE INDEX idx_ca_node      ON cash_advances(org_node_id);
CREATE INDEX idx_ca_requester ON cash_advances(requested_by);
CREATE INDEX idx_ca_status    ON cash_advances(org_node_id, status);
CREATE INDEX idx_ca_overdue   ON cash_advances(org_node_id, overdue_days) WHERE overdue_days > 0;

-- ============================================================
-- I2. CA_ITEMS — Rincian LPJ
-- ============================================================
CREATE TABLE ca_items (
    id              BIGSERIAL       PRIMARY KEY,
    ca_id           BIGINT          NOT NULL REFERENCES cash_advances(id) ON DELETE CASCADE,
    coa_id          BIGINT          NOT NULL REFERENCES coa(id),
    description     VARCHAR(500)    NOT NULL,
    amount          NUMERIC(18,2)   NOT NULL,
    attachment_url  VARCHAR(500),
    ocr_result_json JSONB,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ca_items_ca  ON ca_items(ca_id);
CREATE INDEX idx_ca_items_coa ON ca_items(coa_id);
```

---

### J. Assets & Depreciation

```sql
-- ============================================================
-- J1. ASSETS
-- ============================================================
CREATE TABLE assets (
    id              BIGSERIAL       PRIMARY KEY,
    org_node_id     BIGINT          NOT NULL REFERENCES org_nodes(id),
    coa_id          BIGINT          NOT NULL REFERENCES coa(id),    -- akun aset tetap
    accum_depr_coa_id BIGINT        REFERENCES coa(id),             -- akun akum. depresiasi
    depr_expense_coa_id BIGINT      REFERENCES coa(id),             -- akun beban depresiasi
    cost_center_id  BIGINT          REFERENCES cost_centers(id),
    asset_code      VARCHAR(50)     NOT NULL,
    asset_name      VARCHAR(300)    NOT NULL,
    category        VARCHAR(50)     NOT NULL
                        CHECK (category IN ('tanah','bangunan','kendaraan','inventaris','peralatan_kantor','peralatan_it','lainnya')),
    purchase_date   DATE            NOT NULL,
    purchase_value  NUMERIC(18,2)   NOT NULL,
    salvage_value   NUMERIC(18,2)   NOT NULL DEFAULT 0,
    useful_life_months SMALLINT     NOT NULL DEFAULT 60,
    depr_method     VARCHAR(5)      NOT NULL DEFAULT 'SL'
                        CHECK (depr_method IN ('SL','DDB','NONE')),
    accumulated_depr NUMERIC(18,2)  NOT NULL DEFAULT 0,
    book_value      NUMERIC(18,2)   NOT NULL,               -- purchase_value - accumulated_depr
    status          VARCHAR(20)     NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','disposed','sold','lost','donated')),
    location        VARCHAR(200),
    qr_code_url     VARCHAR(500),
    serial_no       VARCHAR(100),
    notes           TEXT,
    register_id     BIGINT          REFERENCES registers(id),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (org_node_id, asset_code)
);

CREATE INDEX idx_assets_node     ON assets(org_node_id);
CREATE INDEX idx_assets_category ON assets(org_node_id, category);
CREATE INDEX idx_assets_status   ON assets(org_node_id, status);
CREATE INDEX idx_assets_coa      ON assets(coa_id);

-- ============================================================
-- J2. ASSET_DEPRECIATIONS — Log penyusutan per bulan
-- ============================================================
CREATE TABLE asset_depreciations (
    id              BIGSERIAL       PRIMARY KEY,
    asset_id        BIGINT          NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    journal_id      BIGINT          REFERENCES journals(id),
    period_year     SMALLINT        NOT NULL,
    period_month    SMALLINT        NOT NULL,
    depr_amount     NUMERIC(18,2)   NOT NULL,
    book_value_after NUMERIC(18,2)  NOT NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (asset_id, period_year, period_month)
);

CREATE INDEX idx_asset_depr_asset  ON asset_depreciations(asset_id);
CREATE INDEX idx_asset_depr_period ON asset_depreciations(period_year, period_month);
```

---

### K. Bank Statements & Rekonsiliasi

```sql
-- ============================================================
-- K1. BANK_STATEMENTS — Import mutasi bank
-- ============================================================
CREATE TABLE bank_statements (
    id              BIGSERIAL       PRIMARY KEY,
    bank_account_id BIGINT          NOT NULL REFERENCES bank_accounts(id),
    org_node_id     BIGINT          NOT NULL REFERENCES org_nodes(id),
    txn_date        DATE            NOT NULL,
    amount          NUMERIC(18,2)   NOT NULL,               -- positif = kredit (masuk), negatif = debit (keluar)
    description     TEXT,
    source_ref      VARCHAR(100),                           -- nomor referensi dari bank
    balance_after   NUMERIC(18,2),
    import_batch_id VARCHAR(50),                            -- untuk tracking per import file
    status          VARCHAR(20)     NOT NULL DEFAULT 'unmatched'
                        CHECK (status IN ('unmatched','matched','excluded','manual')),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bs_bank_acc  ON bank_statements(bank_account_id);
CREATE INDEX idx_bs_date      ON bank_statements(bank_account_id, txn_date DESC);
CREATE INDEX idx_bs_status    ON bank_statements(bank_account_id, status);
CREATE INDEX idx_bs_org       ON bank_statements(org_node_id);

-- ============================================================
-- K2. RECON_MATCHES — Hasil matching rekonsiliasi
-- ============================================================
CREATE TABLE recon_matches (
    id                  BIGSERIAL   PRIMARY KEY,
    bank_statement_id   BIGINT      NOT NULL REFERENCES bank_statements(id),
    journal_item_id     BIGINT      NOT NULL REFERENCES journal_items(id),
    match_type          VARCHAR(20) NOT NULL DEFAULT 'auto'
                            CHECK (match_type IN ('auto','manual')),
    confidence_pct      SMALLINT    NOT NULL DEFAULT 100 CHECK (confidence_pct BETWEEN 0 AND 100),
    matched_by          BIGINT      REFERENCES users(id),
    matched_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (bank_statement_id, journal_item_id)
);

CREATE INDEX idx_recon_bs    ON recon_matches(bank_statement_id);
CREATE INDEX idx_recon_ji    ON recon_matches(journal_item_id);
```

---

### L. Closing Periods & Cutoff

```sql
-- ============================================================
-- L1. CLOSING_PERIODS — Status tutup buku per periode per node
-- ============================================================
CREATE TABLE closing_periods (
    id              BIGSERIAL       PRIMARY KEY,
    org_node_id     BIGINT          NOT NULL REFERENCES org_nodes(id),
    period_year     SMALLINT        NOT NULL,
    period_month    SMALLINT        NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    status          VARCHAR(20)     NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open','closing','closed','reopened')),
    closed_by       BIGINT          REFERENCES users(id),
    closed_at       TIMESTAMPTZ,
    opening_balance_json JSONB,     -- snapshot saldo awal setelah closing
    closing_balance_json JSONB,     -- snapshot saldo akhir
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (org_node_id, period_year, period_month)
);

CREATE INDEX idx_closing_node    ON closing_periods(org_node_id);
CREATE INDEX idx_closing_period  ON closing_periods(org_node_id, period_year, period_month);
CREATE INDEX idx_closing_status  ON closing_periods(org_node_id, status);

-- ============================================================
-- L2. CLOSING_CUTOFF_CONFIG — Konfigurasi cutoff per node
-- ============================================================
CREATE TABLE closing_cutoff_config (
    id              BIGSERIAL       PRIMARY KEY,
    org_node_id     BIGINT          NOT NULL REFERENCES org_nodes(id) UNIQUE,
    cutoff_day      SMALLINT        NOT NULL DEFAULT 10 CHECK (cutoff_day BETWEEN 1 AND 28),
    mode            VARCHAR(15)     NOT NULL DEFAULT 'strict'
                        CHECK (mode IN ('strict','approval')),
    override_role   VARCHAR(50)     NOT NULL DEFAULT 'super_admin',
    effective_from  DATE            NOT NULL DEFAULT CURRENT_DATE,
    created_by      BIGINT          NOT NULL REFERENCES users(id),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ============================================================
-- L3. CLOSING_OVERRIDE_LOG — Log override cutoff
-- ============================================================
CREATE TABLE closing_override_log (
    id              BIGSERIAL       PRIMARY KEY,
    org_node_id     BIGINT          NOT NULL REFERENCES org_nodes(id),
    period_year     SMALLINT        NOT NULL,
    period_month    SMALLINT        NOT NULL,
    requested_by    BIGINT          NOT NULL REFERENCES users(id),
    requested_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    approved_by     BIGINT          REFERENCES users(id),
    approved_at     TIMESTAMPTZ,
    status          VARCHAR(15)     NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','approved','rejected')),
    reason          TEXT            NOT NULL,
    rejection_note  TEXT
);

CREATE INDEX idx_override_node   ON closing_override_log(org_node_id);
CREATE INDEX idx_override_period ON closing_override_log(org_node_id, period_year, period_month);
CREATE INDEX idx_override_status ON closing_override_log(status) WHERE status = 'pending';
```

---

### M. Konsolidasi (Multi-Level)

```sql
-- ============================================================
-- M1. INTERNODE_TRANSFERS — Transfer antar node (untuk eliminasi)
-- ============================================================
CREATE TABLE internode_transfers (
    id              BIGSERIAL       PRIMARY KEY,
    from_node_id    BIGINT          NOT NULL REFERENCES org_nodes(id),
    to_node_id      BIGINT          NOT NULL REFERENCES org_nodes(id),
    from_journal_id BIGINT          NOT NULL REFERENCES journals(id),
    to_journal_id   BIGINT          NOT NULL REFERENCES journals(id),
    amount          NUMERIC(18,2)   NOT NULL,
    transfer_date   DATE            NOT NULL,
    elimination_flag BOOLEAN        NOT NULL DEFAULT TRUE,
    notes           TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_internode_from ON internode_transfers(from_node_id);
CREATE INDEX idx_internode_to   ON internode_transfers(to_node_id);
CREATE INDEX idx_internode_date ON internode_transfers(transfer_date DESC);

-- ============================================================
-- M2. CONSOLIDATION_SNAPSHOTS — Cache laporan konsolidasi
-- ============================================================
CREATE TABLE consolidation_snapshots (
    id              BIGSERIAL       PRIMARY KEY,
    root_node_id    BIGINT          NOT NULL REFERENCES org_nodes(id),
    scope_node_ids  BIGINT[]        NOT NULL,
    report_type     VARCHAR(50)     NOT NULL,               -- 'trial_balance','laporan_posisi','laporan_aktivitas'
    period_year     SMALLINT        NOT NULL,
    period_month    SMALLINT,                               -- NULL = tahunan
    snapshot_data   JSONB           NOT NULL,
    generated_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    is_stale        BOOLEAN         NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_consol_root    ON consolidation_snapshots(root_node_id);
CREATE INDEX idx_consol_period  ON consolidation_snapshots(root_node_id, period_year, period_month);
CREATE INDEX idx_consol_stale   ON consolidation_snapshots(is_stale) WHERE is_stale = FALSE;

-- ============================================================
-- M3. COA_MAPPING — Pemetaan COA node anak ke COA Pusat
-- ============================================================
CREATE TABLE coa_mapping (
    id              BIGSERIAL       PRIMARY KEY,
    child_node_id   BIGINT          NOT NULL REFERENCES org_nodes(id),
    root_node_id    BIGINT          NOT NULL REFERENCES org_nodes(id),
    child_coa_id    BIGINT          NOT NULL REFERENCES coa(id),
    root_coa_id     BIGINT          NOT NULL REFERENCES coa(id),
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    UNIQUE (child_node_id, child_coa_id, root_node_id)
);

CREATE INDEX idx_coa_mapping_child ON coa_mapping(child_node_id);
CREATE INDEX idx_coa_mapping_root  ON coa_mapping(root_node_id);
```

---

### N. Audit Log & Notifications

```sql
-- ============================================================
-- N1. AUDIT_LOGS — Immutable event log
-- ============================================================
CREATE TABLE audit_logs (
    id              BIGSERIAL       PRIMARY KEY,
    org_node_id     BIGINT          NOT NULL REFERENCES org_nodes(id),
    user_id         BIGINT          REFERENCES users(id),
    action          VARCHAR(50)     NOT NULL,               -- 'CREATE','UPDATE','DELETE','POST','CLOSE','OVERRIDE','LOGIN'
    entity_type     VARCHAR(50)     NOT NULL,               -- 'journal','register','donation','user', dst
    entity_id       BIGINT          NOT NULL,
    before_json     JSONB,
    after_json      JSONB,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);  -- partisi per tahun untuk performa

-- Buat partisi 2025 dan 2026
CREATE TABLE audit_logs_2025 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE audit_logs_2026 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

CREATE INDEX idx_audit_node    ON audit_logs(org_node_id, created_at DESC);
CREATE INDEX idx_audit_entity  ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_user    ON audit_logs(user_id, created_at DESC);

-- ============================================================
-- N2. NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
    id              BIGSERIAL       PRIMARY KEY,
    org_node_id     BIGINT          NOT NULL REFERENCES org_nodes(id),
    user_id         BIGINT          NOT NULL REFERENCES users(id),
    notif_type      VARCHAR(50)     NOT NULL,               -- 'approval_request','cutoff_reminder','budget_alert','low_balance'
    channel         VARCHAR(20)     NOT NULL DEFAULT 'in_app'
                        CHECK (channel IN ('in_app','whatsapp','email','push')),
    title           VARCHAR(300)    NOT NULL,
    body            TEXT            NOT NULL,
    ref_entity_type VARCHAR(50),
    ref_entity_id   BIGINT,
    is_read         BOOLEAN         NOT NULL DEFAULT FALSE,
    sent_at         TIMESTAMPTZ,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_user    ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notif_node    ON notifications(org_node_id, created_at DESC);
CREATE INDEX idx_notif_unread  ON notifications(user_id, is_read) WHERE is_read = FALSE;
```

---

## SEED DATA — LAZ Percikan Iman Sedekahku

### Seed 1: Org Nodes

```sql
-- Pusat
INSERT INTO org_nodes (id, name, short_code, org_level, parent_id, org_path, entity_type, psak_standard, address, phone, email)
VALUES
(1, 'LAZ Percikan Iman Sedekahku Pusat',  'PUSAT',    'pusat',   NULL, '/1',     'ngo', 'PSAK109', 'Jl. Percikan No.1, Bandung', '022-1234567', 'pusat@percikaniman.org'),
(2, 'Wilayah Jawa Barat',                  'WIL-JBR',  'wilayah', 1,    '/1/2',   'ngo', 'PSAK109', 'Jl. Asia Afrika No.10, Bandung', '022-2345678', 'jabar@percikaniman.org'),
(3, 'Wilayah Jawa Tengah',                 'WIL-JTG',  'wilayah', 1,    '/1/3',   'ngo', 'PSAK109', 'Jl. Pemuda No.5, Semarang', '024-3456789', 'jateng@percikaniman.org'),
(4, 'Daerah Bandung',                      'DAE-BDG',  'daerah',  2,    '/1/2/4', 'ngo', 'PSAK109', 'Jl. Dago No.20, Bandung', '022-4567890', 'bandung@percikaniman.org'),
(5, 'Daerah Garut',                        'DAE-GRT',  'daerah',  2,    '/1/2/5', 'ngo', 'PSAK109', 'Jl. Ahmad Yani No.7, Garut', '0262-5678901', 'garut@percikaniman.org'),
(6, 'Daerah Semarang',                     'DAE-SMG',  'daerah',  3,    '/1/3/6', 'ngo', 'PSAK109', 'Jl. Pandanaran No.15, Semarang', '024-6789012', 'semarang@percikaniman.org');

SELECT setval('org_nodes_id_seq', 6);
```

### Seed 2: Roles & Permissions

```sql
INSERT INTO roles (id, role_name, description, is_system) VALUES
(1, 'super_admin',  'Super Administrator platform',         TRUE),
(2, 'admin_org',    'Administrator Organisasi/Node',        TRUE),
(3, 'finance',      'Finance & Accounting Officer',         TRUE),
(4, 'manager',      'Manager / Approver',                   TRUE),
(5, 'amil',         'Amil / Program Officer (Sosial)',      TRUE),
(6, 'viewer',       'Auditor / Read-Only',                  TRUE);

SELECT setval('roles_id_seq', 6);

INSERT INTO permissions (id, perm_code, module, description) VALUES
(1,  'org.manage',           'setting',    'Kelola struktur organisasi'),
(2,  'user.manage',          'setting',    'Kelola user & role'),
(3,  'coa.manage',           'master',     'Kelola Chart of Accounts'),
(4,  'master.manage',        'master',     'Kelola master data (fund, program, kontak)'),
(5,  'register.create',      'transaksi',  'Buat register transaksi'),
(6,  'register.approve',     'transaksi',  'Approve register transaksi'),
(7,  'journal.post',         'jurnal',     'Posting jurnal ke buku besar'),
(8,  'closing.execute',      'closing',    'Eksekusi tutup buku'),
(9,  'closing.override',     'closing',    'Override cutoff tutup buku'),
(10, 'budget.manage',        'rapb',       'Kelola RAPB / anggaran'),
(11, 'donation.manage',      'sosial',     'Kelola donasi & distribusi'),
(12, 'report.view',          'laporan',    'Lihat laporan keuangan'),
(13, 'report.export',        'laporan',    'Export laporan ke PDF/Excel'),
(14, 'audit.view',           'audit',      'Lihat Audit Trail'),
(15, 'consolidation.view',   'laporan',    'Lihat laporan konsolidasi multi-node');

SELECT setval('permissions_id_seq', 15);

-- Role-Permission mapping
INSERT INTO role_permissions (role_id, permission_id) VALUES
-- Super Admin: semua
(1,1),(1,2),(1,3),(1,4),(1,5),(1,6),(1,7),(1,8),(1,9),(1,10),(1,11),(1,12),(1,13),(1,14),(1,15),
-- Admin Org
(2,2),(2,3),(2,4),(2,5),(2,6),(2,7),(2,8),(2,10),(2,11),(2,12),(2,13),(2,14),(2,15),
-- Finance
(3,5),(3,7),(3,8),(3,10),(3,11),(3,12),(3,13),
-- Manager
(4,6),(4,12),(4,13),(4,15),
-- Amil
(5,5),(5,11),(5,12),(5,13),
-- Viewer/Auditor
(6,12),(6,13),(6,14);
```

### Seed 3: Users

```sql
INSERT INTO users (id, org_node_id, full_name, email, phone_wa, password_hash, is_active) VALUES
(1, 1, 'Ahmad Fauzi',         'ahmad.fauzi@percikaniman.org',    '081111111111', '$2b$12$hashed_pw_1', TRUE),  -- Super Admin Pusat
(2, 1, 'Siti Rahayu',         'siti.rahayu@percikaniman.org',    '081111111112', '$2b$12$hashed_pw_2', TRUE),  -- Finance Pusat
(3, 2, 'Budi Santoso',        'budi.santoso@percikaniman.org',   '081111111113', '$2b$12$hashed_pw_3', TRUE),  -- Admin Wilayah JBR
(4, 4, 'Dewi Kurniawati',     'dewi.kurniawati@percikaniman.org','081111111114', '$2b$12$hashed_pw_4', TRUE),  -- Finance Daerah Bandung
(5, 4, 'Rizqi Berliandie R',  'rizqi.berliandie@percikaniman.org','081111111115','$2b$12$hashed_pw_5', TRUE),  -- Amil Daerah Bandung
(6, 5, 'Hendra Gunawan',      'hendra.gunawan@percikaniman.org', '081111111116', '$2b$12$hashed_pw_6', TRUE),  -- Finance Daerah Garut
(7, 1, 'Dr. Taufiq Rahman',   'taufiq.rahman@percikaniman.org',  '081111111117', '$2b$12$hashed_pw_7', TRUE);  -- Manager Pusat

SELECT setval('users_id_seq', 7);

INSERT INTO user_roles (id, user_id, role_id, org_node_id, scope_type, scope_node_ids) VALUES
(1, 1, 1, 1, 'all',    '{1,2,3,4,5,6}'),  -- Ahmad: Super Admin, scope semua node
(2, 2, 3, 1, 'own',    '{1}'),             -- Siti: Finance Pusat
(3, 3, 2, 2, 'region', '{2,4,5}'),         -- Budi: Admin Wilayah JBR + Daerah bawahnya
(4, 4, 3, 4, 'own',    '{4}'),             -- Dewi: Finance Daerah Bandung
(5, 5, 5, 4, 'own',    '{4}'),             -- Rizqi: Amil Daerah Bandung
(6, 6, 3, 5, 'own',    '{5}'),             -- Hendra: Finance Daerah Garut
(7, 7, 4, 1, 'all',    '{1,2,3,4,5,6}');  -- Taufiq: Manager Pusat scope semua

SELECT setval('user_roles_id_seq', 7);
```

### Seed 4: COA (PSAK 109 — LAZ)

```sql
-- Level 1 — Kelompok Utama
INSERT INTO coa (id, org_node_id, account_code, account_name, account_type, normal_balance, parent_id, coa_level, coa_path, is_group) VALUES
(1,  1, '1',   'Aset',          'asset',         'debit',  NULL, 1, '/1',   TRUE),
(2,  1, '2',   'Kewajiban',     'liability',     'credit', NULL, 1, '/2',   TRUE),
(3,  1, '3',   'Saldo Dana',    'fund_balance',  'credit', NULL, 1, '/3',   TRUE),
(4,  1, '4',   'Penerimaan',    'revenue',       'credit', NULL, 1, '/4',   TRUE),
(5,  1, '5',   'Penyaluran Dana','expense',      'debit',  NULL, 1, '/5',   TRUE);

-- Level 2 — Sub Kelompok
INSERT INTO coa (id, org_node_id, account_code, account_name, account_type, normal_balance, parent_id, coa_level, coa_path, is_group) VALUES
-- Aset
(10, 1, '1.01', 'Aset Lancar',              'asset',     'debit',  1,  2, '/1/10',  TRUE),
(11, 1, '1.02', 'Aset Tidak Lancar',        'asset',     'debit',  1,  2, '/1/11',  TRUE),
-- Kewajiban
(20, 1, '2.01', 'Kewajiban Jangka Pendek',  'liability', 'credit', 2,  2, '/2/20',  TRUE),
-- Saldo Dana
(30, 1, '3.01', 'Dana Tidak Terikat',       'fund_balance','credit',3, 2, '/3/30',  TRUE),
(31, 1, '3.02', 'Dana Terikat Sementara',   'fund_balance','credit',3, 2, '/3/31',  TRUE),
(32, 1, '3.03', 'Dana Terikat Permanen',    'fund_balance','credit',3, 2, '/3/32',  TRUE),
-- Penerimaan
(40, 1, '4.01', 'Penerimaan Zakat',         'revenue',   'credit', 4,  2, '/4/40',  TRUE),
(41, 1, '4.02', 'Penerimaan Infaq Sedekah', 'revenue',   'credit', 4,  2, '/4/41',  TRUE),
(42, 1, '4.03', 'Penerimaan Dana Amil',     'revenue',   'credit', 4,  2, '/4/42',  TRUE),
-- Penyaluran
(50, 1, '5.01', 'Penyaluran Fakir Miskin',  'expense',   'debit',  5,  2, '/5/50',  TRUE),
(51, 1, '5.02', 'Penyaluran Fisabilillah',  'expense',   'debit',  5,  2, '/5/51',  TRUE),
(52, 1, '5.03', 'Biaya Operasional Amil',   'expense',   'debit',  5,  2, '/5/52',  TRUE);

-- Level 3 — Akun Kas & Bank (Leaf)
INSERT INTO coa (id, org_node_id, account_code, account_name, account_type, normal_balance, parent_id, coa_level, coa_path, is_group) VALUES
(100, 1, '1.01.01', 'Kas',                       'asset', 'debit', 10, 3, '/1/10/100', TRUE),
(101, 1, '1.01.02', 'Bank',                      'asset', 'debit', 10, 3, '/1/10/101', TRUE),
(110, 1, '1.02.01', 'Aset Tetap',                'asset', 'debit', 11, 3, '/1/11/110', TRUE),
(111, 1, '1.02.02', 'Akum. Penyusutan Aset Tetap','asset','credit',11, 3, '/1/11/111', TRUE);

-- Level 4 — Kas detail
INSERT INTO coa (id, org_node_id, account_code, account_name, account_type, normal_balance, parent_id, coa_level, coa_path, is_group) VALUES
(1001, 1, '1.01.01.001', 'Kas Pusat',                  'asset', 'debit', 100, 4, '/1/10/100/1001', FALSE),
(1002, 1, '1.01.01.002', 'Kas Kecil Operasional',      'asset', 'debit', 100, 4, '/1/10/100/1002', FALSE),
-- Bank Leaf
(1010, 1, '1.01.02.010', 'BRI Penerimaan 3305',        'asset', 'debit', 101, 4, '/1/10/101/1010', FALSE),
(1011, 1, '1.01.02.011', 'BSI Penerimaan 5859',        'asset', 'debit', 101, 4, '/1/10/101/1011', FALSE),
(1012, 1, '1.01.02.012', 'Bank Mandiri Penerimaan 001','asset', 'debit', 101, 4, '/1/10/101/1012', FALSE),
(1013, 1, '1.01.02.013', 'BCA Syariah SMB 0354333999', 'asset', 'debit', 101, 4, '/1/10/101/1013', FALSE),
-- Penerimaan Leaf
(4001, 1, '4.01.001', 'Penerimaan Zakat Maal',         'revenue', 'credit', 40, 3, '/4/40/4001', FALSE),
(4002, 1, '4.01.002', 'Penerimaan Zakat Fitrah',       'revenue', 'credit', 40, 3, '/4/40/4002', FALSE),
(4011, 1, '4.02.001', 'Penerimaan Infaq',              'revenue', 'credit', 41, 3, '/4/41/4011', FALSE),
(4012, 1, '4.02.002', 'Penerimaan Sedekah',            'revenue', 'credit', 41, 3, '/4/41/4012', FALSE),
(4013, 1, '4.02.003', 'Penerimaan Wakaf',              'revenue', 'credit', 41, 3, '/4/41/4013', FALSE),
(4014, 1, '4.02.004', 'Penerimaan Donasi Program',     'revenue', 'credit', 41, 3, '/4/41/4014', FALSE),
(4021, 1, '4.03.001', 'Hak Amil dari Zakat',           'revenue', 'credit', 42, 3, '/4/42/4021', FALSE),
-- Penyaluran Leaf
(5001, 1, '5.01.001', 'Penyaluran Fakir',              'expense', 'debit', 50, 3, '/5/50/5001', FALSE),
(5002, 1, '5.01.002', 'Penyaluran Miskin',             'expense', 'debit', 50, 3, '/5/50/5002', FALSE),
(5011, 1, '5.02.001', 'Penyaluran Beasiswa',           'expense', 'debit', 51, 3, '/5/51/5011', FALSE),
(5012, 1, '5.02.002', 'Penyaluran Kesehatan',          'expense', 'debit', 51, 3, '/5/51/5012', FALSE),
(5021, 1, '5.03.001', 'Biaya SDM Amil',                'expense', 'debit', 52, 3, '/5/52/5021', FALSE),
(5022, 1, '5.03.002', 'Biaya Operasional Kantor',      'expense', 'debit', 52, 3, '/5/52/5022', FALSE);

SELECT setval('coa_id_seq', 5022);
```

### Seed 5: Cost Centers, Funds & Programs

```sql
-- Cost Centers
INSERT INTO cost_centers (id, org_node_id, code, name, cc_level) VALUES
(1, 1, 'DIV-AMIL',     'Divisi Amil',               'divisi'),
(2, 1, 'DIV-OPS',      'Divisi Operasional',        'divisi'),
(3, 1, 'DEPT-PENGHIM', 'Departemen Penghimpunan',   'departemen'),
(4, 1, 'DEPT-PENYALUR','Departemen Penyaluran',     'departemen'),
(5, 1, 'DEPT-IT',      'Departemen IT & Sistem',    'departemen');

SELECT setval('cost_centers_id_seq', 5);

-- Funds (Dana)
INSERT INTO funds (id, org_node_id, fund_code, fund_name, fund_type, zakat_type, hard_lock) VALUES
(1, 1, 'ZM',   'Dana Zakat Maal',              'restricted',          'zakat_maal',  TRUE),
(2, 1, 'ZF',   'Dana Zakat Fitrah',            'restricted',          'zakat_fitrah',TRUE),
(3, 1, 'INF',  'Dana Infaq',                   'temporarily_restricted','infaq',     FALSE),
(4, 1, 'SDK',  'Dana Sedekah',                 'unrestricted',        'sedekah',     FALSE),
(5, 1, 'WKF',  'Dana Wakaf',                   'restricted',          'wakaf',       TRUE),
(6, 1, 'AMIL', 'Dana Amil / Operasional',      'unrestricted',        NULL,          FALSE),
(7, 1, 'PROG-KES','Dana Program Kesehatan',    'restricted',          'infaq',       TRUE),
(8, 1, 'PROG-BEA','Dana Program Beasiswa',     'restricted',          'infaq',       TRUE);

SELECT setval('funds_id_seq', 8);

-- Programs
INSERT INTO programs (id, org_node_id, fund_id, cost_center_id, program_code, program_name, pic_user_id, target_amount, period_start, period_end, status) VALUES
(1, 1, 7, 4, 'KES-2026',  'Program Kesehatan Gratis 2026',        5, 500000000,  '2026-01-01', '2026-12-31', 'active'),
(2, 1, 8, 4, 'BEA-2026',  'Program Beasiswa Yatim Dhuafa 2026',   5, 300000000,  '2026-01-01', '2026-12-31', 'active'),
(3, 1, 3, 4, 'INFAQ-MAJ', 'Program Infaq Masjid Bersinar',        5, 150000000,  '2026-01-01', '2026-12-31', 'active'),
(4, 1, 1, 4, 'ZM-DIST',   'Distribusi Zakat Maal Reguler',        5, 1000000000, '2026-01-01', '2026-12-31', 'active');

SELECT setval('programs_id_seq', 4);
```

### Seed 6: Bank Accounts

```sql
INSERT INTO bank_accounts (id, org_node_id, coa_id, bank_name, account_no, account_name, account_type, current_balance, min_balance) VALUES
(1, 1, 1010, 'Bank BRI',       '3305-01-234567-80', 'LAZ Percikan Iman - Penerimaan',  'tabungan', 850000000,  50000000),
(2, 1, 1011, 'BSI',            '7123456859',         'LAZ Percikan Iman Sedekahku',     'tabungan', 420000000,  30000000),
(3, 1, 1012, 'Bank Mandiri',   '132-00-0012345-6',   'LAZ Percikan Iman Sedekahku',     'giro',     2100000000, 100000000),
(4, 1, 1013, 'BCA Syariah',    '0354333999',         'LAZ Percikan Iman SMB',           'tabungan', 310000000,  25000000),
(5, 4, 1013, 'BSI',            '7198765432',         'LAZ Percikan Iman Daerah Bandung','tabungan', 125000000,  10000000),
(6, 5, 1012, 'Bank BRI',       '3305-01-987654-30',  'LAZ Percikan Iman Daerah Garut',  'tabungan', 65000000,   5000000);

SELECT setval('bank_accounts_id_seq', 6);
```

### Seed 7: Contacts (Donatur & Mustahiq)

```sql
INSERT INTO contacts (id, org_node_id, contact_type, name, email, phone_wa, is_muzakki, donor_tier, asnaf_category) VALUES
-- Donatur
(1,  1, 'donor', 'Risqi Berliandie R',      'risqi@email.com',       '081234560001', TRUE,  'gold',     NULL),
(2,  1, 'donor', 'Paragon Technology & Innovation', NULL,             '02112345678',  FALSE, 'platinum', NULL),
(3,  1, 'donor', 'H. Budiman Saleh',        'budiman@email.com',     '081234560003', TRUE,  'silver',   NULL),
(4,  1, 'donor', 'Yayasan Masjid Bersinar', 'masjid@email.com',      '02198765432',  FALSE, 'gold',     NULL),
(5,  1, 'donor', 'Anonim Online',            NULL,                    NULL,           FALSE, 'regular',  NULL),
(6,  1, 'donor', 'PT Maju Bersama',          NULL,                    '02211223344',  FALSE, 'platinum', NULL),
-- Mustahiq / Penerima
(10, 1, 'mustahiq', 'Pak Ahmad (Fakir)',     NULL,                    '081234560010', FALSE, NULL, 'fakir'),
(11, 1, 'mustahiq', 'Ibu Sari (Miskin)',     NULL,                    '081234560011', FALSE, NULL, 'miskin'),
(12, 1, 'mustahiq', 'Andi Santoso (Yatim)',  NULL,                    '081234560012', FALSE, NULL, 'miskin'),
(13, 1, 'mustahiq', 'Pesantren Al-Hidayah',  NULL,                    '081234560013', FALSE, NULL, 'fisabilillah'),
-- Vendor
(20, 1, 'vendor', 'CV Percetakan Amanah',   'cetak@amanah.com',      '022-9876543',  FALSE, 'regular',  NULL),
(21, 1, 'vendor', 'Apotek Sehat Selalu',     NULL,                    '022-8765432',  FALSE, 'regular',  NULL);

SELECT setval('contacts_id_seq', 21);
```

### Seed 8: Budgets / RAPB 2026

```sql
INSERT INTO budgets (id, org_node_id, coa_id, fund_id, program_id, period_year, period_month, amount, version, lock_mode, created_by) VALUES
-- Penerimaan Zakat Maal Jan-Mar 2026
(1,  1, 4001, 1, NULL, 2026, 1, 800000000,  1, 'soft', 2),
(2,  1, 4001, 1, NULL, 2026, 2, 850000000,  1, 'soft', 2),
(3,  1, 4001, 1, NULL, 2026, 3, 900000000,  1, 'soft', 2),
-- Penerimaan Infaq Jan-Mar 2026
(4,  1, 4011, 3, NULL, 2026, 1, 200000000,  1, 'soft', 2),
(5,  1, 4011, 3, NULL, 2026, 2, 200000000,  1, 'soft', 2),
(6,  1, 4011, 3, NULL, 2026, 3, 200000000,  1, 'soft', 2),
-- Penyaluran Program Kesehatan
(7,  1, 5012, 7, 1,    2026, 1, 40000000,   1, 'hard', 2),
(8,  1, 5012, 7, 1,    2026, 2, 40000000,   1, 'hard', 2),
(9,  1, 5012, 7, 1,    2026, 3, 40000000,   1, 'hard', 2),
-- Penyaluran Beasiswa
(10, 1, 5011, 8, 2,    2026, 1, 25000000,   1, 'hard', 2),
(11, 1, 5011, 8, 2,    2026, 2, 25000000,   1, 'hard', 2),
(12, 1, 5011, 8, 2,    2026, 3, 25000000,   1, 'hard', 2),
-- Biaya Operasional
(13, 1, 5021, 6, NULL, 2026, 1, 50000000,   1, 'soft', 2),
(14, 1, 5022, 6, NULL, 2026, 1, 30000000,   1, 'soft', 2);

SELECT setval('budgets_id_seq', 14);
```

### Seed 9: Closing Periods & Cutoff Config

```sql
-- Status closing per periode
INSERT INTO closing_periods (id, org_node_id, period_year, period_month, status, closed_by, closed_at) VALUES
(1, 1, 2026, 1, 'closed', 2, '2026-02-03 16:45:00+07'),
(2, 1, 2026, 2, 'closed', 2, '2026-03-02 14:30:00+07'),
(3, 1, 2026, 3, 'closed', 2, '2026-04-05 09:15:00+07'),
(4, 1, 2026, 4, 'closed', 2, '2026-05-04 11:00:00+07'),
(5, 1, 2026, 5, 'closed', 2, '2026-06-03 15:20:00+07'),
(6, 1, 2026, 6, 'closed', 2, '2026-07-02 10:10:00+07'),
(7, 1, 2026, 7, 'open',   NULL, NULL),
-- Daerah Bandung
(8, 4, 2026, 1, 'closed', 4, '2026-02-02 14:00:00+07'),
(9, 4, 2026, 7, 'open',   NULL, NULL);

SELECT setval('closing_periods_id_seq', 9);

-- Konfigurasi Cutoff
INSERT INTO closing_cutoff_config (id, org_node_id, cutoff_day, mode, override_role, effective_from, created_by) VALUES
(1, 1, 5, 'approval', 'super_admin', '2026-01-01', 1),  -- Pusat: cutoff tgl 5, mode approval
(2, 2, 5, 'strict',   'super_admin', '2026-01-01', 1),  -- Wilayah JBR: strict
(3, 4, 3, 'strict',   'super_admin', '2026-01-01', 3),  -- Daerah Bandung: cutoff tgl 3 strict
(4, 5, 3, 'strict',   'super_admin', '2026-01-01', 3);  -- Daerah Garut: cutoff tgl 3 strict

SELECT setval('closing_cutoff_config_id_seq', 4);
```

### Seed 10: Registers & Journals (Januari 2026)

```sql
-- ── Register: Donasi masuk Jan 2026 ────────────────────────────────────────
INSERT INTO registers (id, org_node_id, register_no, register_type, status, total_amount, fund_id, contact_id, bank_account_id, txn_date, description, created_by, approved_by, posted_by, posted_at, is_locked)
VALUES
(1, 4, 'TRX/2026/01/0001', 'donasi', 'posted', 300000,   3, 1, 5, '2026-01-16', 'Infaq Masjid Bersinar - Risqi',    5, 3, 4, '2026-01-16 10:00:00+07', TRUE),
(2, 4, 'TRX/2026/01/0002', 'donasi', 'posted', 200000,   3, 1, 5, '2026-02-10', 'Infaq Ramadhan - Risqi',            5, 3, 4, '2026-02-10 09:30:00+07', TRUE),
(3, 1, 'TRX/2026/01/0003', 'donasi', 'posted', 1700000,  1, 2, 1, '2026-05-11', 'Zakat Maal - Paragon Technology',   5, 3, 2, '2026-05-11 11:00:00+07', TRUE),
(4, 4, 'TRX/2026/01/0004', 'donasi', 'posted', 300000,   3, 4, 5, '2026-05-05', 'Infaq Masjid Bersinar - Yayasan',   5, 3, 4, '2026-05-05 13:00:00+07', TRUE),
(5, 4, 'TRX/2026/06/0001', 'donasi', 'posted', 300000,   3, 1, 5, '2026-06-04', 'Infaq Masjid Bersinar - Risqi',    5, 3, 4, '2026-06-04 10:00:00+07', TRUE),
-- Register distribusi
(6, 1, 'TRX/2026/01/0010', 'distribusi', 'posted', 5000000, 1, 10, 3, '2026-01-20', 'Distribusi ZM Fakir Jan 2026', 5, 7, 2, '2026-01-20 14:00:00+07', TRUE),
(7, 1, 'TRX/2026/01/0011', 'distribusi', 'posted', 3000000, 1, 11, 3, '2026-01-20', 'Distribusi ZM Miskin Jan 2026',5, 7, 2, '2026-01-20 14:00:00+07', TRUE),
-- Register Cash Advance
(8, 1, 'TRX/2026/01/0020', 'ca_pencairan','posted',2000000, 6, NULL,3, '2026-01-05', 'CA Operasional Amil - Ahmad',  2, 7, 2, '2026-01-05 09:00:00+07', TRUE);

SELECT setval('registers_id_seq', 8);
```

### Seed 11: Journals & Journal Items

```sql
-- Journal: Penerimaan Donasi Infaq (Register 1)
INSERT INTO journals (id, org_node_id, register_id, journal_no, journal_date, period_year, period_month, description, journal_type, is_posted, posted_at, posted_by, is_locked, total_debit, total_credit, created_by)
VALUES
(1, 4, 1, 'JRN/2026/01/0001', '2026-01-16', 2026, 1, 'Penerimaan Infaq Masjid Bersinar - Risqi', 'penerimaan', TRUE, '2026-01-16 10:00:00+07', 4, TRUE, 300000, 300000, 5),
(2, 4, 2, 'JRN/2026/02/0001', '2026-02-10', 2026, 2, 'Penerimaan Infaq Ramadhan - Risqi',         'penerimaan', TRUE, '2026-02-10 09:30:00+07', 4, TRUE, 200000, 200000, 5),
(3, 1, 3, 'JRN/2026/05/0001', '2026-05-11', 2026, 5, 'Penerimaan Zakat Maal - Paragon',           'penerimaan', TRUE, '2026-05-11 11:00:00+07', 2, TRUE, 1700000, 1700000, 5),
(4, 4, 4, 'JRN/2026/05/0002', '2026-05-05', 2026, 5, 'Penerimaan Infaq - Yayasan Masjid',         'penerimaan', TRUE, '2026-05-05 13:00:00+07', 4, TRUE, 300000, 300000, 5),
(5, 4, 5, 'JRN/2026/06/0001', '2026-06-04', 2026, 6, 'Penerimaan Infaq Masjid - Risqi',           'penerimaan', TRUE, '2026-06-04 10:00:00+07', 4, TRUE, 300000, 300000, 5),
-- Journal Distribusi
(6, 1, 6, 'JRN/2026/01/0010', '2026-01-20', 2026, 1, 'Distribusi Zakat Maal - Fakir',             'pengeluaran', TRUE, '2026-01-20 14:00:00+07', 2, TRUE, 5000000, 5000000, 5),
(7, 1, 7, 'JRN/2026/01/0011', '2026-01-20', 2026, 1, 'Distribusi Zakat Maal - Miskin',            'pengeluaran', TRUE, '2026-01-20 14:00:00+07', 2, TRUE, 3000000, 3000000, 5),
-- Journal Cash Advance
(8, 1, 8, 'JRN/2026/01/0020', '2026-01-05', 2026, 1, 'Pencairan Cash Advance - Ahmad Fauzi',      'pengeluaran', TRUE, '2026-01-05 09:00:00+07', 2, TRUE, 2000000, 2000000, 2);

SELECT setval('journals_id_seq', 8);

-- Journal Items (setiap debit harus ada kredit pasangannya)
INSERT INTO journal_items (id, journal_id, org_node_id, coa_id, fund_id, program_id, debit, credit, narration, line_order)
VALUES
-- JRN 1: Infaq Masjid Bersinar masuk ke BSI Daerah Bandung
(1,  1, 4, 1013, 3, 3, 300000, 0,      'Penerimaan infaq ke rek BSI Daerah Bandung', 1),
(2,  1, 4, 4011, 3, 3, 0,      300000, 'Penerimaan Infaq - Masjid Bersinar',          2),
-- JRN 2: Infaq Ramadhan
(3,  2, 4, 1013, 3, 3, 200000, 0,      'Penerimaan infaq Ramadhan ke BSI Bandung', 1),
(4,  2, 4, 4014, 3, 3, 0,      200000, 'Penerimaan Infaq Program Ramadhan',         2),
-- JRN 3: Zakat Maal Paragon - ke BRI Pusat
(5,  3, 1, 1010, 1, 4, 1700000,0,      'Penerimaan ZM Paragon ke BRI Pusat',       1),
(6,  3, 1, 4001, 1, 4, 0,      1700000,'Penerimaan Zakat Maal',                     2),
-- JRN 4: Infaq Yayasan Masjid Bersinar
(7,  4, 4, 1013, 3, 3, 300000, 0,      'Penerimaan infaq yayasan ke BSI Bandung',  1),
(8,  4, 4, 4011, 3, 3, 0,      300000, 'Penerimaan Infaq - Yayasan Masjid',         2),
-- JRN 5: Infaq Masjid - Jun 2026
(9,  5, 4, 1013, 3, 3, 300000, 0,      'Penerimaan infaq Jun ke BSI Bandung',      1),
(10, 5, 4, 4011, 3, 3, 0,      300000, 'Penerimaan Infaq Masjid Bersinar',          2),
-- JRN 6: Distribusi Fakir
(11, 6, 1, 5001, 1, 4, 5000000,0,      'Penyaluran ZM kepada Fakir',               1),
(12, 6, 1, 1012, 1, 4, 0,      5000000,'Pembayaran via Bank Mandiri',               2),
-- JRN 7: Distribusi Miskin
(13, 7, 1, 5002, 1, 4, 3000000,0,      'Penyaluran ZM kepada Miskin',              1),
(14, 7, 1, 1012, 1, 4, 0,      3000000,'Pembayaran via Bank Mandiri',               2),
-- JRN 8: Pencairan CA
(15, 8, 1, 1001, 6, NULL, 0,    2000000,'Kas keluar untuk CA Ahmad Fauzi',          1),
(16, 8, 1, 1001, 6, NULL, 2000000, 0,  'Piutang CA Ahmad Fauzi',                   2);

SELECT setval('journal_items_id_seq', 16);
```

### Seed 12: Donations & Distributions

```sql
INSERT INTO donations (id, org_node_id, register_id, donor_id, fund_id, program_id, donation_date, amount, channel, payment_ref, bank_account_id, receipt_no, created_by)
VALUES
(1, 4, 1, 1, 3, 3, '2026-01-16', 300000,  'transfer', 'BCA-2026011601', 5, 'RCP/2026/01/001', 5),
(2, 4, 2, 1, 3, 3, '2026-02-10', 200000,  'transfer', 'BCA-2026021001', 5, 'RCP/2026/02/001', 5),
(3, 1, 3, 2, 1, 4, '2026-05-11', 1700000, 'transfer', 'BRI-2026051101', 1, 'RCP/2026/05/001', 5),
(4, 4, 4, 4, 3, 3, '2026-05-05', 300000,  'transfer', 'BCA-2026050501', 5, 'RCP/2026/05/002', 5),
(5, 4, 5, 1, 3, 3, '2026-06-04', 300000,  'transfer', 'BCA-2026060401', 5, 'RCP/2026/06/001', 5);

SELECT setval('donations_id_seq', 5);

INSERT INTO distributions (id, org_node_id, register_id, program_id, fund_id, recipient_id, dist_date, amount, dist_type, asnaf_category, bank_account_id, sk_no, created_by)
VALUES
(1, 1, 6, 4, 1, 10, '2026-01-20', 5000000, 'transfer', 'fakir',  3, 'SK/DIST/2026/01/001', 5),
(2, 1, 7, 4, 1, 11, '2026-01-20', 3000000, 'transfer', 'miskin', 3, 'SK/DIST/2026/01/002', 5);

SELECT setval('distributions_id_seq', 2);
```

### Seed 13: Cash Advance

```sql
INSERT INTO cash_advances (id, org_node_id, register_id, requested_by, cost_center_id, fund_id, ca_no, purpose, amount_requested, amount_disbursed, amount_realized, status, need_date, disbursed_at, ljp_submitted_at, settled_at)
VALUES
(1, 1, 8, 1, 2, 6, 'CA/2026/01/001', 'Operasional Event Sosialisasi ZIS Januari 2026', 2000000, 2000000, 1850000, 'settled', '2026-01-05', '2026-01-05 09:00:00+07', '2026-01-15 16:00:00+07', '2026-01-16 09:00:00+07');

SELECT setval('cash_advances_id_seq', 1);

INSERT INTO ca_items (id, ca_id, coa_id, description, amount)
VALUES
(1, 1, 5022, 'Sewa gedung sosialisasi',  750000),
(2, 1, 5022, 'Konsumsi peserta 50 orang',550000),
(3, 1, 5022, 'Bahan presentasi & ATK',   350000),
(4, 1, 5022, 'Transportasi panitia',     200000);

SELECT setval('ca_items_id_seq', 4);
```

### Seed 14: Assets

```sql
INSERT INTO assets (id, org_node_id, coa_id, accum_depr_coa_id, depr_expense_coa_id, cost_center_id, asset_code, asset_name, category, purchase_date, purchase_value, salvage_value, useful_life_months, depr_method, accumulated_depr, book_value, status, location)
VALUES
(1, 1, 110, 111, 5022, 2, 'AST/IT/2024/001', 'Laptop Dell Latitude 5420',    'peralatan_it',    '2024-01-15', 18500000, 500000, 48, 'SL', 8250000,  10250000, 'active', 'Kantor Pusat Bandung'),
(2, 1, 110, 111, 5022, 2, 'AST/IT/2024/002', 'Server NAS Synology DS923+',   'peralatan_it',    '2024-03-01', 25000000, 1000000,60, 'SL', 9600000,  15400000, 'active', 'Server Room Pusat'),
(3, 1, 110, 111, 5022, 2, 'AST/KEN/2023/001','Toyota Innova 2023',           'kendaraan',       '2023-06-01', 380000000,20000000,72,'SL', 100000000,280000000,'active', 'Pool Kendaraan Pusat'),
(4, 4, 110, 111, 5022, 3, 'AST/IT/2025/001', 'Laptop Lenovo ThinkPad E14',   'peralatan_it',    '2025-01-10', 14000000, 500000, 48, 'SL', 3208333,  10791667, 'active', 'Kantor Daerah Bandung');

SELECT setval('assets_id_seq', 4);

-- Penyusutan sample (Jan 2026)
INSERT INTO asset_depreciations (id, asset_id, journal_id, period_year, period_month, depr_amount, book_value_after) VALUES
(1, 1, NULL, 2026, 1, 375000,   9875000),
(2, 2, NULL, 2026, 1, 400000,   15000000),
(3, 3, NULL, 2026, 1, 5000000,  275000000),
(4, 4, NULL, 2026, 1, 260417,   10531250);

SELECT setval('asset_depreciations_id_seq', 4);
```

### Seed 15: Bank Statements & Rekonsiliasi

```sql
INSERT INTO bank_statements (id, bank_account_id, org_node_id, txn_date, amount, description, source_ref, import_batch_id, status)
VALUES
(1, 5, 4, '2026-01-16', 300000,  'TRF RISQI BERLIANDIE R MASJID BERSINAR',          'BCA-20260116-001', 'IMP-2026-01-BDG', 'matched'),
(2, 5, 4, '2026-02-10', 200000,  'TRF RISQI BERLIANDIE R MASJID BERSINAR RAMADHAN', 'BCA-20260210-001', 'IMP-2026-02-BDG', 'matched'),
(3, 1, 1, '2026-05-11', 1700000, 'PARAGON TECHNOLOGY & INNOVATION 0599102266',       'BRI-20260511-001', 'IMP-2026-05-PST', 'matched'),
(4, 5, 4, '2026-05-05', 300000,  'TRF RISQI BERLIANDIE R MASJID BERSINAR',          'BCA-20260505-001', 'IMP-2026-05-BDG', 'matched'),
(5, 5, 4, '2026-06-04', 300000,  'TRF RISQI BERLIANDIE R MASJID BERSINAR',          'BCA-20260604-001', 'IMP-2026-06-BDG', 'matched'),
-- Unmatched (belum dicocokkan)
(6, 3, 1, '2026-07-01', 5000000, 'TRF ANONIM SEDEKAH',                               'MDR-20260701-001', 'IMP-2026-07-PST', 'unmatched');

SELECT setval('bank_statements_id_seq', 6);

-- Recon matches untuk yang sudah matched
INSERT INTO recon_matches (id, bank_statement_id, journal_item_id, match_type, confidence_pct, matched_by, matched_at)
VALUES
(1, 1, 1,  'auto',   98, NULL, '2026-01-17 08:00:00+07'),
(2, 2, 3,  'auto',   97, NULL, '2026-02-11 08:00:00+07'),
(3, 3, 5,  'manual', 100, 2,   '2026-05-12 09:00:00+07'),
(4, 4, 7,  'auto',   99, NULL, '2026-05-06 08:00:00+07'),
(5, 5, 9,  'auto',   99, NULL, '2026-06-05 08:00:00+07');

SELECT setval('recon_matches_id_seq', 5);
```

### Seed 16: Budget Actuals (Cache Realisasi)

```sql
-- Realisasi vs Budget Jan 2026
INSERT INTO budget_actuals (id, budget_id, actual_amount, as_of_date) VALUES
(1, 1,  1700000, '2026-01-31'),   -- Penerimaan ZM Jan: budget 800jt, realisasi baru 1.7jt (seed terbatas)
(2, 7,  5000000, '2026-01-31'),   -- Penyaluran Kesehatan Jan: realisasi 5jt dari budget 40jt
(3, 10, 3000000, '2026-01-31');   -- Penyaluran Miskin (beasiswa slot) Jan

SELECT setval('budget_actuals_id_seq', 3);
```

### Seed 17: Notifications Sample

```sql
INSERT INTO notifications (id, org_node_id, user_id, notif_type, channel, title, body, ref_entity_type, ref_entity_id, is_read, sent_at)
VALUES
(1, 1, 7, 'approval_request', 'whatsapp', 'Persetujuan Register Diperlukan',
   'Register TRX/2026/01/0010 senilai Rp 5.000.000 menunggu persetujuan Anda.', 'register', 6, TRUE, '2026-01-20 13:55:00+07'),
(2, 1, 2, 'cutoff_reminder',  'in_app',   'Pengingat Closing: 3 Hari Lagi',
   'Batas Closing periode Juni 2026 adalah 5 Jul 2026 (3 hari lagi). Segera lakukan penutupan buku.', 'closing_periods', 6, TRUE, '2026-07-02 07:00:00+07'),
(3, 4, 4, 'cutoff_reminder',  'whatsapp', 'Pengingat Closing Daerah Bandung',
   'Batas Closing periode Juni 2026 adalah 3 Jul 2026 (1 hari lagi). Segera lakukan penutupan buku.', 'closing_periods', 9, FALSE, '2026-07-02 07:00:00+07'),
(4, 1, 2, 'low_balance',      'in_app',   'Saldo Rekening Mendekati Batas Minimum',
   'Saldo BRI Penerimaan 3305 mendekati batas minimum Rp 50.000.000.', 'bank_accounts', 1, FALSE, NOW());

SELECT setval('notifications_id_seq', 4);
```

### Seed 18: Audit Log Sample

```sql
INSERT INTO audit_logs (id, org_node_id, user_id, action, entity_type, entity_id, after_json, ip_address, created_at)
VALUES
(1, 1, 1, 'CREATE', 'closing_cutoff_config', 1, '{"cutoff_day":5,"mode":"approval"}', '192.168.1.10', '2026-01-01 08:00:00+07'),
(2, 4, 4, 'POST',   'journal',  1, '{"journal_no":"JRN/2026/01/0001","total":300000}', '192.168.1.14', '2026-01-16 10:00:00+07'),
(3, 1, 2, 'CLOSE',  'closing_periods', 1, '{"period":"2026-01","status":"closed"}',  '192.168.1.11', '2026-02-03 16:45:00+07'),
(4, 1, 2, 'CLOSE',  'closing_periods', 2, '{"period":"2026-02","status":"closed"}',  '192.168.1.11', '2026-03-02 14:30:00+07'),
(5, 4, 5, 'CREATE', 'donation', 1, '{"amount":300000,"fund":"INF","donor_id":1}',    '192.168.1.15', '2026-01-16 09:50:00+07');
```

---

## VIEWS PENTING (Opsional — untuk Trial Balance & Laporan)

```sql
-- ============================================================
-- VIEW: Trial Balance per node per periode
-- ============================================================
CREATE OR REPLACE VIEW v_trial_balance AS
SELECT
    j.org_node_id,
    j.period_year,
    j.period_month,
    ji.coa_id,
    c.account_code,
    c.account_name,
    c.account_type,
    c.normal_balance,
    c.coa_level,
    c.parent_id,
    SUM(ji.debit)  AS total_debit,
    SUM(ji.credit) AS total_credit,
    CASE c.normal_balance
        WHEN 'debit'  THEN SUM(ji.debit)  - SUM(ji.credit)
        WHEN 'credit' THEN SUM(ji.credit) - SUM(ji.debit)
    END            AS neraca_saldo
FROM journal_items ji
JOIN journals j       ON ji.journal_id  = j.id AND j.is_posted = TRUE
JOIN coa c            ON ji.coa_id      = c.id
GROUP BY j.org_node_id, j.period_year, j.period_month, ji.coa_id,
         c.account_code, c.account_name, c.account_type, c.normal_balance, c.coa_level, c.parent_id;

-- ============================================================
-- VIEW: Saldo per akun (kumulatif seluruh periode)
-- ============================================================
CREATE OR REPLACE VIEW v_account_balance AS
SELECT
    ji.org_node_id,
    ji.coa_id,
    c.account_code,
    c.account_name,
    c.account_type,
    c.normal_balance,
    SUM(ji.debit)  AS total_debit,
    SUM(ji.credit) AS total_credit,
    CASE c.normal_balance
        WHEN 'debit'  THEN SUM(ji.debit)  - SUM(ji.credit)
        WHEN 'credit' THEN SUM(ji.credit) - SUM(ji.debit)
    END AS saldo
FROM journal_items ji
JOIN journals j ON ji.journal_id = j.id AND j.is_posted = TRUE
JOIN coa c      ON ji.coa_id     = c.id
GROUP BY ji.org_node_id, ji.coa_id, c.account_code, c.account_name, c.account_type, c.normal_balance;

-- ============================================================
-- VIEW: Donasi per fund per bulan (high-traffic dashboard)
-- ============================================================
CREATE OR REPLACE VIEW v_donation_summary AS
SELECT
    d.org_node_id,
    date_trunc('month', d.donation_date)::DATE AS period_month,
    d.fund_id,
    f.fund_name,
    f.zakat_type,
    COUNT(*)           AS total_transaksi,
    SUM(d.amount)      AS total_amount
FROM donations d
JOIN funds f ON d.fund_id = f.id
GROUP BY d.org_node_id, date_trunc('month', d.donation_date), d.fund_id, f.fund_name, f.zakat_type;

-- ============================================================
-- VIEW: CA Aging (Outstanding belum LPJ)
-- ============================================================
CREATE OR REPLACE VIEW v_ca_aging AS
SELECT
    ca.org_node_id,
    ca.id,
    ca.ca_no,
    u.full_name    AS requester_name,
    ca.amount_requested,
    ca.need_date,
    ca.status,
    ca.overdue_days,
    CASE
        WHEN ca.overdue_days = 0  THEN 'current'
        WHEN ca.overdue_days <= 7 THEN '1-7 hari'
        WHEN ca.overdue_days <= 14THEN '8-14 hari'
        WHEN ca.overdue_days <= 30THEN '15-30 hari'
        ELSE '>30 hari'
    END AS aging_bucket
FROM cash_advances ca
JOIN users u ON ca.requested_by = u.id
WHERE ca.status NOT IN ('settled','cancelled');
```

---

## RINGKASAN TABEL

| # | Tabel | Baris Seed | Keterangan |
|---|-------|-----------|------------|
| 1 | `org_nodes` | 6 | Pusat + 2 Wilayah + 3 Daerah |
| 2 | `roles` | 6 | System roles LAZ |
| 3 | `permissions` | 15 | Permission per modul |
| 4 | `role_permissions` | 36 | Matrix role-permission |
| 5 | `users` | 7 | User lintas node |
| 6 | `user_roles` | 7 | Scope own/region/all |
| 7 | `coa` | ~40 | COA PSAK 109 hingga level 4 |
| 8 | `cost_centers` | 5 | Divisi & Departemen |
| 9 | `funds` | 8 | Zakat/Infaq/Sedekah/Wakaf/Amil/Program |
| 10 | `programs` | 4 | Program aktif 2026 |
| 11 | `bank_accounts` | 6 | Multi-rekening Pusat & Daerah |
| 12 | `contacts` | 13 | Donatur, Mustahiq, Vendor |
| 13 | `budgets` | 14 | RAPB Jan-Mar 2026 |
| 14 | `closing_periods` | 9 | Status closing per node |
| 15 | `closing_cutoff_config` | 4 | Config cutoff per node |
| 16 | `registers` | 8 | Transaksi sample |
| 17 | `journals` | 8 | Header jurnal |
| 18 | `journal_items` | 16 | Debit/kredit (balance verified) |
| 19 | `donations` | 5 | Donasi berkorelasi ke register & journal |
| 20 | `distributions` | 2 | Distribusi ZM |
| 21 | `cash_advances` | 1 | CA settled |
| 22 | `ca_items` | 4 | Rincian LPJ |
| 23 | `assets` | 4 | Aset Pusat & Bandung |
| 24 | `asset_depreciations` | 4 | Penyusutan Jan 2026 |
| 25 | `bank_statements` | 6 | Import mutasi bank |
| 26 | `recon_matches` | 5 | Hasil rekonsiliasi |
| 27 | `budget_actuals` | 3 | Cache realisasi |
| 28 | `notifications` | 4 | Sample notifikasi |
| 29 | `audit_logs` | 5 | Log aktivitas |

**Total FK chains terverifikasi:**
`org_nodes` → `users` → `user_roles` → `roles` → `permissions`
`coa` → `bank_accounts` → `registers` → `journals` → `journal_items`
`funds` → `programs` → `donations` → `distributions`
`budgets` → `budget_actuals` → `cash_advances` → `ca_items`
`assets` → `asset_depreciations`
`bank_statements` → `recon_matches` → `journal_items`
`closing_periods` → `closing_cutoff_config` → `closing_override_log`
`registers` → `approval_flows`
`notifications` → `audit_logs`
