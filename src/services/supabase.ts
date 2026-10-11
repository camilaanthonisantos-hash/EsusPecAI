import { createClient } from '@supabase/supabase-js';
import { Patient, Consultation, KnowledgeItem, User, SystemSettings, Appointment, ReceptionQueueItem, EvolutionSummary, ExamMediaReportData, SubscriptionPlan, SubscriptionRecord, PixTransactionRecord, WhatsAppMessage } from '../types';

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

-- 9. Mensagens do CRM WhatsApp e Webhook
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id TEXT PRIMARY KEY,
  appointment_id TEXT,
  patient_id TEXT,
  patient_phone TEXT NOT NULL,
  patient_name TEXT,
  direction TEXT NOT NULL,          -- 'outbound' ou 'inbound'
  sender_type TEXT NOT NULL,        -- 'system', 'patient', 'professional'
  sender_name TEXT,
  message_text TEXT NOT NULL,
  message_type TEXT DEFAULT 'text', -- 'text', 'template', 'button_response'
  status TEXT DEFAULT 'sent',       -- 'sent', 'delivered', 'read', 'replied', 'pending'
  created_at BIGINT NOT NULL,
  raw_payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone ON public.whatsapp_messages (patient_phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_appt ON public.whatsapp_messages (appointment_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created ON public.whatsapp_messages (created_at DESC);

-- Habilitar RLS e permitir operações públicas para a chave anon
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_evolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reception_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all anon for users" ON public.users FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all anon for patients" ON public.patients FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all anon for consultations" ON public.consultations FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all anon for clinical_evolutions" ON public.clinical_evolutions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all anon for appointments" ON public.appointments FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all anon for reception_queue" ON public.reception_queue FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all anon for system_settings" ON public.system_settings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all anon for subscriptions" ON public.subscriptions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all anon for whatsapp_messages" ON public.whatsapp_messages FOR ALL TO anon USING (true) WITH CHECK (true);

-- Habilita Realtime (PostgreSQL Change Data Capture / WebSockets) para atualização imediata do CRM
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'whatsapp_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
  END IF;
END $$;

ALTER TABLE public.whatsapp_messages REPLICA IDENTITY FULL;
`;

// Helper: Query WhatsApp messages from Supabase or server fallback with smart phone & ID matching
export async function getWhatsAppMessagesFromDb(params: {
  appointmentId?: string;
  patientPhone?: string;
  patientId?: string;
}): Promise<any[]> {
  const mergedMap = new Map<string, any>();

  // 1. Prepare ID and Phone variations
  const idVariants = new Set<string>();
  if (params.appointmentId) {
    const rawId = String(params.appointmentId).trim();
    if (rawId) {
      idVariants.add(rawId);
      idVariants.add(rawId.replace(/^queue_/, ''));
      idVariants.add(rawId.replace(/^queue-/, ''));
      idVariants.add(rawId.replace(/^queue_queue-/, 'queue-'));
      if (!rawId.startsWith('queue_')) idVariants.add(`queue_${rawId}`);
      if (!rawId.startsWith('queue-')) idVariants.add(`queue-${rawId}`);
    }
  }

  const phoneVariants = new Set<string>();
  const cleanPhone = (params.patientPhone || '').replace(/\D/g, '');
  let last8 = '';
  if (cleanPhone) {
    phoneVariants.add(cleanPhone);
    if (!cleanPhone.startsWith('55')) {
      phoneVariants.add(`55${cleanPhone}`);
    } else if (cleanPhone.length >= 12) {
      phoneVariants.add(cleanPhone.slice(2));
    }
    // Suporte a número brasileiro com ou sem o 9º dígito
    if (cleanPhone.length === 11) {
      const ddd = cleanPhone.slice(0, 2);
      const without9 = ddd + cleanPhone.slice(3);
      phoneVariants.add(without9);
      phoneVariants.add(`55${without9}`);
    } else if (cleanPhone.length === 10) {
      const ddd = cleanPhone.slice(0, 2);
      const with9 = ddd + '9' + cleanPhone.slice(2);
      phoneVariants.add(with9);
      phoneVariants.add(`55${with9}`);
    } else if (cleanPhone.length === 12 && cleanPhone.startsWith('55')) {
      const ddd = cleanPhone.slice(2, 4);
      const with9 = `55${ddd}9${cleanPhone.slice(4)}`;
      phoneVariants.add(with9);
    }
    last8 = cleanPhone.slice(-8);
  }

  // 1. Direct Supabase Query (Captures messages sent by n8n or external webhooks)
  try {
    const orConditions: string[] = [];
    idVariants.forEach((id) => {
      orConditions.push(`appointment_id.eq.${id}`);
    });
    phoneVariants.forEach((p) => {
      orConditions.push(`patient_phone.eq.${p}`);
    });
    if (params.patientId) {
      orConditions.push(`patient_id.eq.${params.patientId}`);
    }
    if (last8 && last8.length >= 8) {
      orConditions.push(`patient_phone.ilike.%${last8}%`);
    }

    let queryBuilder = supabase.from('whatsapp_messages').select('*').order('created_at', { ascending: false });
    if (orConditions.length > 0) {
      queryBuilder = queryBuilder.or(orConditions.join(','));
    }

    const { data, error } = await queryBuilder;
    if (!error && Array.isArray(data)) {
      data.forEach((r: any) => {
        if (r && r.id) {
          mergedMap.set(r.id, {
            id: r.id,
            appointmentId: r.appointment_id,
            patientId: r.patient_id,
            patientPhone: r.patient_phone,
            patientName: r.patient_name,
            direction: r.direction,
            senderType: r.sender_type,
            senderName: r.sender_name,
            messageText: r.message_text,
            messageType: r.message_type,
            status: r.status,
            createdAt: Number(r.created_at || Date.now()),
            rawPayload: r.raw_payload,
          });
        }
      });
    } else if (error) {
      console.debug('[Supabase CRM] Direct query notice:', error.message);
    }
  } catch (sbErr) {
    console.debug('[Supabase CRM] Direct query error:', sbErr);
  }

  // 2. Local backend API (data-store fallback)
  try {
    const query = new URLSearchParams();
    if (params.appointmentId) query.set('appointmentId', params.appointmentId);
    if (cleanPhone) query.set('phone', cleanPhone);
    if (params.patientId) query.set('patientId', params.patientId);

    const res = await fetch(`/api/whatsapp/messages?${query.toString()}`);
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.messages)) {
        json.messages.forEach((m: any) => {
          if (m && m.id && !mergedMap.has(m.id)) {
            mergedMap.set(m.id, m);
          }
        });
      }
    }
  } catch (err) {
    console.warn('[Supabase CRM] Falha ao buscar mensagens via API local:', err);
  }

  const result = Array.from(mergedMap.values());
  result.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));

  // Deduplica mensagens para evitar histórico duplicado (ex: disparos muito próximos com mesmo texto e direção)
  const deduped: any[] = [];
  for (const item of result) {
    const isDup = deduped.some((existing) => {
      if (existing.id === item.id) return true;
      const sameDir = (existing.direction || '') === (item.direction || '');
      const sameText = String(existing.messageText || '').trim() === String(item.messageText || '').trim();
      const timeDiff = Math.abs(Number(existing.createdAt || 0) - Number(item.createdAt || 0));
      return sameDir && sameText && timeDiff < 30000;
    });
    if (!isDup) {
      deduped.push(item);
    }
  }

  return deduped;
}

// Helper: Save WhatsApp message directly to Supabase
export async function saveWhatsAppMessageToDb(msg: any): Promise<boolean> {
  try {
    const payload = {
      id: msg.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      appointment_id: msg.appointmentId || msg.appointment_id || null,
      patient_id: msg.patientId || msg.patient_id || null,
      patient_phone: msg.patientPhone || msg.patient_phone || '',
      patient_name: msg.patientName || msg.patient_name || null,
      direction: msg.direction || 'outbound',
      sender_type: msg.senderType || msg.sender_type || 'system',
      sender_name: msg.senderName || msg.sender_name || null,
      message_text: msg.messageText || msg.message_text || '',
      message_type: msg.messageType || msg.message_type || 'text',
      status: msg.status || 'sent',
      created_at: Number(msg.createdAt || msg.created_at || Date.now()),
      raw_payload: msg.rawPayload || msg.raw_payload || null,
    };

    const { error } = await supabase.from('whatsapp_messages').upsert(payload);
    if (error) {
      console.warn('[Supabase CRM] Falha ao gravar mensagem:', error.message);
      return false;
    }

    // Broadcast instantâneo via WebSocket para todos os navegadores conectados
    broadcastWhatsAppMessageClient(payload).catch(() => {});
    return true;
  } catch (err) {
    console.warn('[Supabase CRM] Exceção ao gravar mensagem:', err);
    return false;
  }
}

// Helper: Delete single WhatsApp message
export async function deleteWhatsAppMessageFromDb(messageId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/whatsapp/messages/${encodeURIComponent(messageId)}`, {
      method: 'DELETE',
    });
    if (res.ok) return true;
  } catch (err) {
    console.warn('[Supabase CRM] Falha ao deletar mensagem via API:', err);
  }

  try {
    const { error } = await supabase.from('whatsapp_messages').delete().eq('id', messageId);
    return !error;
  } catch {
    return false;
  }
}

