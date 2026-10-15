import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Patient, SystemSettings, Consultation, CollectiveActionRecord } from '../types';
import { safeGetItem, safeGetString } from '../utils/safeStorage';
import { getDefaultCboForProfession } from '../data/capsProcedures';

// Chaves de armazenamento local para o Banco 2
const DB2_STORAGE_URL_KEY = 'esus_pec_db2_supabase_url';
const DB2_STORAGE_KEY_KEY = 'esus_pec_db2_supabase_key';

let secondaryClientInstance: SupabaseClient | null = null;
let lastUsedUrl = '';
let lastUsedKey = '';

// Credenciais padrão de fallback do Banco de Dados 2 (Supabase do App 2)
export const DEFAULT_DB2_FALLBACK_URL = 'https://xrqgfppmssklqdxxekyv.supabase.co';
export const DEFAULT_DB2_FALLBACK_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhycWdmcHBtc3NrbHFkeHhla3l2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjE1OTI5NywiZXhwIjoyMDgxNzM1Mjk3fQ.9w897de0S66TRQAZI3ugdRi9W0QW5sSlQUbI_JRMLxs';

/**
 * Obtém as credenciais ativas do Banco de Dados 2 (Supabase Secundário)
 */
export function getDb2Config(): { url: string; key: string } {
  const settings = safeGetItem<SystemSettings | null>('pec_system_settings', null);

  const envUrl = typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_SUPABASE_DB2_URL : '';
  const envKey = typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_SUPABASE_DB2_KEY : '';

  const url =
    settings?.supabaseDb2Url?.trim() ||
    safeGetString(DB2_STORAGE_URL_KEY).trim() ||
    (typeof envUrl === 'string' ? envUrl.trim() : '') ||
    DEFAULT_DB2_FALLBACK_URL;

  const key =
    settings?.supabaseDb2Key?.trim() ||
    safeGetString(DB2_STORAGE_KEY_KEY).trim() ||
    (typeof envKey === 'string' ? envKey.trim() : '') ||
    DEFAULT_DB2_FALLBACK_KEY;

  return { url, key };
}

/**
 * Salva as credenciais do Banco 2 no armazenamento local
 */
export function saveDb2Config(url: string, key: string): void {
  if (typeof window !== 'undefined') {
    if (url.trim()) localStorage.setItem(DB2_STORAGE_URL_KEY, url.trim());
    else localStorage.removeItem(DB2_STORAGE_URL_KEY);

    if (key.trim()) localStorage.setItem(DB2_STORAGE_KEY_KEY, key.trim());
    else localStorage.removeItem(DB2_STORAGE_KEY_KEY);
  }
  // Reseta instância para recriar com as novas credenciais
  secondaryClientInstance = null;
}

/**
 * Cria ou recupera a instância do cliente Supabase para o Banco 2
 */
export function getSecondarySupabaseClient(customUrl?: string, customKey?: string): SupabaseClient | null {
  const config = getDb2Config();
  const url = (customUrl || config.url)?.trim();
  const key = (customKey || config.key)?.trim();

  if (!url || !key) return null;

  if (secondaryClientInstance && lastUsedUrl === url && lastUsedKey === key) {
    return secondaryClientInstance;
  }

  try {
    secondaryClientInstance = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    lastUsedUrl = url;
    lastUsedKey = key;
    return secondaryClientInstance;
  } catch (err) {
    console.warn('[Supabase Banco 2] Erro ao instanciar cliente:', err);
    return null;
  }
}

/**
 * Decodifica o papel (role) da chave JWT do Supabase ('anon' ou 'service_role')
 */
export function decodeSupabaseKeyRole(key?: string): 'anon' | 'service_role' | 'unknown' {
  if (!key) return 'unknown';
  try {
    const parts = key.trim().split('.');
    if (parts.length >= 2) {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = typeof atob === 'function' ? atob(base64) : Buffer.from(base64, 'base64').toString('utf-8');
      const payload = JSON.parse(json);
      if (payload.role === 'service_role') return 'service_role';
      if (payload.role === 'anon') return 'anon';
    }
  } catch {
    // ignorar falha de decode
  }
  return 'unknown';
}

/**
 * Testa a conexão com o Banco 2 verificando a tabela 'patients'
 */
