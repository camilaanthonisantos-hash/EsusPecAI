import { supabase } from './supabase';
import {
  Patient,
  Consultation,
  KnowledgeItem,
  User,
  SystemSettings,
  SubscriptionPlan,
  SubscriptionRecord,
  PixTransactionRecord,
  SUSMedication,
  SUSExam,
  Appointment,
  AppointmentStatus,
  ReceptionQueueItem,
  QueueItemStatus,
  EvolutionSummary,
  ExamMediaReportData,
  CollectiveActionRecord,
} from '../types';
import { ADMIN_MASTER_EMAIL, LEGACY_MOCK_USER_IDS, LEGACY_MOCK_USER_NAMES } from '../data/professions';
import { OFFICIAL_SUS_MEDICATIONS } from '../data/susMedications';
import { OFFICIAL_SUS_EXAMS } from '../data/susExams';
import { normalizeSubscriptionExpiresAt } from '../utils/pixExpiration';
import { safeSetItem, safeGetItem } from '../utils/safeStorage';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db: any = {};
export const auth = getAuth(firebaseApp);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  console.error('[Database Operation Error]:', error, operationType, path);
  throw new Error(String(error));
}

// Test connection to backend/Supabase
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('system_settings').select('id').limit(1);
    return !error || error.code === 'PGRST116' || error.code === '42P01';
  } catch {
    return true;
  }
}

// Map collection names to Supabase tables
function mapCollectionToTable(colName: string): string {
  if (colName === 'settings' || colName === 'system_settings') {
    return 'system_settings';
  }
  return colName;
}

// ================= SUPABASE DATA HELPERS =================

// Comprehensive helper to match consultations to a patient across IDs, CPF, CNS, and normalized name
export function isConsultationForPatient(c: any, patient: Patient | null | undefined): boolean {
  if (!c || !patient) return false;

  // 1. Check patientId / patient_id
  const cPatId =
    c.patientId ||
    c.patient_id ||
    (c.raw_data && (c.raw_data.patientId || c.raw_data.patient_id)) ||
    (c.patient && c.patient.id) ||
    (c.raw_data && c.raw_data.patient && c.raw_data.patient.id);

  if (cPatId && patient.id && String(cPatId).trim() === String(patient.id).trim()) {
    return true;
  }

  // 2. Check CPF match
  const pCpf = (patient.cpf || '').replace(/\D/g, '');
  const cCpf = (
    c.patientCpf ||
    c.cpf ||
    (c.raw_data && (c.raw_data.patientCpf || c.raw_data.cpf)) ||
    (c.patient && (c.patient.cpf || c.patient.patientCpf)) ||
    ''
  ).replace(/\D/g, '');

  if (pCpf && cCpf && pCpf === cCpf && pCpf.length >= 11) {
    return true;
  }

  // 3. Check CNS match
  const pCns = (patient.cns || '').replace(/\D/g, '');
  const cCns = (
    c.patientCns ||
    c.cns ||
    (c.raw_data && (c.raw_data.patientCns || c.raw_data.cns)) ||
    (c.patient && (c.patient.cns || c.patient.patientCns)) ||
    ''
  ).replace(/\D/g, '');

  if (pCns && cCns && pCns === cCns && pCns.length >= 15) {
    return true;
  }

  // 4. Check Normalized Full Name match
  const cPatName =
    c.patientName ||
    c.patient_name ||
    (c.raw_data && (c.raw_data.patientName || c.raw_data.patient_name)) ||
    (c.patient && (c.patient.fullName || c.patient.name));

  const pName = patient.fullName || (patient as any).name;
  if (cPatName && pName) {
    const normC = String(cPatName).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const normP = String(pName).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    if (normC && normP && normC === normP && normC.length >= 3) {
      return true;
    }
  }

  return false;
}

export async function fetchFromSupabaseDirect<T>(colName: string): Promise<T | null> {
  try {
    const tableName = mapCollectionToTable(colName);
    const { data, error } = await supabase.from(tableName).select('*');
    if (error || !data) return null;

    if (tableName === 'system_settings') {
      const globalRow = data.find((r: any) => r.id === 'global') || data[0];
      if (globalRow && globalRow.data) return globalRow.data as T;
      return null;
    }

    const unpacked = data.map((row: any) => {
      let result: any = {};
      if (row.raw_data && typeof row.raw_data === 'object' && Object.keys(row.raw_data).length > 0) {
        result = { ...row.raw_data, id: row.id };
      } else {
        result = { ...row, id: row.id };
      }

      // Ensure critical camelCase fields are mapped from top-level SQL columns if missing
      if (tableName === 'consultations') {
        result.patientId = result.patientId || result.patient_id || row.patient_id;
        result.patientName = result.patientName || result.patient_name || row.patient_name;
        result.authorName = result.authorName || result.author || row.author;
        result.author = result.author || result.authorName || row.author;
        result.authorId = result.authorId || result.author_id || row.author_id;
        result.authorProfession = result.authorProfession || result.author_profession || result.profession || row.profession || row.author_profession;
        result.timestamp = Number(result.timestamp || row.timestamp || (row.created_at ? Number(row.created_at) : Date.now()));
        result.date = result.date || row.date || new Date(result.timestamp).toLocaleDateString('pt-BR');
        result.avaliacao = result.avaliacao || row.avaliacao || '';
        result.plano = result.plano || row.plano || '';
        result.conduta = result.conduta || row.conduta || '';
        result.rawNotes = result.rawNotes || result.raw_notes || row.raw_notes || '';
        result.ciap2 = result.ciap2 || row.ciap2 || '';
        result.cid10 = result.cid10 || row.cid10 || '';
        result.diagnosticHypothesis = result.diagnosticHypothesis || result.diagnostic_hypothesis || row.diagnostic_hypothesis || '';
        result.vitalSigns = result.vitalSigns || result.vital_signs || row.vital_signs || null;
        result.prescription = result.prescription || row.prescription || null;
        result.examRequest = result.examRequest || result.exam_request || row.exam_request || null;
        result.referral = result.referral || row.referral || null;
        result.medicalReport = result.medicalReport || result.medical_report || row.medical_report || null;
        result.attendanceCertificate = result.attendanceCertificate || result.attendance_certificate || row.attendance_certificate || null;
        result.pts = result.pts || row.pts || null;
      } else if (tableName === 'patients') {
        result.fullName = result.fullName || result.full_name || result.name || row.full_name || row.name;
        result.cpf = result.cpf || row.cpf || '';
        result.cns = result.cns || row.cns || '';
        result.phone = result.phone || row.phone || '';
        result.birthDate = result.birthDate || result.birth_date || row.birth_date || '';
        result.gender = result.gender || row.gender || '';
        result.referenceUbs = result.referenceUbs || row.reference_ubs || row.referenceUbs || '';
        result.referenceUbsContact = result.referenceUbsContact || row.reference_ubs_contact || row.referenceUbsContact || '';
        result.acsName = result.acsName || row.acs_name || row.acsName || '';
        result.acsContact = result.acsContact || row.acs_contact || row.acsContact || '';
        result.createdAt = Number(result.createdAt || result.created_at || row.created_at || Date.now());
      } else if (tableName === 'users') {
        result.name = result.name || row.name;
        result.email = result.email || row.email;
        result.role = result.role || row.role || 'user';
        result.profession = result.profession || row.profession;
      } else if (tableName === 'reception_queue') {
        result.patientId = result.patientId || result.patient_id || row.patient_id || '';
        result.patientName = result.patientName || result.patient_name || row.patient_name || '';
        result.patientCpf = result.patientCpf || result.patient_cpf || row.patient_cpf || '';
        result.patientCns = result.patientCns || result.patient_cns || row.patient_cns || '';
        result.status = result.status || row.status || 'waiting';
        result.riskPriority = result.riskPriority || result.risk_priority || row.risk_priority || 'verde';
        result.riskCategory = result.riskCategory || result.risk_category || row.risk_category || '';
        result.professionalId = result.professionalId || result.professional_id || row.professional_id || '';
        result.professionalName = result.professionalName || result.professional_name || row.professional_name || '';
        result.professionalProfession = result.professionalProfession || result.professional_profession || row.professional_profession || 'enfermeiro';
        result.currentAttendingProfessionalId = result.currentAttendingProfessionalId || result.current_attending_professional_id || row.current_attending_professional_id || '';
        result.currentAttendingProfessionalName = result.currentAttendingProfessionalName || result.current_attending_professional_name || row.current_attending_professional_name || '';
        result.scheduledDate = result.scheduledDate || result.scheduled_date || row.raw_data?.scheduledDate || (row.timestamp ? new Date(row.timestamp).toISOString().split('T')[0] : '');
        result.scheduledTime = result.scheduledTime || result.scheduled_time || row.raw_data?.scheduledTime || '08:00';
        result.timestamp = Number(result.timestamp || row.timestamp || Date.now());
        result.calledAt = result.calledAt || row.called_at ? Number(result.calledAt || row.called_at) : undefined;
        result.completedAt = result.completedAt || row.attended_at ? Number(result.completedAt || row.attended_at) : undefined;
        result.attendedAt = result.attendedAt || row.attended_at ? Number(result.attendedAt || row.attended_at) : undefined;
        result.notes = result.notes || row.notes || row.raw_data?.notes || '';
      }

      return result;
    });
    return unpacked as unknown as T;
  } catch {
    return null;
  }
}

