import { User, Consultation } from '../types';
import { DEFAULT_USERS } from '../data/professions';

export interface ResolvedAuthorInfo {
  name: string;
  profession?: string;
  cbo?: string;
  councilBody?: string;
  councilNumber?: string;
  councilUf?: string;
  professionalRegister?: string;
  digitalStampUrl?: string;
  useDigitalStamp: boolean;
  isCurrentUserAuthor: boolean;
  authorUser: User | null;
}

/**
 * Normalizes text for robust comparison (removes accents, trims, lowers case).
 */
function normalizeString(val?: string | null): string {
  if (!val) return '';
  return val
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^(dr\.|dra\.|enf\.|prof\.)\s+/i, '');
}

/**
 * Checks whether a user is an administrator.
 */
export function isUserAdmin(user?: User | null): boolean {
  if (!user) return false;
  return user.role === 'admin' || (user as any).role === 'superadmin';
}

/**
 * Retrieves the cached or live list of registered users from localStorage,
 * combined with DEFAULT_USERS.
 */
export function getStoredUsersList(): User[] {
  const usersMap = new Map<string, User>();

  // Add default users first
  if (Array.isArray(DEFAULT_USERS)) {
    DEFAULT_USERS.forEach((u) => {
      if (u && u.id) usersMap.set(u.id, u);
    });
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem('pec_users_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed.forEach((u) => {
            if (u && u.id) usersMap.set(u.id, u);
          });
        }
      }
    }
  } catch {
    // ignore
  }

  return Array.from(usersMap.values());
}

/**
 * Resolves whether the current user is the author of a consultation.
 */
export function isUserConsultationAuthor(consultation: Consultation, currentUser?: User | null): boolean {
  if (!currentUser) return false;
  const authorId = (consultation.authorId || '').trim();
  const authorRegister = normalizeString(consultation.authorRegister);
  const authorName = normalizeString(consultation.authorName);
  const userRegister = normalizeString(currentUser.professionalRegister);
  const userName = normalizeString(currentUser.name);

  if (authorId && currentUser.id === authorId) return true;
  if (authorRegister && userRegister && authorRegister === userRegister) return true;
  if (authorName && userName && (authorName === userName || authorName.includes(userName) || userName.includes(authorName))) {
    return true;
  }
  return false;
}

/**
 * Determines whether a user can edit a consultation (Author or Admin).
 */
export function canUserEditConsultation(consultation: Consultation, currentUser?: User | null): boolean {
  if (!currentUser) return false;
  if (isUserAdmin(currentUser)) return true;
  return isUserConsultationAuthor(consultation, currentUser);
}

/**
 * Resolves the true author of a consultation.
 * If the logged-in user is the author, uses their info and stamp.
 * If the logged-in user is NOT the author, finds the author in the system users registry.
 * NEVER leaks or applies the logged-in user's stamp or council data to another author's document!
 */