export async function testSecondarySupabaseConnection(
  customUrl?: string,
  customKey?: string
): Promise<{
  success: boolean;
  message: string;
  count?: number;
  keyRole?: 'anon' | 'service_role' | 'unknown';
  isRlsSuspected?: boolean;
}> {
  const client = getSecondarySupabaseClient(customUrl, customKey);
  const effectiveKey = customKey || getDb2Config().key;
  const keyRole = decodeSupabaseKeyRole(effectiveKey);

  if (!client) {
    return {
      success: false,
      message: 'URL e Chave (API Key) do Banco de Dados 2 são obrigatórias para conectar.',
      keyRole,
    };
  }

  try {
    const { count, error } = await client
      .from('patients')
      .select('*', { count: 'exact', head: true });

    if (error) {
      const isRls = error.message?.includes('row-level security') || error.code === '42501';
      return {
        success: false,
        message: isRls
          ? `Acesso bloqueado por RLS (Row Level Security) no Banco 2. Utilize a chave "service_role" (secret) em vez da chave "${keyRole}".`
          : `Falha na consulta ao Banco 2: ${error.message} (Código: ${error.code || 'desconhecido'})`,
        keyRole,
      };
    }

    const patientCount = count ?? 0;
    const isRlsSuspected = patientCount === 0 && keyRole === 'anon';

    let message = `Conexão com o Banco 2 estabelecida com sucesso! (${patientCount} pacientes encontrados na tabela).`;
    if (isRlsSuspected) {
      message = `Conexão estabelecida, porém a tabela retornou 0 pacientes porque a chave informada é a chave pública ("anon") e a tabela possui RLS (Row Level Security) ativado no Supabase. O RLS oculta as centenas de pacientes existentes para o role público anon. Para enxergar e sincronizar todos os pacientes, copie a chave "service_role" (secret) em Project Settings > API no Supabase do Banco 2 e cole no campo de chave.`;
    }

    return {
      success: true,
      message,
      count: patientCount,
      keyRole,
      isRlsSuspected,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Erro de rede ou conexão ao tentar alcançar o Banco 2: ${err?.message || String(err)}`,
      keyRole,
    };
  }
}

/**
 * REGRA DOCUMENTAL INTELIGENTE (Prioridade CPF > CNS):
 * O Banco de Dados 2 reconhece na sua coluna "cns" tanto o CPF quanto o CNS.
 * Prioriza por enviar o CPF (apenas dígitos). Caso o CPF não esteja preenchido, envia o CNS (apenas dígitos).
 */
export function resolvePatientDocumentForDb2(patient: Patient): {
  document: string;
  type: 'CPF' | 'CNS';
} {
  const cleanCpf = (patient.cpf || '').replace(/\D/g, '').trim();
  if (cleanCpf && cleanCpf.length === 11) {
    return { document: cleanCpf, type: 'CPF' };
  }

  // Fallback caso CPF não tenha exatamente 11 mas tenha dígitos
  if (cleanCpf) {
    return { document: cleanCpf, type: 'CPF' };
  }

  const cleanCns = (patient.cns || '').replace(/\D/g, '').trim();
  if (cleanCns) {
    return { document: cleanCns, type: 'CNS' };
  }

  const cleanSus = (patient.susCard || '').replace(/\D/g, '').trim();
  if (cleanSus) {
    return { document: cleanSus, type: 'CNS' };
  }

  // Fallback automático para garantir que pacientes em teste nunca bloqueiem o envio ao BD 2
  const fallbackNum = patient.id
    ? '7' + patient.id.replace(/\D/g, '').padEnd(14, '0').slice(0, 14)
    : '700000000000001';
  return { document: fallbackNum, type: 'CNS' };
}

/**
 * Converte um paciente do App 1 no payload exato esperado pela tabela 'patients' do Banco 2.
 * Note: omitimos 'id' para deixar o Banco 2 gerar seu uuid default: extensions.uuid_generate_v4()
 */
/**
 * Converte um paciente do App 1 no payload exato esperado pela tabela 'patients' do Banco 2.
 * Atenção ao PostgreSQL:
 * - A coluna 'cod_municipio' no Banco 2 é VARCHAR(6). Trunca estritamente em 6 dígitos (omitindo o dígito verificador do IBGE).
 * - Aceita um targetCns explícito caso o paciente já exista no Banco 2 sob esse documento.
 */
export function mapPatientToDb2Payload(patient: Patient, targetCns?: string): Record<string, any> | null {
  const resolved = resolvePatientDocumentForDb2(patient);
  const doc = targetCns || resolved.document;
  if (!doc) {
    return null; // Não pode ser inserido sem CNS/CPF pois coluna cns é NOT NULL no Banco 2
  }

  // Formata data de nascimento segura para tipo 'date' do PostgreSQL (YYYY-MM-DD)
  let birthDateVal: string | null = null;
  if (patient.birthDate) {
    const raw = patient.birthDate.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      birthDateVal = raw;
    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
      const parts = raw.split('/');
      birthDateVal = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }

  // Sexo: no print do BD 2 anotado estritamente como "M neste formato" (apenas 'M' ou 'F')
  let genderVal = 'M';
  if (patient.gender) {
    const g = patient.gender.trim().toUpperCase();
    if (g.startsWith('F')) genderVal = 'F';
    else genderVal = 'M';
  }

  // Número: no print do BD 2 anotado com "s/n envie '00'"
  let numberVal = (patient.number || '').trim();
  if (!numberVal || /^(s\/n|sn|s\.n|sem\s*n[uú]mero|0)$/i.test(numberVal)) {
    numberVal = '00';
  }

  // Limpeza de telefone (apenas dígitos)
  const cleanPhone = (patient.phone || '').replace(/\D/g, '').trim();

  // Limpeza de CEP (apenas dígitos)
  const cleanZip = (patient.zipCode || '').replace(/\D/g, '').trim();

  // Limpeza de Cód. Município (IBGE):
  // CRÍTICO: No PostgreSQL do Banco 2, a coluna cod_municipio possui tipo character varying(6).
  let cleanCodMun: string | null = null;
  if (patient.codMunicipio) {
    const rawMun = String(patient.codMunicipio).replace(/\D/g, '').trim();
    if (rawMun) {
      cleanCodMun = rawMun.length > 6 ? rawMun.slice(0, 6) : rawMun;
    }
  }

  // Se o paciente tiver endereço livre preenchido mas não tiver rua separada, usa o endereço livre
  const streetName = patient.street?.trim() || patient.address?.trim() || null;

  return {
    cns: doc, // Coluna documental do Banco 2 (CPF ou CNS limpo)
    name: patient.fullName?.trim() || 'Paciente Sem Nome',
    birth_date: birthDateVal,
    gender: genderVal, // 'M' ou 'F'
    nationality: patient.nationality?.trim() || 'Brasileira',
    race: patient.race?.trim() || 'Branca',
    ethnicity: patient.ethnicity?.trim() || 'N/A',
    zip_code: cleanZip || null,
    city: patient.city?.trim() || null,
    neighborhood: patient.neighborhood?.trim() || null,
    street_code: patient.streetCode?.trim() || null,
    street_type: patient.streetType?.trim() || null,
    street: streetName,
    number: numberVal, // Se s/n ou vazio, envia '00'
    complement: patient.complement?.trim() || null,
    phone: cleanPhone || null,
    email: patient.email?.trim() || null,
    cod_municipio: cleanCodMun,
  };
}

/**
 * Sincroniza um único paciente no Banco 2 (Busca inteligente e Update/Upsert)
 */
export async function syncPatientToDb2(
  patient: Patient,
  customConfig?: { url?: string; key?: string }
): Promise<{
  success: boolean;
  message: string;
  documentUsed?: string;
  documentType?: 'CPF' | 'CNS' | 'NENHUM';
  skipped?: boolean;
  patientDbId?: string;
}> {
  const resolved = resolvePatientDocumentForDb2(patient);
  const cleanCpf = (patient.cpf || '').replace(/\D/g, '').trim();
  const cleanCns = (patient.cns || '').replace(/\D/g, '').trim();

  const client = getSecondarySupabaseClient(customConfig?.url, customConfig?.key);
  if (!client) {
    return {
      success: false,
      message: 'Banco 2 não configurado (URL e Chave ausentes nas configurações).',
      documentUsed: resolved.document,
      documentType: resolved.type,
    };
  }

  try {
    // 1. Localizar se o paciente já existe no Banco 2 (por CNS, por CPF ou pelo UUID)
    let existingInDb2: { id: string; cns: string; name: string } | null = null;

    if (cleanCns) {
      const { data } = await client
        .from('patients')
        .select('id, cns, name')
        .eq('cns', cleanCns)
        .maybeSingle();
      if (data) existingInDb2 = data;
    }

    if (!existingInDb2 && cleanCpf) {
      const { data } = await client
        .from('patients')
        .select('id, cns, name')
        .eq('cns', cleanCpf)
        .maybeSingle();
      if (data) existingInDb2 = data;
    }

    if (
      !existingInDb2 &&
      patient.id &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patient.id)
    ) {
      const { data } = await client
        .from('patients')
        .select('id, cns, name')
        .eq('id', patient.id)
        .maybeSingle();
      if (data) existingInDb2 = data;
    }

    // 2. Chave documental para a coluna cns
    const targetCns =
      existingInDb2?.cns ||
      (cleanCpf && cleanCpf.length === 11 ? cleanCpf : (cleanCns || cleanCpf));
    const docType: 'CPF' | 'CNS' = targetCns.length === 11 ? 'CPF' : 'CNS';

    const payload = mapPatientToDb2Payload(patient, targetCns);
    if (!payload) {
      return {
        success: false,
        message: 'Falha ao estruturar os dados do paciente.',
        documentUsed: targetCns,
        documentType: docType,
      };
    }

    let saveError: any = null;

    if (existingInDb2?.id) {
      // Atualização direta por ID existente no Banco 2
      const { error } = await client
        .from('patients')
        .update(payload)
        .eq('id', existingInDb2.id);
      saveError = error;
    } else {
      // Upsert pela coluna cns
      const { error } = await client
        .from('patients')
        .upsert(payload, {
          onConflict: 'cns',
          ignoreDuplicates: false,
        });
      saveError = error;
    }

    if (saveError) {
      const isRls = saveError.message?.includes('row-level security') || saveError.code === '42501';
      const msg = isRls
        ? `Bloqueado por RLS (Row Level Security) no Banco 2. A chave informada não possui permissão de gravação na tabela 'patients'. Troque pela chave "service_role" (secret) do Supabase em Configurações > Gestão Global de Dados.`
        : `Erro ao salvar no Banco 2: ${saveError.message}`;
      return {
        success: false,
        message: msg,
        documentUsed: targetCns,
        documentType: docType,
      };
    }

    let finalPatientDbId = existingInDb2?.id;
    if (!finalPatientDbId) {
      const { data: fetchSaved } = await client
        .from('patients')
        .select('id')
        .eq('cns', targetCns)
        .maybeSingle();
      if (fetchSaved?.id) finalPatientDbId = fetchSaved.id;
    }

    return {
      success: true,
      message: `Paciente "${patient.fullName}" salvo e sincronizado com sucesso no Banco 2 (${docType}: ${targetCns}).`,
      documentUsed: targetCns,
      documentType: docType,
      patientDbId: finalPatientDbId,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Erro inesperado na sincronização com Banco 2: ${err?.message || String(err)}`,
      documentUsed: cleanCpf || cleanCns,
      documentType: cleanCpf ? 'CPF' : 'CNS',
    };
  }
}

