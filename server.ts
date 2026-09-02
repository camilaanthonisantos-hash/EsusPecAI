import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { createServer as createViteServer } from "vite";
import multer from "multer";

dotenv.config();

const app = express();
const PORT = 3000;

// Body parsers with generous limits for audio/image payloads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Helper to get Gemini client
function getGeminiClient(userKey?: string): GoogleGenAI {
  const apiKeyClean = userKey?.trim() || process.env.GEMINI_API_KEY;
  if (!apiKeyClean) {
    throw new Error(
      "Chave de API do Gemini não configurada. Configure a GEMINI_API_KEY nas variáveis de ambiente ou informe sua chave no painel de configurações."
    );
  }
  return new GoogleGenAI({
    apiKey: apiKeyClean,
  });
}

// Resilient helper to call Gemini models with automatic fallback on timeout or model availability
async function generateContentWithFallback(
  ai: GoogleGenAI,
  preferredModel: string,
  generateParams: {
    contents: any;
    config?: any;
  }
) {
  // Ordered model candidates starting with preferredModel
  const candidateModels: string[] = [];

  if (preferredModel) {
    candidateModels.push(preferredModel);
  }

  // Common modern active aliases, prioritized by speed/availability for PEC
  const fallbackList = [
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.1-flash-lite",
    "gemini-3.1-pro-preview"
  ];
  for (const m of fallbackList) {
    if (!candidateModels.includes(m)) {
      candidateModels.push(m);
    }
  }

  let lastError: any = null;

  for (let i = 0; i < candidateModels.length; i++) {
    const modelToTry = candidateModels[i];
    try {
      console.log(`[Gemini API] Chamando modelo: ${modelToTry}...`);
      const response = await ai.models.generateContent({
        model: modelToTry,
        contents: generateParams.contents,
        config: generateParams.config,
      });
      return { response, modelUsed: modelToTry };
    } catch (err: any) {
      console.warn(`[Gemini API] Modelo ${modelToTry} falhou:`, err?.message || err);
      lastError = err;

      const errMsg = String(err?.message || "").toLowerCase();
      
      // If API key is explicitly invalid, stop trying other models
      if (errMsg.includes("api_key_invalid") || errMsg.includes("invalid api key") || err?.status === 403) {
        throw err;
      }

      // If Quota Exceeded (429) or Service Unavailable (503), wait before trying next model
      if (err?.status === 429 || err?.status === 503) {
        console.warn(`[Gemini API] Quota ou Indisponibilidade. Aguardando 5s antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  throw lastError || new Error("Não foi possível obter resposta dos modelos do Gemini.");
}

// System prompt generator based on profession and guidelines
function buildSystemPrompt(professionName: string, isFirstConsultation: boolean = false, customContext?: string): string {
  const profUpper = professionName.trim().toUpperCase();
  const safeContext = typeof customContext === "string" ? customContext : "";

  let prompt = `# MOTOR DE PROCESSAMENTO CLÍNICO MULTIPROFISSIONAL (e-SUS PEC / APS / RAPS / eMulti)\n\n`;
  prompt += `CATEGORIA PROFISSIONAL ATUAL: ${profUpper}\n`;
  prompt += `TIPO DE ATENDIMENTO: ${isFirstConsultation ? "PRIMEIRO ATENDIMENTO / ACOLHIMENTO INICIAL" : "RETORNO / REAVALIAÇÃO / ALTA"}\n\n`;

  prompt += `DIRETRIZES CONFORME O TIPO DE ATENDIMENTO:\n`;
  if (isFirstConsultation) {
    prompt += `- PRIMEIRO ATENDIMENTO / ACOLHIMENTO INICIAL: Gerar anamnese/histórico abrangente, relato detalhado da queixa/demanda e levantamento integral de diagnósticos e necessidades clínicas/sociais/funcionais.\n\n`;
  } else {
    prompt += `- RETORNO / REAVALIAÇÃO / ALTA: Focar na evolução comparativa em relação ao plano anterior, adesão às condutas/intervenções e reajuste terapêutico ou critérios de alta.\n`;
    prompt += `- AUDITORIA CLÍNICA CRUZADA ATIVA: Se algum problema de saúde, medicação prévia, meta pendente ou exame/encaminhamento de atendimentos anteriores NÃO tiver sido mencionado ou resolvido hoje, acrescente obrigatoriamente no final da resposta o seguinte bloco:\n`;
    prompt += `---\n### ⚠️ AUDITORIA CLÍNICA: PENDÊNCIAS DO HISTÓRICO ANTERIOR\n`;
    prompt += `- ❓ [Problema/Sintoma Pendente]: [Pergunta para checar o desfecho]\n`;
    prompt += `- ❓ [Medicamento / Conduta Anterior]: [Checagem de adesão/tolerância]\n`;
    prompt += `- ❓ [Exame / Encaminhamento Pendente]: [Checagem de realização]\n\n`;
  }

  prompt += `REGRAS OBRIGATÓRIAS DE PADRONIZAÇÃO E FORMATAÇÃO PARA O PEC:\n`;
  prompt += `1. SINAIS VITAIS E ANTROPOMETRIA QUALITATIVOS: Nunca utilize valores numéricos brutos (ex: não escreva "120x80 mmHg", "IMC 24.2", "72 bpm"). Converta sempre para terminologia qualitativa padronizada (Eutrófico, Normotenso, Normocárdico, Eupneico, Normotérmico, Normossaturado, etc.).\n`;
  prompt += `2. ESTRUTURA RIGOROSA DE 3 BLOCOS DO PEC: Você DEVE SEMPRE gerar estritamente 3 blocos delimitados exatamente pelos cabeçalhos:\n`;
  prompt += `   ### CAMPO: AVALIAÇÃO\n`;
  prompt += `   ### CAMPO: PLANO\n`;
  prompt += `   ### CAMPO 06: FINALIZAÇÃO DO ATENDIMENTO / CONDUTA\n\n`;
  prompt += `3. FORMATAÇÃO RIGOROSA DAS SUBSEÇÕES (PADRÃO PROFISSIONAL DE ENFERMAGEM/MULTI):\n`;
  prompt += `   - O título de cada subseção DEVE estar em LETRAS MAIÚSCULAS com dois pontos no final (SEM asteriscos duplos **).\n`;
  prompt += `   - O conteúdo logo abaixo do título DEVE ser formatado como citação em bloco iniciando cada linha com "> " (garantindo a formatação nativa de citação do e-SUS PEC).\n`;
  prompt += `   - O conteúdo citado deve estar imediatamente na linha seguinte ao título (sem linha em branco intermediária).\n`;
  prompt += `   - Separe cada subseção completa da próxima com uma linha em branco.\n\n`;

  prompt += `4. ESTRUTURAÇÃO ESPECÍFICA POR CATEGORIA PROFISSIONAL:\n\n`;

  if (profUpper.includes("ENFERM")) {
    prompt += `ESTRUTURA PARA ENFERMAGEM:\n`;
    prompt += `### CAMPO: AVALIAÇÃO\n`;
    prompt += `HISTÓRICO/EVOLUÇÃO:\n> [Texto do histórico do usuário e queixa...]\n\n`;
    prompt += `EXAME CLÍNICO:\n> [Exame físico/mental e sinais vitais qualitativos...]\n\n`;
    prompt += `DIAGNÓSTICOS DE ENFERMAGEM (NANDA-I):\n> - [Diagnóstico 1]\n> - [Diagnóstico 2]\n\n`;
    prompt += `CIAP-2:\n> - [Código] ([Descrição])\n\n`;
    prompt += `CID-10:\n> - [Código] ([Descrição])\n\n`;

    prompt += `### CAMPO: PLANO\n`;
    prompt += `METAS (NOC):\n> - [Meta 1]\n> - [Meta 2]\n\n`;
    prompt += `INTERVENÇÕES (NIC):\n> - [Intervenção 1]\n> - [Intervenção 2]\n\n`;
    prompt += `CIAP-2:\n> - 69 (Outras orientações / Aconselhamento / Educação em saúde)\n\n`;
    prompt += `SIGTAP:\n> - ORIENTAÇÃO INDIVIDUAL EM SAÚDE\n\n`;

    prompt += `### CAMPO 06: FINALIZAÇÃO DO ATENDIMENTO / CONDUTA\n`;
    prompt += `CONDUTA IMEDIATA:\n> [Acolhimento e orientações imediatas...]\n\n`;
    prompt += `PRESCRIÇÕES DE ENFERMAGEM / TRANSCRIÇÕES:\n> [Prescrições conforme protocolos municipais...]\n\n`;
    prompt += `GUIAS DE REFERÊNCIA / SOLICITAÇÃO DE EXAMES:\n> [Solicitações laboratoriais ou encaminhamentos...]\n\n`;
    prompt += `RETORNO / AGENDAMENTO:\n> [Agendamento de retorno e orientações de seguimento...]\n\n`;
  } else if (profUpper.includes("ASSIST") || profUpper.includes("SOCIAL") || profUpper.includes("CRESS")) {
    prompt += `ESTRUTURA PARA SERVIÇO SOCIAL (ASSISTENTE SOCIAL):\n`;
    prompt += `### CAMPO: AVALIAÇÃO\n`;
    prompt += `HISTÓRICO / EVOLUÇÃO SOCIAL:\n> [Relato das demandas socioeconômicas, dinâmica familiar, renda e contexto comunitário...]\n\n`;
    prompt += `AVALIAÇÃO DA DETERMINAÇÃO SOCIAL E VULNERABILIDADE:\n> [Análise das condições de moradia, acesso a bens/serviços, barreiras sociais e violação de direitos...]\n\n`;
    prompt += `DEMANDAS SOCIOASSISTENCIAIS IDENTIFICADAS:\n> - [Demanda 1: Ex. Insegurança de renda / Dificuldade de acesso a BPC/CadÚnico]\n> - [Demanda 2: Ex. Fragilidade de rede de apoio familiar/comunitária]\n\n`;
    prompt += `CIAP-2:\n> - [Código] ([Descrição: ex. Z01 Pobreza/problemas econômicos, Z04 Problema sociocultural/familiar])\n\n`;
    prompt += `CID-10:\n> - [Código] ([Descrição: ex. Z59.0 Falta de habitação, Z59.5 Extrema pobreza, Z73.0 Esgotamento])\n\n`;

    prompt += `### CAMPO: PLANO\n`;
    prompt += `METAS E OBJETIVOS DO ACOMPANHAMENTO SOCIAL:\n> - [Meta 1: Ex. Regularização documental e inclusão no Cadastro Único]\n> - [Meta 2: Ex. Garantia de acesso a benefícios socioassistenciais]\n\n`;
    prompt += `INTERVENÇÕES E ORIENTAÇÕES SOCIAIS:\n> - [Intervenção 1: Ex. Orientação técnica sobre critérios de concessão do BPC/LOAS]\n> - [Intervenção 2: Ex. Acompanhamento periódico da situação de vulnerabilidade]\n\n`;
    prompt += `CIAP-2:\n> - 69 (Outras orientações / Aconselhamento / Educação em saúde)\n\n`;
    prompt += `SIGTAP:\n> - ORIENTAÇÃO INDIVIDUAL EM SAÚDE\n\n`;

    prompt += `### CAMPO 06: FINALIZAÇÃO DO ATENDIMENTO / CONDUTA\n`;
    prompt += `CONDUTA IMEDIATA:\n> [Acolhimento imediato e orientações prestadas ao usuário/família...]\n\n`;
    prompt += `ENCAMINHAMENTOS E ARTICULAÇÃO INTERSETORIAL (CRAS / CREAS / INSS / SUAS):\n> [Encaminhamento formal ao CRAS de referência, setor de benefícios ou programas de transferência de renda...]\n\n`;
    prompt += `SOLICITAÇÃO DE DOCUMENTOS / LAUDOS CIRCUNSTANCIADOS:\n> [Solicitação de laudo médico atualizado para instrução do BPC/LOAS ou emissão de relatório social...]\n\n`;
    prompt += `RETORNO / AGENDAMENTO:\n> [Prazo estipulado para retorno, entrega de documentos e acompanhamento continuado...]\n\n`;
  } else if (profUpper.includes("PSICOL") || profUpper.includes("CRP")) {
    prompt += `ESTRUTURA PARA PSICOLOGIA:\n`;
    prompt += `### CAMPO: AVALIAÇÃO\n`;
    prompt += `HISTÓRICO / EVOLUÇÃO CLÍNICO-PSICOLÓGICA:\n> [Queixa principal, dinâmica afetiva, estado subjetivo e relato espontâneo...]\n\n`;
    prompt += `EXAME DO ESTADO MENTAL E AVALIAÇÃO SUBJETIVA:\n> [Aparência, humor, afeto, orientação temporoespacial, discurso, pensamento, sensopercepção e sono...]\n\n`;
    prompt += `DEMANDAS PSICOLÓGICAS E HIPÓTESES COMPREENSIVAS:\n> - [Demanda / Sofrimento psíquico identificado]\n\n`;
    prompt += `CIAP-2:\n> - [Código] ([Descrição: ex. P01 Sensação de ansiedade/nervosismo, P03 Sensação de depressão, P79 Outros transtornos psicológicos])\n\n`;
    prompt += `CID-10:\n> - [Código] ([Descrição: ex. F32.1 Episódio depressivo, F41.1 Ansiedade generalizada, F20.0 Esquizofrenia paranoide])\n\n`;

    prompt += `### CAMPO: PLANO\n`;
    prompt += `METAS TERAPÊUTICAS (PTS - PROJETO TERAPÊUTICO SINGULAR):\n> - [Meta 1: Ex. Desenvolvimento de estratégias de autorregulação emocional e enfrentamento]\n\n`;
    prompt += `INTERVENÇÕES PSICOTERAPÊUTICAS E MANEJOS:\n> - [Intervenção 1: Ex. Psicoterapia individual com foco em reestruturação cognitiva e expressão afetiva]\n\n`;
    prompt += `CIAP-2:\n> - 69 (Outras orientações / Aconselhamento / Educação em saúde)\n\n`;
    prompt += `SIGTAP:\n> - ORIENTAÇÃO INDIVIDUAL EM SAÚDE\n\n`;

    prompt += `### CAMPO 06: FINALIZAÇÃO DO ATENDIMENTO / CONDUTA\n`;
    prompt += `CONDUTA IMEDIATA:\n> [Intervenção em crise, acolhimento ou validação afetiva realizada no atendimento...]\n\n`;
    prompt += `ARTICULAÇÃO DE REDE / ENCAMINHAMENTOS (RAPS / CAPS / APS):\n> [Articulação com equipe de Saúde da Família, matriciamento com Psiquiatria ou grupos terapêuticos...]\n\n`;
    prompt += `RETORNO / AGENDAMENTO:\n> [Frequência dos atendimentos psicoterapêuticos e agendamento da próxima sessão...]\n\n`;
  } else if (profUpper.includes("PSICOPEDAG")) {
    prompt += `ESTRUTURA PARA PSICOPEDAGOGIA:\n`;
    prompt += `### CAMPO: AVALIAÇÃO\n`;
    prompt += `HISTÓRICO / EVOLUÇÃO PSICOPEDAGÓGICA:\n> [Histórico de aprendizagem, queixas escolares e desenvolvimento global...]\n\n`;
    prompt += `AVALIAÇÃO DAS FUNÇÕES EXECUTIVAS E COGNIÇÃO:\n> [Atenção sustentada, controle inibitório, memória operacional e raciocínio lógico-matemático...]\n\n`;
    prompt += `DEMANDAS DE APRENDIZAGEM IDENTIFICADAS:\n> - [Dificuldade ou potencialidade de aprendizagem observada]\n\n`;
    prompt += `CIAP-2:\n> - [Código] ([Descrição: ex. P24 Dificuldade de aprendizagem])\n\n`;
    prompt += `CID-10:\n> - [Código] ([Descrição: ex. F81.9 Transtorno do desenvolvimento das habilidades escolares])\n\n`;

    prompt += `### CAMPO: PLANO\n`;
    prompt += `METAS DE ESTIMULAÇÃO PSICOPEDAGÓGICA:\n> - [Meta 1: Ex. Fortalecimento da flexibilidade cognitiva e planejamento sequencial]\n\n`;
    prompt += `INTERVENÇÕES E ESTRATÉGIAS DE MEDIAÇÃO:\n> - [Intervenção 1: Ex. Estimulação psicopedagógica mediada por recursos lúdicos e visuais concretos]\n\n`;
    prompt += `CIAP-2:\n> - 69 (Outras orientações / Aconselhamento / Educação em saúde)\n\n`;
    prompt += `SIGTAP:\n> - ORIENTAÇÃO INDIVIDUAL EM SAÚDE\n\n`;

    prompt += `### CAMPO 06: FINALIZAÇÃO DO ATENDIMENTO / CONDUTA\n`;
    prompt += `CONDUTA IMEDIATA:\n> [Orientações imediatas aos responsáveis para estruturação da rotina domiciliar...]\n\n`;
    prompt += `ARTICULAÇÃO ESCOLAR / INTERSETORIAL (AEE / PDI):\n> [Diálogo com coordenação pedagógica e subsídios para o Plano de Desenvolvimento Individual na escola...]\n\n`;
    prompt += `RETORNO / AGENDAMENTO:\n> [Periodicidade e agendamento dos atendimentos psicopedagógicos...]\n\n`;
  } else if (profUpper.includes("NUTRI")) {
    prompt += `ESTRUTURA PARA NUTRIÇÃO:\n`;
    prompt += `### CAMPO: AVALIAÇÃO\n`;
    prompt += `HISTÓRICO / EVOLUÇÃO NUTRICIONAL:\n> [Hábitos alimentares, recordatório, intolerâncias, ingestão hídrica e comportamento à mesa...]\n\n`;
    prompt += `AVALIAÇÃO ANTROPOMÉTRICA E CLÍNICO-NUTRICIONAL:\n> [Estado nutricional qualitativo (Eutrófico/Sobrepeso/Baixo Peso), sinais clínicos de carências e digestão...]\n\n`;
    prompt += `DIAGNÓSTICOS DE NUTRIÇÃO / DEMANDAS DIETÉTICAS:\n> - [Inadequação ou diagnóstico nutricional identificado]\n\n`;
    prompt += `CIAP-2:\n> - [Código] ([Descrição: ex. T07 Ganho de peso, T08 Perda de peso, T89 Diabetes mellitus])\n\n`;
    prompt += `CID-10:\n> - [Código] ([Descrição: ex. E66 Obesidade, E46 Desnutrição, E11 Diabetes tipo 2])\n\n`;

    prompt += `### CAMPO: PLANO\n`;
    prompt += `METAS DO PLANO ALIMENTAR:\n> - [Meta 1: Ex. Adequação qualitativa da ingestão calórica e aumento do consumo de alimentos in natura]\n\n`;
    prompt += `INTERVENÇÕES E ORIENTAÇÕES NUTRICIONAIS:\n> - [Intervenção 1: Ex. Elaboração de plano alimentar individualizado adaptado à realidade socioeconômica]\n\n`;
    prompt += `CIAP-2:\n> - 69 (Outras orientações / Aconselhamento / Educação em saúde)\n\n`;
    prompt += `SIGTAP:\n> - ORIENTAÇÃO INDIVIDUAL EM SAÚDE\n\n`;

    prompt += `### CAMPO 06: FINALIZAÇÃO DO ATENDIMENTO / CONDUTA\n`;
    prompt += `CONDUTA IMEDIATA:\n> [Orientações nutricionais e metas práticas pactuadas no atendimento...]\n\n`;
    prompt += `ENCAMINHAMENTOS / SOLICITAÇÃO DE EXAMES LABORATORIAIS:\n> [Solicitação de exames pertinentes (perfil lipídico, glicemia) ou encaminhamento multidisciplinar...]\n\n`;
    prompt += `RETORNO / AGENDAMENTO:\n> [Prazo para retorno, monitoramento ponderal e reavaliação do plano alimentar...]\n\n`;
  } else {
    // Demais especialidades (Médico, Educador Físico, Fisioterapeuta, etc.)
    prompt += `ESTRUTURA PARA ${profUpper}:\n`;
    prompt += `### CAMPO: AVALIAÇÃO\n`;
    prompt += `HISTÓRICO / EVOLUÇÃO DO ATENDIMENTO:\n> [Relato detalhado da consulta, queixas principais e histórico...]\n\n`;
    prompt += `AVALIAÇÃO TÉCNICA E EXAME CLÍNICO-FUNCIONAL:\n> [Achados do exame clínico/físico/funcional com parâmetros estritamente qualitativos...]\n\n`;
    prompt += `DIAGNÓSTICOS / DEMANDAS TÉCNICAS IDENTIFICADAS:\n> - [Diagnóstico ou demanda principal]\n\n`;
    prompt += `CIAP-2:\n> - [Código] ([Descrição])\n\n`;
    prompt += `CID-10:\n> - [Código] ([Descrição])\n\n`;

    prompt += `### CAMPO: PLANO\n`;
    prompt += `METAS E OBJETIVOS TERAPÊUTICOS:\n> - [Meta 1]\n\n`;
    prompt += `INTERVENÇÕES E CONDUTAS TÉCNICAS:\n> - [Intervenção 1]\n\n`;
    prompt += `CIAP-2:\n> - 69 (Outras orientações / Aconselhamento / Educação em saúde)\n\n`;
    prompt += `SIGTAP:\n> - ORIENTAÇÃO INDIVIDUAL EM SAÚDE\n\n`;

    prompt += `### CAMPO 06: FINALIZAÇÃO DO ATENDIMENTO / CONDUTA\n`;
    prompt += `CONDUTA IMEDIATA:\n> [Condutas e orientações imediatas fornecidas ao usuário...]\n\n`;
    prompt += `ENCAMINHAMENTOS E ARTICULAÇÃO DE REDE:\n> [Encaminhamentos intersetoriais ou para outros pontos da rede de saúde...]\n\n`;
    prompt += `PRESCRIÇÕES / GUIAS / DOCUMENTOS:\n> [Prescrições, guias ou atestados pertinentes...]\n\n`;
    prompt += `RETORNO / AGENDAMENTO:\n> [Prazo para retorno e seguimento...]\n\n`;
  }

  if (safeContext) {
    prompt += `\n--- BASE DE CONHECIMENTO / PROTOCOLOS LOCAIS E REMUME MUNICIPAL INJETADOS ---\n${safeContext}\n\n`;
  }

  prompt += `INSTRUÇÃO FINAL:\n`;
  prompt += `Gere rigorosamente os 3 blocos com os cabeçalhos '### CAMPO: AVALIAÇÃO', '### CAMPO: PLANO' e '### CAMPO 06: FINALIZAÇÃO DO ATENDIMENTO / CONDUTA'. Mantenha todos os títulos das subseções em LETRAS MAIÚSCULAS e todo o conteúdo correspondente formatado com '> '. Mantenha o texto limpo, técnico e pronto para o e-SUS PEC.`;

  return prompt;
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "e-SUS PEC Multiprofissional AI API",
    timestamp: new Date().toISOString(),
  });
});

// Main generation endpoint
app.post("/api/gemini/generate", async (req, res) => {
  try {
    const profession = typeof req.body.profession === "string" ? req.body.profession : "Enfermeiro";
    const modelName = typeof req.body.modelName === "string" ? req.body.modelName : "gemini-3.7-flash";
    const isFirstConsultation = Boolean(req.body.isFirstConsultation);
    const patientHistory = req.body.patientHistory;
    const rawNotes = typeof req.body.rawNotes === "string" ? req.body.rawNotes : "";
    const audioData = req.body.audioData;
    const images = Array.isArray(req.body.images) ? req.body.images : [];
    const customContext = typeof req.body.customContext === "string" ? req.body.customContext : "";
    const userApiKey = typeof req.body.userApiKey === "string" ? req.body.userApiKey : undefined;
    const openaiApiKey = typeof req.body.openaiApiKey === "string" ? req.body.openaiApiKey : undefined;
    const openrouterApiKey = typeof req.body.openrouterApiKey === "string" ? req.body.openrouterApiKey : undefined;

    if (!rawNotes && !audioData && (!images || images.length === 0)) {
      return res.status(400).json({
        error: "Por favor, insira um relato em texto, grave um áudio ou anexe um documento/foto.",
      });
    }

    const systemInstruction = buildSystemPrompt(profession, Boolean(isFirstConsultation), customContext);

    // Determine model routing
    const isGemini = modelName.includes("gemini");
    const isOpenAI = modelName.includes("gpt");
    const isOpenRouter = !isGemini && !isOpenAI;

    let targetModel = modelName;
    if (isGemini) {
      const validModels = ["gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.1-flash-lite", "gemini-3.1-pro-preview", "gemini-2.5-pro", "gemini-pro"];
      if (validModels.includes(modelName)) {
        targetModel = modelName === "gemini-2.5-pro" || modelName === "gemini-pro" ? "gemini-3.1-pro-preview" : modelName;
      } else if (modelName?.includes("pro")) {
        targetModel = "gemini-3.1-pro-preview";
      } else if (modelName?.includes("lite")) {
        targetModel = "gemini-3.1-flash-lite";
      } else {
        targetModel = "gemini-3.7-flash";
      }
    }

    console.log(`[AI Generation] Model requested from client: "${modelName}" -> Executing on model: "${targetModel}"`);

    // Prepare User Prompt
    let userTextPrompt = `Por favor, elabore o registro clínico formal para o PEC do e-SUS para o profissional: ${profession}.\n`;
    userTextPrompt += `TIPO DE ATENDIMENTO: ${isFirstConsultation ? "PRIMEIRO ATENDIMENTO / ACOLHIMENTO INICIAL" : "RETORNO / REAVALIAÇÃO / ALTA"}\n\n`;

    if (rawNotes && rawNotes.trim().length > 0) {
      userTextPrompt += `DADOS BRUTOS / RELATO DO ATENDIMENTO ATUAL:\n${rawNotes}\n\n`;
    }

    if (!isFirstConsultation && patientHistory) {
      let formattedHistoryText = "";
      if (Array.isArray(patientHistory) && patientHistory.length > 0) {
        // Limit to last 5 consultations to save tokens
        const recentHistory = patientHistory.slice(-5);
        formattedHistoryText = recentHistory
          .map((item: any, idx: number) => {
            return `[${item.date || "Data ?"} | ${item.author || "Prof."}]: Aval: ${item.avaliacao?.substring(0, 150) || "--"} | Plano: ${item.plano?.substring(0, 150) || "--"}`;
          })
          .join("\n");
      } else if (typeof patientHistory === "string" && patientHistory.trim().length > 0) {
        formattedHistoryText = patientHistory.substring(0, 1000);
      }

      if (formattedHistoryText) {
        userTextPrompt += `HISTÓRICO RECENTE (últimos 5):\n${formattedHistoryText}\n\n`;
      }
    }

    let transcribedText = "";

    // 1. Process Multimedia (Audio/Image) using Gemini if needed
    if (audioData || (images && images.length > 0)) {
      const ai = getGeminiClient(userApiKey);
      const contentsParts: Array<any> = [];

      if (audioData?.data) {
        contentsParts.push({
          inlineData: {
            mimeType: audioData.mimeType || "audio/webm",
            data: audioData.data,
          },
        });
      }

      if (Array.isArray(images)) {
        for (const img of images) {
          if (img?.data) {
            contentsParts.push({
              inlineData: {
                mimeType: img.mimeType || "image/jpeg",
                data: img.data,
              },
            });
          }
        }
      }

      const validParts = contentsParts
        .filter((p) => p && typeof p === "object")
        .map((p) => {
          if (p.inlineData && typeof p.inlineData === "object" && typeof p.inlineData.data === "string") {
            return {
              inlineData: {
                mimeType: String(p.inlineData.mimeType || "image/jpeg"),
                data: String(p.inlineData.data),
              },
            };
          }
          return null;
        })
        .filter((p): p is { inlineData: { mimeType: string; data: string } } => p !== null);

      if (isGemini) {
        // Direct processing
        if (audioData) {
          userTextPrompt += `OBSERVAÇÃO: Há um áudio anexado com o relato verbal da consulta/visita. Faça a transcrição e extração clínica integral dos pontos relatados.\n\n`;
        }
        if (images && images.length > 0) {
          userTextPrompt += `OBSERVAÇÃO: Há ${images.length} imagem(ns)/documento(s) anexados (receitas, exames ou monitores de sinais vitais). Extraia todos os dados clínicos pertinentes e incorpore no prontuário conforme as regras do PEC.\n\n`;
        }
        validParts.push({ text: userTextPrompt } as any);
        
        userTextPrompt += `Gere o prontuário estruturado pronto para cópia conforme os blocos e regras obrigatórias.`;
        
        const { response, modelUsed } = await generateContentWithFallback(ai, targetModel, {
          contents: [{ role: "user", parts: validParts }],
          config: {
            systemInstruction,
            temperature: 0.2,
            topP: 0.9,
          },
        });
        
        transcribedText = response.text || "";
        targetModel = modelUsed;
      } else {
        // Pre-transcribe for OpenAI/OpenRouter
        console.log(`[AI Generation] Transcribing multimedia using Gemini for external model: ${targetModel}`);
        validParts.push({ text: "Transcreva o áudio (se houver) e descreva os documentos/fotos anexados com o máximo de detalhes clínicos possíveis. Não estruture o prontuário ainda." } as any);
        
        const { response } = await generateContentWithFallback(ai, "gemini-3.7-flash", {
          contents: [{ role: "user", parts: validParts }],
          config: {
            temperature: 0.1,
          },
        });
        
        if (response.text) {
          userTextPrompt += `[TRANSCRIÇÃO/DESCRIÇÃO DO MULTIMÍDIA GERADA POR IA]:\n${response.text}\n\n`;
        }
      }
    }

    let fullText = transcribedText;

    // 2. Generate Text if using OpenAI / OpenRouter (or if it was a text-only Gemini request)
    if (!isGemini || (!audioData && (!images || images.length === 0))) {
      userTextPrompt += `Gere o prontuário estruturado pronto para cópia conforme os blocos e regras obrigatórias.`;
      
      if (isGemini) {
        const ai = getGeminiClient(userApiKey);
        const { response, modelUsed } = await generateContentWithFallback(ai, targetModel, {
          contents: [{ role: "user", parts: [{ text: userTextPrompt }] }],
          config: {
            systemInstruction,
            temperature: 0.2,
            topP: 0.9,
          },
        });
        fullText = response.text || "";
        targetModel = modelUsed;
      } else {
        // OpenAI or OpenRouter logic
        const keyToUse = isOpenAI ? openaiApiKey : openrouterApiKey;
        const envKey = isOpenAI ? process.env.OPENAI_API_KEY : process.env.OPENROUTER_API_KEY;
        const finalKey = (keyToUse || envKey || "").trim();
        
        if (!finalKey) {
          throw new Error(`Chave de API da ${isOpenAI ? 'OpenAI' : 'OpenRouter'} não configurada.`);
        }

        const client = new OpenAI({
          apiKey: finalKey,
          baseURL: isOpenRouter ? "https://openrouter.ai/api/v1" : undefined,
        });

        console.log(`[AI Generation] Calling ${isOpenAI ? 'OpenAI' : 'OpenRouter'} with model: ${targetModel}`);
        const response = await client.chat.completions.create({
          model: targetModel,
          temperature: 0.2,
          top_p: 0.9,
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: userTextPrompt }
          ],
        });

        fullText = response.choices[0]?.message?.content || "";
      }
    }

    // Parse the output into distinct blocks for the PEC cards
    const parsed = parsePECBlocks(fullText, profession);

    res.json({
      success: true,
      fullText,
      avaliacao: parsed.avaliacao,
      plano: parsed.plano,
      conduta: parsed.conduta,
      clinicalAudit: parsed.clinicalAudit,
      isFirstConsultation: Boolean(isFirstConsultation),
      hasBlock3: parsed.hasBlock3,
      modelUsed: targetModel,
      profession,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error("Erro na chamada Gemini API:", error);
    const errorMessage =
      error?.message || "Ocorreu um erro ao processar o prontuário com a IA.";
    res.status(500).json({
      error: errorMessage,
    });
  }
});

// Test API Key endpoint
app.post("/api/gemini/test", async (req, res) => {
  try {
    const { apiKey, model = "gemini-3.6-flash" } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: "Chave de API não informada." });
    }
    const ai = getGeminiClient(apiKey);
    const { response, modelUsed } = await generateContentWithFallback(ai, model, {
      contents: [
        {
          role: "user",
          parts: [{ text: "Responda apenas: OK" }],
        },
      ],
    });
    res.json({
      success: true,
      message: `Chave de API válida e conectada com sucesso via modelo ${modelUsed}!`,
      text: response.text,
    });
  } catch (err: any) {
    console.error("Erro no teste da API Key:", err);
    res.status(500).json({
      error: err?.message || "Falha na validação da chave com o Gemini.",
    });
  }
});

