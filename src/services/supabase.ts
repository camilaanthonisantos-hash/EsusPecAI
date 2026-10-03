import { createClient } from '@supabase/supabase-js';
import { Patient, Consultation, KnowledgeItem, User, SystemSettings, Appointment, ReceptionQueueItem, EvolutionSummary, ExamMediaReportData, SubscriptionPlan, SubscriptionRecord, PixTransactionRecord } from '../types';

export const SUPABASE_URL = 'https://ejsvpdecoxqqebipybiz.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqc3ZwZGVjb3hxcWViaXB5Yml6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwNDU2ODksImV4cCI6MjEwNjYyMTY4OX0.hHUtEMBw74ycPw4rhwnnMVKZkdJJ_i8LorifxAyrD4E';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Test connection to Supabase
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('system_settings').select('*').limit(1);
    // Even if table doesn't exist yet, connection responds
    return !error || error.code === 'PGRST116' || error.code === '42P01';
  } catch {
    return false;
  }
}

// Full SQL script to initialize tables in Supabase SQL editor if user wants full relational structure
export const SUPABASE_SETUP_SQL = `
-- TABELAS PRINCIPAIS DO E-SUS PEC MULTIPROFISSIONAL (SUPABASE POSTGRESQL)

-- 1. Usuários e Profissionais
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  role TEXT DEFAULT 'user',
  profession TEXT,
  council_register TEXT,
  specialty TEXT,
  workplace TEXT,
  subscription_status TEXT DEFAULT 'free',
  subscription_expires_at BIGINT,
  plan_name TEXT,
  free_used BOOLEAN DEFAULT false,
  raw_data JSONB,
  created_at BIGINT,
  updated_at BIGINT
);

-- 2. Pacientes
CREATE TABLE IF NOT EXISTS public.patients (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  cpf TEXT,
  cns TEXT,
  phone TEXT,
  birth_date TEXT,
  gender TEXT,
  mother_name TEXT,
  address TEXT,
  balance NUMERIC(10, 2) DEFAULT 0,
  raw_data JSONB,
  created_at BIGINT,
  updated_at BIGINT
);

-- 3. Consultas e Prontuários (PEC SOAP)
CREATE TABLE IF NOT EXISTS public.consultations (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  patient_name TEXT,
  author TEXT,
  profession TEXT,
  date TEXT,
  timestamp BIGINT,
  avaliacao TEXT,
  plano TEXT,
  conduta TEXT,
  raw_notes TEXT,
  ciap2 TEXT,
  cid10 TEXT,
  diagnostic_hypothesis TEXT,
  vital_signs JSONB,
  prescription JSONB,
  exam_request JSONB,
  referral JSONB,
  medical_report JSONB,
  attendance_certificate JSONB,
  pts JSONB,
  raw_data JSONB,
  created_at BIGINT,
  updated_at BIGINT
);

-- 4. Evolução Longitudinal (IA)
CREATE TABLE IF NOT EXISTS public.clinical_evolutions (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  patient_name TEXT,
  generated_at BIGINT,
  model_used TEXT,
  resumo_longitudinal TEXT,
  condicoes_saude JSONB,
  farmacoterapia JSONB,
  trajetoria_clinica JSONB,
  matriz_evolucao JSONB,
  condutas_realizadas JSONB,
  faltas_e_abandonos JSONB,
  pontos_alerta_recomendacoes JSONB,
  raw_markdown TEXT,
  raw_data JSONB
);

-- 5. Agendamentos
CREATE TABLE IF NOT EXISTS public.appointments (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  patient_name TEXT,
  patient_phone TEXT,
  patient_email TEXT,
  patient_cpf TEXT,
  professional_id TEXT,
  professional_name TEXT,
  professional_profession TEXT,
  date TEXT,
  start_time TEXT,
  end_time TEXT,
  service_name TEXT,
  service_price NUMERIC(10, 2) DEFAULT 0,
  payment_method TEXT,
  payment_status TEXT,
  status TEXT DEFAULT 'agendado',
  notifications JSONB,
  raw_data JSONB,
  created_at BIGINT,
  updated_at BIGINT
);

-- 6. Fila de Acolhimento e Recepção
CREATE TABLE IF NOT EXISTS public.reception_queue (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  patient_name TEXT,
  patient_cpf TEXT,
  patient_cns TEXT,
  risk_priority TEXT DEFAULT 'verde',
  risk_category TEXT,
  status TEXT DEFAULT 'waiting',
  timestamp BIGINT,
  called_at BIGINT,
  attended_at BIGINT,
  professional_name TEXT,
  room_name TEXT,
  raw_data JSONB,
  created_at BIGINT,
  updated_at BIGINT
);

-- 7. Configurações Globais do Sistema
CREATE TABLE IF NOT EXISTS public.system_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  data JSONB,
  updated_at BIGINT
);

-- 8. Assinaturas e Transações PIX
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  order_id TEXT,
  user_name TEXT,
  email TEXT,
  plan_id TEXT,
  plan_name TEXT,
  amount NUMERIC(10, 2),
  status TEXT,
  pix_copia_e_cola TEXT,
  pix_qr_code TEXT,
  pix_id TEXT,
  expires_at BIGINT,
  created_at BIGINT,
  updated_at BIGINT,
  raw_data JSONB
);

-- Habilitar RLS e permitir operações públicas para a chave anon
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_evolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reception_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all anon for users" ON public.users FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all anon for patients" ON public.patients FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all anon for consultations" ON public.consultations FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all anon for clinical_evolutions" ON public.clinical_evolutions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all anon for appointments" ON public.appointments FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all anon for reception_queue" ON public.reception_queue FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all anon for system_settings" ON public.system_settings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all anon for subscriptions" ON public.subscriptions FOR ALL TO anon USING (true) WITH CHECK (true);
`;