/**
 * Sincronização em Lote de Pacientes com o Banco 2
 */
export async function syncPatientsBatchToDb2(
  patients: Patient[],
  customConfig?: { url?: string; key?: string },
  onProgress?: (current: number, total: number) => void
): Promise<{
  total: number;
  success: number;
  skipped: number;
  errors: number;
  details: string[];
}> {
  const result = {
    total: patients.length,
    success: 0,
    skipped: 0,
    errors: 0,
    details: [] as string[],
  };

  const client = getSecondarySupabaseClient(customConfig?.url, customConfig?.key);
  if (!client) {
    result.details.push('Banco 2 não configurado. Verifique a URL e Chave do Supabase Secundário.');
    result.errors = patients.length;
    return result;
  }

  for (let i = 0; i < patients.length; i++) {
    const p = patients[i];
    if (onProgress) {
      onProgress(i + 1, patients.length);
    }

    const res = await syncPatientToDb2(p, customConfig);
    if (res.skipped) {
      result.skipped++;
      result.details.push(`Ignorado: "${p.fullName}" - sem CPF ou CNS.`);
    } else if (res.success) {
      result.success++;
    } else {
      result.errors++;
      result.details.push(`Erro em "${p.fullName}": ${res.message}`);
    }
  }

  return result;
}

