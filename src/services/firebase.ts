import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Patient, Consultation, KnowledgeItem, User, SystemSettings, SubscriptionPlan, SubscriptionRecord, PixTransactionRecord, SUSMedication, SUSExam, Appointment, AppointmentStatus, ReceptionQueueItem, QueueItemStatus, EvolutionSummary, ExamMediaReportData } from '../types';
import { ADMIN_MASTER_EMAIL, LEGACY_MOCK_USER_IDS, LEGACY_MOCK_USER_NAMES } from '../data/professions';
import { OFFICIAL_SUS_MEDICATIONS } from '../data/susMedications';
import { OFFICIAL_SUS_EXAMS } from '../data/susExams';
import { normalizeSubscriptionExpiresAt } from '../utils/pixExpiration';

// Initialize Firebase App singleton
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const rawConfig = firebaseConfig as Record<string, any>;
const databaseId = (rawConfig.firestoreDatabaseId && String(rawConfig.firestoreDatabaseId).trim().length > 0)
  ? String(rawConfig.firestoreDatabaseId).trim()
  : undefined;

// Export Firestore db instance referencing the configured named database
export const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Safe background connection check that does not throw or trigger false offline warnings
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDoc(doc(db, 'test', 'connection'));
    return true;
  } catch {
    return false;
  }
}
setTimeout(() => {
  testFirestoreConnection().catch(() => {});
}, 1500);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Helper to deeply remove undefined fields before writing to Firestore
function sanitizeForFirestore(val: any): any {
  if (val === undefined) {
    return null;
  }
  if (val === null || typeof val !== 'object') {
    return val;
  }
  if (Array.isArray(val)) {
    return val
      .map((item) => sanitizeForFirestore(item))
      .filter((item) => item !== undefined);
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(val)) {
    if (value !== undefined) {
      clean[key] = sanitizeForFirestore(value);
    }
  }
  return clean;
}

// Full-Stack Server Storage API Helpers (dual-sync with server backend)
async function apiDbGet<T>(colName: string): Promise<T | null> {
  try {
    const res = await fetch(`/api/db/${colName}`);
    if (res.ok) {
      const json = await res.json();
      return json.data as T;
    }
  } catch {
    // offline / fallback
  }
  return null;
}

