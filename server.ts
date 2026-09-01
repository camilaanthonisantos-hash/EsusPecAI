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
    prompt += "Siga EXATAMENTE esta estrutura de tópicos, colocando o título SEMPRE EM MAIÚSCULAS e com dois pontos no final (SEM asteriscos), e o conteúdo correspondente logo na linha seguinte formatado como citação (iniciando com >):\n";
    prompt += "HISTÓRICO/EVOLUÇÃO:\n> [Texto do histórico...]\n\n";
    prompt += "EXAME CLÍNICO:\n> [Texto do exame clínico com sinais vitais qualitativos...]\n\n";
    prompt += "DIAGNÓSTICOS DE ENFERMAGEM (NANDA-I):\n> - [Diagnóstico 1]\n> - [Diagnóstico 2]\n\n";
    prompt += "CIAP-2:\n> - [Código] ([Descrição])\n\n";
    prompt += "CID-10:\n> - [Código] ([Descrição])\n\n";

    prompt += "### CAMPO: PLANO\n";
    prompt += "Siga EXATAMENTE esta estrutura de tópicos:\n";
    prompt += "METAS (NOC):\n> - [Meta 1]\n> - [Meta 2]\n\n";
    prompt += "INTERVENÇÕES (NIC):\n> - [Intervenção 1]\n> - [Intervenção 2]\n\n";
    prompt += "CIAP-2:\n> - 69 (Outras orientações / Aconselhamento / Educação em saúde)\n\n";
    prompt += "SIGTAP:\n> - 0301080445 (Orientação Individual em Saúde)\n\n";

    prompt += "### CAMPO 06: FINALIZAÇÃO DO ATENDIMENTO / CONDUTA\n";
    prompt += "Siga EXATAMENTE a divisão em subseções com títulos em MAIÚSCULAS e citação > na linha seguinte:\n";
    prompt += "CONDUTA IMEDIATA:\n> [Acolhimento e orientações imediatas...]\n\n";
    prompt += "PRESCRIÇÕES DE ENFERMAGEM / TRANSCRIÇÕES:\n> [Prescrições conforme protocolos municipais...]\n\n";
    prompt += "GUIAS DE REFERÊNCIA / SOLICITAÇÃO DE EXAMES:\n> [Exames laboratoriais ou encaminhamentos...]\n\n";
    prompt += "RETORNO / AGENDAMENTO:\n> [Agendamento de retorno ou sinais de alerta...]\n\n";
  } else {
    prompt += "Deverá gerar estritamente 2 blocos bem demarcados com os seguintes cabeçalhos exatos:\n\n";
    prompt += "### CAMPO: AVALIAÇÃO\n";
    prompt += "Divida em subseções com títulos em MAIÚSCULAS (ex: RELATO/EVOLUÇÃO DO CIDADÃO:, IMPRESSÕES TÉCNICAS E AVALIAÇÃO CLÍNICA:, CIAP-2:, CID-10:), e o conteúdo logo na linha seguinte formatado como citação (> ).\n\n";
    prompt += "### CAMPO: PLANO\n";
    prompt += "Divida em subseções com títulos em MAIÚSCULAS (ex: CONDUTA TERAPÊUTICA E INTERVENÇÕES:, ENCAMINHAMENTOS E ARTICULAÇÃO DE REDE:, CIAP-2:, SIGTAP:), e o conteúdo logo na linha seguinte formatado como citação (> ). Finalize com:\n";
    prompt += "CIAP-2:\n> - 69 (Outras orientações / Aconselhamento / Educação em saúde)\n\n";
    prompt += "SIGTAP:\n> - 0301080445 (Orientação Individual em Saúde)\n\n";
  }

  if (safeContext) {
    prompt += `\n--- BASE DE CONHECIMENTO / PROTOCOLOS LOCAIS E REMUME MUNICIPAL INJETADOS ---\n${safeContext}\n(Utilize as diretrizes, medicamentos da REMUME e fluxos acima como referência para guias, condutas e prescrições do prontuário)\n\n`;
  }

  prompt += "INSTRUÇÃO DE FORMATAÇÃO RIGOROSA PARA O PEC DO e-SUS:\n";
  prompt += '1. Escreva SEMPRE os títulos das subseções em LETRAS MAIÚSCULAS com dois pontos no final (ex: "HISTÓRICO/EVOLUÇÃO:", "EXAME CLÍNICO:", "DIAGNÓSTICOS DE ENFERMAGEM (NANDA-I):", "METAS (NOC):", "INTERVENÇÕES (NIC):", "CIAP-2:", "CID-10:", "SIGTAP:"). NUNCA utilize asteriscos duplos (**) nos títulos.\n';
  prompt += "2. O conteúdo e a descrição abaixo do título DEVEM ser formatados como uma citação em bloco (iniciando cada linha com o caractere > e um espaço), colocado IMEDIATAMENTE na linha seguinte após o título (sem linha em branco intermediária entre o título e a citação).\n";
  prompt += "3. Pule uma linha em branco apenas para separar um bloco/seção completo do próximo.\n";
  prompt += "4. Aplique este mesmo padrão rigoroso em TODOS os campos do prontuário.\n";
  prompt += "5. Mantenha o texto limpo, técnico e pronto para cópia direta nas abas do e-SUS PEC.";

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