export async function saveToSupabaseDirect(colName: string, item: any): Promise<void> {
  try {
    const tableName = mapCollectionToTable(colName);
    if (tableName === 'system_settings') {
      await supabase.from(tableName).upsert({
        id: 'global',
        data: item,
        updated_at: Date.now(),
      });
      return;
    }
    if (!item || !item.id) return;

    let payload: Record<string, any> = {
      id: String(item.id),
      raw_data: item,
      updated_at: Date.now(),
    };

    if (tableName === 'consultations') {
      payload = {
        ...payload,
        patient_id: item.patientId || item.patient_id || null,
        patient_name: item.patientName || item.patient_name || null,
        author: item.author || item.authorName || null,
        profession: item.authorProfession || item.profession || null,
        date: item.date || null,
        timestamp: item.timestamp || Date.now(),
        avaliacao: item.avaliacao || null,
        plano: item.plano || null,
        conduta: item.conduta || null,
        raw_notes: item.rawNotes || item.raw_notes || null,
        ciap2: item.ciap2 || null,
        cid10: item.cid10 || null,
        diagnostic_hypothesis: item.diagnosticHypothesis || item.diagnostic_hypothesis || null,
        vital_signs: item.vitalSigns || item.vital_signs || null,
        prescription: item.prescription || null,
        exam_request: item.examRequest || item.exam_request || null,
        referral: item.referral || null,
        created_at: item.createdAt || item.timestamp || Date.now(),
      };
    } else if (tableName === 'patients') {
      payload = {
        ...payload,
        full_name: item.fullName || item.name || 'Paciente',
        cpf: item.cpf || null,
        cns: item.cns || null,
        phone: item.phone || null,
        birth_date: item.birthDate || item.birth_date || null,
        gender: item.gender || null,
        balance: item.balance || 0,
        reference_ubs: item.referenceUbs || null,
        reference_ubs_contact: item.referenceUbsContact || null,
        acs_name: item.acsName || null,
        acs_contact: item.acsContact || null,
        created_at: item.createdAt || Date.now(),
      };
    } else if (tableName === 'reception_queue') {
      const effProfName = (item.status === 'completed' || item.status === 'in_service' || item.status === 'in_consultation')
        ? (item.currentAttendingProfessionalName || item.professionalName || item.professional_name || null)
        : (item.professionalName || item.professional_name || item.currentAttendingProfessionalName || null);
      const effProfId = (item.status === 'completed' || item.status === 'in_service' || item.status === 'in_consultation')
        ? (item.currentAttendingProfessionalId || item.professionalId || item.professional_id || null)
        : (item.professionalId || item.professional_id || item.currentAttendingProfessionalId || null);

      payload = {
        ...payload,
        patient_id: item.patientId || item.patient_id || null,
        patient_name: item.patientName || item.patient_name || null,
        patient_cpf: item.patientCpf || item.patient_cpf || null,
        patient_cns: item.patientCns || item.patient_cns || null,
        professional_id: effProfId,
        professional_name: effProfName,
        status: item.status || 'waiting',
        risk_priority: item.riskPriority || item.risk_priority || 'verde',
        risk_category: item.riskCategory || item.risk_category || null,
        timestamp: item.timestamp || Date.now(),
        called_at: item.calledAt || item.called_at || null,
        attended_at: item.completedAt || item.attendedAt || item.attended_at || null,
        created_at: item.createdAt || Date.now(),
      };
    }

    await supabase.from(tableName).upsert(payload);
  } catch (err) {
    console.debug(`[Supabase save error on ${colName}]:`, err);
  }
}

export async function deleteFromSupabaseDirect(colName: string, id: string): Promise<void> {
  try {
    const tableName = mapCollectionToTable(colName);
    await supabase.from(tableName).delete().eq('id', id);
  } catch (err) {
    console.debug(`[Supabase delete error on ${colName}]:`, err);
  }
}

// Full-Stack Server Storage API Helpers (dual-sync with server backend and Supabase directly)
async function apiDbGet<T>(colName: string): Promise<T | null> {
  // 1. Direct Supabase Query first
  try {
    const sbData = await fetchFromSupabaseDirect<T>(colName);
    if (sbData && (Array.isArray(sbData) ? sbData.length > 0 : Object.keys(sbData).length > 0)) {
      return sbData;
    }
  } catch {}

  // 2. Try server endpoint
  try {
    const res = await fetch(`/api/db/${colName}`);
    if (res.ok) {
      const json = await res.json();
      if (json.data && (Array.isArray(json.data) ? json.data.length > 0 : Object.keys(json.data).length > 0)) {
        return json.data as T;
      }
    }
  } catch {}

  return null;
}

