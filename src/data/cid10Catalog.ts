/**
 * Catálogo Oficial e Base de Dados de Diagnósticos CID-10 para SUS / CAPS / Atenção Primária
 * Permite extrair CIDs armazenados nas consultas do banco de dados e combiná-los
 * com o catálogo de referência nacional do SUS.
 */

import { Consultation } from '../types';

export interface Cid10Entry {
  code: string; // Ex: "F41.9"
  description: string; // Ex: "Transtorno ansioso não especificado"
  category?: string; // Ex: "Saúde Mental (CAPS)", "Atenção Primária", etc.
  fromDatabase?: boolean; // Se foi registrado em consultas prévias no banco
}

// Catálogo Curado de CID-10 Mais Utilizados no SUS, CAPS e Atenção Primária à Saúde
export const MASTER_CID10_CATALOG: Cid10Entry[] = [
  // --- TRANSTORNOS MENTAIS E COMPORTAMENTAIS (F00 - F99) ---
  // F00-F09 Transtornos Mentais Orgânicos
  { code: 'F00.0', description: 'Demência na doença de Alzheimer com início precoce', category: 'Saúde Mental (CAPS)' },
  { code: 'F00.1', description: 'Demência na doença de Alzheimer com início tardio', category: 'Saúde Mental (CAPS)' },
  { code: 'F03', description: 'Demência não especificada', category: 'Saúde Mental (CAPS)' },
  { code: 'F05.0', description: 'Delirium não superposto a demência', category: 'Saúde Mental (CAPS)' },
  { code: 'F06.7', description: 'Transtorno cognitivo leve', category: 'Saúde Mental (CAPS)' },
  { code: 'F07.0', description: 'Transtorno orgânico da personalidade', category: 'Saúde Mental (CAPS)' },

  // F10-F19 Transtornos por Uso de Substâncias Psicoativas (Álcool e outras Drogas - CAPS ad)
  { code: 'F10.0', description: 'Intoxicação aguda por uso de álcool', category: 'Saúde Mental (CAPS)' },
  { code: 'F10.1', description: 'Uso nocivo de álcool para a saúde', category: 'Saúde Mental (CAPS)' },
  { code: 'F10.2', description: 'Síndrome de dependência de álcool (Alcoolismo)', category: 'Saúde Mental (CAPS)' },
  { code: 'F10.3', description: 'Síndrome de abstinência de álcool', category: 'Saúde Mental (CAPS)' },
  { code: 'F10.4', description: 'Síndrome de abstinência de álcool com delirium (Delirium tremens)', category: 'Saúde Mental (CAPS)' },
  { code: 'F11.2', description: 'Síndrome de dependência de opioides', category: 'Saúde Mental (CAPS)' },
  { code: 'F12.1', description: 'Uso nocivo de canabinoides (Maconha)', category: 'Saúde Mental (CAPS)' },
  { code: 'F12.2', description: 'Síndrome de dependência de canabinoides', category: 'Saúde Mental (CAPS)' },
  { code: 'F13.2', description: 'Síndrome de dependência de sedativos ou hipnóticos', category: 'Saúde Mental (CAPS)' },
  { code: 'F14.1', description: 'Uso nocivo de cocaína', category: 'Saúde Mental (CAPS)' },
  { code: 'F14.2', description: 'Síndrome de dependência de cocaína / crack', category: 'Saúde Mental (CAPS)' },
  { code: 'F17.2', description: 'Síndrome de dependência de tabaco (Tabagismo)', category: 'Saúde Mental (CAPS)' },
  { code: 'F19.1', description: 'Uso nocivo de múltiplas drogas e substâncias psicoativas', category: 'Saúde Mental (CAPS)' },
  { code: 'F19.2', description: 'Síndrome de dependência de múltiplas drogas', category: 'Saúde Mental (CAPS)' },

  // F20-F29 Esquizofrenia, Transtornos Esquizotípicos e Delirantes
  { code: 'F20.0', description: 'Esquizofrenia paranoide', category: 'Saúde Mental (CAPS)' },
  { code: 'F20.1', description: 'Esquizofrenia hebefrênica', category: 'Saúde Mental (CAPS)' },
  { code: 'F20.3', description: 'Esquizofrenia indiferenciada', category: 'Saúde Mental (CAPS)' },
  { code: 'F20.5', description: 'Esquizofrenia residual', category: 'Saúde Mental (CAPS)' },
  { code: 'F20.9', description: 'Esquizofrenia não especificada', category: 'Saúde Mental (CAPS)' },
  { code: 'F22.0', description: 'Transtorno delirante persistente (Paranoia)', category: 'Saúde Mental (CAPS)' },
  { code: 'F23.0', description: 'Transtorno psicótico polimorfo agudo sem sintomas esquizofrenia', category: 'Saúde Mental (CAPS)' },
  { code: 'F23.9', description: 'Transtorno psicótico agudo e transitório não especificado', category: 'Saúde Mental (CAPS)' },
  { code: 'F25.0', description: 'Transtorno esquizoafetivo do tipo maníaco', category: 'Saúde Mental (CAPS)' },
  { code: 'F25.1', description: 'Transtorno esquizoafetivo do tipo depressivo', category: 'Saúde Mental (CAPS)' },
  { code: 'F25.2', description: 'Transtorno esquizoafetivo misto', category: 'Saúde Mental (CAPS)' },
  { code: 'F29', description: 'Psicose não-orgânica não especificada', category: 'Saúde Mental (CAPS)' },

  // F30-F39 Transtornos do Humor (Afetivos)
  { code: 'F31.0', description: 'Transtorno afetivo bipolar, episódio atual hipomaníaco', category: 'Saúde Mental (CAPS)' },
  { code: 'F31.1', description: 'Transtorno afetivo bipolar, episódio atual maníaco sem sintomas psicóticos', category: 'Saúde Mental (CAPS)' },
  { code: 'F31.2', description: 'Transtorno afetivo bipolar, episódio atual maníaco com sintomas psicóticos', category: 'Saúde Mental (CAPS)' },
  { code: 'F31.3', description: 'Transtorno afetivo bipolar, episódio atual depressivo leve ou moderado', category: 'Saúde Mental (CAPS)' },
  { code: 'F31.4', description: 'Transtorno afetivo bipolar, episódio atual depressivo grave sem sintomas psicóticos', category: 'Saúde Mental (CAPS)' },
  { code: 'F31.5', description: 'Transtorno afetivo bipolar, episódio atual depressivo grave com sintomas psicóticos', category: 'Saúde Mental (CAPS)' },
  { code: 'F31.6', description: 'Transtorno afetivo bipolar, episódio atual misto', category: 'Saúde Mental (CAPS)' },
  { code: 'F31.9', description: 'Transtorno afetivo bipolar não especificado', category: 'Saúde Mental (CAPS)' },
  { code: 'F32.0', description: 'Episódio depressivo leve', category: 'Saúde Mental (CAPS)' },
  { code: 'F32.1', description: 'Episódio depressivo moderado', category: 'Saúde Mental (CAPS)' },
  { code: 'F32.2', description: 'Episódio depressivo grave sem sintomas psicóticos', category: 'Saúde Mental (CAPS)' },
  { code: 'F32.3', description: 'Episódio depressivo grave com sintomas psicóticos', category: 'Saúde Mental (CAPS)' },
  { code: 'F32.9', description: 'Episódio depressivo não especificado', category: 'Saúde Mental (CAPS)' },
  { code: 'F33.0', description: 'Transtorno depressivo recorrente, episódio atual leve', category: 'Saúde Mental (CAPS)' },
  { code: 'F33.1', description: 'Transtorno depressivo recorrente, episódio atual moderado', category: 'Saúde Mental (CAPS)' },
  { code: 'F33.2', description: 'Transtorno depressivo recorrente, episódio atual grave sem sintomas psicóticos', category: 'Saúde Mental (CAPS)' },
  { code: 'F33.3', description: 'Transtorno depressivo recorrente, episódio atual grave com sintomas psicóticos', category: 'Saúde Mental (CAPS)' },
  { code: 'F33.9', description: 'Transtorno depressivo recorrente sem especificação', category: 'Saúde Mental (CAPS)' },
  { code: 'F34.1', description: 'Distimia', category: 'Saúde Mental (CAPS)' },
  { code: 'F39', description: 'Transtorno do humor (afetivo) não especificado', category: 'Saúde Mental (CAPS)' },

  // F40-F48 Transtornos Neuróticos, Relacionados ao Estresse e Somatoformes
  { code: 'F40.0', description: 'Agorafobia', category: 'Saúde Mental (CAPS)' },
  { code: 'F40.1', description: 'Fobias sociais (Ansiedade social)', category: 'Saúde Mental (CAPS)' },
  { code: 'F41.0', description: 'Transtorno de pânico (Ansiedade paroxística episódica)', category: 'Saúde Mental (CAPS)' },
  { code: 'F41.1', description: 'Transtorno de ansiedade generalizada (TAG)', category: 'Saúde Mental (CAPS)' },
  { code: 'F41.2', description: 'Transtorno misto ansioso e depressivo', category: 'Saúde Mental (CAPS)' },
  { code: 'F41.8', description: 'Outros transtornos ansiosos especificados', category: 'Saúde Mental (CAPS)' },
  { code: 'F41.9', description: 'Transtorno ansioso não especificado', category: 'Saúde Mental (CAPS)' },
  { code: 'F42.0', description: 'Transtorno obsessivo-compulsivo predominantemente obsessivo', category: 'Saúde Mental (CAPS)' },
  { code: 'F42.1', description: 'Transtorno obsessivo-compulsivo predominantemente compulsivo', category: 'Saúde Mental (CAPS)' },
  { code: 'F42.9', description: 'Transtorno obsessivo-compulsivo (TOC) não especificado', category: 'Saúde Mental (CAPS)' },
  { code: 'F43.0', description: 'Reação aguda ao estresse', category: 'Saúde Mental (CAPS)' },
  { code: 'F43.1', description: 'Estado de estresse pós-traumático (TEPT)', category: 'Saúde Mental (CAPS)' },
  { code: 'F43.2', description: 'Transtornos de adaptação', category: 'Saúde Mental (CAPS)' },
  { code: 'F44.9', description: 'Transtorno dissociativo (de conversão) não especificado', category: 'Saúde Mental (CAPS)' },
  { code: 'F45.0', description: 'Transtorno de somatização', category: 'Saúde Mental (CAPS)' },
  { code: 'F45.9', description: 'Transtorno somatoforme não especificado', category: 'Saúde Mental (CAPS)' },
  { code: 'F48.0', description: 'Neurastenia / Esgotamento crônico', category: 'Saúde Mental (CAPS)' },

  // F50-F59 Síndromes Comportamentais Associadas a Perturbações Fisiológicas
  { code: 'F50.0', description: 'Anorexia nervosa', category: 'Saúde Mental (CAPS)' },
  { code: 'F50.2', description: 'Bulimia nervosa', category: 'Saúde Mental (CAPS)' },
  { code: 'F51.0', description: 'Insônia não-orgânica', category: 'Saúde Mental (CAPS)' },
  { code: 'F51.1', description: 'Sonolência excessiva não-orgânica (Hipersonia)', category: 'Saúde Mental (CAPS)' },
  { code: 'F51.9', description: 'Transtorno do sono não-orgânico não especificado', category: 'Saúde Mental (CAPS)' },
  { code: 'F53.0', description: 'Transtornos mentais leves associados ao puerpério (Depressão pós-parto)', category: 'Saúde Mental (CAPS)' },

  // F60-F69 Transtornos da Personalidade e do Comportamento Adulto
  { code: 'F60.0', description: 'Transtorno de personalidade paranoide', category: 'Saúde Mental (CAPS)' },
  { code: 'F60.1', description: 'Transtorno de personalidade esquizoide', category: 'Saúde Mental (CAPS)' },
  { code: 'F60.2', description: 'Transtorno de personalidade antissocial', category: 'Saúde Mental (CAPS)' },
  { code: 'F60.3', description: 'Transtorno de personalidade emocionalmente instável (Borderline)', category: 'Saúde Mental (CAPS)' },
  { code: 'F60.4', description: 'Transtorno de personalidade histriônica', category: 'Saúde Mental (CAPS)' },
  { code: 'F60.6', description: 'Transtorno de personalidade esquiva (ansiosa)', category: 'Saúde Mental (CAPS)' },
  { code: 'F60.7', description: 'Transtorno de personalidade dependente', category: 'Saúde Mental (CAPS)' },
  { code: 'F60.9', description: 'Transtorno de personalidade não especificado', category: 'Saúde Mental (CAPS)' },

  // F70-F79 Retardo Mental / Deficiência Intelectual
  { code: 'F70.0', description: 'Retardo mental leve com menção de ausência de comprometimento comportamental', category: 'Saúde Mental (CAPS)' },
  { code: 'F70.1', description: 'Retardo mental leve com comprometimento significativo do comportamento', category: 'Saúde Mental (CAPS)' },
  { code: 'F70.9', description: 'Retardo mental leve (Deficiência Intelectual Leve)', category: 'Saúde Mental (CAPS)' },
  { code: 'F71.9', description: 'Retardo mental moderado (Deficiência Intelectual Moderada)', category: 'Saúde Mental (CAPS)' },
  { code: 'F72.9', description: 'Retardo mental grave (Deficiência Intelectual Grave)', category: 'Saúde Mental (CAPS)' },
  { code: 'F79.9', description: 'Retardo mental não especificado', category: 'Saúde Mental (CAPS)' },

  // F80-F89 Transtornos do Desenvolvimento Psicológico (TEA e Aprendizagem)
  { code: 'F80.9', description: 'Transtorno do desenvolvimento da fala e da linguagem não especificado', category: 'Saúde Mental (CAPS)' },
  { code: 'F81.9', description: 'Transtorno do desenvolvimento das habilidades escolares não especificado', category: 'Saúde Mental (CAPS)' },
  { code: 'F84.0', description: 'Autismo infantil (Transtorno do Espectro Autista - TEA)', category: 'Saúde Mental (CAPS)' },
  { code: 'F84.1', description: 'Autismo atípico', category: 'Saúde Mental (CAPS)' },
  { code: 'F84.5', description: 'Síndrome de Asperger', category: 'Saúde Mental (CAPS)' },
  { code: 'F84.9', description: 'Transtorno global do desenvolvimento não especificado (TGD / TEA)', category: 'Saúde Mental (CAPS)' },

  // F90-F98 Transtornos do Comportamento e Emocionais com Início na Infância/Adolescência
  { code: 'F90.0', description: 'Distúrbios da atividade e da atenção (TDAH)', category: 'Saúde Mental (CAPS)' },
  { code: 'F90.9', description: 'Transtorno hipercinético não especificado', category: 'Saúde Mental (CAPS)' },
  { code: 'F91.0', description: 'Distúrbio de conduta restrito ao contexto familiar', category: 'Saúde Mental (CAPS)' },
  { code: 'F91.3', description: 'Transtorno desafiador e de oposição (TOD)', category: 'Saúde Mental (CAPS)' },
  { code: 'F91.9', description: 'Transtorno de conduta não especificado', category: 'Saúde Mental (CAPS)' },
  { code: 'F93.0', description: 'Transtorno de ansiedade de separação na infância', category: 'Saúde Mental (CAPS)' },
  { code: 'F95.2', description: 'Transtorno de tiques vocais e motores múltiplos combinados (Síndrome de Tourette)', category: 'Saúde Mental (CAPS)' },

  // --- DOENÇAS DO SISTEMA NERVOSO (G00 - G99) ---
  { code: 'G20', description: 'Doença de Parkinson', category: 'Neurologia' },
  { code: 'G30.9', description: 'Doença de Alzheimer não especificada', category: 'Neurologia' },
  { code: 'G40.0', description: 'Epilepsia idiopática focal', category: 'Neurologia' },
  { code: 'G40.9', description: 'Epilepsia não especificada (Crises convulsivas)', category: 'Neurologia' },
  { code: 'G43.9', description: 'Enxaqueca sem especificação', category: 'Neurologia' },
  { code: 'G44.2', description: 'Cefaleia tensional', category: 'Neurologia' },
  { code: 'G47.0', description: 'Distúrbios do início e da manutenção do sono (Insônia orgânica)', category: 'Neurologia' },
  { code: 'G47.3', description: 'Apneia de sono', category: 'Neurologia' },

  // --- DOENÇAS DO APARELHO CIRCULATÓRIO (I00 - I99) ---
  { code: 'I10', description: 'Hipertensão essencial (primária)', category: 'Atenção Primária' },
  { code: 'I11.9', description: 'Doença cardíaca hipertensiva sem insuficiência cardíaca', category: 'Atenção Primária' },
  { code: 'I20.9', description: 'Angina pectoris não especificada', category: 'Atenção Primária' },
  { code: 'I21.9', description: 'Infarto agudo do miocárdio não especificado', category: 'Atenção Primária' },
  { code: 'I25.9', description: 'Doença isquêmica crônica do coração não especificada', category: 'Atenção Primária' },
  { code: 'I50.9', description: 'Insuficiência cardíaca não especificada', category: 'Atenção Primária' },
  { code: 'I64', description: 'Acidente vascular cerebral (AVC), não especificado como hemorrágico ou isquêmico', category: 'Atenção Primária' },
  { code: 'I69.4', description: 'Sequelas de acidente vascular cerebral', category: 'Atenção Primária' },

  // --- DOENÇAS ENDÓCRINAS, NUTRICIONAIS E METABÓLICAS (E00 - E90) ---
  { code: 'E03.9', description: 'Hipotireoidismo não especificado', category: 'Atenção Primária' },
  { code: 'E05.9', description: 'Tireotoxicose não especificada (Hipertireoidismo)', category: 'Atenção Primária' },
  { code: 'E10.9', description: 'Diabetes mellitus insulino-dependente sem complicações (Tipo 1)', category: 'Atenção Primária' },
  { code: 'E11.9', description: 'Diabetes mellitus não-insulino-dependente sem complicações (Tipo 2)', category: 'Atenção Primária' },
  { code: 'E14.9', description: 'Diabetes mellitus não especificado sem complicações', category: 'Atenção Primária' },
  { code: 'E66.0', description: 'Obesidade devida a excesso de calorias', category: 'Atenção Primária' },
  { code: 'E66.9', description: 'Obesidade não especificada', category: 'Atenção Primária' },
  { code: 'E78.0', description: 'Hipercolesterolemia pura (Dislipidemia)', category: 'Atenção Primária' },

  // --- DOENÇAS DO APARELHO RESPIRATÓRIO (J00 - J99) ---
  { code: 'J00', description: 'Nasofaringite aguda (Resfriado comum)', category: 'Atenção Primária' },
  { code: 'J06.9', description: 'Infecção aguda das vias aéreas superiores não especificada', category: 'Atenção Primária' },
  { code: 'J18.9', description: 'Pneumonia não especificada', category: 'Atenção Primária' },
  { code: 'J44.9', description: 'Doença pulmonar obstrutiva crônica (DPOC) não especificada', category: 'Atenção Primária' },
  { code: 'J45.9', description: 'Asma não especificada', category: 'Atenção Primária' },

  // --- DOENÇAS DO APARELHO DIGESTIVO E OSTEOMUSCULAR (K00-K93, M00-M99) ---
  { code: 'K21.9', description: 'Doença de refluxo gastroesofágico sem esofagite', category: 'Atenção Primária' },
  { code: 'K29.7', description: 'Gastrite não especificada', category: 'Atenção Primária' },
  { code: 'M54.2', description: 'Cervicalgia', category: 'Atenção Primária' },
  { code: 'M54.5', description: 'Dor lombar baixa (Lombalgia)', category: 'Atenção Primária' },
  { code: 'M79.7', description: 'Fibromialgia', category: 'Atenção Primária' },

  // --- SINTOMAS, SINAIS E ACHADOS ANORMAIS (R00 - R99) ---
  { code: 'R45.0', description: 'Nervosismo', category: 'Sintomas Clínicos' },
  { code: 'R45.1', description: 'Inquietação e agitação', category: 'Sintomas Clínicos' },
  { code: 'R45.4', description: 'Irritabilidade e mau humor', category: 'Sintomas Clínicos' },
  { code: 'R45.8', description: 'Outros sintomas e sinais relativos ao estado emocional (Choro fácil, labilidade)', category: 'Sintomas Clínicos' },
  { code: 'R51', description: 'Cefaleia (Dor de cabeça)', category: 'Sintomas Clínicos' },
  { code: 'R53', description: 'Mal-estar e fadiga (Astenia)', category: 'Sintomas Clínicos' },

  // --- FATORES QUE INFLUENCIAM O ESTADO DE SAÚDE E CONTATO COM SERVIÇOS (Z00 - Z99) ---
  { code: 'Z00.0', description: 'Exame médico geral (Rotina)', category: 'Administrativo / Exames' },
  { code: 'Z00.4', description: 'Exame psiquiátrico geral não classificado em outra parte', category: 'Administrativo / Exames' },
  { code: 'Z02.7', description: 'Obtenção de atestado médico', category: 'Administrativo / Exames' },
  { code: 'Z34.8', description: 'Acompanhamento de outra gravidez normal', category: 'Atenção Primária' },
  { code: 'Z63.0', description: 'Problemas na relação com o cônjuge ou parceiro', category: 'Psicossocial / Apoio' },
  { code: 'Z63.8', description: 'Outros problemas especificados relacionados ao grupo de apoio primário', category: 'Psicossocial / Apoio' },
  { code: 'Z73.0', description: 'Esgotamento (Síndrome de Burnout)', category: 'Saúde Mental (CAPS)' },
  { code: 'Z73.3', description: 'Estresse não classificado em outra parte', category: 'Saúde Mental (CAPS)' },
  { code: 'Z76.0', description: 'Emissão de prescrição médica de repetição', category: 'Administrativo / Exames' },
  { code: 'Z91.5', description: 'História pessoal de autoagressão / tentativa de suicídio', category: 'Saúde Mental (CAPS)' },
];

