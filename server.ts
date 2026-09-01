import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

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
  const isEnfermeiro = professionName.trim().toUpperCase() === "ENFERMEIRO";
  const safeContext = typeof customContext === "string" ? customContext : "";

  let prompt = "Você é um Especialista em Documentação Clínica para o e-SUS / PEC. Sua função é receber relatos clínicos, anotações, áudios transcritos ou fotos e gerar o prontuário eletrônico consolidado para inserção direta nos campos do PEC.\n\n";
  prompt += "LISTA DE PROFISSÕES: ENFERMEIRO, ASSISTENTE SOCIAL, PSICOPEDAGOGO, PSICÓLOGO, NUTRICIONISTA, EDUCADOR FÍSICO e MÉDICO.\n";
  prompt += `PROFISSÃO DO ATENDIMENTO ATUAL: ${professionName.toUpperCase()}\n\n`;
  prompt += `TIPO DE ATENDIMENTO: ${isFirstConsultation ? "PRIMEIRO ATENDIMENTO / ACOLHIMENTO INICIAL" : "RETORNO / REAVALIAÇÃO / ALTA"}\n\n`;
  prompt += "DIRETRIZES CONFORME O TIPO DE ATENDIMENTO:\n";

  if (isFirstConsultation) {
    prompt += "• PRIMEIRO ATENDIMENTO / ACOLHIMENTO INICIAL:\n";
    prompt += "- Gerar anamnese completa, histórico abrangente do paciente, queixa principal detalhada e levantamento integral de diagnósticos clínicos/funcionais/sociais.\n\n";
  } else {
    prompt += "• RETORNO / REAVALIAÇÃO / ALTA:\n";
    prompt += "- NÃO gerar histórico longo ou repetitivo.\n";
    prompt += "- Redigir o texto focado estritamente na evolução comparativa em relação ao plano anterior, adesão às condutas/remédios prescritos e reajuste terapêutico ou critérios de alta.\n";
    prompt += "- AUDITORIA CLÍNICA CRUZADA ATIVA: Comparar o relato do atendimento atual com os atendimentos anteriores fornecidos no histórico do prontuário. Se algum problema de saúde, queixa física/emocional, medicação prévia, meta pendente ou exame/encaminhamento de consultas passadas NÃO tiver sido mencionado ou resolvido no relato de hoje, acrescente obrigatoriamente no final da resposta o seguinte bloco estruturado:\n\n";
    prompt += "---\n### ⚠️ AUDITORIA CLÍNICA: PENDÊNCIAS DO HISTÓRICO ANTERIOR\n";
    prompt += "*(Problemas, medicamentos ou metas de consultas anteriores não abordados neste relato)*\n";
    prompt += "- ❓ **[Problema/Sintoma Pendente]:** [Pergunta direta para checar o desfecho]\n";
    prompt += "- ❓ **[Medicamento / Conduta Anterior]:** [Checagem de adesão/tolerância]\n";
    prompt += "- ❓ **[Exame / Encaminhamento Pendente]:** [Checagem de realização do exame/encaminhamento]\n\n";
  }

  prompt += "REGRAS OBRIGATÓRIAS:\n\n";
  prompt += "1. SINAIS VITAIS QUALITATIVOS:\n";
  prompt += 'Nunca utilize valores numéricos brutos de sinais vitais ou antropometria nos campos do prontuário (ex: não escreva "120x80 mmHg", "IMC 24.2", "72 bpm", "36.5°C", "98%").\n';
  prompt += "Converta sempre para a terminologia qualitativa padronizada correspondente:\n";
  prompt += "- Estado Nutricional / IMC: Eutrófico / Sobrepeso / Obesidade (Grau I, II, III) / Baixo peso\n";
  prompt += "- Pressão Arterial: Normotenso / Pré-hipertenso / Hipotenso / Hipertenso\n";
  prompt += "- Frequência Cardíaca: Normocárdico / Taquicárdico / Bradicárdico\n";
  prompt += "- Frequência Respiratória: Eupneico / Taquipneico / Bradipneico\n";
  prompt += "- Temperatura: Normotérmico / Febril / Afebril / Hipotérmico\n";
  prompt += "- Saturação de O2: Normossaturado / Dessaturado\n\n";

  prompt += "2. CÓDIGO FIXO NO PLANO:\n";
  prompt += "O bloco PLANO de todas as profissões DEVE SEMPRE e OBRIGATORIAMENTE finalizar com as duas linhas fixas:\n";
  prompt += "CIAP-2: -69 (Outras orientações / Aconselhamento / Educação em saúde)\n";
  prompt += "SIGTAP: 0301080445 (Orientação Individual em Saúde)\n\n";

  prompt += "3. ESTRUTURA SE PROFISSÃO = ENFERMEIRO:\n";
  if (isEnfermeiro) {
    prompt += "Deverá gerar estritamente 3 blocos bem demarcados com os seguintes cabeçalhos exatos:\n\n";
    prompt += "### CAMPO: AVALIAÇÃO\n";
    prompt += "(Histórico/Evolução comparativa + Exame Clínico/Mental com sinais vitais estritamente qualitativos + Diagnósticos de Enfermagem NANDA-I + Códigos CIAP-2 pertinentes + CID-10 pertinentes)\n\n";
    prompt += "### CAMPO: PLANO\n";
    prompt += "(Metas NOC + Intervenções de Enfermagem NIC + Linhas fixas obrigatórias no final:\n";
    prompt += "CIAP-2: -69 (Outras orientações / Aconselhamento / Educação em saúde)\n";
    prompt += "SIGTAP: 0301080445 (Orientação Individual em Saúde))\n\n";
    prompt += "### CAMPO 06: FINALIZAÇÃO DO ATENDIMENTO / CONDUTA\n";
    prompt += "(Conduta Imediata + Prescrições de Enfermagem/Transcrições conforme protocolos municipais + Guias de Referência/Contrarreferência ou Solicitação de Exames + Retorno/Agendamento)\n\n";
  } else {
    prompt += "Deverá gerar estritamente 2 blocos bem demarcados com os seguintes cabeçalhos exatos:\n\n";
    prompt += "### CAMPO: AVALIAÇÃO\n";
    prompt += "(Relato/Evolução do Cidadão + Impressões Técnicas e Avaliação Clínico-Comportamental/Funcional/Social com sinais vitais e dados antropométricos estritamente qualitativos + Códigos CIAP-2 pertinentes + Códigos CID-10 pertinentes)\n\n";
    prompt += "### CAMPO: PLANO\n";
    prompt += "(Conduta Terapêutica & Intervenções Realizadas + Encaminhamentos, Articulação de Rede, Suporte e Seguimento + Linhas fixas obrigatórias no final:\n";
    prompt += "CIAP-2: -69 (Outras orientações / Aconselhamento / Educação em saúde)\n";
    prompt += "SIGTAP: 0301080445 (Orientação Individual em Saúde))\n\n";
  }

  if (safeContext) {
    prompt += `\n--- BASE DE CONHECIMENTO / PROTOCOLOS LOCAIS E REMUME MUNICIPAL INJETADOS ---\n${safeContext}\n(Utilize as diretrizes, medicamentos da REMUME e fluxos acima como referência para guias, condutas e prescrições do prontuário)\n\n`;
  }

  prompt += "INSTRUÇÃO DE FORMATAÇÃO RIGOROSA PARA O PEC DO e-SUS:\n";
  prompt += '1. NUNCA utilize asteriscos duplos (**) ou formatação markdown de negrito nos títulos das subseções (ex: escreva exatamente "Histórico/Evolução:" ou "Exame Clínico:" em texto simples, sem **).\n';
  prompt += "2. O conteúdo e a descrição de cada subseção DEVEM ser formatados obrigatoriamente como uma citação em bloco (utilizando o caractere > no início de cada linha do texto), garantindo a estrutura visual de citação com barra lateral.\n";
  prompt += "3. Aplique este mesmo padrão rigoroso em TODOS os campos do prontuário (CAMPO: AVALIAÇÃO, CAMPO: PLANO e CAMPO 06: FINALIZAÇÃO DO ATENDIMENTO / CONDUTA).\n";
  prompt += "4. Mantenha o texto extremamente limpo, técnico e pronto para cópia direta nas abas do e-SUS PEC.";

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

    if (!rawNotes && !audioData && (!images || images.length === 0)) {
      return res.status(400).json({
        error: "Por favor, insira um relato em texto, grave um áudio ou anexe um documento/foto.",
      });
    }

    const ai = getGeminiClient(userApiKey);
    const systemInstruction = buildSystemPrompt(profession, Boolean(isFirstConsultation), customContext);

    // Map requested model to supported current model versions
    let targetModel = "gemini-3.7-flash";
    const validModels = ["gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.1-flash-lite", "gemini-3.1-pro-preview", "gemini-2.5-pro", "gemini-pro"];
    if (validModels.includes(modelName)) {
      targetModel = modelName === "gemini-2.5-pro" || modelName === "gemini-pro" ? "gemini-3.1-pro-preview" : modelName;
    } else if (modelName?.includes("pro")) {
      targetModel = "gemini-3.1-pro-preview";
    } else if (modelName?.includes("lite")) {
      targetModel = "gemini-3.1-flash-lite";
    } else if (modelName?.includes("3.6")) {
      targetModel = "gemini-3.6-flash";
    }

    console.log(`[AI Generation] Model requested from client: "${modelName}" -> Executing on model: "${targetModel}"`);

    const contentsParts: Array<any> = [];

    // Add audio if present
    if (audioData?.data) {
      contentsParts.push({
        inlineData: {
          mimeType: audioData.mimeType || "audio/webm",
          data: audioData.data,
        },
      });
    }

    // Add images / documents if present
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

    // Add user text prompt / raw clinical notes
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

    if (audioData) {
      userTextPrompt += `OBSERVAÇÃO: Há um áudio anexado com o relato verbal da consulta/visita. Faça a transcrição e extração clínica integral dos pontos relatados.\n\n`;
    }

    if (images && images.length > 0) {
      userTextPrompt += `OBSERVAÇÃO: Há ${images.length} imagem(ns)/documento(s) anexados (receitas, exames ou monitores de sinais vitais). Extraia todos os dados clínicos pertinentes e incorpore no prontuário conforme as regras do PEC.\n\n`;
    }

    userTextPrompt += `Gere o prontuário estruturado pronto para cópia conforme os blocos e regras obrigatórias.`;

    contentsParts.push({
      text: userTextPrompt,
    });

    const validParts = contentsParts
      .filter((p) => p && typeof p === "object")
      .map((p) => {
        if (p.text && typeof p.text === "string") {
          return { text: p.text };
        }
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
      .filter((p): p is { text: string } | { inlineData: { mimeType: string; data: string } } => p !== null);

    const { response, modelUsed } = await generateContentWithFallback(ai, targetModel, {
      contents: [
        {
          role: "user",
          parts: validParts,
        },
      ],
      config: {
        systemInstruction,
        temperature: 0.2, // Low temperature for high clinical consistency and exact adherence to rules
        topP: 0.9,
      },
    });

    const fullText = response.text || "";

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
      modelUsed: modelUsed || targetModel,
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

  // Split by headers or markdown titles
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

  // Fallbacks if regex did not capture clearly
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
      avaliacao = text;
    }
  }

  return {
    avaliacao: avaliacao || text,
    plano: plano || "",
    conduta: conduta || "",
    clinicalAudit: clinicalAudit || undefined,
    hasBlock3: isEnfermeiro,
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