async function apiDbSave<T>(colName: string, item: T): Promise<void> {
  // 1. Direct Supabase save
  try {
    await saveToSupabaseDirect(colName, item);
  } catch {}

  // 2. Save to server persistent endpoint
  try {
    await fetch(`/api/db/${colName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
  } catch {}
}

async function apiDbDelete(colName: string, id: string): Promise<void> {
  // 1. Direct Supabase delete
  try {
    await deleteFromSupabaseDirect(colName, id);
  } catch {}

  // 2. Delete on server endpoint
  try {
    await fetch(`/api/db/${colName}/${id}`, {
      method: 'DELETE',
    });
  } catch {}
}

const LEGACY_MOCK_EMAILS = [
  'vanessa.lima.cras@saude.gov.br',
  'marcelo.ramos.psi@saude.gov.br',
  'camila.soares.psp@saude.gov.br',
  'camila.santos@saude.gov.br',
  'beatriz.lima@saude.gov.br',
  'lucas.andrade@saude.gov.br',
  'rodrigo.silveira@saude.gov.br',
  'juliana.martins@saude.gov.br',
];

export function isMockUser(u: Partial<User> | null | undefined, docId?: string): boolean {
  if (!u) return false;
  const targetId = (u.id || docId || '').toLowerCase().trim();
  if (targetId && (LEGACY_MOCK_USER_IDS.some((id) => id.toLowerCase() === targetId) || targetId.includes('profissional da unidade') || targetId === 'user-profissional-da-unidade' || targetId === 'profissional-da-unidade')) return true;
  const name = (typeof u.name === 'string' ? u.name : '').toLowerCase().trim();
  if (name && (LEGACY_MOCK_USER_NAMES.map((n) => n.toLowerCase()).includes(name) || name === 'profissional da unidade' || name === 'profissional da saúde' || name === 'profissional da saude')) return true;
  const email = (typeof u.email === 'string' ? u.email : '').toLowerCase().trim();
  if (email && (LEGACY_MOCK_EMAILS.includes(email) || email.includes('profissional.da.unidade') || email.includes('profissionaldaunidade'))) return true;
  return false;
}

export function isMockPatient(p: Partial<Patient> | null | undefined, docId?: string): boolean {
  if (!p) return false;
  const id = (p.id || docId || '').toLowerCase().trim();
  if (['pat-lucas-oliveira', 'pat-maria-aparecida', 'pat-gabriel-souza', 'cidadao', 'cidadão', 'pat-cidadao', 'pat-cidadão'].includes(id)) return true;
  const name = (typeof p.fullName === 'string' ? p.fullName : '').toLowerCase().trim();
  if (!name || name === 'cidadão' || name === 'cidadao' || name === 'paciente agendado' || name === 'paciente da fila' || name === 'cidadão identificado' || name === 'profissional da unidade') return true;
  return false;
}

export function isMockQueueItem(q: Partial<ReceptionQueueItem> | null | undefined, docId?: string): boolean {
  if (!q) return false;
  const id = (q.id || docId || '').toLowerCase().trim();
  if (id.includes('profissional da unidade') || id === 'profissional da unidade') return true;
  const patName = (q.patientName || '').toLowerCase().trim();
  if (!patName || patName === 'cidadão' || patName === 'cidadao' || patName === 'paciente agendado' || patName === 'paciente da fila' || patName === 'cidadão identificado' || patName === 'profissional da unidade') return true;
  const profName = (q.professionalName || '').toLowerCase().trim();
  const profId = (q.professionalId || '').toLowerCase().trim();
  if (profName === 'profissional da unidade' || profId === 'profissional da unidade' || profId === 'user-profissional-da-unidade' || profId === 'profissional-da-unidade') return true;
  // Exclude items assigned to administrative profiles
  if (q.professionalProfession === 'administrativo') return true;
  return false;
}

export function isMockAppointment(a: Partial<Appointment> | null | undefined, docId?: string): boolean {
  if (!a) return false;
  const id = (a.id || docId || '').toLowerCase().trim();
  if (id.includes('profissional da unidade') || id === 'profissional da unidade') return true;
  const patName = (a.patientName || '').toLowerCase().trim();
  if (!patName || patName === 'cidadão' || patName === 'cidadao' || patName === 'paciente agendado' || patName === 'paciente da fila' || patName === 'cidadão identificado' || patName === 'profissional da unidade') return true;
  const profName = (a.professionalName || '').toLowerCase().trim();
  const profId = (a.professionalId || '').toLowerCase().trim();
  if (profName === 'profissional da unidade' || profId === 'profissional da unidade' || profId === 'user-profissional-da-unidade' || profId === 'profissional-da-unidade') return true;
  if (a.professionalProfession === 'administrativo') return true;
  return false;
}

// Generic Realtime Subscriptions via Supabase
function createSupabaseSubscription<T>(
  tableName: string,
  transform: (data: any[]) => T[],
  onUpdate: (items: T[]) => void
) {
  let isMounted = true;

  const refresh = async () => {
    try {
      const sbData = await fetchFromSupabaseDirect<any[]>(tableName);
      if (isMounted && sbData && Array.isArray(sbData) && sbData.length > 0) {
        const transformed = transform(sbData);
        onUpdate(transformed);
        return;
      }
      // Fallback to local server data-store / localStorage if Supabase table is empty or unavailable
      const localData = await apiDbGet<any[]>(tableName);
      if (isMounted && localData && Array.isArray(localData)) {
        const transformed = transform(localData);
        onUpdate(transformed);
      }
    } catch {
      try {
        const localData = await apiDbGet<any[]>(tableName);
        if (isMounted && localData && Array.isArray(localData)) {
          const transformed = transform(localData);
          onUpdate(transformed);
        }
      } catch {}
    }
  };

  // Initial load
  refresh();

  // Supabase Realtime channel
  const channelName = `realtime_${tableName}_${Math.random().toString(36).slice(2, 8)}`;
  const channel = supabase
    .channel(channelName)
    .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, () => {
      refresh();
    })
    .subscribe();

  return () => {
    isMounted = false;
    supabase.removeChannel(channel);
  };
}

// ================= USERS & RBAC =================

export function subscribeToUsers(
  onUpdate: (users: User[]) => void,
  onError?: (err: Error) => void
) {
  return createSupabaseSubscription<User>(
    'users',
    (rows) => {
      const items: User[] = [];
      for (const u of rows) {
        if (isMockUser(u, u.id)) continue;
        const role =
          u.email && typeof u.email === 'string' && u.email.toLowerCase().trim() === ADMIN_MASTER_EMAIL.toLowerCase()
            ? 'admin'
            : u.role || 'user';
        const normExpiresAt = normalizeSubscriptionExpiresAt(u.subscription_expires_at);
        items.push({
          ...u,
          role,
          subscription_expires_at: normExpiresAt,
        });
      }
      return items.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
    },
    onUpdate
  );
}

export async function fetchAllUsersFromFirestore(): Promise<User[]> {
  const serverUsers = await apiDbGet<User[]>('users');
  const serverList = (serverUsers || []).filter((u) => !isMockUser(u, u.id));
  return serverList.length > 0 ? serverList : [];
}

export async function saveUserToFirestore(user: User): Promise<void> {
  const role =
    user.email && typeof user.email === 'string' && user.email.toLowerCase().trim() === ADMIN_MASTER_EMAIL.toLowerCase()
      ? 'admin'
      : user.role || 'user';

  const data: User = {
    ...user,
    role,
    createdAt: user.createdAt || Date.now(),
  };

  await apiDbSave('users', data);
}

export async function deleteUserFromFirestore(userId: string): Promise<void> {
  await apiDbDelete('users', userId);
}

// ================= SYSTEM SETTINGS =================

export function subscribeToSystemSettings(
  onUpdate: (settings: SystemSettings) => void,
  onError?: (err: Error) => void
) {
  let isMounted = true;

  const refresh = async () => {
    try {
      const { data, error } = await supabase.from('system_settings').select('*');
      if (isMounted && !error && data && data.length > 0) {
        const globalRow = data.find((r: any) => r.id === 'global') || data[0];
        if (globalRow && globalRow.data) {
          onUpdate(globalRow.data);
          return;
        }
      }
      const local = await apiDbGet<SystemSettings>('settings');
      if (isMounted && local && Object.keys(local).length > 0) {
        onUpdate(local);
      }
    } catch {}
  };

  refresh();

  const channel = supabase
    .channel(`realtime_settings_${Math.random().toString(36).slice(2, 8)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' }, () => {
      refresh();
    })
    .subscribe();

  return () => {
    isMounted = false;
    supabase.removeChannel(channel);
  };
}

export async function saveSystemSettingsToFirestore(settings: SystemSettings): Promise<void> {
  const data = {
    ...settings,
    updatedAt: Date.now(),
  };
  await apiDbSave('settings', data);
}

// ================= PATIENTS =================

export function subscribeToPatients(
  onUpdate: (patients: Patient[]) => void,
  onError?: (err: Error) => void
) {
  return createSupabaseSubscription<Patient>(
    'patients',
    (rows) =>
      rows
        .filter((p) => {
          if (isMockPatient(p)) {
            if (p.id) deletePatientFromFirestore(p.id).catch(() => {});
            return false;
          }
          return true;
        })
        .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0)),
    onUpdate
  );
}