/**
 * Busca o catálogo de tipos de logradouro da tabela 'street_types_catalog' no Banco 2.
 * Espera colunas 'name' e 'code'.
 */
export async function fetchStreetTypesCatalogFromDb2(
  customUrl?: string,
  customKey?: string
): Promise<{ code: string; name: string }[] | null> {
  const client = getSecondarySupabaseClient(customUrl, customKey);
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('street_types_catalog')
      .select('code, name')
      .order('name', { ascending: true });

    if (error || !data || data.length === 0) {
      return null;
    }

    return data
      .filter((item: any) => item && (item.name || item.code))
      .map((item: any) => ({
        code: String(item.code || '').trim(),
        name: String(item.name || '').trim(),
      }));
  } catch (err) {
    console.warn('[secondarySupabase] Erro ao consultar street_types_catalog:', err);
    return null;
  }
}

// =========================================================================
// PRODUÇÃO E FATURAMENTO NO BANCO DE DADOS 2 (BPA-I, BPA-C E RAAS)
// =========================================================================

export const CAPS_CNES = '7676417';
export const CAPS_MODALITY = 'CAPS I';

const PT_MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Converte data em texto de competência 'Mês / AAAA' (1ª letra maiúscula)
 * Exemplo: 13/10/2026 -> 'Outubro / 2026'
 */
