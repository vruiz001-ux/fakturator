-- Fakturator Supabase Schema
-- Run this in Supabase SQL Editor to create all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Organizations ───────────────────────────────────────
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'PL',
  nip TEXT,
  regon TEXT,
  krs TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  bank_name TEXT,
  bank_account TEXT,
  bank_swift TEXT,
  bank_iban TEXT,
  default_currency TEXT DEFAULT 'EUR',
  default_vat_rate NUMERIC DEFAULT 23,
  default_payment_days INTEGER DEFAULT 14,
  logo_url TEXT,
  invoice_number_format TEXT DEFAULT 'FV/{YYYY}/{MM}/{NNN}',
  invoice_footer TEXT,
  -- Subscription
  stripe_customer_id TEXT,
  subscription_status TEXT DEFAULT 'free', -- free, active, past_due, cancelled
  subscription_plan TEXT DEFAULT 'free', -- free, pro
  subscription_ends_at TIMESTAMPTZ,
  -- Source tracking
  source_type TEXT, -- KRS, NIP, MANUAL
  source_id TEXT,
  source_fetched_at TIMESTAMPTZ,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── User Profiles (extends Supabase auth.users) ────────
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  email TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'owner', -- owner, admin, member, viewer
  ninja_api_url TEXT,
  ninja_api_token_encrypted TEXT,
  display_currency TEXT DEFAULT 'EUR',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Clients ─────────────────────────────────────────────
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'PL',
  nip TEXT,
  contact_person TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  invoice_email TEXT,
  finance_email TEXT,
  auto_send_invoices BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Services ────────────────────────────────────────────
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  default_rate NUMERIC,
  default_unit TEXT DEFAULT 'SERVICE',
  default_vat_rate NUMERIC DEFAULT 23,
  category TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Invoices ────────────────────────────────────────────
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id),
  invoice_number TEXT NOT NULL,
  type TEXT DEFAULT 'VAT',
  status TEXT DEFAULT 'DRAFT',
  issue_date DATE DEFAULT CURRENT_DATE,
  sale_date DATE,
  due_date DATE NOT NULL,
  payment_method TEXT DEFAULT 'BANK_TRANSFER',
  currency TEXT DEFAULT 'EUR',
  subtotal NUMERIC DEFAULT 0,
  vat_total NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  notes TEXT,
  -- KSeF
  ksef_reference_id TEXT,
  ksef_status TEXT,
  ksef_submitted_at TIMESTAMPTZ,
  -- Ninja source
  ninja_id TEXT,
  ninja_number TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, invoice_number)
);

-- ─── Invoice Items ───────────────────────────────────────
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id),
  description TEXT NOT NULL,
  quantity NUMERIC DEFAULT 1,
  unit TEXT DEFAULT 'SERVICE',
  unit_price NUMERIC NOT NULL,
  vat_rate NUMERIC DEFAULT 23,
  net_amount NUMERIC NOT NULL,
  vat_amount NUMERIC NOT NULL,
  gross_amount NUMERIC NOT NULL,
  sort_order INTEGER DEFAULT 0
);

-- ─── Payments ────────────────────────────────────────────
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  method TEXT DEFAULT 'BANK_TRANSFER',
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Expenses ────────────────────────────────────────────
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id),
  category TEXT,
  description TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  net_amount NUMERIC NOT NULL,
  vat_rate NUMERIC DEFAULT 23,
  vat_amount NUMERIC NOT NULL,
  gross_amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'EUR',
  is_billable BOOLEAN DEFAULT FALSE,
  is_rebilled BOOLEAN DEFAULT FALSE,
  is_foreign_currency BOOLEAN DEFAULT FALSE,
  fx_rate NUMERIC,
  fx_uplift_percent NUMERIC,
  fx_final_amount NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Audit Log ───────────────────────────────────────────
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Email Events ────────────────────────────────────────
CREATE TABLE invoice_email_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'PENDING',
  recipients TEXT[] DEFAULT '{}',
  subject TEXT,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ─────────────────────────────────────────────
CREATE INDEX idx_profiles_org ON profiles(organization_id);
CREATE INDEX idx_clients_org ON clients(organization_id);
CREATE INDEX idx_services_org ON services(organization_id);
CREATE INDEX idx_invoices_org ON invoices(organization_id);
CREATE INDEX idx_invoices_client ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_date ON invoices(issue_date);
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_expenses_org ON expenses(organization_id);
CREATE INDEX idx_audit_org ON audit_logs(organization_id);
CREATE INDEX idx_email_events_invoice ON invoice_email_events(invoice_id);

-- ─── Row Level Security ──────────────────────────────────
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_email_events ENABLE ROW LEVEL SECURITY;

-- Policies: users can only access their organization's data
CREATE POLICY "Users access own org" ON organizations
  FOR ALL USING (id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users access own profile" ON profiles
  FOR ALL USING (id = auth.uid());

CREATE POLICY "Users access org clients" ON clients
  FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users access org services" ON services
  FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users access org invoices" ON invoices
  FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users access invoice items" ON invoice_items
  FOR ALL USING (invoice_id IN (SELECT id FROM invoices WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Users access org payments" ON payments
  FOR ALL USING (invoice_id IN (SELECT id FROM invoices WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Users access org expenses" ON expenses
  FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users access org audit" ON audit_logs
  FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users access org emails" ON invoice_email_events
  FOR ALL USING (invoice_id IN (SELECT id FROM invoices WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())));

-- ─── Functions ───────────────────────────────────────────

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