export async function savePatientToFirestore(patient: Patient): Promise<void> {
  const data: Patient = {
    ...patient,
    createdAt: patient.createdAt || Date.now(),
    updatedAt: Date.now(),
  };
  await apiDbSave('patients', data);
}

export async function deletePatientFromFirestore(patientId: string): Promise<void> {
  await apiDbDelete('patients', patientId);
}

// ================= CONSULTATIONS (PRONTUÁRIO) =================

export function subscribeToConsultations(
  onUpdate: (consultations: Consultation[]) => void,
  onError?: (err: Error) => void
) {
  return createSupabaseSubscription<Consultation>(
    'consultations',
    (rows) => rows.sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0)),
    onUpdate
  );
}

export async function saveConsultationToFirestore(consultation: Consultation): Promise<void> {
  const data: Consultation = {
    ...consultation,
    timestamp: consultation.timestamp || Date.now(),
  };

  // 1. Persist to localStorage safely
  try {
    const list: Consultation[] = safeGetItem<Consultation[]>('pec_consultations', []);
    const idx = list.findIndex((c) => c.id === consultation.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...consultation };
    } else {
      list.unshift(consultation);
    }
    safeSetItem('pec_consultations', list);
  } catch {}

  // 2. Persist to Supabase & server
  await apiDbSave('consultations', data);
}

export async function deleteConsultationFromFirestore(consultationId: string): Promise<void> {
  try {
    const list: Consultation[] = safeGetItem<Consultation[]>('pec_consultations', []);
    const filtered = list.filter((c) => c.id !== consultationId);
    safeSetItem('pec_consultations', filtered);
  } catch {}
  await apiDbDelete('consultations', consultationId);
}

// ================= COLLECTIVE ACTIONS (AÇÕES COLETIVAS BPA-C) =================

export async function saveCollectiveActionToFirestore(action: CollectiveActionRecord): Promise<void> {
  const data: CollectiveActionRecord = {
    ...action,
    timestamp: action.timestamp || Date.now(),
  };

  // 1. Persiste no storage local
  try {
    const list: CollectiveActionRecord[] = safeGetItem<CollectiveActionRecord[]>('pec_collective_records', []);
    const idx = list.findIndex((a) => a.id === action.id || (a.actionId && a.actionId === action.actionId));
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...data };
    } else {
      list.unshift(data);
    }
    safeSetItem('pec_collective_records', list);
  } catch {}

  // 2. Persiste no Banco de Dados 1 (Supabase Primário em coluna única raw_data & Servidor)
  await apiDbSave('collective_actions', data);
}

export async function getCollectiveActionsFromFirestore(): Promise<CollectiveActionRecord[]> {
  try {
    const serverActions = await apiDbGet<CollectiveActionRecord[]>('collective_actions');
    if (serverActions && Array.isArray(serverActions) && serverActions.length > 0) {
      const localActions = safeGetItem<CollectiveActionRecord[]>('pec_collective_records', []);
      const mergedMap = new Map<string, CollectiveActionRecord>();
      [...serverActions, ...localActions].forEach((item) => {
        if (item && item.id) mergedMap.set(item.id, item);
      });
      const merged = Array.from(mergedMap.values()).sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));
      safeSetItem('pec_collective_records', merged);
      return merged;
    }
  } catch {}
  return safeGetItem<CollectiveActionRecord[]>('pec_collective_records', []) || [];
}

export async function deleteCollectiveActionFromFirestore(actionId: string): Promise<void> {
  try {
    const list: CollectiveActionRecord[] = safeGetItem<CollectiveActionRecord[]>('pec_collective_records', []);
    const filtered = list.filter((a) => a.id !== actionId && a.actionId !== actionId);
    safeSetItem('pec_collective_records', filtered);
  } catch {}
  await apiDbDelete('collective_actions', actionId);
}

// ================= CLINICAL EVOLUTIONS (EVOLUÇÃO LONGITUDINAL IA) =================

export async function saveClinicalEvolutionToFirestore(evolution: EvolutionSummary): Promise<void> {
  const data = {
    ...evolution,
    id: evolution.patientId,
    generatedAt: evolution.generatedAt || Date.now(),
  };
  await apiDbSave('clinical_evolutions', data);
}