// Helper: Delete all WhatsApp messages for a conversation
export async function clearWhatsAppHistoryFromDb(params: {
  appointmentId?: string;
  patientPhone?: string;
  patientId?: string;
}): Promise<boolean> {
  try {
    const query = new URLSearchParams();
    if (params.appointmentId) query.set('appointmentId', params.appointmentId);
    if (params.patientPhone) query.set('phone', params.patientPhone);
    if (params.patientId) query.set('patientId', params.patientId);

    const res = await fetch(`/api/whatsapp/messages/all?${query.toString()}`, {
      method: 'DELETE',
    });
    if (res.ok) return true;
  } catch (err) {
    console.warn('[Supabase CRM] Falha ao limpar histórico via API:', err);
  }

  try {
    const cleanPhone = (params.patientPhone || '').replace(/\D/g, '');
    let q = supabase.from('whatsapp_messages').delete();
    const orConditions: string[] = [];
    if (params.appointmentId) {
      orConditions.push(`appointment_id.eq.${params.appointmentId}`);
      orConditions.push(`appointment_id.eq.${params.appointmentId.replace(/^queue_/, '')}`);
      orConditions.push(`appointment_id.eq.${params.appointmentId.replace(/^queue_queue-/, 'queue-')}`);
    }
    if (params.patientId) {
      orConditions.push(`patient_id.eq.${params.patientId}`);
    }
    if (cleanPhone) {
      orConditions.push(`patient_phone.eq.${cleanPhone}`);
      if (!cleanPhone.startsWith('55')) orConditions.push(`patient_phone.eq.55${cleanPhone}`);
      const last8 = cleanPhone.slice(-8);
      if (last8.length >= 8) orConditions.push(`patient_phone.ilike.%${last8}%`);
    }
    if (orConditions.length > 0) {
      q = q.or(orConditions.join(','));
      const { error } = await q;
      return !error;
    }
    return false;
  } catch {
    return false;
  }
}