// Test Groq API Key Endpoint
app.post("/api/groq/test", async (req, res) => {
  try {
    const apiKey = typeof req.body.apiKey === "string" ? req.body.apiKey.trim() : "";
    if (!apiKey) {
      return res.status(400).json({ success: false, error: "Chave da Groq não informada." });
    }

    const groq = new OpenAI({
      apiKey,
      baseURL: "https://api.groq.com/openai/v1",
    });

    const models = await groq.models.list();
    const hasWhisper = models.data.some((m) => m.id.includes("whisper"));

    res.json({
      success: true,
      message: `Chave da Groq válida! Modelos disponíveis (incluindo whisper-large-v3).`,
    });
  } catch (err: any) {
    console.error("Erro no teste da Groq API Key:", err);
    res.status(500).json({
      success: false,
      error: err?.message || "Falha na validação da chave com a Groq API.",
    });
  }
});

// ── Audio Transcription Endpoint ─────────────────────────────────────────────
// Uses multer for proper file upload handling and calls Groq API directly
// via fetch + FormData (no OpenAI SDK intermediary)
const audioUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

app.post(
  ["/api/audio/transcribe", "/api/gemini/transcribe"],
  audioUpload.single("audio"),
  async (req: any, res) => {
    try {
      // ── Resolve the audio buffer ──────────────────────────────────────────
      let audioBuffer: Buffer | null = null;
      let fileName = "audio.webm";
      let fileMime = "audio/webm";

      if (req.file) {
        // Multipart upload path (new)
        audioBuffer = req.file.buffer;
        fileName = req.file.originalname || "audio.webm";
        fileMime = req.file.mimetype || "audio/webm";
      } else if (req.body?.audioData?.data) {
        // Legacy base64 JSON path (backward compat)
        const base64Data = String(req.body.audioData.data);
        const rawMime = String(req.body.audioData.mimeType || "audio/webm");
        fileMime = rawMime.split(";")[0].trim();
        const ext = fileMime.includes("mp4") ? "mp4" : fileMime.includes("ogg") ? "ogg" : fileMime.includes("wav") ? "wav" : "webm";
        fileName = `audio.${ext}`;
        audioBuffer = Buffer.from(base64Data, "base64");
      }

      if (!audioBuffer || audioBuffer.length < 500) {
        return res.status(400).json({ success: false, error: "Nenhum dado de áudio fornecido ou áudio muito curto." });
      }

      // ── Resolve API keys ──────────────────────────────────────────────────
      const groqApiKey = (typeof req.body?.groqApiKey === "string" ? req.body.groqApiKey : "").trim()
        || process.env.GROQ_API_KEY || "";

      console.log(`[AudioTranscription] file="${fileName}" | size=${audioBuffer.length} bytes | mime="${fileMime}" | groqKey=${groqApiKey ? groqApiKey.slice(0, 8) + "..." : "MISSING"}`);

      if (!groqApiKey) {
        return res.status(400).json({
          success: false,
          error: "Chave de API da Groq não configurada. Vá em Configurações do Sistema → Chaves de API → Groq.",
        });
      }

      // ── Call Groq Whisper API directly via fetch + FormData ────────────────
      const formData = new FormData();
      const blob = new Blob([audioBuffer], { type: fileMime });
      formData.append("file", blob, fileName);
      formData.append("model", "whisper-large-v3-turbo");
      formData.append("language", "pt");
      formData.append("response_format", "verbose_json");
      formData.append("temperature", "0");

      console.log("[AudioTranscription] Sending to Groq Whisper API (whisper-large-v3-turbo)...");

      let groqResponse = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${groqApiKey}` },
        body: formData,
      });

      // Fallback to whisper-large-v3 if turbo is not available
      if (groqResponse.status === 400 || groqResponse.status === 404) {
        console.warn("[AudioTranscription] Turbo model unavailable, falling back to whisper-large-v3...");
        const formData2 = new FormData();
        const blob2 = new Blob([audioBuffer], { type: fileMime });
        formData2.append("file", blob2, fileName);
        formData2.append("model", "whisper-large-v3");
        formData2.append("language", "pt");
        formData2.append("response_format", "verbose_json");
        formData2.append("temperature", "0");

        groqResponse = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${groqApiKey}` },
          body: formData2,
        });
      }

      const groqResult = await groqResponse.json();
      console.log("[AudioTranscription/Groq] Response status:", groqResponse.status, "| Body:", JSON.stringify(groqResult).slice(0, 500));

      if (!groqResponse.ok) {
        const errMsg = groqResult?.error?.message || groqResult?.error || JSON.stringify(groqResult);
        return res.status(500).json({
          success: false,
          error: `Erro na API da Groq (${groqResponse.status}): ${errMsg}`,
        });
      }

      const transcription = (groqResult.text || "").trim();

      if (transcription && transcription !== ".") {
        console.log(`[AudioTranscription/Groq] ✅ Transcription: "${transcription}"`);
        return res.json({
          success: true,
          text: transcription,
          transcription,
          duration: groqResult.duration,
          engine: "groq-whisper",
        });
      } else {
        console.warn("[AudioTranscription/Groq] ⚠️ Empty transcription returned.");
        return res.status(422).json({
          success: false,
          error: "Nenhuma fala compreensível foi detectada no áudio gravado.",
        });
      }
    } catch (err: any) {
      console.error("[AudioTranscription] Fatal error:", err);
      res.status(500).json({ success: false, error: err?.message || "Erro interno ao transcrever o áudio." });
    }
  }
);