export async function getClinicalEvolutionFromFirestore(patientId: string): Promise<EvolutionSummary | null> {
  if (!patientId) return null;
  try {
    const serverEvolutions = await apiDbGet<EvolutionSummary[]>('clinical_evolutions');
    if (serverEvolutions && Array.isArray(serverEvolutions)) {
      const found = serverEvolutions.find((e) => e.patientId === patientId || (e as any).id === patientId);
      if (found) return found;
    }
  } catch {}
  return null;
}

// ================= EXAM MEDIA & VIDEO REPORTS =================

export async function saveExamMediaToFirestore(mediaReport: ExamMediaReportData): Promise<void> {
  const data = {
    ...mediaReport,
    createdAt: mediaReport.createdAt || Date.now(),
  };
  await apiDbSave('exam_media', data);
}

export async function getExamMediaFromFirestore(mediaId: string): Promise<ExamMediaReportData | null> {
  if (!mediaId) return null;
  try {
    const serverItems = await apiDbGet<ExamMediaReportData[]>('exam_media');
    if (serverItems && Array.isArray(serverItems)) {
      const found = serverItems.find((m) => m.id === mediaId);
      if (found) return found;
    }
  } catch {}
  return null;
}

export async function getPatientExamMediaReports(patientId: string): Promise<ExamMediaReportData[]> {
  if (!patientId) return [];
  try {
    const serverItems = await apiDbGet<ExamMediaReportData[]>('exam_media');
    if (serverItems && Array.isArray(serverItems)) {
      return serverItems
        .filter((m) => m.patientId === patientId)
        .sort((a, b) => b.createdAt - a.createdAt);
    }
  } catch {}
  return [];
}

export async function deleteExamMediaFromFirestore(mediaId: string): Promise<void> {
  await apiDbDelete('exam_media', mediaId);
}

// ================= KNOWLEDGE BASE =================

export function subscribeToKnowledgeItems(
  onUpdate: (items: KnowledgeItem[]) => void,
  onError?: (err: Error) => void
) {
  return createSupabaseSubscription<KnowledgeItem>(
    'knowledge_base',
    (rows) => rows.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0)),
    onUpdate
  );
}

export async function saveKnowledgeItemToFirestore(item: KnowledgeItem): Promise<void> {
  const data = {
    ...item,
    createdAt: item.createdAt || Date.now(),
  };
  await apiDbSave('knowledge_base', data);
}

export async function deleteKnowledgeItemFromFirestore(itemId: string): Promise<void> {
  await apiDbDelete('knowledge_base', itemId);
}

// ================= INITIAL SEEDING & PURGE MOCK DATA =================

export async function purgeLegacyMockDataFromFirestore(): Promise<void> {
  for (const uId of LEGACY_MOCK_USER_IDS) {
    await deleteUserFromFirestore(uId).catch(() => {});
  }
}

export async function seedFirestoreIfEmpty(
  defaultPatients: Patient[],
  defaultConsultations: Consultation[],
  defaultKnowledge: KnowledgeItem[],
  defaultUsers?: User[],
  defaultSettings?: SystemSettings
): Promise<void> {
  try {
    const existingUsers = await apiDbGet<User[]>('users');
    if (!existingUsers || existingUsers.length === 0) {
      if (defaultUsers && defaultUsers.length > 0) {
        for (const defUser of defaultUsers) {
          const role =
            defUser.email?.toLowerCase().trim() === ADMIN_MASTER_EMAIL.toLowerCase()
              ? 'admin'
              : defUser.role || 'user';
          await saveUserToFirestore({
            ...defUser,
            role,
            subscription_status: role === 'admin' ? 'pago' : defUser.subscription_status || 'free',
            free_used: role === 'admin' ? true : Boolean(defUser.free_used),
            ...(role === 'admin' ? { subscription_expires_at: new Date('2099-12-31').getTime() } : {}),
          });
        }
      }
    }
  } catch {}
}

// ================= SUBSCRIPTION PLANS & BILLING =================

export const DEFAULT_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'por_hora',
    name: 'Plano por Hora (60m)',
    price: 3.00,
    durationDays: 1 / 24,
    description: 'Acesso completo por 1 hora de uso.',
    badge: 'Uso Rápido',
    features: [
      'Geração ilimitada de prontuários por 1 hora',
      'Ideal para testar ou uso pontual',
      'Gravação de voz e anexos',
    ],
    active: true,
  },
  {
    id: 'semanal',
    name: 'Plano Semanal',
    price: 5.00,
    durationDays: 7,
    description: 'Acesso completo durante 7 dias corridos.',
    badge: 'Curto Prazo',
    features: [
      'Geração ilimitada de prontuários',
      'Validade de 7 dias corridos',
      'Histórico e Linha do Tempo',
    ],
    active: true,
  },
  {
    id: 'quinzenal',
    name: 'Plano Quinzenal',
    price: 13.90,
    durationDays: 15,
    description: 'Acesso completo para 15 dias de atendimentos.',
    badge: 'Flexível',
    features: [
      'Geração ilimitada de prontuários',
      'Gravação de voz e anexos de exames/receitas',
      'Adequação e-SUS PEC para todas as profissões',
      'Validade de 15 dias corridos',
    ],
    active: true,
  },
  {
    id: 'mensal',
    name: 'Plano Mensal',
    price: 19.90,
    durationDays: 30,
    description: 'O mais escolhido para a rotina diária das unidades.',
    badge: 'Mais Popular',
    features: [
      'Geração ilimitada de prontuários',
      'Gravação de voz e anexos de exames/receitas',
      'Histórico completo e Linha do Tempo',
      'Auditoria de Evolução Clínica Longitudinal com IA',
      'Validade de 30 dias corridos',
    ],
    active: true,
  },
  {
    id: 'anual',
    name: 'Plano Anual',
    price: 199.90,
    durationDays: 365,
    description: 'Máxima economia e tranquilidade para o ano todo.',
    badge: 'Melhor Custo-Benefício',
    features: [
      'Geração ilimitada durante 365 dias',
      'Economia equivalente a 2 meses grátis',
      'Acesso antecipado a novos modelos de IA',
      'Todas as atualizações do sistema incluídas',
      'Suporte prioritário',
    ],
    active: true,
  },
];

export function subscribeToSubscriptionPlans(
  onUpdate: (plans: SubscriptionPlan[]) => void,
  onError?: (err: Error) => void
) {
  onUpdate(DEFAULT_SUBSCRIPTION_PLANS);
  return () => {};
}

export async function saveSubscriptionPlanToFirestore(plan: SubscriptionPlan): Promise<void> {
  await apiDbSave('subscription_plans', plan);
}

export async function seedSubscriptionPlansIfEmpty(): Promise<void> {
  // handled by defaults
}