/**
 * Normaliza o código para busca e comparação limpa (ex: "F41.9" -> "F419")
 */
export function normalizeCidCode(code: string): string {
  return code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

/**
 * Extrai todos os CIDs registrados no histórico de consultas salvas no banco de dados.
 */
export function extractCidsFromConsultations(consultations?: Consultation[]): Cid10Entry[] {
  if (!consultations || consultations.length === 0) return [];

  const foundMap = new Map<string, Cid10Entry>();

  for (const cons of consultations) {
    // 1. Verificar se a consulta já possui laudo médico com CID-10
    if (cons.medicalReport?.cid10) {
      const items = parseCidListString(cons.medicalReport.cid10);
      for (const item of items) {
        const key = normalizeCidCode(item.code);
        if (key && !foundMap.has(key)) {
          foundMap.set(key, {
            code: item.code,
            description: item.description || findDescriptionInCatalog(item.code),
            category: 'Salvo no Banco de Dados',
            fromDatabase: true,
          });
        }
      }
    }

    // 2. Extrair CIDs de avaliacao e plano
    const fullText = `${cons.avaliacao || ''}\n${cons.plano || ''}\n${cons.rawNotes || ''}`;
    const regex = /\b([A-Za-z]\d{2}(?:\.\d{1,2})?|[A-Za-z]\d{3})\b(?:\s*[-–—:]\s*([^\n,;(]+)|\s*\((.*?)\))?/g;
    let m;
    while ((m = regex.exec(fullText)) !== null) {
      const rawCode = m[1].toUpperCase();
      // Filtrar apenas letras usuais de CID-10 (F, G, I, E, J, Z, R, K, M, A, B, X, Y)
      if (/^[FGIJEZRMKABXY]\d{2}/.test(rawCode)) {
        const norm = normalizeCidCode(rawCode);
        const desc = (m[2] || m[3] || '').trim();
        if (norm && !foundMap.has(norm)) {
          foundMap.set(norm, {
            code: formatStandardCidCode(rawCode),
            description: desc || findDescriptionInCatalog(rawCode),
            category: 'Salvo no Banco de Dados',
            fromDatabase: true,
          });
        }
      }
    }
  }

  return Array.from(foundMap.values());
}

/**
 * Formata um código de CID para o padrão com ponto quando aplicável (ex: "F419" -> "F41.9")
 */
export function formatStandardCidCode(code: string): string {
  const clean = code.trim().toUpperCase();
  if (clean.includes('.')) return clean;
  if (/^[A-Z]\d{3}$/.test(clean)) {
    return `${clean.slice(0, 3)}.${clean.slice(3)}`;
  }
  return clean;
}

/**
 * Procura a descrição oficial no catálogo mestre
 */
export function findDescriptionInCatalog(code: string): string {
  const norm = normalizeCidCode(code);
  const found = MASTER_CID10_CATALOG.find((item) => normalizeCidCode(item.code) === norm);
  return found ? found.description : 'Diagnóstico Clínico';
}

/**
 * Retorna todos os CIDs disponíveis, combinando os salvos no banco de dados
 * com o catálogo geral de referência, deduplicados e ordenados.
 */
export function getAllAvailableCids(consultations?: Consultation[]): Cid10Entry[] {
  const dbCids = extractCidsFromConsultations(consultations);
  const seen = new Set<string>();
  const results: Cid10Entry[] = [];

  // 1. Adicionar primeiro os CIDs do banco de dados (prioridade alta)
  for (const cid of dbCids) {
    const key = normalizeCidCode(cid.code);
    if (!seen.has(key)) {
      seen.add(key);
      results.push({
        ...cid,
        fromDatabase: true,
        category: 'Salvo no Banco de Dados',
      });
    }
  }

  // 2. Adicionar o catálogo mestre
  for (const item of MASTER_CID10_CATALOG) {
    const key = normalizeCidCode(item.code);
    if (!seen.has(key)) {
      seen.add(key);
      results.push(item);
    } else {
      // Se já estava no banco, atualizar categoria se estava sem descrição
      const existing = results.find((r) => normalizeCidCode(r.code) === key);
      if (existing && (!existing.description || existing.description === 'Diagnóstico Clínico')) {
        existing.description = item.description;
      }
    }
  }

  return results;
}

/**
 * Decompõe uma string de múltiplos CIDs em itens separados.
 * Ex: "F41.9 - Transtorno ansioso não especificado; F51.0 - Insônia não-orgânica"
 * Ou "F41.9 / F51.0"
 */
export function parseCidListString(cidString: string): Cid10Entry[] {
  if (!cidString || !cidString.trim()) return [];

  // Separar por ponto-e-vírgula, quebra de linha ou barra
  const rawParts = cidString.split(/\s*;\s*|\n+|\s*\/\s*/).filter(Boolean);
  const entries: Cid10Entry[] = [];
  const seen = new Set<string>();

  for (const part of rawParts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const match = trimmed.match(/^([A-Za-z]\d{2}(?:\.\d{1,2})?|[A-Za-z]\d{3})(?:\s*[-–—:]\s*(.*))?$/);
    if (match) {
      const code = formatStandardCidCode(match[1]);
      const norm = normalizeCidCode(code);
      if (!seen.has(norm)) {
        seen.add(norm);
        const description = (match[2] || '').trim() || findDescriptionInCatalog(code);
        entries.push({ code, description });
      }
    } else {
      // Tentar encontrar código na parte
      const subMatch = trimmed.match(/\b([A-Za-z]\d{2}(?:\.\d{1,2})?)\b/);
      if (subMatch) {
        const code = formatStandardCidCode(subMatch[1]);
        const norm = normalizeCidCode(code);
        if (!seen.has(norm)) {
          seen.add(norm);
          const desc = trimmed.replace(subMatch[0], '').replace(/^[-–—:\s()]+|[-–—:\s()]+$/g, '').trim();
          entries.push({ code, description: desc || findDescriptionInCatalog(code) });
        }
      } else {
        // Texto livre
        entries.push({ code: trimmed, description: '' });
      }
    }
  }

  return entries;
}

/**
 * Junta uma lista de CIDs em uma string padronizada oficial
 * Ex: "F41.9 - Transtorno ansioso não especificado; F51.0 - Insônia não-orgânica"
 */
export function formatCidListToString(entries: Cid10Entry[]): string {
  if (!entries || entries.length === 0) return '';
  return entries
    .map((e) => {
      const cleanCode = e.code.trim();
      const cleanDesc = (e.description || '').trim();
      if (!cleanDesc || cleanDesc === 'Diagnóstico Clínico') {
        return cleanCode;
      }
      return `${cleanCode} - ${cleanDesc}`;
    })
    .join('; ');
}