export function formatReferenceMonth(dateInput?: Date | string | number): string {
  let d = new Date();
  if (dateInput) {
    if (typeof dateInput === 'string' && /^\d{2}\/\d{2}\/\d{4}/.test(dateInput)) {
      const parts = dateInput.split('/');
      d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    } else {
      const parsed = new Date(dateInput);
      if (!isNaN(parsed.getTime())) d = parsed;
    }
  }
  const monthName = PT_MONTHS[d.getMonth()] || 'Outubro';
  return `${monthName} / ${d.getFullYear()}`;
}

/**
 * Converte data para ISO 8601 UTC seguro
 */
export function formatIsoUtc(dateInput?: Date | string | number): string {
  if (!dateInput) return new Date().toISOString();
  if (typeof dateInput === 'string' && /^\d{2}\/\d{2}\/\d{4}/.test(dateInput)) {
    const parts = dateInput.split('/');
    const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00Z`);
    return !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString();
  }
  const d = new Date(dateInput);
  return !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString();
}

/**
 * Extrai 6 dígitos numéricos do CBO ou mapeia pelo cargo
 */
export function extractCboDigits(rawCbo?: string, professionId?: string): string {
  if (rawCbo) {
    const digits = rawCbo.replace(/\D/g, '');
    if (digits.length >= 6) return digits.slice(0, 6);
  }
  return getDefaultCboForProfession(professionId);
}

/**
 * Grava BPA-I (Boletim de Produção Ambulatorial Individualizado) em public.procedure_production
 */
export async function recordBpaIInDb2(params: {
  patient: Patient;
  procedureCode: string;
  dateService?: string | number | Date;
  cbo?: string;
  professionId?: string;
  notes?: string;
  customConfig?: { url?: string; key?: string };
}): Promise<{ success: boolean; message: string; id?: string }> {
  const client = getSecondarySupabaseClient(params.customConfig?.url, params.customConfig?.key);
  if (!client) {
    return { success: false, message: 'Banco 2 não configurado.' };
  }

  try {
    // 1. Garantir que o paciente existe no Banco 2 e obter seu UUID
    const syncRes = await syncPatientToDb2(params.patient, params.customConfig);
    let patientId = syncRes.patientDbId;

    if (!patientId) {
      const doc = syncRes.documentUsed || params.patient.cns || params.patient.cpf;
      if (doc) {
        const cleanDoc = doc.replace(/\D/g, '');
        const { data: pData } = await client
          .from('patients')
          .select('id')
          .eq('cns', cleanDoc)
          .maybeSingle();
        if (pData?.id) patientId = pData.id;
      }
    }

    if (!patientId) {
      return {
        success: false,
        message: 'Não foi possível vincular o paciente na tabela patients do Banco 2.',
      };
    }

    const isoDate = formatIsoUtc(params.dateService);
    // Extrai 10 dígitos numéricos limpos (ex: 0102010242 ou 0301080232) conforme esperado pelo Banco 2
    const cleanDigits = params.procedureCode.replace(/\D/g, '');
    const cleanCode = cleanDigits.length >= 8 ? cleanDigits : params.procedureCode.trim();

    const payload: Record<string, any> = {
      patient_id: patientId,
      procedure_code: cleanCode,
      status: 'Finalizado',
      date_service: isoDate,
      notes: params.notes || '',
      sia_processed: false,
      date_delivery: isoDate,
      date_scheduling: null, // Regra estrita: Não enviar data de agendamento no BPA-I
      created_at: new Date().toISOString(),
    };

    const { data, error } = await client
      .from('procedure_production')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      return {
        success: false,
        message: `Erro ao gravar BPA-I no Banco 2: ${error.message}`,
      };
    }

    return {
      success: true,
      message: `BPA-I registrado com sucesso no Banco 2 (Código: ${cleanCode}).`,
      id: data?.id,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Falha na gravação do BPA-I: ${err?.message || String(err)}`,
    };
  }
}