async function apiDbSave<T>(colName: string, item: T): Promise<void> {
  try {
    await fetch(`/api/db/${colName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
  } catch {
    // ignore
  }
}

async function apiDbDelete(colName: string, id: string): Promise<void> {
  try {
    await fetch(`/api/db/${colName}/${id}`, {
      method: 'DELETE',
    });
  } catch {
    // ignore
  }
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
  if (docId && LEGACY_MOCK_USER_IDS.includes(docId)) return true;
  if (u.id && LEGACY_MOCK_USER_IDS.includes(u.id)) return true;
  if (u.name && LEGACY_MOCK_USER_NAMES.includes(u.name.trim())) return true;
  const email = (typeof u.email === 'string' ? u.email : '').toLowerCase().trim();
  if (email && LEGACY_MOCK_EMAILS.includes(email)) return true;
  return false;
}

// ================= USERS & RBAC =================

export function subscribeToUsers(
  onUpdate: (users: User[]) => void,
  onError?: (err: Error) => void
) {
  // 1. Instantly pull from Server Persistent Store on startup
  apiDbGet<User[]>('users').then((serverUsers) => {
    if (serverUsers && Array.isArray(serverUsers) && serverUsers.length > 0) {
      const cleaned = serverUsers.filter((u) => !isMockUser(u, u.id)).map((u) => ({
        ...u,
        subscription_expires_at: normalizeSubscriptionExpiresAt(u.subscription_expires_at),
      }));
      if (cleaned.length > 0) {
        onUpdate(cleaned);
      }
    }
  }).catch(() => {});

  // 2. Real-time Firestore stream listener
  const q = collection(db, 'users');
  return onSnapshot(
    q,
    (snapshot) => {
      const items: User[] = [];
      snapshot.forEach((docSnap) => {
        const u = docSnap.data() as User;
        // Purge mock users from appearing in UI
        if (isMockUser(u, docSnap.id)) {
          return;
        }
        // Guarantee master admin email always has admin role
        const role =
          u.email && typeof u.email === 'string' && u.email.toLowerCase().trim() === ADMIN_MASTER_EMAIL.toLowerCase()
            ? 'admin'
            : u.role || 'user';
        const normExpiresAt = normalizeSubscriptionExpiresAt(u.subscription_expires_at);
        items.push({
          ...u,
          id: docSnap.id,
          role,
          subscription_expires_at: normExpiresAt,
        });
      });
      // Sort descending by creation date safely
      items.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
      if (items.length > 0) {
        onUpdate(items);
      }
    },
    (error) => {
      console.debug('Firestore users subscription status:', error?.message || error);
      onError?.(error);
    }
  );
}

export async function fetchAllUsersFromFirestore(): Promise<User[]> {
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    const items: User[] = [];
    usersSnap.forEach((docSnap) => {
      const u = docSnap.data() as User;
      if (isMockUser(u, docSnap.id)) {
        return;
      }
      const role =
        u.email && typeof u.email === 'string' && u.email.toLowerCase().trim() === ADMIN_MASTER_EMAIL.toLowerCase()
          ? 'admin'
          : u.role || 'user';
      const normExpiresAt = normalizeSubscriptionExpiresAt(u.subscription_expires_at);
      items.push({
        ...u,
        id: docSnap.id,
        role,
        subscription_expires_at: normExpiresAt,
      });
    });
    items.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
    if (items.length > 0) {
      for (const item of items) {
        apiDbSave('users', item).catch(() => {});
      }
      return items;
    }
  } catch (error) {
    console.debug('Busca de usuários no Firestore operando com cache/servidor:', error);
  }

  // Fallback to server store
  const serverUsers = await apiDbGet<User[]>('users');
  const serverList = (serverUsers || []).filter((u) => !isMockUser(u, u.id));
  return serverList.length > 0 ? serverList : [];
}

export async function saveUserToFirestore(user: User): Promise<void> {
  const path = `users/${user.id}`;
  const role =
    user.email && typeof user.email === 'string' && user.email.toLowerCase().trim() === ADMIN_MASTER_EMAIL.toLowerCase()
      ? 'admin'
      : user.role || 'user';

  const data = sanitizeForFirestore({
    ...user,
    role,
    createdAt: user.createdAt || Date.now(),
  });

  // Save to server persistent store immediately
  await apiDbSave('users', data);

  try {
    const userRef = doc(db, 'users', user.id);
    await setDoc(userRef, data, { merge: true });
  } catch (error) {
    console.debug('Firestore write:', error);
  }
}

export async function deleteUserFromFirestore(userId: string): Promise<void> {
  const path = `users/${userId}`;
  await apiDbDelete('users', userId);
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (error) {
    console.debug('Firestore delete:', error);
  }
}

// ================= SYSTEM SETTINGS =================

export function subscribeToSystemSettings(
  onUpdate: (settings: SystemSettings) => void,
  onError?: (err: Error) => void
) {
  // Pull from server persistent store on boot
  apiDbGet<SystemSettings>('settings').then((serverSettings) => {
    if (serverSettings && Object.keys(serverSettings).length > 0) {
      onUpdate(serverSettings);
    }
  }).catch(() => {});

  const docRef = doc(db, 'system_settings', 'global');
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data() as SystemSettings);
      }
    },
    (error) => {
      console.debug('Firestore system_settings status:', error?.message || error);
      onError?.(error);
    }
  );
}

export async function saveSystemSettingsToFirestore(settings: SystemSettings): Promise<void> {
  const data = sanitizeForFirestore({
    ...settings,
    updatedAt: Date.now(),
  });
  await apiDbSave('settings', data);

  try {
    const docRef = doc(db, 'system_settings', 'global');
    await setDoc(docRef, data, { merge: true });
  } catch (error) {
    console.debug('Firestore settings write:', error);
  }
}

// ================= PATIENTS =================

export function subscribeToPatients(
  onUpdate: (patients: Patient[]) => void,
  onError?: (err: Error) => void
) {
  apiDbGet<Patient[]>('patients').then((serverPatients) => {
    if (serverPatients && Array.isArray(serverPatients)) {
      onUpdate(serverPatients);
    }
  }).catch(() => {});

  const q = query(collection(db, 'patients'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Patient[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ ...(docSnap.data() as Patient), id: docSnap.id });
      });
      if (items.length > 0) {
        onUpdate(items);
      }
    },
    (error) => {
      console.debug('Firestore patients status:', error?.message || error);
      onError?.(error);
    }
  );
}

export async function savePatientToFirestore(patient: Patient): Promise<void> {
  const data = sanitizeForFirestore({
    ...patient,
    createdAt: patient.createdAt || Date.now(),
    updatedAt: Date.now(),
  });
  await apiDbSave('patients', data);

  try {
    const patientRef = doc(db, 'patients', patient.id);
    await setDoc(patientRef, data, { merge: true });
  } catch (error) {
    console.debug('Firestore patient write:', error);
  }
}

export async function deletePatientFromFirestore(patientId: string): Promise<void> {
  await apiDbDelete('patients', patientId);
  try {
    await deleteDoc(doc(db, 'patients', patientId));
  } catch (error) {
    console.debug('Firestore patient delete:', error);
  }
}

// ================= CONSULTATIONS (PRONTUÁRIO) =================

export function subscribeToConsultations(
  onUpdate: (consultations: Consultation[]) => void,
  onError?: (err: Error) => void
) {
  apiDbGet<Consultation[]>('consultations').then((serverCons) => {
    if (serverCons && Array.isArray(serverCons)) {
      onUpdate(serverCons);
    }
  }).catch(() => {});

  const q = query(collection(db, 'consultations'), orderBy('timestamp', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Consultation[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ ...(docSnap.data() as Consultation), id: docSnap.id });
      });
      if (items.length > 0) {
        onUpdate(items);
      }
    },
    (error) => {
      console.debug('Firestore consultations status:', error?.message || error);
      onError?.(error);
    }
  );
}

export async function saveConsultationToFirestore(consultation: Consultation): Promise<void> {
  const data = sanitizeForFirestore({
    ...consultation,
    timestamp: consultation.timestamp || Date.now(),
  });

  // 1. Immediately persist to localStorage for zero-loss guarantee
  try {
    const saved = localStorage.getItem('pec_consultations');
    const list: Consultation[] = saved ? JSON.parse(saved) : [];
    const idx = list.findIndex((c) => c.id === consultation.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...consultation };
    } else {
      list.unshift(consultation);
    }
    localStorage.setItem('pec_consultations', JSON.stringify(list));
  } catch {}

  // 2. Persist to server storage
  await apiDbSave('consultations', data);

  // 3. Persist to Cloud Firestore
  try {
    const consultationRef = doc(db, 'consultations', consultation.id);
    await setDoc(consultationRef, data, { merge: true });
  } catch (error) {
    console.debug('Firestore consultation write:', error);
  }
}

export async function deleteConsultationFromFirestore(consultationId: string): Promise<void> {
  try {
    const saved = localStorage.getItem('pec_consultations');
    if (saved) {
      const list: Consultation[] = JSON.parse(saved);
      const filtered = list.filter((c) => c.id !== consultationId);
      localStorage.setItem('pec_consultations', JSON.stringify(filtered));
    }
  } catch {}
  await apiDbDelete('consultations', consultationId);
  try {
    await deleteDoc(doc(db, 'consultations', consultationId));
  } catch (error) {
    console.debug('Firestore consultation delete:', error);
  }
}

// ================= CLINICAL EVOLUTIONS (EVOLUÇÃO LONGITUDINAL IA) =================

export async function saveClinicalEvolutionToFirestore(evolution: EvolutionSummary): Promise<void> {
  const data = sanitizeForFirestore({
    ...evolution,
    id: evolution.patientId,
    generatedAt: evolution.generatedAt || Date.now(),
  });
  await apiDbSave('clinical_evolutions', data);

  try {
    const docRef = doc(db, 'clinical_evolutions', evolution.patientId);
    await setDoc(docRef, data, { merge: true });
  } catch (error) {
    console.debug('Firestore clinical evolution write:', error);
  }
}

export async function getClinicalEvolutionFromFirestore(patientId: string): Promise<EvolutionSummary | null> {
  if (!patientId) return null;
  // Check local server store first
  try {
    const serverEvolutions = await apiDbGet<EvolutionSummary[]>('clinical_evolutions');
    if (serverEvolutions && Array.isArray(serverEvolutions)) {
      const found = serverEvolutions.find((e) => e.patientId === patientId || (e as any).id === patientId);
      if (found) return found;
    }
  } catch {
    // continue to Firestore
  }

  try {
    const docSnap = await getDoc(doc(db, 'clinical_evolutions', patientId));
    if (docSnap.exists()) {
      return { ...(docSnap.data() as EvolutionSummary), id: docSnap.id };
    }
  } catch (error) {
    console.debug('Firestore clinical evolution fetch:', error);
  }
  return null;
}

// ================= EXAM MEDIA & VIDEO REPORTS (ANEXO ICONOGRÁFICO A4) =================

export async function saveExamMediaToFirestore(mediaReport: ExamMediaReportData): Promise<void> {
  const data = sanitizeForFirestore({
    ...mediaReport,
    createdAt: mediaReport.createdAt || Date.now(),
  });
  await apiDbSave('exam_media', data);

  try {
    const docRef = doc(db, 'exam_media', mediaReport.id);
    await setDoc(docRef, data, { merge: true });
  } catch (error) {
    console.debug('Firestore exam media write:', error);
  }
}

export async function getExamMediaFromFirestore(mediaId: string): Promise<ExamMediaReportData | null> {
  if (!mediaId) return null;
  // Local store first
  try {
    const serverItems = await apiDbGet<ExamMediaReportData[]>('exam_media');
    if (serverItems && Array.isArray(serverItems)) {
      const found = serverItems.find((m) => m.id === mediaId);
      if (found) return found;
    }
  } catch {
    // continue
  }

  try {
    const docSnap = await getDoc(doc(db, 'exam_media', mediaId));
    if (docSnap.exists()) {
      return { ...(docSnap.data() as ExamMediaReportData), id: docSnap.id };
    }
  } catch (error) {
    console.debug('Firestore exam media fetch:', error);
  }
  return null;
}

export async function getPatientExamMediaReports(patientId: string): Promise<ExamMediaReportData[]> {
  if (!patientId) return [];
  const results: ExamMediaReportData[] = [];

  // Local store
  try {
    const serverItems = await apiDbGet<ExamMediaReportData[]>('exam_media');
    if (serverItems && Array.isArray(serverItems)) {
      const filtered = serverItems.filter((m) => m.patientId === patientId);
      results.push(...filtered);
    }
  } catch {
    // continue
  }

  try {
    const q = query(collection(db, 'exam_media'), where('patientId', '==', patientId));
    const snap = await getDocs(q);
    snap.forEach((docSnap) => {
      const data = { ...(docSnap.data() as ExamMediaReportData), id: docSnap.id };
      if (!results.some((r) => r.id === data.id)) {
        results.push(data);
      }
    });
  } catch (error) {
    console.debug('Firestore query patient exam media:', error);
  }

  return results.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteExamMediaFromFirestore(mediaId: string): Promise<void> {
  await apiDbDelete('exam_media', mediaId);
  try {
    await deleteDoc(doc(db, 'exam_media', mediaId));
  } catch (error) {
    console.debug('Firestore delete exam media:', error);
  }
}

// ================= KNOWLEDGE BASE =================

export function subscribeToKnowledgeItems(
  onUpdate: (items: KnowledgeItem[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(collection(db, 'knowledge_items'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: KnowledgeItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ ...(docSnap.data() as KnowledgeItem), id: docSnap.id });
      });
      onUpdate(items);
    },
    (error) => {
      console.debug('Firestore knowledge subscription error:', error);
      onError?.(error);
    }
  );
}

export async function saveKnowledgeItemToFirestore(item: KnowledgeItem): Promise<void> {
  const path = `knowledge_items/${item.id}`;
  try {
    const itemRef = doc(db, 'knowledge_items', item.id);
    const data = sanitizeForFirestore({
      ...item,
      createdAt: item.createdAt || Date.now(),
    });
    await setDoc(itemRef, data, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteKnowledgeItemFromFirestore(itemId: string): Promise<void> {
  const path = `knowledge_items/${itemId}`;
  try {
    await deleteDoc(doc(db, 'knowledge_items', itemId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ================= INITIAL SEEDING & PURGE MOCK DATA =================

const LEGACY_MOCK_PATIENT_IDS = ['pat-lucas-oliveira', 'pat-maria-aparecida', 'pat-gabriel-souza'];
const LEGACY_MOCK_CONSULTATION_IDS = ['cons-lucas-1', 'cons-lucas-2', 'cons-lucas-3', 'cons-lucas-4'];

export async function purgeLegacyMockDataFromFirestore(): Promise<void> {
  try {
    const batch = writeBatch(db);
    let count = 0;

    for (const patId of LEGACY_MOCK_PATIENT_IDS) {
      batch.delete(doc(db, 'patients', patId));
      count++;
    }

    for (const consId of LEGACY_MOCK_CONSULTATION_IDS) {
      batch.delete(doc(db, 'consultations', consId));
      count++;
    }

    for (const uId of LEGACY_MOCK_USER_IDS) {
      batch.delete(doc(db, 'users', uId));
      count++;
    }

    // Also scan existing users in Firestore and delete any mock user matching names, IDs, or mock emails
    const usersSnap = await getDocs(collection(db, 'users'));
    usersSnap.forEach((uDoc) => {
      const uData = uDoc.data() as User;
      if (isMockUser(uData, uDoc.id)) {
        batch.delete(doc(db, 'users', uDoc.id));
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
      console.log('Dados mockados excluídos do banco de dados Cloud Firestore com sucesso.');
    }
  } catch (error) {
    console.debug('Nota sobre remoção de dados mockados no Firestore:', error);
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
    // Purge any residual legacy mock data first
    await purgeLegacyMockDataFromFirestore();

    // 1. Seed & initialize team users into Firestore if not present
    const usersSnap = await getDocs(collection(db, 'users'));
    const existingUserIds = new Set(usersSnap.docs.map((d) => d.id));
    const existingEmails = new Set(
      usersSnap.docs
        .map((d) => (typeof d.data().email === 'string' ? d.data().email.toLowerCase().trim() : ''))
        .filter(Boolean)
    );

    if (defaultUsers && defaultUsers.length > 0) {
      const userBatch = writeBatch(db);
      let newUsersCount = 0;
      for (const defUser of defaultUsers) {
        const emailKey = typeof defUser.email === 'string' ? defUser.email.toLowerCase().trim() : '';
        if (!existingUserIds.has(defUser.id) && (!emailKey || !existingEmails.has(emailKey))) {
          const role =
            emailKey === ADMIN_MASTER_EMAIL.toLowerCase()
              ? 'admin'
              : defUser.role || 'user';
          const userData = {
            ...defUser,
            role,
            subscription_status: role === 'admin' ? 'pago' : defUser.subscription_status || 'free',
            free_used: role === 'admin' ? true : Boolean(defUser.free_used),
            ...(role === 'admin' ? { subscription_expires_at: new Date('2099-12-31').getTime() } : {}),
          };
          userBatch.set(doc(db, 'users', defUser.id), sanitizeForFirestore(userData));
          newUsersCount++;
        }
      }
      if (newUsersCount > 0) {
        await userBatch.commit();
        console.log(`Inicializados ${newUsersCount} profissionais da equipe no Firestore.`);
      }
    }

    // 2. Migração/Inicialização: Garante campos de assinatura para usuários já existentes
    usersSnap.forEach(async (uDoc) => {
      const data = uDoc.data();
      if (
        !LEGACY_MOCK_USER_IDS.includes(uDoc.id) &&
        !LEGACY_MOCK_USER_NAMES.includes(data.name) &&
        (data.subscription_status === undefined || data.free_used === undefined)
      ) {
        const role =
          typeof data.email === 'string' && data.email.toLowerCase().trim() === ADMIN_MASTER_EMAIL.toLowerCase()
            ? 'admin'
            : data.role || 'user';
        const updates: Record<string, any> = {};
        if (data.subscription_status === undefined) {
          updates.subscription_status = role === 'admin' ? 'pago' : 'free';
        }
        if (data.free_used === undefined) {
          updates.free_used = role === 'admin' ? true : false;
        }
        if (role === 'admin' && data.subscription_expires_at === undefined) {
          updates.subscription_expires_at = new Date('2099-12-31').getTime();
        }
        await setDoc(doc(db, 'users', uDoc.id), updates, { merge: true });
      }
    });

    const settingsSnap = await getDoc(doc(db, 'system_settings', 'global'));
    if (!settingsSnap.exists() && defaultSettings) {
      await setDoc(doc(db, 'system_settings', 'global'), sanitizeForFirestore(defaultSettings));
    }

    const knowledgeSnap = await getDocs(collection(db, 'knowledge_items'));
    if (knowledgeSnap.empty && defaultKnowledge && defaultKnowledge.length > 0) {
      const batch = writeBatch(db);
      for (const k of defaultKnowledge) {
        batch.set(doc(db, 'knowledge_items', k.id), sanitizeForFirestore(k));
      }
      await batch.commit();
    }

    // Seed official SUS medications and exams catalog
    await seedMedicationsIfEmpty();
    await seedExamsIfEmpty();
  } catch (error) {
    // Initialized or using server fallback
  }
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
  const q = collection(db, 'subscription_plans');
  return onSnapshot(
    q,
    (snapshot) => {
      const firestoreMap = new Map<string, SubscriptionPlan>();
      snapshot.forEach((docSnap) => {
        firestoreMap.set(docSnap.id, { ...(docSnap.data() as SubscriptionPlan), id: docSnap.id });
      });

      // Mescla planos padrão com os salvos no Firestore
      const items: SubscriptionPlan[] = [];
      const seenIds = new Set<string>();

      for (const defPlan of DEFAULT_SUBSCRIPTION_PLANS) {
        if (firestoreMap.has(defPlan.id)) {
          items.push(firestoreMap.get(defPlan.id)!);
        } else {
          items.push(defPlan);
        }
        seenIds.add(defPlan.id);
      }

      firestoreMap.forEach((plan, id) => {
        if (!seenIds.has(id)) {
          items.push(plan);
        }
      });

      // Ordena por preço crescente
      items.sort((a, b) => a.price - b.price);
      onUpdate(items);
    },
    (error) => {
      console.debug('Firestore subscription_plans subscription error:', error);
      onError?.(error);
      onUpdate(DEFAULT_SUBSCRIPTION_PLANS);
    }
  );
}

export async function saveSubscriptionPlanToFirestore(plan: SubscriptionPlan): Promise<void> {
  const path = `subscription_plans/${plan.id}`;
  try {
    const planRef = doc(db, 'subscription_plans', plan.id);
    const data = sanitizeForFirestore({ ...plan });
    await setDoc(planRef, data, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function seedSubscriptionPlansIfEmpty(): Promise<void> {
  try {
    const plansSnap = await getDocs(collection(db, 'subscription_plans'));
    const existingIds = new Set(plansSnap.docs.map((d) => d.id));
    const batch = writeBatch(db);
    let needCommit = false;

    for (const p of DEFAULT_SUBSCRIPTION_PLANS) {
      if (!existingIds.has(p.id)) {
        batch.set(doc(db, 'subscription_plans', p.id), sanitizeForFirestore(p));
        needCommit = true;
      }
    }

    if (needCommit) {
      await batch.commit();
      console.log('Planos de assinatura complementares inicializados no Firestore.');
    }
  } catch (err) {
    console.debug('Erro ao inicializar planos padrão no Firestore:', err);
  }
}

export async function saveSubscriptionRecord(record: SubscriptionRecord): Promise<void> {
  const path = `subscriptions/${record.id}`;
  const data = sanitizeForFirestore({
    ...record,
    createdAt: record.createdAt || Date.now(),
  });
  await apiDbSave('subscriptions', data);

  try {
    const subRef = doc(db, 'subscriptions', record.id);
    await setDoc(subRef, data, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteSubscriptionRecord(recordId: string): Promise<void> {
  const path = `subscriptions/${recordId}`;
  await apiDbDelete('subscriptions', recordId);
  try {
    const subRef = doc(db, 'subscriptions', recordId);
    await deleteDoc(subRef);
  } catch (error) {
    console.debug(`Firestore subscription deletion error (${recordId}):`, error);
  }
}

/**
 * Exclui do banco de dados (Firestore e store local) todas as assinaturas pendentes ou expiradas
 * que ultrapassaram a data e horário de expiração estipulados pelo webhook n8n
 */
export async function cleanupExpiredSubscriptions(): Promise<number> {
  let cleanedCount = 0;
  const now = Date.now();

  // 1. Limpa via API backend local
  try {
    const res = await fetch('/api/subscriptions/cleanup-expired', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      cleanedCount += Number(data?.removedCount || 0);
    }
  } catch (err) {
    console.debug('Erro ao chamar limpeza no backend local:', err);
  }

  // 2. Limpa no Firestore
  try {
    const subSnap = await getDocs(collection(db, 'subscriptions'));
    const toDeleteDocs: string[] = [];

    subSnap.forEach((docSnap) => {
      const data = docSnap.data() as SubscriptionRecord;
      const isPendingOrExpired = data.status === 'pendente' || data.status === 'expirado';
      if (isPendingOrExpired && data.expiresAt && data.expiresAt <= now) {
        toDeleteDocs.push(docSnap.id);
      }
    });

    if (toDeleteDocs.length > 0) {
      const batch = writeBatch(db);
      for (const id of toDeleteDocs) {
        batch.delete(doc(db, 'subscriptions', id));
      }
      await batch.commit();
      cleanedCount += toDeleteDocs.length;
      console.log(`[PIX Cleanup] ${toDeleteDocs.length} assinaturas pendentes/expiradas removidas do Firestore.`);
    }
  } catch (err) {
    console.debug('Firestore subscription cleanup error:', err);
  }

  return cleanedCount;
}

export function subscribeToSubscriptionRecord(
  subscriptionId: string,
  onUpdate: (sub: SubscriptionRecord | null) => void,
  onError?: (err: Error) => void
) {
  const docRef = doc(db, 'subscriptions', subscriptionId);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = { ...(snapshot.data() as SubscriptionRecord), id: snapshot.id };
        // Se já expirou e está pendente/expirado, exclui do banco
        if ((data.status === 'pendente' || data.status === 'expirado') && data.expiresAt && data.expiresAt <= Date.now()) {
          deleteSubscriptionRecord(subscriptionId).catch(() => {});
          onUpdate(null);
        } else {
          onUpdate(data);
        }
      } else {
        onUpdate(null);
      }
    },
    (error) => {
      console.debug(`Error subscribing to subscription ${subscriptionId}:`, error);
      onError?.(error);
    }
  );
}

export function subscribeToSubscriptions(
  onUpdate: (subs: SubscriptionRecord[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(collection(db, 'subscriptions'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: SubscriptionRecord[] = [];
      const now = Date.now();
      const expiredIdsToDelete: string[] = [];

      snapshot.forEach((docSnap) => {
        const item = { ...(docSnap.data() as SubscriptionRecord), id: docSnap.id };
        const isPendingOrExpired = item.status === 'pendente' || item.status === 'expirado';

        if (isPendingOrExpired && item.expiresAt && item.expiresAt <= now) {
          expiredIdsToDelete.push(item.id);
        } else {
          items.push(item);
        }
      });

      // Exclui em background registros expirados detectados
      if (expiredIdsToDelete.length > 0) {
        expiredIdsToDelete.forEach((id) => deleteSubscriptionRecord(id).catch(() => {}));
      }

      onUpdate(items);
    },
    (error) => {
      console.debug('Firestore subscriptions subscription error:', error);
      onError?.(error);
    }
  );
}

/**
 * Busca a última assinatura pendente ativa do usuário.
 * Se houver assinaturas expiradas, remove-as imediatamente do banco de dados.
 */
export async function getUserActivePendingSubscription(userId: string): Promise<SubscriptionRecord | null> {
  if (!userId) return null;
  const now = Date.now();

  try {
    // 1. Tenta buscar no Firestore
    const q = query(
      collection(db, 'subscriptions'),
      where('userId', '==', userId),
      where('status', '==', 'pendente')
    );
    const snap = await getDocs(q);

    let activeSub: SubscriptionRecord | null = null;
    const expiredIds: string[] = [];

    snap.forEach((docSnap) => {
      const item = { ...(docSnap.data() as SubscriptionRecord), id: docSnap.id };
      if (item.expiresAt && item.expiresAt <= now) {
        expiredIds.push(item.id);
      } else if (!item.expiresAt || item.expiresAt > now) {
        if (!activeSub || (item.createdAt || 0) > (activeSub.createdAt || 0)) {
          activeSub = item;
        }
      }
    });

    // Exclui imediatamente do banco quaisquer registros expirados encontrados
    if (expiredIds.length > 0) {
      for (const id of expiredIds) {
        await deleteSubscriptionRecord(id);
      }
      console.log(`[PIX] ${expiredIds.length} assinaturas expiradas do usuário ${userId} removidas do banco.`);
    }

    if (activeSub) {
      return activeSub;
    }
  } catch (err) {
    console.debug('Erro ao consultar assinaturas pendentes no Firestore, tentando API local:', err);
  }

  // 2. Fallback via API backend local
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
    console.debug('Erro ao buscar assinatura pendente na API local:', err);
  }

  return null;
}

/**
 * Remove todas as assinaturas pendentes anteriores do usuário do banco de dados
 */
export async function clearPendingSubscriptionsForUser(userId: string): Promise<void> {
  if (!userId) return;

  try {
    const q = query(
      collection(db, 'subscriptions'),
      where('userId', '==', userId),
      where('status', '==', 'pendente')
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    let count = 0;

    snap.forEach((docSnap) => {
      batch.delete(doc(db, 'subscriptions', docSnap.id));
      count++;
      apiDbDelete('subscriptions', docSnap.id).catch(() => {});
    });

    if (count > 0) {
      await batch.commit();
      console.log(`[PIX] ${count} assinaturas pendentes anteriores do usuário ${userId} foram removidas.`);
    }
  } catch (err) {
    console.debug('Erro ao limpar assinaturas pendentes anteriores:', err);
  }
}

export async function updateUserFreeTrialUsed(userId: string): Promise<void> {
  const path = `users/${userId}`;
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { free_used: true }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Reseta todos os dados de assinatura e transações PIX de um usuário para permitir testar novamente do zero
 * sem excluir o usuário do banco.
 */
export async function resetUserSubscriptionAndPixForTesting(
  userId: string,
  options?: { resetFreeTrial?: boolean }
): Promise<User | null> {
  if (!userId) return null;

  // 1. Remove do Firestore todas as assinaturas vinculadas ao usuário
  try {
    const qSubs = query(
      collection(db, 'subscriptions'),
      where('userId', '==', userId)
    );
    const snapSubs = await getDocs(qSubs);
    if (!snapSubs.empty) {
      const batch = writeBatch(db);
      snapSubs.forEach((d) => {
        batch.delete(doc(db, 'subscriptions', d.id));
        apiDbDelete('subscriptions', d.id).catch(() => {});
      });
      await batch.commit();
    }
  } catch (err) {
    console.debug('Erro ao limpar assinaturas do usuário no Firestore:', err);
  }

  // 2. Remove da API local / store
  try {
    const res = await fetch('/api/db/subscriptions');
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data?.data) ? data.data : [];
      for (const s of list) {
        if (s.userId === userId) {
          await apiDbDelete('subscriptions', s.id);
        }
      }
    }
  } catch (err) {
    console.debug('Erro ao limpar assinaturas locais:', err);
  }

  // 3. Atualiza o usuário no Firestore e na API local para status 'free' com expiração limpa
  const userUpdates: Record<string, any> = {
    subscription_status: 'free',
    subscription_expires_at: null,
    plan_name: null,
    free_used: options?.resetFreeTrial ? false : true,
    updatedAt: Date.now(),
  };

  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, userUpdates, { merge: true });

    // Busca dados atualizados do usuário
    const uSnap = await getDoc(userRef);
    if (uSnap.exists()) {
      const updatedUser = { ...(uSnap.data() as User), id: uSnap.id, ...userUpdates, subscription_expires_at: undefined };
      await apiDbSave('users', updatedUser).catch(() => {});
      return updatedUser;
    }
  } catch (err) {
    console.debug('Erro ao atualizar usuário no Firestore durante reset:', err);
  }

  return null;
}

export async function updateUserSubscriptionDirectly(
  userId: string,
  status: 'free' | 'pendente' | 'pago',
  durationDays: number,
  planName: string
): Promise<void> {
  const path = `users/${userId}`;
  try {
    const userRef = doc(db, 'users', userId);
    const expiresAt = Date.now() + durationDays * 24 * 60 * 60 * 1000;
    await setDoc(
      userRef,
      {
        subscription_status: status,
        subscription_expires_at: expiresAt,
        plan_name: planName,
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ================= SUS MEDICATIONS & REMUME =================

export function subscribeToMedications(
  onUpdate: (medications: SUSMedication[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(collection(db, 'medications'), orderBy('name', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: SUSMedication[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ ...docSnap.data(), id: docSnap.id } as SUSMedication);
      });
      onUpdate(items);
    },
    (error) => {
      console.debug('Firestore medications subscription error:', error);
      onError?.(error);
    }
  );
}

export async function saveMedicationToFirestore(medication: SUSMedication): Promise<void> {
  const path = `medications/${medication.id}`;
  try {
    const medRef = doc(db, 'medications', medication.id);
    const data = sanitizeForFirestore({
      ...medication,
      updatedAt: Date.now(),
      createdAt: medication.createdAt || Date.now(),
      active: medication.active !== false,
    });
    await setDoc(medRef, data, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteMedicationFromFirestore(medicationId: string): Promise<void> {
  const path = `medications/${medicationId}`;
  try {
    await deleteDoc(doc(db, 'medications', medicationId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function seedMedicationsIfEmpty(): Promise<void> {
  try {
    const medsSnap = await getDocs(collection(db, 'medications'));
    const existingIds = new Set(medsSnap.docs.map((d) => d.id));
    const batch = writeBatch(db);
    let needCommit = false;
    let addedCount = 0;

    for (const med of OFFICIAL_SUS_MEDICATIONS) {
      if (!existingIds.has(med.id)) {
        batch.set(
          doc(db, 'medications', med.id),
          sanitizeForFirestore({
            ...med,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          })
        );
        needCommit = true;
        addedCount++;
        // Firestore batches max 500 writes
        if (addedCount >= 450) break;
      }
    }

    if (needCommit) {
      await batch.commit();
      console.log(`Catálogo oficial do SUS (${addedCount} medicamentos) sincronizado no Firestore.`);
    }
  } catch (err) {
    console.debug('Erro ao inicializar base de medicamentos SUS no Firestore:', err);
  }
}

export async function resetMedicationsToDefaults(): Promise<void> {
  try {
    const batch = writeBatch(db);
    for (const med of OFFICIAL_SUS_MEDICATIONS) {
      batch.set(
        doc(db, 'medications', med.id),
        sanitizeForFirestore({
          ...med,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      );
    }
    await batch.commit();
    console.log('Base de medicamentos SUS restaurada com o padrão oficial.');
  } catch (err) {
    console.error('Erro ao restaurar base de medicamentos:', err);
    throw err;
  }
}

// ================= SUS EXAMS & COMPLEMENTARY TESTS CATALOG =================

export function subscribeToExams(
  onUpdate: (exams: SUSExam[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(collection(db, 'exams'), orderBy('name', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: SUSExam[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ ...docSnap.data(), id: docSnap.id } as SUSExam);
      });
      onUpdate(items);
    },
    (error) => {
      console.debug('Firestore exams subscription error:', error);
      onError?.(error);
    }
  );
}

export async function saveExamToFirestore(exam: SUSExam): Promise<void> {
  const path = `exams/${exam.id}`;
  try {
    const examRef = doc(db, 'exams', exam.id);
    const data = sanitizeForFirestore({
      ...exam,
      updatedAt: Date.now(),
      createdAt: exam.createdAt || Date.now(),
      active: exam.active !== false,
    });
    await setDoc(examRef, data, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteExamFromFirestore(examId: string): Promise<void> {
  const path = `exams/${examId}`;
  try {
    await deleteDoc(doc(db, 'exams', examId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function seedExamsIfEmpty(): Promise<void> {
  try {
    const examsSnap = await getDocs(collection(db, 'exams'));
    const existingIds = new Set(examsSnap.docs.map((d) => d.id));
    const batch = writeBatch(db);
    let needCommit = false;
    let addedCount = 0;

    for (const exam of OFFICIAL_SUS_EXAMS) {
      if (!existingIds.has(exam.id)) {
        batch.set(
          doc(db, 'exams', exam.id),
          sanitizeForFirestore({
            ...exam,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          })
        );
        needCommit = true;
        addedCount++;
        if (addedCount >= 450) break;
      }
    }

    if (needCommit) {
      await batch.commit();
      console.log(`Catálogo oficial do SUS (${addedCount} exames) sincronizado no Firestore.`);
    }
  } catch (err) {
    console.debug('Erro ao inicializar base de exames SUS no Firestore:', err);
  }
}

export async function resetExamsToDefaults(): Promise<void> {
  try {
    const batch = writeBatch(db);
    for (const exam of OFFICIAL_SUS_EXAMS) {
      batch.set(
        doc(db, 'exams', exam.id),
        sanitizeForFirestore({
          ...exam,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      );
    }
    await batch.commit();
    console.log('Base de exames SUS restaurada com o padrão oficial.');
  } catch (err) {
    console.error('Erro ao restaurar base de exames:', err);
    throw err;
  }
}

// ================= APPOINTMENTS & SCHEDULING (AGENDAMENTO INTELIGENTE) =================

export function subscribeToAppointments(
  onUpdate: (appointments: Appointment[]) => void,
  onError?: (err: Error) => void
) {
  apiDbGet<Appointment[]>('appointments').then((serverApps) => {
    if (serverApps && Array.isArray(serverApps)) {
      onUpdate(serverApps);
    }
  }).catch(() => {});

  const q = query(collection(db, 'appointments'), orderBy('date', 'desc'), orderBy('startTime', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Appointment[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ ...docSnap.data(), id: docSnap.id } as Appointment);
      });
      if (items.length > 0) {
        onUpdate(items);
      }
    },
    (error) => {
      console.debug('Firestore appointments status:', error?.message || error);
      onError?.(error);
    }
  );
}

export async function saveAppointmentToFirestore(appointment: Appointment): Promise<void> {
  const data = sanitizeForFirestore({
    ...appointment,
    updatedAt: Date.now(),
    createdAt: appointment.createdAt || Date.now(),
  });
  await apiDbSave('appointments', data);

  try {
    const appRef = doc(db, 'appointments', appointment.id);
    await setDoc(appRef, data, { merge: true });
  } catch (error) {
    console.debug('Firestore appointment write:', error);
  }

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
      };

      fetch('https://n8n.mentoriajrs.com/webhook/pec-appointment-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
      }).catch((err) => {
        console.error('Falha não crítica ao notificar n8n sobre agendamento gratuito:', err);
      });
    } catch (err) {
      console.error('Erro ao preparar notificação n8n de agendamento gratuito:', err);
    }
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
    ...(extraFields ? sanitizeForFirestore(extraFields) : {}),
  };
  await apiDbSave('appointments', updateData);

  try {
    const appRef = doc(db, 'appointments', appointmentId);
    await setDoc(appRef, updateData, { merge: true });
  } catch (error) {
    console.debug('Firestore appointment status update:', error);
  }
}

export async function deleteAppointmentFromFirestore(appointmentId: string): Promise<void> {
  await apiDbDelete('appointments', appointmentId);
  try {
    await deleteDoc(doc(db, 'appointments', appointmentId));
  } catch (error) {
    console.debug('Firestore appointment delete:', error);
  }
}

// ================= PIX TRANSACTIONS & PATIENT WALLET =================

export async function savePixTransaction(transaction: PixTransactionRecord): Promise<void> {
  const path = `subscriptions/${transaction.id}`;
  try {
    const docRef = doc(db, 'subscriptions', transaction.id);
    const data = sanitizeForFirestore({
      ...transaction,
      updatedAt: Date.now(),
    });
    await setDoc(docRef, data, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeToPixTransaction(
  transactionId: string,
  onUpdate: (tx: PixTransactionRecord | null) => void,
  onError?: (err: Error) => void
) {
  const docRef = doc(db, 'subscriptions', transactionId);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate({ ...(snapshot.data() as PixTransactionRecord), id: snapshot.id });
      } else {
        onUpdate(null);
      }
    },
    (error) => {
      console.debug(`Error subscribing to PIX transaction ${transactionId}:`, error);
      onError?.(error);
    }
  );
}

export async function updatePixTransactionStatus(
  transactionId: string,
  status: 'pendente' | 'pago' | 'expirado' | 'utilizado',
  extra?: Record<string, any>
): Promise<void> {
  const path = `subscriptions/${transactionId}`;
  try {
    const docRef = doc(db, 'subscriptions', transactionId);
    await setDoc(
      docRef,
      sanitizeForFirestore({
        status,
        updatedAt: Date.now(),
        ...(extra || {}),
      }),
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function getPatientByCpf(cpf: string): Promise<Patient | null> {
  const cleanCpf = cpf.replace(/\D/g, '');
  if (!cleanCpf) return null;
  try {
    const q = query(collection(db, 'patients'));
    const snapshot = await getDocs(q);
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as Patient;
      const patientCpfClean = (data.cpf || '').replace(/\D/g, '');
      if (patientCpfClean === cleanCpf) {
        return { ...data, id: docSnap.id };
      }
    }
  } catch (err) {
    console.debug('Error fetching patient by CPF:', err);
  }
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
    const docRef = doc(db, 'patients', existing.id);
    await setDoc(
      docRef,
      {
        balance: newBalance,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
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
    await setDoc(doc(db, 'patients', newId), sanitizeForFirestore(newPatient));
    return { newBalance: newPatient.balance!, patientId: newId };
  }
}

export async function deductPatientBalance(
  patientId: string,
  amount: number
): Promise<number> {
  const docRef = doc(db, 'patients', patientId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return 0;
  const patient = snap.data() as Patient;
  const current = Number(patient.balance || 0);
  const newBalance = Math.max(0, Math.round((current - amount) * 100) / 100);
  await setDoc(
    docRef,
    {
      balance: newBalance,
      updatedAt: Date.now(),
    },
    { merge: true }
  );
  return newBalance;
}

// ================= RECEPTION QUEUE (FILA DE ATENDIMENTO) =================

export function subscribeToReceptionQueue(
  onUpdate: (items: ReceptionQueueItem[]) => void,
  onError?: (err: Error) => void
) {
  apiDbGet<ReceptionQueueItem[]>('reception_queue').then((serverItems) => {
    if (serverItems && Array.isArray(serverItems)) {
      onUpdate(serverItems);
    }
  }).catch(() => {});

  const q = query(collection(db, 'reception_queue'), orderBy('timestamp', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: ReceptionQueueItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ ...docSnap.data(), id: docSnap.id } as ReceptionQueueItem);
      });
      onUpdate(items);
    },
    (error) => {
      console.debug('Firestore reception queue status:', error?.message || error);
      onError?.(error);
    }
  );
}

export async function saveQueueItemToFirestore(item: ReceptionQueueItem): Promise<void> {
  const data = sanitizeForFirestore({
    ...item,
    updatedAt: Date.now(),
    createdAt: item.createdAt || Date.now(),
  });
  await apiDbSave('reception_queue', data);

  try {
    const docRef = doc(db, 'reception_queue', item.id);
    await setDoc(docRef, data, { merge: true });
  } catch (error) {
    // Server storage already synchronized via apiDbSave
  }
}

export async function updateQueueItemStatusInFirestore(
  itemId: string,
  status: QueueItemStatus,
  extraFields?: Partial<ReceptionQueueItem>
): Promise<void> {
  const updateData: Record<string, any> = {
    id: itemId,
    status,
    updatedAt: Date.now(),
    ...(status === 'calling' ? { calledAt: extraFields?.calledAt || Date.now() } : {}),
    ...(extraFields ? sanitizeForFirestore(extraFields) : {}),
  };
  await apiDbSave('reception_queue', updateData);

  try {
    const docRef = doc(db, 'reception_queue', itemId);
    await setDoc(docRef, updateData, { merge: true });
  } catch (error) {
    // Server storage already synchronized via apiDbSave
  }
}

export async function deleteQueueItemFromFirestore(itemId: string): Promise<void> {
  await apiDbDelete('reception_queue', itemId);
  try {
    await deleteDoc(doc(db, 'reception_queue', itemId));
  } catch (error) {
    // Server storage already synchronized via apiDbDelete
  }
}