export function resolveConsultationAuthor(
  consultation: Consultation,
  currentUser?: User | null,
  usersList?: User[]
): ResolvedAuthorInfo {
  const authorName = (consultation.authorName || '').trim();
  const authorId = (consultation.authorId || '').trim();
  const normAuthorRegister = normalizeString(consultation.authorRegister);
  const normAuthorName = normalizeString(authorName);

  const isCurrentAuthor = isUserConsultationAuthor(consultation, currentUser);

  const allUsers = usersList && usersList.length > 0 ? usersList : getStoredUsersList();

  let authorUser: User | null = null;
  if (isCurrentAuthor) {
    authorUser = currentUser || null;
  } else {
    authorUser =
      allUsers.find((u) => {
        if (authorId && u.id === authorId) return true;
        const uReg = normalizeString(u.professionalRegister);
        if (normAuthorRegister && uReg && normAuthorRegister === uReg) return true;
        const uName = normalizeString(u.name);
        if (normAuthorName && uName && (normAuthorName === uName || normAuthorName.includes(uName) || uName.includes(normAuthorName))) {
          return true;
        }
        return false;
      }) || null;
  }

  const effectiveName =
    authorName ||
    authorUser?.name ||
    (isCurrentAuthor ? (currentUser?.name || '') : '') ||
    'Profissional de Saúde';

  const effectiveProfession =
    consultation.authorProfession ||
    authorUser?.profession ||
    (isCurrentAuthor ? (currentUser?.profession || '') : '') ||
    'Profissional de Saúde';

  const effectiveCbo =
    consultation.authorCbo ||
    authorUser?.cboCode ||
    authorUser?.cbo ||
    (isCurrentAuthor ? (currentUser?.cboCode || currentUser?.cbo || '') : '') ||
    '';

  const effectiveRegister =
    consultation.authorRegister ||
    authorUser?.professionalRegister ||
    (isCurrentAuthor ? (currentUser?.professionalRegister || '') : '') ||
    '';

  const councilBody = authorUser?.councilBody || (isCurrentAuthor ? currentUser?.councilBody : undefined);
  const councilNumber = authorUser?.councilNumber || (isCurrentAuthor ? currentUser?.councilNumber : undefined);
  const councilUf = authorUser?.councilUf || (isCurrentAuthor ? currentUser?.councilUf : undefined);

  // Digital Stamp URL: ONLY the author's stamp, NEVER an observer / viewer stamp!
  const stampUrl = (
    consultation.authorDigitalStampUrl ||
    (authorUser?.digitalStampUrl || '') ||
    (isCurrentAuthor ? (currentUser?.digitalStampUrl || '') : '')
  ).trim();

  // Preference for stamp usage
  const authorPrefersStamp = isCurrentAuthor
    ? (consultation.authorUseDigitalStamp ?? currentUser?.useDigitalStamp ?? true)
    : (consultation.authorUseDigitalStamp ?? authorUser?.useDigitalStamp ?? true);

  const useDigitalStamp = Boolean(stampUrl && authorPrefersStamp);

  return {
    name: effectiveName,
    profession: effectiveProfession,
    cbo: effectiveCbo,
    councilBody,
    councilNumber,
    councilUf,
    professionalRegister: effectiveRegister,
    digitalStampUrl: stampUrl,
    useDigitalStamp,
    isCurrentUserAuthor: isCurrentAuthor,
    authorUser,
  };
}

/**
 * Resolves whether the user is author of a document.
 */
export function isUserDocumentAuthor(
  doc: {
    professionalName?: string;
    professionalRegister?: string;
    authorId?: string;
  },
  currentUser?: User | null,
  parentConsultation?: Consultation | null
): boolean {
  if (!currentUser) return false;
  const docAuthorId = (doc.authorId || parentConsultation?.authorId || '').trim();
  const docName = normalizeString(doc.professionalName || parentConsultation?.authorName);
  const docRegister = normalizeString(doc.professionalRegister || parentConsultation?.authorRegister);
  const userRegister = normalizeString(currentUser.professionalRegister);
  const userName = normalizeString(currentUser.name);

  if (docAuthorId && currentUser.id === docAuthorId) return true;
  if (docRegister && userRegister && docRegister === userRegister) return true;
  if (docName && userName && (docName === userName || docName.includes(userName) || userName.includes(docName))) {
    return true;
  }
  if (!docName && !docRegister && !parentConsultation) {
    return true;
  }
  return false;
}

/**
 * Determines whether a user can edit a document (Author or Admin).
 */
export function canUserEditDocument(
  doc: any,
  currentUser?: User | null,
  parentConsultation?: Consultation | null
): boolean {
  if (!currentUser) return false;
  if (isUserAdmin(currentUser)) return true;
  return isUserDocumentAuthor(doc, currentUser, parentConsultation);
}

/**
 * Resolves the professional author of an attached document (Prescription, Referral, Exam, PTS, Report, Certificate, Media).
 * If parentConsultation is provided, anchors to the consultation's author whenever the document's author is missing or matches.
 * NEVER leaks or applies the viewing user's stamp or council data to another author's document!
 */