// =========================================================================
// REALTIME SUBSCRIPTION FOR CRM WHATSAPP MESSAGES (Broadcast & CDC WebSockets)
// =========================================================================

export type RealtimeWhatsAppEvent = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: any;
  old: any;
  message?: WhatsAppMessage;
};

/**
 * Converte linha bruta do Supabase (snake_case) em modelo TypeScript tipado (camelCase)
 */
export function mapRawDbMessageToWhatsAppMessage(r: any): WhatsAppMessage {
  if (!r) return {} as WhatsAppMessage;
  return {
    id: r.id || `msg_${Date.now()}`,
    appointmentId: r.appointment_id || undefined,
    patientId: r.patient_id || undefined,
    patientPhone: r.patient_phone || '',
    patientName: r.patient_name || undefined,
    direction: r.direction === 'inbound' ? 'inbound' : 'outbound',
    senderType: r.sender_type || (r.direction === 'inbound' ? 'patient' : 'system'),
    senderName: r.sender_name || undefined,
    messageText: r.message_text || '',
    messageType: r.message_type || 'text',
    status: r.status || (r.direction === 'inbound' ? 'replied' : 'sent'),
    createdAt: Number(r.created_at || Date.now()),
    rawPayload: r.raw_payload || undefined,
  };
}

// =========================================================================
// REALTIME SUBSCRIPTION FOR CRM WHATSAPP MESSAGES (Broadcast & CDC WebSockets)
// =========================================================================

