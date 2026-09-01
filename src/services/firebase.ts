import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Patient, Consultation, KnowledgeItem, User, SystemSettings } from '../types';
import { ADMIN_MASTER_EMAIL } from '../data/professions';

// Initialize Firebase App singleton
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with custom database ID if specified in config
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Initialize Firebase Auth
export const auth = getAuth(app);

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

// Helper to remove undefined fields before writing to Firestore
function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = value;
    }
  }
  return clean;
}

// ================= USERS & RBAC =================

export function subscribeToUsers(
  onUpdate: (users: User[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: User[] = [];
      snapshot.forEach((docSnap) => {
        const u = docSnap.data() as User;
        // Guarantee master admin email always has admin role
        const role =
          u.email && u.email.toLowerCase().trim() === ADMIN_MASTER_EMAIL.toLowerCase()
            ? 'admin'
            : u.role || 'user';
        items.push({ ...u, id: docSnap.id, role });
      });
      onUpdate(items);
    },
    (error) => {
      console.warn('Firestore users subscription error:', error);
      onError?.(error);
    }
  );
}

export async function saveUserToFirestore(user: User): Promise<void> {
  const path = `users/${user.id}`;
  try {
    const userRef = doc(db, 'users', user.id);
    const role =
      user.email && user.email.toLowerCase().trim() === ADMIN_MASTER_EMAIL.toLowerCase()
        ? 'admin'
        : user.role || 'user';

    const data = sanitizeForFirestore({
      ...user,
      role,
      createdAt: user.createdAt || Date.now(),
    });
    await setDoc(userRef, data, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteUserFromFirestore(userId: string): Promise<void> {
  const path = `users/${userId}`;
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ================= SYSTEM SETTINGS =================

export function subscribeToSystemSettings(
  onUpdate: (settings: SystemSettings) => void,
  onError?: (err: Error) => void
) {
  const docRef = doc(db, 'system_settings', 'global');
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data() as SystemSettings);
      }
    },
    (error) => {
      console.warn('Firestore system_settings subscription error:', error);
      onError?.(error);
    }
  );
}

export async function saveSystemSettingsToFirestore(settings: SystemSettings): Promise<void> {
  const path = 'system_settings/global';
  try {
    const docRef = doc(db, 'system_settings', 'global');
    const data = sanitizeForFirestore({
      ...settings,
      updatedAt: Date.now(),
    });
    await setDoc(docRef, data, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ================= PATIENTS =================

export function subscribeToPatients(
  onUpdate: (patients: Patient[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(collection(db, 'patients'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Patient[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ ...(docSnap.data() as Patient), id: docSnap.id });
      });
      onUpdate(items);
    },
    (error) => {
      console.warn('Firestore patients subscription error:', error);
      onError?.(error);
    }
  );
}

export async function savePatientToFirestore(patient: Patient): Promise<void> {
  const path = `patients/${patient.id}`;
  try {
    const patientRef = doc(db, 'patients', patient.id);
    const data = sanitizeForFirestore({
      ...patient,
      createdAt: patient.createdAt || Date.now(),
      updatedAt: Date.now(),
    });
    await setDoc(patientRef, data, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deletePatientFromFirestore(patientId: string): Promise<void> {
  const path = `patients/${patientId}`;
  try {
    await deleteDoc(doc(db, 'patients', patientId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ================= CONSULTATIONS (PRONTUÁRIO) =================

export function subscribeToConsultations(
  onUpdate: (consultations: Consultation[]) => void,
  onError?: (err: Error) => void
) {
  const q = query(collection(db, 'consultations'), orderBy('timestamp', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Consultation[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ ...(docSnap.data() as Consultation), id: docSnap.id });
      });
      onUpdate(items);
    },
    (error) => {
      console.warn('Firestore consultations subscription error:', error);
      onError?.(error);
    }
  );
}

export async function saveConsultationToFirestore(consultation: Consultation): Promise<void> {
  const path = `consultations/${consultation.id}`;
  try {
    const consultationRef = doc(db, 'consultations', consultation.id);
    const data = sanitizeForFirestore({
      ...consultation,
      timestamp: consultation.timestamp || Date.now(),
    });
    await setDoc(consultationRef, data, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteConsultationFromFirestore(consultationId: string): Promise<void> {
  const path = `consultations/${consultationId}`;
  try {
    await deleteDoc(doc(db, 'consultations', consultationId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
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
      console.warn('Firestore knowledge subscription error:', error);
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
const LEGACY_MOCK_USER_IDS = [
  'user-enfermeiro-1',
  'user-medico-1',
  'user-psicologo-1',
  'user-psicopedagogo-1',
  'user-nutricionista-1',
  'user-assistente-social-1',
  'user-educador-fisico-1',
];

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

    if (count > 0) {
      await batch.commit();
      console.log('Dados simulados e mockados legados removidos com sucesso do Firestore.');
    }
  } catch (error) {
    console.warn('Nota sobre remoção de dados mockados no Firestore:', error);
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
    // Purge any residual mock data first
    await purgeLegacyMockDataFromFirestore();

    const usersSnap = await getDocs(collection(db, 'users'));
    if (usersSnap.empty && defaultUsers && defaultUsers.length > 0) {
      const batch = writeBatch(db);
      for (const u of defaultUsers) {
        batch.set(doc(db, 'users', u.id), sanitizeForFirestore(u));
      }
      await batch.commit();
      console.log('Administrador mestre inicial provisionado no Cloud Firestore.');
    } else if (defaultUsers && defaultUsers.length > 0) {
      // Ensure master admin user always exists in users collection
      const masterUser = defaultUsers.find(
        (u) => u.email.toLowerCase() === ADMIN_MASTER_EMAIL.toLowerCase()
      ) || defaultUsers[0];
      if (masterUser) {
        const masterRef = doc(db, 'users', masterUser.id);
        const masterSnap = await getDoc(masterRef);
        if (!masterSnap.exists()) {
          await setDoc(masterRef, sanitizeForFirestore(masterUser));
          console.log(`Usuário admin ${masterUser.email} sincronizado no Cloud Firestore.`);
        }
      }
    }

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
  } catch (error) {
    console.warn('Nota sobre inicialização do Firestore:', error);
  }
}