/**
 * Grava RAAS Psicossocial em public.raas_psychosocial
 */
export async function recordRaasInDb2(params: {
  patient: Patient;
  procedureCode: string;
  dateService?: string | number | Date;
  cbo?: string;
  professionId?: string;
  cidPrimary?: string;
  cidPrimaryDesc?: string;
  cidSecondary?: string;
  cidSecondaryDesc?: string;
  localAction?: 'C' | 'T';
  notes?: string;
  customConfig?: { url?: string; key?: string };
}): Promise<{ success: boolean; message: string; id?: string }> {
  const client = getSecondarySupabaseClient(params.customConfig?.url, params.customConfig?.key);
  if (!client) {
    return { success: false, message: 'Banco 2 não configurado.' };
  }

  try {
    // 1. Sincroniza paciente se necessário
    await syncPatientToDb2(params.patient, params.customConfig);

    const docCns = (params.patient.cns || '').replace(/\D/g, '');
    const docCpf = (params.patient.cpf || '').replace(/\D/g, '');
    const activeDoc = docCns || docCpf || '000000000000000';

    // Formata datas
    const isoDate = formatIsoUtc(params.dateService);
    // REGRA DE NEGÓCIO: A data de admissão no RAAS deve ser a data em que o paciente foi cadastrado no sistema
    let admissionDate = isoDate.split('T')[0];
    if (params.patient.createdAt) {
      try {
        const d = new Date(params.patient.createdAt);
        if (!isNaN(d.getTime())) {
          admissionDate = d.toISOString().split('T')[0];
        }
      } catch {
        // fallback
      }
    }
    let birthDateVal = '1980-01-01';
    if (params.patient.birthDate) {
      const bRaw = params.patient.birthDate.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(bRaw)) birthDateVal = bRaw;
      else if (/^\d{2}\/\d{2}\/\d{4}$/.test(bRaw)) {
        const p = bRaw.split('/');
        birthDateVal = `${p[2]}-${p[1]}-${p[0]}`;
      }
    }

    const competence = formatReferenceMonth(params.dateService);
    let genderLetter = 'M';
    if (params.patient.gender) {
      const g = params.patient.gender.trim().toUpperCase();
      if (g.startsWith('F')) genderLetter = 'F';
      else genderLetter = 'M';
    }
    const primaryCid = (params.cidPrimary || 'F32.2').trim().toUpperCase();

    const payload: Record<string, any> = {
      competence,
      establishment_cnes: CAPS_CNES,
      establishment_name: CAPS_MODALITY,
      status: 'Finalizado',
      patient_cns: activeDoc,
      patient_cpf: docCpf ? (params.patient.cpf || docCpf) : null,
      patient_name: params.patient.fullName?.trim() || 'Paciente',
      admission_date: admissionDate,
      record_number: params.patient.id ? params.patient.id.replace(/\D/g, '').slice(0, 6) || '0001' : '0001',
      birth_date: birthDateVal,
      gender: genderLetter,
      nationality: (params.patient.nationality || 'BRASILEIRA').toUpperCase(),
      street_situation: false,
      substance_user: false,
      origin_code: '01 - Demanda Espontânea',
      cid_primary: primaryCid,
      cid_primary_desc: params.cidPrimaryDesc || null,
      cid_secondary: params.cidSecondary ? params.cidSecondary.trim().toUpperCase() : null,
      cid_secondary_desc: params.cidSecondaryDesc || null,
      esf_coverage: true,
      destination_code: '1 - Permanência / Acompanhamento no CAPS',
      notes: params.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await client
      .from('raas_psychosocial')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      return {
        success: false,
        message: `Erro ao gravar RAAS no Banco 2: ${error.message}`,
      };
    }

    return {
      success: true,
      message: `RAAS Psicossocial registrado com sucesso no Banco 2 (Competência: ${competence}, CID: ${primaryCid}).`,
      id: data?.id,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Falha na gravação do RAAS: ${err?.message || String(err)}`,
    };
  }
}

/**
 * Grava ou incrementa BPA-C (Consolidado) em public.bpa_consolidated e public.bpa_consolidated_items
 */
export async function recordBpaCInDb2(params: {
  dateService?: string | number | Date;
  cbo?: string;
  professionId?: string;
  procedureCode: string;
  procedureName?: string;
  participantsCount: number; // Apenas controle interno / memória de ata
  actionQuantity?: number; // Produção real BPA-C: 1 ação por CBO distinto (padrão: 1)
  theme?: string;
  description?: string;
  authorName?: string;
  customConfig?: { url?: string; key?: string };
}): Promise<{
  success: boolean;
  message: string;
  bpaId?: string;
  newTotalQuantity?: number;
  itemQuantity?: number;
}> {
  const client = getSecondarySupabaseClient(params.customConfig?.url, params.customConfig?.key);
  if (!client) {
    return { success: false, message: 'Banco 2 não configurado.' };
  }

  // Quantidade para fins de produção BPA-C: exatamente 1 ação por CBO distinto na atividade coletiva
  const actionQuantity = params.actionQuantity !== undefined ? Math.max(1, Number(params.actionQuantity)) : 1;
  // Quantidade de participantes presentes: estritamente para controle interno e ata institucional
  const participants = Math.max(1, Number(params.participantsCount) || 1);
  const competence = formatReferenceMonth(params.dateService);
  const cboDigits = extractCboDigits(params.cbo, params.professionId);
  const numericCode = params.procedureCode.replace(/\D/g, '') || params.procedureCode;

  try {
    // 1. Localiza ou cria o lote consolidado na tabela 'bpa_consolidated'
    const { data: existingBpa, error: bpaQueryErr } = await client
      .from('bpa_consolidated')
      .select('id, total_quantity')
      .eq('cnes', CAPS_CNES)
      .eq('reference_month', competence)
      .maybeSingle();

    if (bpaQueryErr) {
      console.warn('[BPA-C] Erro ao buscar lote consolidado:', bpaQueryErr.message);
    }

    let bpaId: string;
    let currentTotal = 0;

    if (existingBpa?.id) {
      bpaId = existingBpa.id;
      currentTotal = Number(existingBpa.total_quantity || 0);
    } else {
      // Cria novo cabeçalho de lote
      const { data: createdBpa, error: createErr } = await client
        .from('bpa_consolidated')
        .insert({
          cnes: CAPS_CNES,
          reference_month: competence,
          total_quantity: 0,
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (createErr || !createdBpa) {
        return {
          success: false,
          message: `Erro ao criar lote BPA-C no Banco 2: ${createErr?.message || 'Falha ao obter ID'}`,
        };
      }
      bpaId = createdBpa.id;
    }

    // 2. Localiza ou insere o item em 'bpa_consolidated_items'
    // Tenta primeiro pelo código numérico e se não achar, pelo código formatado
    let existingItem: any = null;
    const { data: itemData } = await client
      .from('bpa_consolidated_items')
      .select('id, quantity')
      .eq('bpa_id', bpaId)
      .eq('cbo_info', cboDigits)
      .eq('procedure_info', numericCode)
      .maybeSingle();

    if (itemData) {
      existingItem = itemData;
    } else {
      // Tenta pelo código formatado
      const { data: itemDataFmt } = await client
        .from('bpa_consolidated_items')
        .select('id, quantity')
        .eq('bpa_id', bpaId)
        .eq('cbo_info', cboDigits)
        .eq('procedure_info', params.procedureCode)
        .maybeSingle();
      if (itemDataFmt) existingItem = itemDataFmt;
    }

    // Contabiliza exatamente 1 ação para a produção deste CBO
    let itemFinalQty = actionQuantity;

    if (existingItem?.id) {
      itemFinalQty = Number(existingItem.quantity || 0) + actionQuantity;
      const { error: updateItemErr } = await client
        .from('bpa_consolidated_items')
        .update({ quantity: itemFinalQty })
        .eq('id', existingItem.id);

      if (updateItemErr) {
        return {
          success: false,
          message: `Erro ao atualizar item do BPA-C: ${updateItemErr.message}`,
        };
      }
    } else {
      const { error: insertItemErr } = await client
        .from('bpa_consolidated_items')
        .insert({
          bpa_id: bpaId,
          procedure_info: numericCode,
          cbo_info: cboDigits,
          quantity: actionQuantity,
          created_at: new Date().toISOString(),
        });

      if (insertItemErr) {
        return {
          success: false,
          message: `Erro ao inserir item no BPA-C: ${insertItemErr.message}`,
        };
      }
    }

    // 3. Atualiza o total_quantity no lote principal (incrementa 1 ação por CBO distinto)
    const newTotal = currentTotal + actionQuantity;
    await client
      .from('bpa_consolidated')
      .update({ total_quantity: newTotal })
      .eq('id', bpaId);

    return {
      success: true,
      message: `Ação Coletiva registrada no Banco 2! +${actionQuantity} ação contabilizada na produção para o CBO ${cboDigits} na competência ${competence} (Total acumulado no lote: ${newTotal} ações). [${participants} participantes registrados para controle interno/ata].`,
      bpaId,
      newTotalQuantity: newTotal,
      itemQuantity: itemFinalQty,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Falha na gravação do BPA-C: ${err?.message || String(err)}`,
    };
  }
}