// Longitudinal Clinical Evolution Endpoint
app.post("/api/gemini/evolution", async (req, res) => {
  try {
    const { patient, consultations = [], userApiKey } = req.body;

    if (!patient || !consultations || consultations.length === 0) {
      return res.status(400).json({
        error: "Paciente ou lista de atendimentos não fornecidos para análise longitudinal.",
      });
    }

    const ai = getGeminiClient(userApiKey);

    // Sort consultations chronologically (oldest to newest)
    const sortedConsultations = [...consultations].sort(
      (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
    );

    // Limit to last 10 to avoid token explosion
    const recentConsultations = sortedConsultations.slice(-10);

    const formattedHistory = recentConsultations
      .map((c, index) => {
        const dateStr = new Date(c.timestamp).toLocaleDateString("pt-BR");
        return `[${dateStr}]: ${c.avaliacao?.substring(0, 100) || "--"} | Plano: ${c.plano?.substring(0, 100) || "--"}`;
      })
      .join("\n");

    const systemInstruction = `Você é um Auditor Clínico e Consultor Multiprofissional da Atenção Primária e RAPS.
Analise a linha do tempo de atendimentos deste paciente e gere um relatório conciso estruturado em:

RESUMO LONGITUDINAL: Linha do tempo das queixas e intervenções realizadas pelas diferentes categorias profissionais.

MATRIZ DE EVOLUÇÃO (POSITIVA / NEGATIVA / ESTÁVEL):
- Aspectos Psicoemocionais e Comportamentais: Houve melhora ou piora de sintomas, crises ou adesão?
- Aspectos Físicos / Sinais Vitais / Queixas Somáticas: Evolução de lesões, pressão, peso ou queixas álgicas.
- Dinâmica Familiar e Social: Avanços ou agravamento de vulnerabilidades.

PONTOS DE ALERTA E RECOMENDAÇÕES PARA A EQUIPE: Fatores de risco identificados que exigem busca ativa, ajuste medicamentoso ou discussão em reunião de equipe (PTS).`;

    const userPrompt = `DADOS DO PACIENTE:
Nome Completo: ${patient.fullName}
CNS: ${patient.cns || "--"}
Data de Nascimento: ${patient.birthDate || "--"}
Responsável Legal: ${patient.legalGuardianName ? `${patient.legalGuardianName} (${patient.guardianKinship || "Responsável"})` : "Próprio paciente"}

HISTÓRICO CRONOLÓGICO DE ATENDIMENTOS MULTIPROFISSIONAIS (${sortedConsultations.length} atendimentos):

${formattedHistory}

Elabore a análise clínica longitudinal estruturada com o resumo, a matriz de evolução detalhada e os pontos de alerta e recomendações para a equipe multiprofissional.`;

    const { response, modelUsed } = await generateContentWithFallback(ai, "gemini-3.7-flash", {
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }],
        },
      ],
      config: {
        systemInstruction,
        temperature: 0.25,
      },
    });

    const fullMarkdown = response.text || "";

    // Parse sections for rich UI badges & visual presentation
    const parsedEvolution = parseLongitudinalEvolution(fullMarkdown, patient, sortedConsultations);

    res.json({
      success: true,
      data: parsedEvolution,
    });
  } catch (error: any) {
    console.error("Erro na geração de evolução longitudinal:", error);
    res.status(500).json({
      error:
        error?.message ||
        "Falha ao gerar relatório de evolução clínica longitudinal com a IA.",
    });
  }
});