export async function saveSubscriptionRecord(record: SubscriptionRecord): Promise<void> {
  const data = {
    ...record,
    createdAt: record.createdAt || Date.now(),
  };
  await apiDbSave('subscriptions', data);
}

export async function deleteSubscriptionRecord(recordId: string): Promise<void> {
  await apiDbDelete('subscriptions', recordId);
}

export async function cleanupExpiredSubscriptions(): Promise<number> {
  let cleanedCount = 0;
  try {
    const res = await fetch('/api/subscriptions/cleanup-expired', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      cleanedCount += Number(data?.removedCount || 0);
    }
  } catch (err) {
    console.debug('Erro ao chamar limpeza no backend:', err);
  }
  return cleanedCount;
}

export function subscribeToSubscriptionRecord(
  subscriptionId: string,
  onUpdate: (sub: SubscriptionRecord | null) => void,
  onError?: (err: Error) => void
) {
  return createSupabaseSubscription<SubscriptionRecord>(
    'subscriptions',
    (rows) => rows,
    (items) => {
      const found = items.find((s) => s.id === subscriptionId);
      if (found) {
        if ((found.status === 'pendente' || found.status === 'expirado') && found.expiresAt && found.expiresAt <= Date.now()) {
          deleteSubscriptionRecord(subscriptionId).catch(() => {});
          onUpdate(null);
        } else {
          onUpdate(found);
        }
      } else {
        onUpdate(null);
      }
    }
  );
}

export function subscribeToSubscriptions(
  onUpdate: (subs: SubscriptionRecord[]) => void,
  onError?: (err: Error) => void
) {
  return createSupabaseSubscription<SubscriptionRecord>(
    'subscriptions',
    (rows) => {
      const now = Date.now();
      const valid: SubscriptionRecord[] = [];
      const expiredIds: string[] = [];
      for (const item of rows) {
        if ((item.status === 'pendente' || item.status === 'expirado') && item.expiresAt && item.expiresAt <= now) {
          expiredIds.push(item.id);
        } else {
          valid.push(item);
        }
      }
      if (expiredIds.length > 0) {
        expiredIds.forEach((id) => deleteSubscriptionRecord(id).catch(() => {}));
      }
      return valid.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    },
    onUpdate
  );
}

export async function getUserActivePendingSubscription(userId: string): Promise<SubscriptionRecord | null> {
  if (!userId) return null;
  const now = Date.now();

  try {
    const res = await fetch('/api/db/subscriptions');
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data?.data) ? data.data : [];
      let activeSub: SubscriptionRecord | null = null;

      for (const item of list) {
        if (item.userId === userId && item.status === 'pendente') {
          if (item.expiresAt && item.expiresAt <= now) {
            await deleteSubscriptionRecord(item.id);
          } else {
            if (!activeSub || (item.createdAt || 0) > (activeSub.createdAt || 0)) {
              activeSub = item;
            }
          }
        }
      }

      return activeSub;
    }
  } catch (err) {
    console.debug('Erro ao buscar assinatura pendente:', err);
  }

  return null;
}

export async function clearPendingSubscriptionsForUser(userId: string): Promise<void> {
  if (!userId) return;
  try {
    const list = await apiDbGet<SubscriptionRecord[]>('subscriptions');
    if (list && Array.isArray(list)) {
      for (const item of list) {
        if (item.userId === userId && item.status === 'pendente') {
          await deleteSubscriptionRecord(item.id);
        }
      }
    }
  } catch (err) {
    console.debug('Erro ao limpar assinaturas pendentes:', err);
  }
}

export async function updateUserFreeTrialUsed(userId: string): Promise<void> {
  try {
    const user = await apiDbGet<User[]>('users');
    const existing = (user || []).find((u) => u.id === userId);
    if (existing && !existing.lifetime_trial) {
      await saveUserToFirestore({ ...existing, free_used: true });
    }
  } catch (error) {
    console.debug('Erro ao atualizar free trial:', error);
  }
}

export async function resetUserSubscriptionAndPixForTesting(
  userId: string,
  options?: { resetFreeTrial?: boolean }
): Promise<User | null> {
  if (!userId) return null;

  await clearPendingSubscriptionsForUser(userId);

  const users = await apiDbGet<User[]>('users');
  const existing = (users || []).find((u) => u.id === userId);
  if (existing) {
    const updatedUser: User = {
      ...existing,
      subscription_status: 'free',
      subscription_expires_at: undefined,
      plan_name: undefined,
      free_used: options?.resetFreeTrial ? false : true,
      updatedAt: Date.now(),
    };
    await saveUserToFirestore(updatedUser);
    return updatedUser;
  }

  return null;
}

export async function updateUserSubscriptionDirectly(
  userId: string,
  status: 'free' | 'pendente' | 'pago',
  durationDays: number,
  planName: string
): Promise<void> {
  const users = await apiDbGet<User[]>('users');
  const existing = (users || []).find((u) => u.id === userId);
  if (existing) {
    const expiresAt = Date.now() + durationDays * 24 * 60 * 60 * 1000;
    await saveUserToFirestore({
      ...existing,
      subscription_status: status,
      subscription_expires_at: expiresAt,
      plan_name: planName,
    });
  }
}

// ================= SUS MEDICATIONS =================

export function subscribeToMedications(
  onUpdate: (medications: SUSMedication[]) => void,
  onError?: (err: Error) => void
) {
  onUpdate(OFFICIAL_SUS_MEDICATIONS);
  return () => {};
}

export async function saveMedicationToFirestore(medication: SUSMedication): Promise<void> {
  await apiDbSave('medications', medication);
}

export async function deleteMedicationFromFirestore(medicationId: string): Promise<void> {
  await apiDbDelete('medications', medicationId);
}

export async function seedMedicationsIfEmpty(): Promise<void> {
  // Handled statically / via API
}

export async function resetMedicationsToDefaults(): Promise<void> {
  // Handled statically
}

// ================= SUS EXAMS =================

export function subscribeToExams(
  onUpdate: (exams: SUSExam[]) => void,
  onError?: (err: Error) => void
) {
  onUpdate(OFFICIAL_SUS_EXAMS);
  return () => {};
}

export async function saveExamToFirestore(exam: SUSExam): Promise<void> {
  await apiDbSave('exams', exam);
}

export async function deleteExamFromFirestore(examId: string): Promise<void> {
  await apiDbDelete('exams', examId);
}

export async function seedExamsIfEmpty(): Promise<void> {
  // Handled statically / via API
}

export async function resetExamsToDefaults(): Promise<void> {
  // Handled statically
}

// ================= APPOINTMENTS & SCHEDULING =================

export function subscribeToAppointments(
  onUpdate: (appointments: Appointment[]) => void,
  onError?: (err: Error) => void
) {
  return createSupabaseSubscription<Appointment>(
    'appointments',
    (rows) =>
      rows
        .filter((a) => {
          if (isMockAppointment(a)) {
            if (a.id) deleteAppointmentFromFirestore(a.id).catch(() => {});
            return false;
          }
          return true;
        })
        .sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    onUpdate
  );
}