/**
 * Função unificada que direciona e grava qualquer consulta do App 1 no Banco 2
 * de acordo com o instrumento correspondente (BPA-I, RAAS ou BPA-C).
 */
export async function syncConsultationToDb2(
  consultation: Consultation,
  patient: Patient,
  customConfig?: { url?: string; key?: string }
): Promise<{
  success: boolean;
  message: string;
  instrument: string;
  recordId?: string;
}> {
  const pCode = consultation.procedureCode?.trim() || '';
  const numCode = pCode.replace(/\D/g, '');

  // Detecta BPA-I: Acolhimento Inicial ou procedimentos ambulatoriais de faturamento individualizado
  const isBpaI =
    pCode.includes('03.01.08.023-2') ||
    pCode.includes('03.01.08.019-4') ||
    pCode.includes('01.02.01.024-2') ||
    pCode.includes('07.01.07.010-2') ||
    numCode === '0301080232' ||
    numCode === '0301080194' ||
    numCode === '0102010242' ||
    numCode === '0701070102' ||
    numCode.startsWith('010201') ||
    numCode.startsWith('070107') ||
    consultation.isFirstConsultation;

  if (isBpaI) {
    const res = await recordBpaIInDb2({
      patient,
      procedureCode: pCode || '03.01.08.023-2',
      dateService: consultation.timestamp,
      cbo: consultation.authorCbo,
      professionId: consultation.authorProfession,
      notes: consultation.avaliacao || consultation.plano,
      customConfig,
    });
    return {
      success: res.success,
      message: res.message,
      instrument: 'BPA-I',
      recordId: res.id,
    };
  }

  // Caso contrário, é um procedimento individual continuado no CAPS -> RAAS Psicossocial
  const res = await recordRaasInDb2({
    patient,
    procedureCode: pCode || '03.01.08.020-8',
    dateService: consultation.timestamp,
    cbo: consultation.authorCbo,
    professionId: consultation.authorProfession,
    cidPrimary: consultation.cidPrimary,
    cidPrimaryDesc: consultation.cidPrimaryDesc,
    cidSecondary: consultation.cidSecondary,
    cidSecondaryDesc: consultation.cidSecondaryDesc,
    localAction: consultation.localAction || 'C',
    notes: consultation.avaliacao || consultation.plano,
    customConfig,
  });

  return {
    success: res.success,
    message: res.message,
    instrument: 'RAAS-PSI',
    recordId: res.id,
  };
}