function parseLongitudinalEvolution(
  markdown: string,
  patient: any,
  consultations: any[]
) {
  const startDate = consultations[0]?.timestamp
    ? new Date(consultations[0].timestamp).toLocaleDateString("pt-BR")
    : "--";
  const endDate = consultations[consultations.length - 1]?.timestamp
    ? new Date(consultations[consultations.length - 1].timestamp).toLocaleDateString("pt-BR")
    : "--";

  // Helper to find evolution status
  const findStatus = (
    text: string
  ): "positiva" | "negativa" | "estavel" | "mista" => {
    const lower = text.toLowerCase();
    if (lower.includes("melhora") || lower.includes("positiv") || lower.includes("favorável") || lower.includes("evolução positiva")) {
      return "positiva";
    }
    if (lower.includes("piora") || lower.includes("negativ") || lower.includes("agravamento") || lower.includes("regressão")) {
      return "negativa";
    }
    if (lower.includes("mista") || lower.includes("oscila")) {
      return "mista";
    }
    return "estavel";
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "positiva":
        return "Evolução Positiva (Melhora)";
      case "negativa":
        return "Alerta de Piora / Agravamento";
      case "mista":
        return "Evolução Mista / Flutuante";
      default:
        return "Quadro Estável / Em Manejo";
    }
  };

  // Section extraction
  const resumoMatch = markdown.match(
    /(?:RESUMO LONGITUDINAL:?|###?\s*RESUMO LONGITUDINAL)([\s\S]*?)(?=(?:MATRIZ DE EVOLU[ÇC][ÃA]O|###?\s*MATRIZ|PONTOS DE ALERTA|$))/i
  );
  const matrizMatch = markdown.match(
    /(?:MATRIZ DE EVOLU[ÇC][ÃA]O|###?\s*MATRIZ DE EVOLU[ÇC][ÃA]O)([\s\S]*?)(?=(?:PONTOS DE ALERTA|###?\s*PONTOS|$))/i
  );
  const alertasMatch = markdown.match(
    /(?:PONTOS DE ALERTA E RECOMENDA[ÇC][ÕO]ES|###?\s*PONTOS DE ALERTA)([\s\S]*$)/i
  );

  const resumoLongitudinal = resumoMatch
    ? resumoMatch[1].trim()
    : "Análise cronológica consolidada de atendimentos multiprofissionais.";

  const matrizText = matrizMatch ? matrizMatch[1].trim() : markdown;

  // Sub-aspect extraction
  const psicoMatch = matrizText.match(
    /(?:Aspectos Psicoemocionais[^\n]*:?)([\s\S]*?)(?=(?:Aspectos F[íi]sicos|Din[âa]mica Familiar|$))/i
  );
  const fisicoMatch = matrizText.match(
    /(?:Aspectos F[íi]sicos[^\n]*:?)([\s\S]*?)(?=(?:Din[âa]mica Familiar|PONTOS DE ALERTA|$))/i
  );
  const socialMatch = matrizText.match(
    /(?:Din[âa]mica Familiar e Social[^\n]*:?)([\s\S]*$)/i
  );

  const psicoDesc = psicoMatch ? psicoMatch[1].trim() : "Avaliação contínua de sintomas emocionais e adesão.";
  const fisicoDesc = fisicoMatch ? fisicoMatch[1].trim() : "Parâmetros físicos e sinais vitais em acompanhamento.";
  const socialDesc = socialMatch ? socialMatch[1].trim() : "Rede de apoio sociofamiliar mapeada.";

  const psicoStatus = findStatus(psicoDesc);
  const fisicoStatus = findStatus(fisicoDesc);
  const socialStatus = findStatus(socialDesc);

  // Extract alert bullet points
  const alertasText = alertasMatch ? alertasMatch[1].trim() : "";
  const pontosAlertaRecomendacoes = alertasText
    .split(/\n\s*[-*•\d+.]\s*/)
    .map((item) => item.trim())
    .filter((item) => item.length > 5);

  return {
    patientId: patient.id,
    patientName: patient.fullName,
    generatedAt: Date.now(),
    modelUsed: "gemini-3.7-flash",
    totalConsultationsAnalyzed: consultations.length,
    dateRange: {
      start: startDate,
      end: endDate,
    },
    resumoLongitudinal,
    matrizEvolucao: {
      aspectosPsicoemocionais: {
        status: psicoStatus,
        statusLabel: getStatusLabel(psicoStatus),
        descricao: psicoDesc,
      },
      aspectosFisicosSinais: {
        status: fisicoStatus,
        statusLabel: getStatusLabel(fisicoStatus),
        descricao: fisicoDesc,
      },
      dinamicaFamiliarSocial: {
        status: socialStatus,
        statusLabel: getStatusLabel(socialStatus),
        descricao: socialDesc,
      },
    },
    pontosAlertaRecomendacoes:
      pontosAlertaRecomendacoes.length > 0
        ? pontosAlertaRecomendacoes
        : [
            "Manter acompanhamento intersetorial e discussões periódicas em reunião de equipe (PTS).",
            "Monitorar adesão às orientações e comparecimento aos retornos agendados.",
          ],
    rawMarkdown: markdown,
  };
}

// Helper function to extract individual blocks for PEC cards
function parsePECBlocks(text: string, profession: string) {
  const isEnfermeiro = profession.trim().toUpperCase() === "ENFERMEIRO";
  let avaliacao = "";
  let plano = "";
  let conduta = "";
  let clinicalAudit = "";

  // Check for clinical audit block
  const auditMatch = text.match(/(?:###?\s*⚠️?\s*AUDITORIA CL[ÍI]NICA[\s\S]*$)/i);
  if (auditMatch) {
    clinicalAudit = auditMatch[0].trim();
  }

  // 1. Primary: Markdown Regex Parsing (Standard PEC 3 Blocks)
  const avaliacaoRegex =
    /(?:###?\s*CAMPO:?\s*AVALIA[ÇC][ÃA]O|CAMPO\s*AVALIA[ÇC][ÃA]O|AVALIA[ÇC][ÃA]O:?)([\s\S]*?)(?=(?:###?\s*CAMPO:?\s*PLANO|CAMPO\s*PLANO|###?\s*CAMPO\s*06|###?\s*⚠️?\s*AUDITORIA|$))/i;
  const planoRegex =
    /(?:###?\s*CAMPO:?\s*PLANO|CAMPO\s*PLANO|PLANO:?)([\s\S]*?)(?=(?:###?\s*CAMPO\s*06|###?\s*FINALIZA[ÇC][ÃA]O|###?\s*⚠️?\s*AUDITORIA|$))/i;
  const condutaRegex =
    /(?:###?\s*CAMPO\s*06[:\s-]*FINALIZA[ÇC][ÃA]O(?:[^\n]*)|CAMPO\s*06|FINALIZA[ÇC][ÃA]O\s*DO\s*ATENDIMENTO)([\s\S]*?)(?=(?:###?\s*⚠️?\s*AUDITORIA|$))/i;

  const avaliacaoMatch = text.match(avaliacaoRegex);
  const planoMatch = text.match(planoRegex);
  const condutaMatch = text.match(condutaRegex);

  if (avaliacaoMatch && avaliacaoMatch[1]) {
    avaliacao = avaliacaoMatch[1].trim();
  }
  if (planoMatch && planoMatch[1]) {
    plano = planoMatch[1].trim();
  }
  if (condutaMatch && condutaMatch[1]) {
    conduta = condutaMatch[1].trim();
  }

  // 2. Fallbacks if regex did not capture clearly
  if (!avaliacao && !plano) {
    const parts = text.split(/###?\s*CAMPO:?/i);
    if (parts.length >= 2) {
      avaliacao = parts[1]?.replace(/^[\s:]*AVALIA[ÇC][ÃA]O/i, "").trim() || "";
      if (parts.length >= 3) {
        plano = parts[2]?.replace(/^[\s:]*PLANO/i, "").trim() || "";
      }
      if (parts.length >= 4) {
        conduta = parts[3]?.replace(/^[\s:]*06[^\n]*/i, "").trim() || "";
      }
    } else {
      // 3. Fallback: try parsing JSON if generated in json format
      try {
        let cleanJsonStr = text.trim();
        if (cleanJsonStr.startsWith("```json")) {
          cleanJsonStr = cleanJsonStr.replace(/^```json\s*/, "").replace(/\s*```$/, "");
        } else if (cleanJsonStr.startsWith("```")) {
          cleanJsonStr = cleanJsonStr.replace(/^```\s*/, "").replace(/\s*```$/, "");
        }
        const parsedObj = JSON.parse(cleanJsonStr);
        if (parsedObj && typeof parsedObj === 'object') {
          avaliacao = parsedObj.avaliacao || parsedObj.Avaliacao || "";
          plano = parsedObj.plano || parsedObj.Plano || "";
          conduta = parsedObj.conduta_encaminhamentos || parsedObj.conduta || parsedObj.condutaEncaminhamentos || parsedObj.Conduta || "";
        }
      } catch {
        avaliacao = text;
      }
    }
  }

  return {
    avaliacao: avaliacao || text,
    plano: plano || "",
    conduta: conduta || "",
    clinicalAudit: clinicalAudit || undefined,
    hasBlock3: Boolean(conduta) || isEnfermeiro,
  };
}

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[e-SUS PEC AI Server] Rodando na porta ${PORT}`);
  });
}

startServer();