export async function saveAppointmentToFirestore(appointment: Appointment): Promise<void> {
  const data: Appointment = {
    ...appointment,
    updatedAt: Date.now(),
    createdAt: appointment.createdAt || Date.now(),
  };
  await apiDbSave('appointments', data);

  // Agendamento Isento / Gratuito - Disparo automático não-bloqueante para webhook n8n
  const isGratuito =
    appointment.paymentMethod === 'gratuito' ||
    appointment.paymentStatus === 'isento' ||
    appointment.servicePrice === 0 ||
    !appointment.servicePrice;

  if (isGratuito) {
    try {
      const webhookPayload = {
        event: 'appointment_confirmed',
        id: appointment.id,
        patientName: appointment.patientName,
        patientPhone: appointment.patientPhone,
        patientEmail: appointment.patientEmail,
        patientCpf: appointment.patientCpf,
        date: appointment.date,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        serviceName: appointment.serviceName,
        serviceDurationMinutes: appointment.serviceDurationMinutes,
        professionalName: appointment.professionalName,
        professionalProfession: appointment.professionalProfession,
        paymentMethod: appointment.paymentMethod || 'gratuito',
        paymentStatus: appointment.paymentStatus || 'isento',
        status: appointment.status || 'agendado',
        source: appointment.source || 'portal_publico',
        referenceUbs: appointment.patientReferenceUbs || (appointment as any).referenceUbs || null,
        referenceUbsContact: appointment.patientReferenceUbsContact || (appointment as any).referenceUbsContact || null,
        acsName: appointment.patientAcsName || (appointment as any).acsName || null,
        acsContact: appointment.patientAcsContact || (appointment as any).acsContact || null,
        ubsReferencia: appointment.patientReferenceUbs || (appointment as any).referenceUbs || null,
        ubsContato: appointment.patientReferenceUbsContact || (appointment as any).referenceUbsContact || null,
        acs: appointment.patientAcsName || (appointment as any).acsName || null,
        acsContato: appointment.patientAcsContact || (appointment as any).acsContact || null,
        reference_ubs: appointment.patientReferenceUbs || (appointment as any).referenceUbs || null,
        reference_ubs_contact: appointment.patientReferenceUbsContact || (appointment as any).referenceUbsContact || null,
        acs_name: appointment.patientAcsName || (appointment as any).acsName || null,
        acs_contact: appointment.patientAcsContact || (appointment as any).acsContact || null,
      };

      fetch('https://n8n.mentoriajrs.com/webhook/pec-appointment-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
      }).catch(() => {});
    } catch {}
  }
}

export async function updateAppointmentStatusInFirestore(
  appointmentId: string,
  status: AppointmentStatus,
  extraFields?: Partial<Appointment>
): Promise<void> {
  const updateData: Record<string, any> = {
    id: appointmentId,
    status,
    updatedAt: Date.now(),
    ...(extraFields || {}),
  };
  await apiDbSave('appointments', updateData);
}

export async function deleteAppointmentFromFirestore(appointmentId: string): Promise<void> {
  await apiDbDelete('appointments', appointmentId);
}

// ================= PIX TRANSACTIONS & PATIENT WALLET =================

export async function savePixTransaction(transaction: PixTransactionRecord): Promise<void> {
  await apiDbSave('subscriptions', transaction);
}

export function subscribeToPixTransaction(
  transactionId: string,
  onUpdate: (tx: PixTransactionRecord | null) => void,
  onError?: (err: Error) => void
) {
  return createSupabaseSubscription<PixTransactionRecord>(
    'subscriptions',
    (rows) => rows,
    (items) => {
      const found = items.find((s) => s.id === transactionId);
      onUpdate(found || null);
    }
  );
}

export async function updatePixTransactionStatus(
  transactionId: string,
  status: 'pendente' | 'pago' | 'expirado' | 'utilizado',
  extra?: Record<string, any>
): Promise<void> {
  const updateData = {
    id: transactionId,
    status,
    updatedAt: Date.now(),
    ...(extra || {}),
  };
  await apiDbSave('subscriptions', updateData);
}

export async function getPatientByCpf(cpf: string): Promise<Patient | null> {
  const cleanCpf = cpf.replace(/\D/g, '');
  if (!cleanCpf) return null;
  try {
    const list = await apiDbGet<Patient[]>('patients');
    if (list && Array.isArray(list)) {
      for (const p of list) {
        const pCpf = (p.cpf || '').replace(/\D/g, '');
        if (pCpf === cleanCpf) return p;
      }
    }
  } catch {}
  return null;
}