export function resolveDocumentAuthor(
  doc: {
    professionalName?: string;
    professionalRole?: string;
    professionalRegister?: string;
    professionalStampUrl?: string;
    useDigitalStamp?: boolean;
    authorId?: string;
    workplace?: string;
  },
  currentUser?: User | null,
  usersList?: User[],
  parentConsultation?: Consultation | null
): {
  name: string;
  role: string;
  register: string;
  stampUrl: string;
  useStamp: boolean;
  authorUser: User | null;
  isCurrentUserAuthor: boolean;
  cbo?: string;
  councilBody?: string;
  councilNumber?: string;
  councilUf?: string;
  workplace?: string;
} {
  const docAuthorId = (doc.authorId || parentConsultation?.authorId || '').trim();
  const rawDocName = (doc.professionalName || parentConsultation?.authorName || '').trim();
  const rawDocRegister = (doc.professionalRegister || parentConsultation?.authorRegister || '').trim();
  const docRole = (doc.professionalRole || parentConsultation?.authorProfession || '').trim();
  const docStamp = (doc.professionalStampUrl || parentConsultation?.authorDigitalStampUrl || '').trim();
  const docWorkplace = (doc.workplace || parentConsultation?.workplace || '').trim();

  const normDocName = normalizeString(rawDocName);
  const normDocRegister = normalizeString(rawDocRegister);

  const isCurrentAuthor = isUserDocumentAuthor(doc, currentUser, parentConsultation);

  const allUsers = usersList && usersList.length > 0 ? usersList : getStoredUsersList();

  let authorUser: User | null = null;
  if (isCurrentAuthor) {
    authorUser = currentUser || null;
  } else if (docAuthorId || normDocRegister || normDocName) {
    authorUser =
      allUsers.find((u) => {
        if (docAuthorId && u.id === docAuthorId) return true;
        const uReg = normalizeString(u.professionalRegister);
        if (normDocRegister && uReg && normDocRegister === uReg) return true;
        const uName = normalizeString(u.name);
        if (normDocName && uName && (normDocName === uName || normDocName.includes(uName) || uName.includes(normDocName))) {
          return true;
        }
        return false;
      }) || null;
  }

  const name =
    rawDocName ||
    authorUser?.name ||
    (isCurrentAuthor ? (currentUser?.name || '') : '') ||
    'Profissional de Saúde';

  const role =
    docRole ||
    authorUser?.profession ||
    (isCurrentAuthor ? (currentUser?.profession || '') : '') ||
    'Profissional de Saúde';

  const register =
    rawDocRegister ||
    authorUser?.professionalRegister ||
    (isCurrentAuthor ? (currentUser?.professionalRegister || '') : '') ||
    '';

  const cbo =
    authorUser?.cboCode ||
    authorUser?.cbo ||
    parentConsultation?.authorCbo ||
    (isCurrentAuthor ? (currentUser?.cboCode || currentUser?.cbo || '') : '') ||
    '';

  const councilBody = authorUser?.councilBody || (isCurrentAuthor ? currentUser?.councilBody : undefined);
  const councilNumber = authorUser?.councilNumber || (isCurrentAuthor ? currentUser?.councilNumber : undefined);
  const councilUf = authorUser?.councilUf || (isCurrentAuthor ? currentUser?.councilUf : undefined);
  const workplace =
    docWorkplace ||
    authorUser?.workplace ||
    (isCurrentAuthor ? currentUser?.workplace : '') ||
    'CENTRO DE ATENÇÃO PSICOSSOCIAL (CAPS I)';

  // Stamp URL: ONLY the document or consultation author's stamp, NEVER an observer / viewer stamp!
  const stampUrl = (
    docStamp ||
    authorUser?.digitalStampUrl ||
    (isCurrentAuthor ? (currentUser?.digitalStampUrl || '') : '')
  ).trim();

  const stampPref = isCurrentAuthor
    ? (doc.useDigitalStamp ?? parentConsultation?.authorUseDigitalStamp ?? currentUser?.useDigitalStamp ?? true)
    : (doc.useDigitalStamp ?? parentConsultation?.authorUseDigitalStamp ?? authorUser?.useDigitalStamp ?? true);

  const useStamp = Boolean(stampUrl && stampPref);

  return {
    name,
    role,
    register,
    stampUrl,
    useStamp,
    authorUser,
    isCurrentUserAuthor: isCurrentAuthor,
    cbo,
    councilBody,
    councilNumber,
    councilUf,
    workplace,
  };
}