// Lista interna de ouvintes registrados no canal compartilhado
const crmWhatsAppListeners = new Set<(event: RealtimeWhatsAppEvent) => void>();

// Inicializa o canal compartilhado com todos os callbacks registrados ANTES de dar subscribe()
export const crmRealtimeChannel = supabase
  .channel('crm_whatsapp_channel', {
    config: { broadcast: { self: true } },
  })
  // 1. Escuta transmissões instantâneas via WebSockets (broadcast)
  .on('broadcast', { event: 'new_message' }, (payload) => {
    try {
      const raw = payload.payload;
      if (raw && raw.id) {
        const event: RealtimeWhatsAppEvent = {
          eventType: 'INSERT',
          new: raw,
          old: null,
          message: mapRawDbMessageToWhatsAppMessage(raw),
        };
        crmWhatsAppListeners.forEach((fn) => {
          try {
            fn(event);
          } catch (e) {
            console.debug('[CRM Realtime] Erro no callback do ouvinte:', e);
          }
        });
      }
    } catch (err) {
      console.debug('[CRM Realtime] Erro ao processar broadcast:', err);
    }
  })
  // 2. Escuta mudanças diretas no banco PostgreSQL (postgres_changes)
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'whatsapp_messages' },
    (payload) => {
      try {
        const typedEvent: RealtimeWhatsAppEvent = {
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new,
          old: payload.old,
          message: payload.new ? mapRawDbMessageToWhatsAppMessage(payload.new) : undefined,
        };
        crmWhatsAppListeners.forEach((fn) => {
          try {
            fn(typedEvent);
          } catch (e) {
            console.debug('[CRM Realtime] Erro no callback do ouvinte postgres_changes:', e);
          }
        });
      } catch (err) {
        console.debug('[Supabase Realtime CRM] Erro ao processar evento postgres_changes:', err);
      }
    }
  );

// Dispara a subscrição única do canal compartilhado
crmRealtimeChannel.subscribe((status) => {
  console.debug('[CRM Realtime] Status do canal singleton:', status);
});

/**
 * Dispara uma mensagem em tempo real para todos os clientes conectados via WebSocket
 */
export async function broadcastWhatsAppMessageClient(rawOrMsg: any): Promise<void> {
  try {
    const rawPayload = {
      id: rawOrMsg.id || `msg_${Date.now()}`,
      appointment_id: rawOrMsg.appointment_id || rawOrMsg.appointmentId || null,
      patient_id: rawOrMsg.patient_id || rawOrMsg.patientId || null,
      patient_phone: rawOrMsg.patient_phone || rawOrMsg.patientPhone || '',
      patient_name: rawOrMsg.patient_name || rawOrMsg.patientName || null,
      direction: rawOrMsg.direction || 'outbound',
      sender_type: rawOrMsg.sender_type || rawOrMsg.senderType || 'system',
      sender_name: rawOrMsg.sender_name || rawOrMsg.senderName || null,
      message_text: rawOrMsg.message_text || rawOrMsg.messageText || '',
      message_type: rawOrMsg.message_type || rawOrMsg.messageType || 'text',
      status: rawOrMsg.status || 'sent',
      created_at: Number(rawOrMsg.created_at || rawOrMsg.createdAt || Date.now()),
      raw_payload: rawOrMsg.raw_payload || rawOrMsg.rawPayload || null,
    };

    await crmRealtimeChannel.send({
      type: 'broadcast',
      event: 'new_message',
      payload: rawPayload,
    });
  } catch (err) {
    console.debug('[CRM Realtime] Falha ao enviar broadcast:', err);
  }
}

/**
 * Inscreve no stream do Supabase Realtime (WebSockets) para mensagens do CRM.
 * Retorna uma função de cancelamento (cleanup) para desregistrar o ouvinte sem destruir o canal singleton.
 */
export function subscribeToWhatsAppMessagesRealtime(
  onEvent: (event: RealtimeWhatsAppEvent) => void
): () => void {
  crmWhatsAppListeners.add(onEvent);
  return () => {
    crmWhatsAppListeners.delete(onEvent);
  };
}