export async function creditPatientBalance(
  patientCpf: string,
  amount: number,
  patientData?: Partial<Patient>
): Promise<{ newBalance: number; patientId: string }> {
  const cleanCpf = patientCpf.replace(/\D/g, '');
  const existing = await getPatientByCpf(cleanCpf);

  if (existing) {
    const currentBalance = Number(existing.balance || 0);
    const newBalance = Math.round((currentBalance + amount) * 100) / 100;
    const updated = {
      ...existing,
      balance: newBalance,
      updatedAt: Date.now(),
    };
    await savePatientToFirestore(updated);
    return { newBalance, patientId: existing.id };
  } else {
    const newId = `pat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newPatient: Patient = {
      id: newId,
      fullName: patientData?.fullName || 'Paciente',
      cpf: patientData?.cpf || cleanCpf,
      cns: patientData?.cns || '',
      phone: patientData?.phone || '',
      birthDate: patientData?.birthDate || '',
      gender: patientData?.gender || 'Feminino',
      balance: Math.round(amount * 100) / 100,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await savePatientToFirestore(newPatient);
    return { newBalance: newPatient.balance!, patientId: newId };
  }
}

export async function deductPatientBalance(
  patientId: string,
  amount: number
): Promise<number> {
  const patients = await apiDbGet<Patient[]>('patients');
  const patient = (patients || []).find((p) => p.id === patientId);
  if (!patient) return 0;
  const current = Number(patient.balance || 0);
  const newBalance = Math.max(0, Math.round((current - amount) * 100) / 100);
  await savePatientToFirestore({
    ...patient,
    balance: newBalance,
    updatedAt: Date.now(),
  });
  return newBalance;
}

// ================= RECEPTION QUEUE (FILA DE ATENDIMENTO) =================

export function subscribeToReceptionQueue(
  onUpdate: (items: ReceptionQueueItem[]) => void,
  onError?: (err: Error) => void
) {
  return createSupabaseSubscription<ReceptionQueueItem>(
    'reception_queue',
    (rows) =>
      rows
        .filter((q) => {
          if (isMockQueueItem(q)) {
            if (q.id) deleteQueueItemFromFirestore(q.id).catch(() => {});
            return false;
          }
          return true;
        })
        .sort((a, b) => {
          const orderA = a.orderIndex !== undefined ? a.orderIndex : (Number(a.timestamp) || 0);
          const orderB = b.orderIndex !== undefined ? b.orderIndex : (Number(b.timestamp) || 0);
          return orderA - orderB;
        }),
    onUpdate
  );
}

export async function saveQueueItemToFirestore(item: ReceptionQueueItem): Promise<void> {
  const data: ReceptionQueueItem = {
    ...item,
    updatedAt: Date.now(),
    createdAt: item.createdAt || Date.now(),
  };
  await apiDbSave('reception_queue', data);
}

export async function updateQueueItemStatusInFirestore(
  itemId: string,
  status: QueueItemStatus,
  extraFields?: Partial<ReceptionQueueItem>
): Promise<void> {
  // Query existing item to preserve patient and queue metadata in raw_data and SQL
  let existingItem: any = null;
  try {
    const { data: row } = await supabase.from('reception_queue').select('*').eq('id', itemId).maybeSingle();
    if (row) {
      existingItem = row.raw_data && typeof row.raw_data === 'object' ? { ...row.raw_data, ...row } : row;
    }
  } catch {}

  const mergedItem: Record<string, any> = {
    ...(existingItem || {}),
    id: itemId,
    status,
    updatedAt: Date.now(),
    ...(status === 'calling' ? { calledAt: extraFields?.calledAt || Date.now() } : {}),
    ...(status === 'completed' ? { completedAt: extraFields?.completedAt || Date.now(), attendedAt: extraFields?.attendedAt || Date.now() } : {}),
    ...(extraFields || {}),
  };
  await apiDbSave('reception_queue', mergedItem);
}

export async function deleteQueueItemFromFirestore(itemId: string): Promise<void> {
  await apiDbDelete('reception_queue', itemId);
}

// Fresh snapshot fetchers to guarantee queue operations always start from the latest state
export async function fetchLatestQueueFromFirestore(): Promise<ReceptionQueueItem[]> {
  try {
    const list = await apiDbGet<ReceptionQueueItem[]>('reception_queue');
    if (list && Array.isArray(list)) {
      return list
        .filter((q) => !isMockQueueItem(q))
        .sort((a, b) => {
          const orderA = a.orderIndex !== undefined ? a.orderIndex : (Number(a.timestamp) || 0);
          const orderB = b.orderIndex !== undefined ? b.orderIndex : (Number(b.timestamp) || 0);
          return orderA - orderB;
        });
    }
  } catch (err) {
    console.warn('Erro ao carregar fila atualizada:', err);
  }
  return [];
}

export async function fetchLatestAppointmentsFromFirestore(): Promise<Appointment[]> {
  try {
    const list = await apiDbGet<Appointment[]>('appointments');
    if (list && Array.isArray(list)) {
      return list
        .filter((a) => !isMockAppointment(a))
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    }
  } catch (err) {
    console.warn('Erro ao carregar agendamentos atualizados:', err);
  }
  return [];
}

// Attendance Locking: Prevents concurrent attendance by multiple professionals on the same patient
export async function acquirePatientAttendanceLock(
  queueItemId: string,
  professionalId: string,
  professionalName: string,
  fallbackItem?: ReceptionQueueItem
): Promise<{ success: boolean; lockedBy?: string; queueItem?: ReceptionQueueItem }> {
  try {
    let item: ReceptionQueueItem | undefined;

    // 1. Try to find in fresh remote queue snapshot
    try {
      const latestQueue = await fetchLatestQueueFromFirestore();
      item = latestQueue.find((q) => q.id === queueItemId || q.appointmentId === queueItemId);
    } catch {}

    // 2. If not found in queue, check fresh appointments snapshot
    if (!item) {
      try {
        const latestApps = await fetchLatestAppointmentsFromFirestore();
        const app = latestApps.find((a) => a.id === queueItemId || `queue_${a.id}` === queueItemId);
        if (app) {
          item = {
            id: app.id,
            patientId: app.patientId || `pat-${app.id}`,
            patientName: app.patientName || 'Paciente Agendado',
            patientCpf: app.patientCpf,
            patientCns: app.patientCns,
            patientBirthDate: app.patientBirthDate,
            patientPhone: app.patientPhone,
            professionalId: app.professionalId || professionalId,
            professionalName: app.professionalName || professionalName,
            professionalProfession: app.professionalProfession || 'enfermeiro',
            scheduledDate: app.date,
            scheduledTime: app.startTime || '08:00',
            timestamp: app.timestamp || Date.now(),
            formattedDateTime: (app as any).formattedDateTime || `${app.date || ''} ${app.startTime || ''}`.trim(),
            status: (app.status === 'em_atendimento' ? 'in_service' : 'waiting') as QueueItemStatus,
            origin: 'agendamento',
            priorityCategory: 'padrao',
            appointmentId: app.id,
            notes: app.notes,
            createdAt: app.createdAt || Date.now(),
            updatedAt: Date.now(),
          };
        }
      } catch {}
    }

    // 3. Fallback to provided item in state
    if (!item && fallbackItem) {
      item = fallbackItem;
    }

    if (!item) {
      // If no item found anywhere, allow attendance without lock failure
      return { success: true };
    }

    // 4. Check if currently attended by ANOTHER professional
    const isCurrentlyAttended = item.status === 'in_consultation' || item.status === 'in_service';
    const attendedByAnother =
      isCurrentlyAttended &&
      item.currentAttendingProfessionalId &&
      item.currentAttendingProfessionalId !== professionalId &&
      item.currentAttendingProfessionalName &&
      item.currentAttendingProfessionalName.toLowerCase().trim() !== professionalName.toLowerCase().trim();

    if (attendedByAnother) {
      return {
        success: false,
        lockedBy: item.currentAttendingProfessionalName || item.professionalName || 'outro profissional',
        queueItem: item,
      };
    }

    // 5. Acquire lock and mark in_service
    const updated: ReceptionQueueItem = {
      ...item,
      status: 'in_service',
      currentAttendingProfessionalId: professionalId,
      currentAttendingProfessionalName: professionalName,
      attendingStartedAt: Date.now(),
      attendedAt: item.attendedAt || Date.now(),
      version: (item.version || 0) + 1,
      updatedAt: Date.now(),
    };

    await saveQueueItemToFirestore(updated).catch(console.warn);
    return { success: true, queueItem: updated };
  } catch (err) {
    console.warn('Erro ao adquirir trava de atendimento:', err);
    return { success: true };
  }
}

export async function releasePatientAttendanceLock(
  queueItemId: string,
  newStatus: QueueItemStatus = 'completed',
  extraFields?: Partial<ReceptionQueueItem>
): Promise<void> {
  try {
    await updateQueueItemStatusInFirestore(queueItemId, newStatus, {
      ...(newStatus === 'completed' ? { completedAt: Date.now() } : {}),
      ...(extraFields || {}),
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.warn('Erro ao liberar trava de atendimento:', err);
  }
}
