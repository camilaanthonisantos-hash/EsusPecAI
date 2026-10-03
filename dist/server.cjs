var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  supabaseServer: () => supabaseServer
});
module.exports = __toCommonJS(server_exports);
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_dns = __toESM(require("dns"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_genai = require("@google/genai");
var import_openai = __toESM(require("openai"), 1);
var import_multer = __toESM(require("multer"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_app = require("firebase/app");
var import_firestore = require("firebase/firestore");
var import_supabase_js = require("@supabase/supabase-js");

// firebase-applet-config.json
var firebase_applet_config_default = {
  projectId: "vocal-shuttle-g8chg",
  appId: "1:789963213213:web:15e19baa5c5a948033c774",
  apiKey: "AIzaSyAAK95RDJQ2uKBiyez307l9PkcLHxN9yA4",
  authDomain: "gen-lang-client-0161337139.firebaseapp.com",
  firestoreProjectId: "vocal-shuttle-g8chg",
  firestoreDatabaseId: "ai-studio-pronturiopecmult-d6f44424-1f51-4bde-8c47-37efc3bc8944",
  storageBucket: "vocal-shuttle-g8chg.firebasestorage.app",
  messagingSenderId: "789963213213",
  measurementId: "",
  oAuthClientId: "789963213213-n98mjsg4j26a5omub57g2r1c5o6fq961.apps.googleusercontent.com",
  recaptchaSiteKey: ""
};

// server.ts
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
var portArgIndex = process.argv.indexOf("--port");
if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
  const parsed = parseInt(process.argv[portArgIndex + 1], 10);
  if (!isNaN(parsed)) PORT = parsed;
} else if (process.env.PORT) {
  const parsed = parseInt(process.env.PORT, 10);
  if (!isNaN(parsed)) PORT = parsed;
}
app.use(import_express.default.json({ limit: "50mb" }));
app.use(import_express.default.urlencoded({ extended: true, limit: "50mb" }));
function getGeminiClient(userKey) {
  const apiKeyClean = userKey?.trim() || process.env.GEMINI_API_KEY;
  if (!apiKeyClean) {
    throw new Error(
      "Chave de API do Gemini n\xE3o configurada. Configure a GEMINI_API_KEY nas vari\xE1veis de ambiente ou informe sua chave no painel de configura\xE7\xF5es."
    );
  }
  return new import_genai.GoogleGenAI({
    apiKey: apiKeyClean
  });
}
function getFriendlyModelNameServer(modelId) {
  if (!modelId || typeof modelId !== "string") return "Gemini 3.7 Flash";
  const clean = modelId.trim().toLowerCase();
  if (clean.includes("ling-3.0-flash-sante") || clean.includes("sante")) return "Ling 3.0 Flash Sant\xE9 (Free)";
  if (clean.includes("ling-3.0-flash") || clean.includes("ling-3.0")) return "Ling 3.0 Flash (Free)";
  if (clean.includes("whisper-large-v3-turbo") || clean.includes("v3-turbo")) return "Groq Whisper Large v3 Turbo";
  if (clean.includes("whisper-large-v3") || clean.includes("whisper")) return "Groq Whisper Large v3";
  if (clean.includes("3.7-flash") || clean === "gemini-3.7-flash") return "Gemini 3.7 Flash";
  if (clean.includes("3.8-flash") || clean === "gemini-3.8-flash") return "Gemini 3.8 Flash";
  if (clean.includes("3.6-flash") || clean === "gemini-3.6-flash") return "Gemini 3.6 Flash";
  if (clean.includes("3.1-flash-lite") || clean.includes("lite")) return "Gemini 3.1 Flash Lite";
  if (clean.includes("3.1-pro") || clean.includes("gemini-pro") || clean.includes("2.5-pro")) return "Gemini 3.1 Pro";
  if (clean.includes("2.5-flash")) return "Gemini 2.5 Flash";
  if (clean.includes("2.0-flash-thinking")) return "Gemini 2.0 Flash Thinking (OpenRouter Free)";
  if (clean.includes("2.0-flash-lite")) return "Gemini 2.0 Flash Lite";
  if (clean.includes("2.0-flash-exp")) return "Gemini 2.0 Flash (OpenRouter Free)";
  if (clean.includes("2.0-flash")) return "Gemini 2.0 Flash";
  if (clean.includes("gpt-4o-mini")) return clean.includes("openrouter") ? "GPT-4o Mini (OpenRouter)" : "OpenAI GPT-4o Mini";
  if (clean.includes("gpt-4o")) return "OpenAI GPT-4o";
  if (clean.includes("o3-mini")) return clean.includes("openrouter") ? "OpenAI o3-mini (OpenRouter)" : "OpenAI o3-mini";
  if (clean.includes("o1-preview")) return "OpenAI o1 Preview";
  if (clean.includes("o1-mini")) return "OpenAI o1 Mini";
  if (clean === "openai:o1" || clean.endsWith(":o1") || clean === "o1") return "OpenAI o1";
  if (clean.includes("deepseek-r1")) return "DeepSeek R1 (OpenRouter Free)";
  if (clean.includes("deepseek-chat") || clean.includes("deepseek-v3")) return "DeepSeek V3 (OpenRouter Free)";
  if (clean.includes("llama-3.3-70b-instruct:free") || clean.includes("llama-3.3") && clean.includes("free")) return "Llama 3.3 70B Instruct (OpenRouter Free)";
  if (clean.includes("llama-3.3")) return "Llama 3.3 70B (OpenRouter)";
  if (clean.includes("llama-3.1-8b-instruct:free") || clean.includes("llama-3.1-8b") && clean.includes("free")) return "Llama 3.1 8B Instruct (OpenRouter Free)";
  if (clean.includes("llama-3.1-8b")) return "Llama 3.1 8B (OpenRouter)";
  if (clean.includes("llama-3.2-3b")) return "Llama 3.2 3B Instruct (OpenRouter Free)";
  if (clean.includes("llama-3.2-1b")) return "Llama 3.2 1B Instruct (OpenRouter Free)";
  if (clean.includes("llama-3.1-70b")) return "Llama 3.1 70B Instruct (OpenRouter Free)";
  if (clean.includes("qwen-2.5-coder")) return "Qwen 2.5 Coder 32B (OpenRouter Free)";
  if (clean.includes("qwen-2.5-72b:free") || clean.includes("qwen-2.5") && clean.includes("free")) return "Qwen 2.5 72B Instruct (OpenRouter Free)";
  if (clean.includes("qwen-2.5") || clean.includes("qwen")) return "Qwen 2.5 72B Instruct (OpenRouter)";
  if (clean.includes("claude-3.5-haiku")) return "Claude 3.5 Haiku (OpenRouter)";
  if (clean.includes("claude-3.5-sonnet") || clean.includes("claude")) return "Claude 3.5 Sonnet (OpenRouter)";
  if (clean.includes("gemma-2")) return "Google Gemma 2 9B (OpenRouter)";
  if (clean.includes("mistral-small")) return "Mistral Small 24B (OpenRouter Free)";
  if (clean.includes("mistral-7b")) return "Mistral 7B Instruct (OpenRouter Free)";
  if (clean.includes("mistral-nemo") || clean.includes("mistral")) return "Mistral Nemo (OpenRouter)";
  if (clean.includes("phi-3")) return "Microsoft Phi-3 Medium (OpenRouter Free)";
  return modelId.replace(/^(openai:|openrouter:|groq:|google\/|meta-llama\/|anthropic\/|inclusionai\/|deepseek\/|qwen\/|mistralai\/|microsoft\/)/i, "").split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
async function executeMultiProviderWithFallback(params) {
  const {
    primaryModelId,
    fallbackChain = [],
    systemInstruction,
    userPrompt,
    temperature = 0.2,
    responseMimeType,
    geminiApiKey: customGeminiKey,
    openaiApiKey: customOpenAiKey,
    openrouterApiKey: customOpenRouterKey,
    onModelTransition
  } = params;
  const systemSettings = readStoreData("settings", {});
  const candidateModels = [];
  const rawList = [primaryModelId, ...fallbackChain];
  for (const m of rawList) {
    if (typeof m === "string" && m.trim()) {
      const clean = m.trim();
      if (!candidateModels.includes(clean)) {
        candidateModels.push(clean);
      }
    }
  }
  if (!candidateModels.includes("gemini-3.7-flash")) candidateModels.push("gemini-3.7-flash");
  if (!candidateModels.includes("gemini-3.6-flash")) candidateModels.push("gemini-3.6-flash");
  if (!candidateModels.includes("gemini-3.1-flash-lite")) candidateModels.push("gemini-3.1-flash-lite");
  let lastError = null;
  for (let i = 0; i < candidateModels.length; i++) {
    const candidate = candidateModels[i];
    const previousModel = i > 0 ? candidateModels[i - 1] : void 0;
    const isOpenRouter = candidate.startsWith("openrouter:") || candidate.includes("inclusionai/") || candidate.includes("meta-llama/") || candidate.includes("anthropic/") || candidate.includes("mistralai/") || candidate.includes("google/gemma") || candidate.includes("deepseek/") || candidate.includes("qwen/") || candidate.includes("microsoft/");
    const isOpenAI = !isOpenRouter && (candidate.startsWith("openai:") || candidate.startsWith("gpt-") || candidate.startsWith("o1") || candidate.startsWith("o3"));
    const isGemini = !isOpenRouter && !isOpenAI;
    if (i > 0 && onModelTransition) {
      onModelTransition({
        currentModel: candidate,
        previousModel,
        isFallback: true,
        reason: `Alternando para modelo de conting\xEAncia (${getFriendlyModelNameServer(candidate)})`
      });
    }
    if (isOpenRouter) {
      const effectiveKey = (customOpenRouterKey || systemSettings.openrouterApiKey || process.env.OPENROUTER_API_KEY || "").trim();
      if (!effectiveKey) {
        console.warn(`[AI Cascade] Chave de API do OpenRouter n\xE3o configurada. Pulando modelo ${candidate} imediatamente...`);
        continue;
      }
      const cleanSlug = candidate.replace(/^openrouter:\s*/i, "").trim();
      console.log(`[AI Cascade] Tentando OpenRouter (${cleanSlug})...`);
      try {
        const client = new import_openai.default({
          apiKey: effectiveKey,
          baseURL: "https://openrouter.ai/api/v1",
          defaultHeaders: {
            "HTTP-Referer": "https://esus-pec-multiprofissional.gov.br",
            "X-Title": "e-SUS PEC Multiprofissional"
          },
          timeout: 3e4
        });
        const completion = await client.chat.completions.create({
          model: cleanSlug,
          temperature,
          messages: [
            ...systemInstruction ? [{ role: "system", content: systemInstruction }] : [],
            { role: "user", content: userPrompt }
          ],
          response_format: responseMimeType === "application/json" ? { type: "json_object" } : void 0
        });
        const outputText = completion.choices[0]?.message?.content || "";
        if (outputText && outputText.trim().length > 0) {
          console.log(`[AI Cascade] Sucesso com OpenRouter (${cleanSlug})!`);
          return { text: outputText, modelUsed: candidate };
        }
      } catch (err) {
        console.warn(`[AI Cascade] OpenRouter (${cleanSlug}) falhou:`, err?.message || err);
        lastError = err;
        continue;
      }
    } else if (isOpenAI) {
      const effectiveKey = (customOpenAiKey || systemSettings.openaiApiKey || process.env.OPENAI_API_KEY || "").trim();
      if (!effectiveKey) {
        console.warn(`[AI Cascade] Chave de API da OpenAI n\xE3o configurada. Pulando modelo ${candidate} imediatamente...`);
        continue;
      }
      const cleanSlug = candidate.replace(/^openai:\s*/i, "").trim();
      console.log(`[AI Cascade] Tentando OpenAI (${cleanSlug})...`);
      try {
        const client = new import_openai.default({
          apiKey: effectiveKey,
          timeout: 3e4
        });
        const completion = await client.chat.completions.create({
          model: cleanSlug,
          temperature,
          messages: [
            ...systemInstruction ? [{ role: "system", content: systemInstruction }] : [],
            { role: "user", content: userPrompt }
          ],
          response_format: responseMimeType === "application/json" ? { type: "json_object" } : void 0
        });
        const outputText = completion.choices[0]?.message?.content || "";
        if (outputText && outputText.trim().length > 0) {
          console.log(`[AI Cascade] Sucesso com OpenAI (${cleanSlug})!`);
          return { text: outputText, modelUsed: candidate };
        }
      } catch (err) {
        console.warn(`[AI Cascade] OpenAI (${cleanSlug}) falhou:`, err?.message || err);
        lastError = err;
        continue;
      }
    } else {
      const effectiveKey = (customGeminiKey || systemSettings.geminiApiKey || process.env.GEMINI_API_KEY || "").trim();
      if (!effectiveKey) {
        console.warn(`[AI Cascade] Chave de API do Gemini n\xE3o configurada. Pulando modelo ${candidate}...`);
        continue;
      }
      const cleanSlug = candidate.replace(/^gemini:\s*/i, "").trim();
      console.log(`[AI Cascade] Tentando Gemini (${cleanSlug})...`);
      try {
        const ai = getGeminiClient(effectiveKey);
        const resp = await ai.models.generateContent({
          model: cleanSlug,
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          config: {
            systemInstruction,
            temperature,
            responseMimeType
          }
        });
        const outputText = resp.text || "";
        if (outputText && outputText.trim().length > 0) {
          console.log(`[AI Cascade] Sucesso com Gemini (${cleanSlug})!`);
          return { text: outputText, modelUsed: candidate };
        }
      } catch (err) {
        console.warn(`[AI Cascade] Gemini (${cleanSlug}) falhou:`, err?.message || err);
        lastError = err;
        continue;
      }
    }
  }
  throw lastError || new Error("N\xE3o foi poss\xEDvel obter resposta de nenhum modelo da cascata de conting\xEAncia.");
}
async function generateContentWithFallback(ai, preferredModel, generateParams, onModelTransition) {
  const candidateModels = [];
  if (preferredModel) {
    candidateModels.push(preferredModel);
  }
  const fallbackList = [
    "gemini-3.7-flash",
    "gemini-3.8-flash",
    "gemini-3.6-flash",
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash"
  ];
  for (const m of fallbackList) {
    if (!candidateModels.includes(m)) {
      candidateModels.push(m);
    }
  }
  let lastError = null;
  for (let i = 0; i < candidateModels.length; i++) {
    const modelToTry = candidateModels[i];
    const previousModel = i > 0 ? candidateModels[i - 1] : void 0;
    if (i > 0 && onModelTransition) {
      onModelTransition({
        currentModel: modelToTry,
        previousModel,
        isFallback: true,
        reason: "Alternando modelo devido a limite de cota ou instabilidade"
      });
    }
    try {
      console.log(`[Gemini API] Chamando modelo: ${modelToTry}...`);
      const response = await ai.models.generateContent({
        model: modelToTry,
        contents: generateParams.contents,
        config: generateParams.config
      });
      return { response, modelUsed: modelToTry };
    } catch (err) {
      console.warn(`[Gemini API] Modelo ${modelToTry} falhou:`, err?.message || err);
      lastError = err;
      const errMsg = String(err?.message || "").toLowerCase();
      if (errMsg.includes("api_key_invalid") || errMsg.includes("invalid api key") || err?.status === 403) {
        throw err;
      }
      if (errMsg.includes("limit: 0")) {
        console.warn(`[Gemini API] Modelo ${modelToTry} possui cota 0 no plano atual. Alternando imediatamente para candidato com cota gratuita...`);
        continue;
      }
      if (err?.status === 429 || err?.status === 503) {
        console.warn(`[Gemini API] Taxa limite atingida (429/503). Tentando pr\xF3ximo modelo...`);
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
  }
  throw lastError || new Error("N\xE3o foi poss\xEDvel obter resposta dos modelos do Gemini.");
}
function formatFriendlyAIError(error) {
  if (!error) return "Ocorreu um erro desconhecido ao processar com a IA.";
  const rawMsg = String(error.message || error || "");
  const status = error.status || error.statusCode || error.response?.status;
  if (status === 429 || rawMsg.includes("RESOURCE_EXHAUSTED") || rawMsg.includes("Quota exceeded")) {
    if (rawMsg.includes("limit: 0")) {
      return "O modelo solicitado (ex: Gemini Pro) requer faturamento ativo (chave paga) na Google AI Studio e possui cota 0 no plano gratuito. Por favor, selecione Gemini 3.7 Flash, Gemini 3.1 Flash Lite ou utilize outro provedor (OpenAI/OpenRouter).";
    }
    const retryMatch = rawMsg.match(/retry in\s+([0-9.]+\s*s(?:ec)?)/i) || rawMsg.match(/retryDelay[:"\s]+(\d+s?)/i);
    const retryDelay = retryMatch ? ` (tente novamente em ~${retryMatch[1].trim()})` : "";
    return `Limite de requisi\xE7\xF5es por minuto da cota gratuita do Gemini atingido temporariamente${retryDelay}. Por favor, aguarde alguns instantes ou alterne para outro modelo/provedor nas Configura\xE7\xF5es.`;
  }
  if (status === 404 || rawMsg.includes("404") || rawMsg.includes("does not exist or you do not have access")) {
    return "O modelo selecionado n\xE3o foi encontrado ou n\xE3o est\xE1 acess\xEDvel com a sua chave de API. Verifique o nome do modelo e as permiss\xF5es de acesso da sua conta.";
  }
  if (status === 401 || status === 403 || rawMsg.includes("API_KEY_INVALID") || rawMsg.includes("invalid_api_key")) {
    return "Chave de API inv\xE1lida ou sem permiss\xE3o de acesso. Verifique a chave configurada no menu de Configura\xE7\xF5es do Sistema.";
  }
  if (rawMsg.includes("insufficient_quota") || rawMsg.includes("billing_not_active")) {
    return "Cota ou cr\xE9ditos insuficientes na sua conta do provedor de IA (OpenAI / OpenRouter). Verifique o saldo ou plano de faturamento da sua chave.";
  }
  if (rawMsg.startsWith("{") && rawMsg.endsWith("}")) {
    try {
      const parsed = JSON.parse(rawMsg);
      if (parsed?.error?.message) {
        return parsed.error.message;
      }
    } catch {
    }
  }
  return rawMsg.length > 250 ? rawMsg.substring(0, 250) + "..." : rawMsg;
}
function buildSystemPrompt(professionName, isFirstConsultation = false, customContext) {
  const profUpper = professionName.trim().toUpperCase();
  const safeContext = typeof customContext === "string" ? customContext : "";
  let prompt = `# MOTOR DE PROCESSAMENTO CL\xCDNICO MULTIPROFISSIONAL (e-SUS PEC / APS / RAPS / eMulti)

`;
  prompt += `CATEGORIA PROFISSIONAL ATUAL: ${profUpper}
`;
  prompt += `TIPO DE ATENDIMENTO: ${isFirstConsultation ? "PRIMEIRO ATENDIMENTO / ACOLHIMENTO INICIAL" : "RETORNO / REAVALIA\xC7\xC3O / ALTA"}

`;
  prompt += `DIRETRIZES CONFORME O TIPO DE ATENDIMENTO:
`;
  if (isFirstConsultation) {
    prompt += `- PRIMEIRO ATENDIMENTO / ACOLHIMENTO INICIAL: Gerar anamnese/hist\xF3rico abrangente, relato detalhado da queixa/demanda e levantamento integral de diagn\xF3sticos e necessidades cl\xEDnicas/sociais/funcionais.

`;
  } else {
    prompt += `- RETORNO / REAVALIA\xC7\xC3O / ALTA: Focar na evolu\xE7\xE3o comparativa em rela\xE7\xE3o ao plano anterior, ades\xE3o \xE0s condutas/interven\xE7\xF5es e reajuste terap\xEAutico ou crit\xE9rios de alta.
`;
    prompt += `- AUDITORIA CL\xCDNICA CRUZADA ATIVA: Se algum problema de sa\xFAde, medica\xE7\xE3o pr\xE9via, meta pendente ou exame/encaminhamento de atendimentos anteriores N\xC3O tiver sido mencionado ou resolvido hoje, acrescente obrigatoriamente no final da resposta o seguinte bloco:
`;
    prompt += `---
### \u26A0\uFE0F AUDITORIA CL\xCDNICA: PEND\xCANCIAS DO HIST\xD3RICO ANTERIOR
`;
    prompt += `- \u2753 [Problema/Sintoma Pendente]: [Pergunta para checar o desfecho]
`;
    prompt += `- \u2753 [Medicamento / Conduta Anterior]: [Checagem de ades\xE3o/toler\xE2ncia]
`;
    prompt += `- \u2753 [Exame / Encaminhamento Pendente]: [Checagem de realiza\xE7\xE3o]

`;
  }
  prompt += `REGRAS OBRIGAT\xD3RIAS DE PADRONIZA\xC7\xC3O E FORMATA\xC7\xC3O PARA O PEC:
`;
  prompt += `1. SINAIS VITAIS E ANTROPOMETRIA QUALITATIVOS: Nunca utilize valores num\xE9ricos brutos (ex: n\xE3o escreva "120x80 mmHg", "IMC 24.2", "72 bpm"). Converta sempre para terminologia qualitativa padronizada (Eutr\xF3fico, Normotenso, Normoc\xE1rdico, Eupneico, Normot\xE9rmico, Normossaturado, etc.).
`;
  prompt += `2. ESTRUTURA RIGOROSA DE 3 BLOCOS DO PEC: Voc\xEA DEVE SEMPRE gerar estritamente 3 blocos delimitados exatamente pelos cabe\xE7alhos:
`;
  prompt += `   ### CAMPO: AVALIA\xC7\xC3O
`;
  prompt += `   ### CAMPO: PLANO
`;
  prompt += `   ### CAMPO 06: FINALIZA\xC7\xC3O DO ATENDIMENTO / CONDUTA

`;
  prompt += `3. FORMATA\xC7\xC3O RIGOROSA DAS SUBSE\xC7\xD5ES (PADR\xC3O PROFISSIONAL DE ENFERMAGEM/MULTI):
`;
  prompt += `   - O t\xEDtulo de cada subse\xE7\xE3o DEVE estar em LETRAS MAI\xDASCULAS com dois pontos no final (SEM asteriscos duplos **).
`;
  prompt += `   - O conte\xFAdo logo abaixo do t\xEDtulo DEVE ser formatado como cita\xE7\xE3o em bloco iniciando cada linha com "> " (garantindo a formata\xE7\xE3o nativa de cita\xE7\xE3o do e-SUS PEC).
`;
  prompt += `   - O conte\xFAdo citado deve estar imediatamente na linha seguinte ao t\xEDtulo (sem linha em branco intermedi\xE1ria).
`;
  prompt += `   - Separe cada subse\xE7\xE3o completa da pr\xF3xima com uma linha em branco.

`;
  prompt += `4. ESTRUTURA\xC7\xC3O ESPEC\xCDFICA POR CATEGORIA PROFISSIONAL:

`;
  if (profUpper.includes("ENFERM")) {
    prompt += `ESTRUTURA PARA ENFERMAGEM:
`;
    prompt += `### CAMPO: AVALIA\xC7\xC3O
`;
    prompt += `HIST\xD3RICO/EVOLU\xC7\xC3O:
> [Texto do hist\xF3rico do usu\xE1rio e queixa...]

`;
    prompt += `EXAME CL\xCDNICO:
> [Exame f\xEDsico/mental e sinais vitais qualitativos...]

`;
    prompt += `DIAGN\xD3STICOS DE ENFERMAGEM (NANDA-I):
> - [Diagn\xF3stico 1]
> - [Diagn\xF3stico 2]

`;
    prompt += `CIAP-2:
> - [C\xF3digo] ([Descri\xE7\xE3o])

`;
    prompt += `CID-10:
> - [C\xF3digo] ([Descri\xE7\xE3o])

`;
    prompt += `### CAMPO: PLANO
`;
    prompt += `METAS (NOC):
> - [Meta 1]
> - [Meta 2]

`;
    prompt += `INTERVEN\xC7\xD5ES (NIC):
> - [Interven\xE7\xE3o 1]
> - [Interven\xE7\xE3o 2]

`;
    prompt += `CIAP-2:
> - 69 (Outras orienta\xE7\xF5es / Aconselhamento / Educa\xE7\xE3o em sa\xFAde)

`;
    prompt += `SIGTAP:
> - ORIENTA\xC7\xC3O INDIVIDUAL EM SA\xDADE

`;
    prompt += `### CAMPO 06: FINALIZA\xC7\xC3O DO ATENDIMENTO / CONDUTA
`;
    prompt += `CONDUTA IMEDIATA:
> [Acolhimento e orienta\xE7\xF5es imediatas...]

`;
    prompt += `PRESCRI\xC7\xD5ES DE ENFERMAGEM / TRANSCRI\xC7\xD5ES:
> [Prescri\xE7\xF5es conforme protocolos municipais...]

`;
    prompt += `GUIAS DE REFER\xCANCIA / SOLICITA\xC7\xC3O DE EXAMES:
> [Solicita\xE7\xF5es laboratoriais ou encaminhamentos...]

`;
    prompt += `RETORNO / AGENDAMENTO:
> [Agendamento de retorno e orienta\xE7\xF5es de seguimento...]

`;
  } else if (profUpper.includes("ASSIST") || profUpper.includes("SOCIAL") || profUpper.includes("CRESS")) {
    prompt += `ESTRUTURA PARA SERVI\xC7O SOCIAL (ASSISTENTE SOCIAL):
`;
    prompt += `### CAMPO: AVALIA\xC7\xC3O
`;
    prompt += `HIST\xD3RICO / EVOLU\xC7\xC3O SOCIAL:
> [Relato das demandas socioecon\xF4micas, din\xE2mica familiar, renda e contexto comunit\xE1rio...]

`;
    prompt += `AVALIA\xC7\xC3O DA DETERMINA\xC7\xC3O SOCIAL E VULNERABILIDADE:
> [An\xE1lise das condi\xE7\xF5es de moradia, acesso a bens/servi\xE7os, barreiras sociais e viola\xE7\xE3o de direitos...]

`;
    prompt += `DEMANDAS SOCIOASSISTENCIAIS IDENTIFICADAS:
> - [Demanda 1: Ex. Inseguran\xE7a de renda / Dificuldade de acesso a BPC/Cad\xDAnico]
> - [Demanda 2: Ex. Fragilidade de rede de apoio familiar/comunit\xE1ria]

`;
    prompt += `CIAP-2:
> - [C\xF3digo] ([Descri\xE7\xE3o: ex. Z01 Pobreza/problemas econ\xF4micos, Z04 Problema sociocultural/familiar])

`;
    prompt += `CID-10:
> - [C\xF3digo] ([Descri\xE7\xE3o: ex. Z59.0 Falta de habita\xE7\xE3o, Z59.5 Extrema pobreza, Z73.0 Esgotamento])

`;
    prompt += `### CAMPO: PLANO
`;
    prompt += `METAS E OBJETIVOS DO ACOMPANHAMENTO SOCIAL:
> - [Meta 1: Ex. Regulariza\xE7\xE3o documental e inclus\xE3o no Cadastro \xDAnico]
> - [Meta 2: Ex. Garantia de acesso a benef\xEDcios socioassistenciais]

`;
    prompt += `INTERVEN\xC7\xD5ES E ORIENTA\xC7\xD5ES SOCIAIS:
> - [Interven\xE7\xE3o 1: Ex. Orienta\xE7\xE3o t\xE9cnica sobre crit\xE9rios de concess\xE3o do BPC/LOAS]
> - [Interven\xE7\xE3o 2: Ex. Acompanhamento peri\xF3dico da situa\xE7\xE3o de vulnerabilidade]

`;
    prompt += `CIAP-2:
> - 69 (Outras orienta\xE7\xF5es / Aconselhamento / Educa\xE7\xE3o em sa\xFAde)

`;
    prompt += `SIGTAP:
> - ORIENTA\xC7\xC3O INDIVIDUAL EM SA\xDADE

`;
    prompt += `### CAMPO 06: FINALIZA\xC7\xC3O DO ATENDIMENTO / CONDUTA
`;
    prompt += `CONDUTA IMEDIATA:
> [Acolhimento imediato e orienta\xE7\xF5es prestadas ao usu\xE1rio/fam\xEDlia...]

`;
    prompt += `ENCAMINHAMENTOS E ARTICULA\xC7\xC3O INTERSETORIAL (CRAS / CREAS / INSS / SUAS):
> [Encaminhamento formal ao CRAS de refer\xEAncia, setor de benef\xEDcios ou programas de transfer\xEAncia de renda...]

`;
    prompt += `SOLICITA\xC7\xC3O DE DOCUMENTOS / LAUDOS CIRCUNSTANCIADOS:
> [Solicita\xE7\xE3o de laudo m\xE9dico atualizado para instru\xE7\xE3o do BPC/LOAS ou emiss\xE3o de relat\xF3rio social...]

`;
    prompt += `RETORNO / AGENDAMENTO:
> [Prazo estipulado para retorno, entrega de documentos e acompanhamento continuado...]

`;
  } else if (profUpper.includes("PSICOL") || profUpper.includes("CRP")) {
    prompt += `ESTRUTURA PARA PSICOLOGIA:
`;
    prompt += `### CAMPO: AVALIA\xC7\xC3O
`;
    prompt += `HIST\xD3RICO / EVOLU\xC7\xC3O CL\xCDNICO-PSICOL\xD3GICA:
> [Queixa principal, din\xE2mica afetiva, estado subjetivo e relato espont\xE2neo...]

`;
    prompt += `EXAME DO ESTADO MENTAL E AVALIA\xC7\xC3O SUBJETIVA:
> [Apar\xEAncia, humor, afeto, orienta\xE7\xE3o temporoespacial, discurso, pensamento, sensopercep\xE7\xE3o e sono...]

`;
    prompt += `DEMANDAS PSICOL\xD3GICAS E HIP\xD3TESES COMPREENSIVAS:
> - [Demanda / Sofrimento ps\xEDquico identificado]

`;
    prompt += `CIAP-2:
> - [C\xF3digo] ([Descri\xE7\xE3o: ex. P01 Sensa\xE7\xE3o de ansiedade/nervosismo, P03 Sensa\xE7\xE3o de depress\xE3o, P79 Outros transtornos psicol\xF3gicos])

`;
    prompt += `CID-10:
> - [C\xF3digo] ([Descri\xE7\xE3o: ex. F32.1 Epis\xF3dio depressivo, F41.1 Ansiedade generalizada, F20.0 Esquizofrenia paranoide])

`;
    prompt += `### CAMPO: PLANO
`;
    prompt += `METAS TERAP\xCAUTICAS (PTS - PROJETO TERAP\xCAUTICO SINGULAR):
> - [Meta 1: Ex. Desenvolvimento de estrat\xE9gias de autorregula\xE7\xE3o emocional e enfrentamento]

`;
    prompt += `INTERVEN\xC7\xD5ES PSICOTERAP\xCAUTICAS E MANEJOS:
> - [Interven\xE7\xE3o 1: Ex. Psicoterapia individual com foco em reestrutura\xE7\xE3o cognitiva e express\xE3o afetiva]

`;
    prompt += `CIAP-2:
> - 69 (Outras orienta\xE7\xF5es / Aconselhamento / Educa\xE7\xE3o em sa\xFAde)

`;
    prompt += `SIGTAP:
> - ORIENTA\xC7\xC3O INDIVIDUAL EM SA\xDADE

`;
    prompt += `### CAMPO 06: FINALIZA\xC7\xC3O DO ATENDIMENTO / CONDUTA
`;
    prompt += `CONDUTA IMEDIATA:
> [Interven\xE7\xE3o em crise, acolhimento ou valida\xE7\xE3o afetiva realizada no atendimento...]

`;
    prompt += `ARTICULA\xC7\xC3O DE REDE / ENCAMINHAMENTOS (RAPS / CAPS / APS):
> [Articula\xE7\xE3o com equipe de Sa\xFAde da Fam\xEDlia, matriciamento com Psiquiatria ou grupos terap\xEAuticos...]

`;
    prompt += `RETORNO / AGENDAMENTO:
> [Frequ\xEAncia dos atendimentos psicoterap\xEAuticos e agendamento da pr\xF3xima sess\xE3o...]

`;
  } else if (profUpper.includes("PSICOPEDAG")) {
    prompt += `ESTRUTURA PARA PSICOPEDAGOGIA:
`;
    prompt += `### CAMPO: AVALIA\xC7\xC3O
`;
    prompt += `HIST\xD3RICO / EVOLU\xC7\xC3O PSICOPEDAG\xD3GICA:
> [Hist\xF3rico de aprendizagem, queixas escolares e desenvolvimento global...]

`;
    prompt += `AVALIA\xC7\xC3O DAS FUN\xC7\xD5ES EXECUTIVAS E COGNI\xC7\xC3O:
> [Aten\xE7\xE3o sustentada, controle inibit\xF3rio, mem\xF3ria operacional e racioc\xEDnio l\xF3gico-matem\xE1tico...]

`;
    prompt += `DEMANDAS DE APRENDIZAGEM IDENTIFICADAS:
> - [Dificuldade ou potencialidade de aprendizagem observada]

`;
    prompt += `CIAP-2:
> - [C\xF3digo] ([Descri\xE7\xE3o: ex. P24 Dificuldade de aprendizagem])

`;
    prompt += `CID-10:
> - [C\xF3digo] ([Descri\xE7\xE3o: ex. F81.9 Transtorno do desenvolvimento das habilidades escolares])

`;
    prompt += `### CAMPO: PLANO
`;
    prompt += `METAS DE ESTIMULA\xC7\xC3O PSICOPEDAG\xD3GICA:
> - [Meta 1: Ex. Fortalecimento da flexibilidade cognitiva e planejamento sequencial]

`;
    prompt += `INTERVEN\xC7\xD5ES E ESTRAT\xC9GIAS DE MEDIA\xC7\xC3O:
> - [Interven\xE7\xE3o 1: Ex. Estimula\xE7\xE3o psicopedag\xF3gica mediada por recursos l\xFAdicos e visuais concretos]

`;
    prompt += `CIAP-2:
> - 69 (Outras orienta\xE7\xF5es / Aconselhamento / Educa\xE7\xE3o em sa\xFAde)

`;
    prompt += `SIGTAP:
> - ORIENTA\xC7\xC3O INDIVIDUAL EM SA\xDADE

`;
    prompt += `### CAMPO 06: FINALIZA\xC7\xC3O DO ATENDIMENTO / CONDUTA
`;
    prompt += `CONDUTA IMEDIATA:
> [Orienta\xE7\xF5es imediatas aos respons\xE1veis para estrutura\xE7\xE3o da rotina domiciliar...]

`;
    prompt += `ARTICULA\xC7\xC3O ESCOLAR / INTERSETORIAL (AEE / PDI):
> [Di\xE1logo com coordena\xE7\xE3o pedag\xF3gica e subs\xEDdios para o Plano de Desenvolvimento Individual na escola...]

`;
    prompt += `RETORNO / AGENDAMENTO:
> [Periodicidade e agendamento dos atendimentos psicopedag\xF3gicos...]

`;
  } else if (profUpper.includes("NUTRI")) {
    prompt += `ESTRUTURA PARA NUTRI\xC7\xC3O:
`;
    prompt += `### CAMPO: AVALIA\xC7\xC3O
`;
    prompt += `HIST\xD3RICO / EVOLU\xC7\xC3O NUTRICIONAL:
> [H\xE1bitos alimentares, recordat\xF3rio, intoler\xE2ncias, ingest\xE3o h\xEDdrica e comportamento \xE0 mesa...]

`;
    prompt += `AVALIA\xC7\xC3O ANTROPOM\xC9TRICA E CL\xCDNICO-NUTRICIONAL:
> [Estado nutricional qualitativo (Eutr\xF3fico/Sobrepeso/Baixo Peso), sinais cl\xEDnicos de car\xEAncias e digest\xE3o...]

`;
    prompt += `DIAGN\xD3STICOS DE NUTRI\xC7\xC3O / DEMANDAS DIET\xC9TICAS:
> - [Inadequa\xE7\xE3o ou diagn\xF3stico nutricional identificado]

`;
    prompt += `CIAP-2:
> - [C\xF3digo] ([Descri\xE7\xE3o: ex. T07 Ganho de peso, T08 Perda de peso, T89 Diabetes mellitus])

`;
    prompt += `CID-10:
> - [C\xF3digo] ([Descri\xE7\xE3o: ex. E66 Obesidade, E46 Desnutri\xE7\xE3o, E11 Diabetes tipo 2])

`;
    prompt += `### CAMPO: PLANO
`;
    prompt += `METAS DO PLANO ALIMENTAR:
> - [Meta 1: Ex. Adequa\xE7\xE3o qualitativa da ingest\xE3o cal\xF3rica e aumento do consumo de alimentos in natura]

`;
    prompt += `INTERVEN\xC7\xD5ES E ORIENTA\xC7\xD5ES NUTRICIONAIS:
> - [Interven\xE7\xE3o 1: Ex. Elabora\xE7\xE3o de plano alimentar individualizado adaptado \xE0 realidade socioecon\xF4mica]

`;
    prompt += `CIAP-2:
> - 69 (Outras orienta\xE7\xF5es / Aconselhamento / Educa\xE7\xE3o em sa\xFAde)

`;
    prompt += `SIGTAP:
> - ORIENTA\xC7\xC3O INDIVIDUAL EM SA\xDADE

`;
    prompt += `### CAMPO 06: FINALIZA\xC7\xC3O DO ATENDIMENTO / CONDUTA
`;
    prompt += `CONDUTA IMEDIATA:
> [Orienta\xE7\xF5es nutricionais e metas pr\xE1ticas pactuadas no atendimento...]

`;
    prompt += `ENCAMINHAMENTOS / SOLICITA\xC7\xC3O DE EXAMES LABORATORIAIS:
> [Solicita\xE7\xE3o de exames pertinentes (perfil lip\xEDdico, glicemia) ou encaminhamento multidisciplinar...]

`;
    prompt += `RETORNO / AGENDAMENTO:
> [Prazo para retorno, monitoramento ponderal e reavalia\xE7\xE3o do plano alimentar...]

`;
  } else {
    prompt += `ESTRUTURA PARA ${profUpper}:
`;
    prompt += `### CAMPO: AVALIA\xC7\xC3O
`;
    prompt += `HIST\xD3RICO / EVOLU\xC7\xC3O DO ATENDIMENTO:
> [Relato detalhado da consulta, queixas principais e hist\xF3rico...]

`;
    prompt += `AVALIA\xC7\xC3O T\xC9CNICA E EXAME CL\xCDNICO-FUNCIONAL:
> [Achados do exame cl\xEDnico/f\xEDsico/funcional com par\xE2metros estritamente qualitativos...]

`;
    prompt += `DIAGN\xD3STICOS / DEMANDAS T\xC9CNICAS IDENTIFICADAS:
> - [Diagn\xF3stico ou demanda principal]

`;
    prompt += `CIAP-2:
> - [C\xF3digo] ([Descri\xE7\xE3o])

`;
    prompt += `CID-10:
> - [C\xF3digo] ([Descri\xE7\xE3o])

`;
    prompt += `### CAMPO: PLANO
`;
    prompt += `METAS E OBJETIVOS TERAP\xCAUTICOS:
> - [Meta 1]

`;
    prompt += `INTERVEN\xC7\xD5ES E CONDUTAS T\xC9CNICAS:
> - [Interven\xE7\xE3o 1]

`;
    prompt += `CIAP-2:
> - 69 (Outras orienta\xE7\xF5es / Aconselhamento / Educa\xE7\xE3o em sa\xFAde)

`;
    prompt += `SIGTAP:
> - ORIENTA\xC7\xC3O INDIVIDUAL EM SA\xDADE

`;
    prompt += `### CAMPO 06: FINALIZA\xC7\xC3O DO ATENDIMENTO / CONDUTA
`;
    prompt += `CONDUTA IMEDIATA:
> [Condutas e orienta\xE7\xF5es imediatas fornecidas ao usu\xE1rio...]

`;
    prompt += `ENCAMINHAMENTOS E ARTICULA\xC7\xC3O DE REDE:
> [Encaminhamentos intersetoriais ou para outros pontos da rede de sa\xFAde...]

`;
    prompt += `PRESCRI\xC7\xD5ES / GUIAS / DOCUMENTOS:
> [Prescri\xE7\xF5es, guias ou atestados pertinentes...]

`;
    prompt += `RETORNO / AGENDAMENTO:
> [Prazo para retorno e seguimento...]

`;
  }
  if (safeContext) {
    prompt += `
--- BASE DE CONHECIMENTO / PROTOCOLOS LOCAIS E REMUME MUNICIPAL INJETADOS ---
${safeContext}

`;
  }
  prompt += `INSTRU\xC7\xC3O FINAL:
`;
  prompt += `Gere rigorosamente os 3 blocos com os cabe\xE7alhos '### CAMPO: AVALIA\xC7\xC3O', '### CAMPO: PLANO' e '### CAMPO 06: FINALIZA\xC7\xC3O DO ATENDIMENTO / CONDUTA'. Mantenha todos os t\xEDtulos das subse\xE7\xF5es em LETRAS MAI\xDASCULAS e todo o conte\xFAdo correspondente formatado com '> '. Mantenha o texto limpo, t\xE9cnico e pronto para o e-SUS PEC.`;
  return prompt;
}
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "e-SUS PEC Multiprofissional AI API",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.post("/api/gemini/generate", async (req, res) => {
  const isStream = req.body?.stream === true || req.headers.accept && req.headers.accept.includes("text/event-stream");
  const sendEvent = (eventData) => {
    if (isStream) {
      res.write(`data: ${JSON.stringify(eventData)}

`);
    }
  };
  if (isStream) {
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    if (typeof res.flushHeaders === "function") {
      res.flushHeaders();
    }
  }
  try {
    const profession = typeof req.body.profession === "string" ? req.body.profession : "Enfermeiro";
    const modelName = typeof req.body.modelName === "string" ? req.body.modelName : "gemini-3.7-flash";
    const isFirstConsultation = Boolean(req.body.isFirstConsultation);
    const patientHistory = req.body.patientHistory;
    const rawNotes = typeof req.body.rawNotes === "string" ? req.body.rawNotes : "";
    const audioData = req.body.audioData;
    const images = Array.isArray(req.body.images) ? req.body.images : [];
    const customContext = typeof req.body.customContext === "string" ? req.body.customContext : "";
    const userApiKey = typeof req.body.userApiKey === "string" ? req.body.userApiKey : void 0;
    const openaiApiKey = typeof req.body.openaiApiKey === "string" ? req.body.openaiApiKey : void 0;
    const openrouterApiKey = typeof req.body.openrouterApiKey === "string" ? req.body.openrouterApiKey : void 0;
    if (!rawNotes && !audioData && (!images || images.length === 0)) {
      if (isStream) {
        sendEvent({
          type: "error",
          error: "Por favor, insira um relato em texto, grave um \xE1udio ou anexe um documento/foto."
        });
        return res.end();
      }
      return res.status(400).json({
        error: "Por favor, insira um relato em texto, grave um \xE1udio ou anexe um documento/foto."
      });
    }
    const systemInstruction = buildSystemPrompt(profession, Boolean(isFirstConsultation), customContext);
    const sysSettings = readStoreData("settings", {});
    const soapSectionConfig = req.body.sectionConfig || sysSettings.sectionsConfig?.soapPec;
    const requestedModel = (req.body.model || req.body.modelName || "").trim();
    const primaryCandidate = soapSectionConfig?.primaryModelId || requestedModel || "gemini-3.7-flash";
    const fallbackCandidates = Array.isArray(soapSectionConfig?.fallbackChain) ? soapSectionConfig.fallbackChain : ["openrouter:inclusionai/ling-3.0-flash-sante:free", "gemini-3.6-flash", "gemini-3.1-flash-lite"];
    let targetModel = primaryCandidate;
    const isGemini = targetModel.includes("gemini") && !targetModel.startsWith("openrouter:");
    const isOpenAI = (targetModel.startsWith("openai:") || targetModel.includes("gpt") || targetModel.startsWith("o1")) && !targetModel.startsWith("openrouter:");
    const isOpenRouter = !isGemini && !isOpenAI;
    console.log(`[AI Generation] Model requested: "${requestedModel || "auto"}" -> Executing Primary: "${primaryCandidate}", Cascade: ${fallbackCandidates.join(" -> ")}`);
    sendEvent({
      type: "status",
      model: targetModel,
      modelName: getFriendlyModelNameServer(targetModel),
      message: `Processando com ${getFriendlyModelNameServer(targetModel)}...`
    });
    const onModelTransition = (info) => {
      console.log(`[AI Generation Transition] ${info.previousModel} -> ${info.currentModel}`);
      sendEvent({
        type: "transition",
        fromModel: info.previousModel,
        fromModelName: getFriendlyModelNameServer(info.previousModel),
        toModel: info.currentModel,
        toModelName: getFriendlyModelNameServer(info.currentModel),
        reason: info.reason || "Alternando modelo",
        message: `Alternando para ${getFriendlyModelNameServer(info.currentModel)}...`
      });
    };
    let userTextPrompt = `Por favor, elabore o registro cl\xEDnico formal para o PEC do e-SUS para o profissional: ${profession}.
`;
    userTextPrompt += `TIPO DE ATENDIMENTO: ${isFirstConsultation ? "PRIMEIRO ATENDIMENTO / ACOLHIMENTO INICIAL" : "RETORNO / REAVALIA\xC7\xC3O / ALTA"}

`;
    if (rawNotes && rawNotes.trim().length > 0) {
      userTextPrompt += `DADOS BRUTOS / RELATO DO ATENDIMENTO ATUAL:
${rawNotes}

`;
    }
    if (!isFirstConsultation && patientHistory) {
      let formattedHistoryText = "";
      if (Array.isArray(patientHistory) && patientHistory.length > 0) {
        const recentHistory = patientHistory.slice(-5);
        formattedHistoryText = recentHistory.map((item, idx) => {
          return `[${item.date || "Data ?"} | ${item.author || "Prof."}]: Aval: ${item.avaliacao?.substring(0, 150) || "--"} | Plano: ${item.plano?.substring(0, 150) || "--"}`;
        }).join("\n");
      } else if (typeof patientHistory === "string" && patientHistory.trim().length > 0) {
        formattedHistoryText = patientHistory.substring(0, 1e3);
      }
      if (formattedHistoryText) {
        userTextPrompt += `HIST\xD3RICO RECENTE (\xFAltimos 5):
${formattedHistoryText}

`;
      }
    }
    let transcribedText = "";
    if (audioData || images && images.length > 0) {
      const ai = getGeminiClient(userApiKey);
      const contentsParts = [];
      if (audioData?.data) {
        contentsParts.push({
          inlineData: {
            mimeType: audioData.mimeType || "audio/webm",
            data: audioData.data
          }
        });
      }
      if (Array.isArray(images)) {
        for (const img of images) {
          if (img?.data) {
            contentsParts.push({
              inlineData: {
                mimeType: img.mimeType || "image/jpeg",
                data: img.data
              }
            });
          }
        }
      }
      const validParts = contentsParts.filter((p) => p && typeof p === "object").map((p) => {
        if (p.inlineData && typeof p.inlineData === "object" && typeof p.inlineData.data === "string") {
          return {
            inlineData: {
              mimeType: String(p.inlineData.mimeType || "image/jpeg"),
              data: String(p.inlineData.data)
            }
          };
        }
        return null;
      }).filter((p) => p !== null);
      if (isGemini) {
        if (audioData) {
          userTextPrompt += `OBSERVA\xC7\xC3O: H\xE1 um \xE1udio anexado com o relato verbal da consulta/visita. Fa\xE7a a transcri\xE7\xE3o e extra\xE7\xE3o cl\xEDnica integral dos pontos relatados.

`;
        }
        if (images && images.length > 0) {
          userTextPrompt += `OBSERVA\xC7\xC3O: H\xE1 ${images.length} imagem(ns)/documento(s) anexados (receitas, exames ou monitores de sinais vitais). Extraia todos os dados cl\xEDnicos pertinentes e incorpore no prontu\xE1rio conforme as regras do PEC.

`;
        }
        validParts.push({ text: userTextPrompt });
        userTextPrompt += `Gere o prontu\xE1rio estruturado pronto para c\xF3pia conforme os blocos e regras obrigat\xF3rias.`;
        const { response, modelUsed } = await generateContentWithFallback(ai, targetModel, {
          contents: [{ role: "user", parts: validParts }],
          config: {
            systemInstruction,
            temperature: 0.2,
            topP: 0.9
          }
        }, onModelTransition);
        transcribedText = response.text || "";
        targetModel = modelUsed;
      } else {
        console.log(`[AI Generation] Transcribing multimedia using Gemini for external model: ${targetModel}`);
        validParts.push({ text: "Transcreva o \xE1udio (se houver) e descreva os documentos/fotos anexados com o m\xE1ximo de detalhes cl\xEDnicos poss\xEDveis. N\xE3o estruture o prontu\xE1rio ainda." });
        const { response } = await generateContentWithFallback(ai, "gemini-3.7-flash", {
          contents: [{ role: "user", parts: validParts }],
          config: {
            temperature: 0.1
          }
        }, onModelTransition);
        if (response.text) {
          userTextPrompt += `[TRANSCRI\xC7\xC3O/DESCRI\xC7\xC3O DO MULTIM\xCDDIA GERADA POR IA]:
${response.text}

`;
        }
      }
    }
    let fullText = transcribedText;
    if (!isGemini || !audioData && (!images || images.length === 0)) {
      userTextPrompt += `Gere o prontu\xE1rio estruturado pronto para c\xF3pia conforme os blocos e regras obrigat\xF3rias.`;
      const sysSettings2 = readStoreData("settings", {});
      const soapSectionConfig2 = req.body.sectionConfig || sysSettings2.sectionsConfig?.soapPec;
      const primaryCandidate2 = soapSectionConfig2?.primaryModelId || targetModel || "gemini-3.7-flash";
      const fallbackCandidates2 = Array.isArray(soapSectionConfig2?.fallbackChain) ? soapSectionConfig2.fallbackChain : ["openrouter:inclusionai/ling-3.0-flash-sante:free", "gemini-3.6-flash", "gemini-3.1-flash-lite"];
      console.log(`[AI Generation Cascade] Executando SOAP com Prim\xE1rio: ${primaryCandidate2}, Cascata: ${fallbackCandidates2.join(" -> ")}`);
      const executionResult = await executeMultiProviderWithFallback({
        primaryModelId: primaryCandidate2,
        fallbackChain: fallbackCandidates2,
        systemInstruction,
        userPrompt: userTextPrompt,
        temperature: soapSectionConfig2?.temperature ?? 0.2,
        geminiApiKey: userApiKey,
        openaiApiKey,
        openrouterApiKey,
        onModelTransition
      });
      fullText = executionResult.text;
      targetModel = executionResult.modelUsed;
    }
    const parsed = parsePECBlocks(fullText, profession);
    const resultPayload = {
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
      timestamp: Date.now()
    };
    if (isStream) {
      sendEvent({
        type: "complete",
        data: resultPayload
      });
      return res.end();
    }
    return res.json(resultPayload);
  } catch (error) {
    console.error("Erro na chamada de IA (gera\xE7\xE3o de prontu\xE1rio):", error);
    const friendlyMessage = formatFriendlyAIError(error);
    if (isStream) {
      sendEvent({
        type: "error",
        error: friendlyMessage,
        rawError: error?.message || String(error)
      });
      return res.end();
    }
    return res.status(500).json({
      error: friendlyMessage,
      rawError: error?.message || String(error)
    });
  }
});
app.post("/api/gemini/test", async (req, res) => {
  try {
    const { apiKey, model = "gemini-3.6-flash" } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: "Chave de API n\xE3o informada." });
    }
    const ai = getGeminiClient(apiKey);
    const { response, modelUsed } = await generateContentWithFallback(ai, model, {
      contents: [
        {
          role: "user",
          parts: [{ text: "Responda apenas: OK" }]
        }
      ]
    });
    res.json({
      success: true,
      message: `Chave de API v\xE1lida e conectada com sucesso via modelo ${modelUsed}!`,
      text: response.text
    });
  } catch (err) {
    console.error("Erro no teste da API Key:", err);
    res.status(500).json({
      error: err?.message || "Falha na valida\xE7\xE3o da chave com o Gemini."
    });
  }
});
app.post("/api/groq/test", async (req, res) => {
  try {
    const apiKey = typeof req.body.apiKey === "string" ? req.body.apiKey.trim() : "";
    if (!apiKey) {
      return res.status(400).json({ success: false, error: "Chave da Groq n\xE3o informada." });
    }
    const groq = new import_openai.default({
      apiKey,
      baseURL: "https://api.groq.com/openai/v1"
    });
    const models = await groq.models.list();
    const hasWhisper = models.data.some((m) => m.id.includes("whisper"));
    res.json({
      success: true,
      message: `Chave da Groq v\xE1lida! Modelos dispon\xEDveis (incluindo whisper-large-v3).`
    });
  } catch (err) {
    console.error("Erro no teste da Groq API Key:", err);
    res.status(500).json({
      success: false,
      error: err?.message || "Falha na valida\xE7\xE3o da chave com a Groq API."
    });
  }
});
var audioUpload = (0, import_multer.default)({ storage: import_multer.default.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
app.post(
  ["/api/audio/transcribe", "/api/gemini/transcribe"],
  (req, res, next) => {
    audioUpload.single("audio")(req, res, (err) => {
      if (err) {
        console.warn("[AudioTranscription] Multer warning/notice:", err?.message || err);
      }
      next();
    });
  },
  async (req, res) => {
    try {
      let audioBuffer = null;
      let fileName = "audio.webm";
      let fileMime = "audio/webm";
      if (req.file && req.file.buffer) {
        audioBuffer = req.file.buffer;
        fileName = req.file.originalname || "audio.webm";
        fileMime = req.file.mimetype || "audio/webm";
      } else if (req.body?.audioData?.data) {
        const base64Data = String(req.body.audioData.data);
        const rawMime = String(req.body.audioData.mimeType || "audio/webm");
        fileMime = rawMime.split(";")[0].trim();
        const ext = fileMime.includes("mp4") ? "mp4" : fileMime.includes("ogg") ? "ogg" : fileMime.includes("wav") ? "wav" : "webm";
        fileName = `audio.${ext}`;
        audioBuffer = Buffer.from(base64Data, "base64");
      } else if (req.body?.audio && typeof req.body.audio === "string") {
        const base64Data = req.body.audio.replace(/^data:[^;]+;base64,/, "");
        audioBuffer = Buffer.from(base64Data, "base64");
      }
      if (!audioBuffer || audioBuffer.length < 300) {
        return res.status(400).json({ success: false, error: "Nenhum dado de \xE1udio fornecido ou \xE1udio muito curto." });
      }
      const systemSettings = readStoreData("settings", {});
      const headerGroqKey = typeof req.headers["x-groq-api-key"] === "string" ? req.headers["x-groq-api-key"].trim() : "";
      const bodyGroqKey = typeof req.body?.groqApiKey === "string" ? req.body.groqApiKey.trim() : "";
      const groqApiKey = bodyGroqKey || headerGroqKey || systemSettings?.groqApiKey || process.env.GROQ_API_KEY || "";
      console.log(`[AudioTranscription] file="${fileName}" | size=${audioBuffer.length} bytes | mime="${fileMime}" | groqKey=${groqApiKey ? groqApiKey.slice(0, 8) + "..." : "MISSING"}`);
      let transcription = "";
      let engineUsed = "groq-whisper";
      if (groqApiKey) {
        try {
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
            body: formData
          });
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
              body: formData2
            });
          }
          if (groqResponse.ok) {
            const groqResult = await groqResponse.json();
            const candidateText = (groqResult.text || "").trim();
            if (candidateText && candidateText !== ".") {
              transcription = candidateText;
              engineUsed = "groq-whisper";
            }
          } else {
            console.warn(`[AudioTranscription] Groq Whisper retornou status ${groqResponse.status}. Alternando para fallback Gemini...`);
          }
        } catch (groqErr) {
          console.warn("[AudioTranscription] Falha ao contatar Groq Whisper. Alternando para fallback Gemini:", groqErr);
        }
      }
      if (!transcription) {
        console.log("[AudioTranscription] Acionando cascata de conting\xEAncia: Google Gemini Multimodal...");
        try {
          const userGeminiKey = typeof req.headers["x-gemini-api-key"] === "string" ? req.headers["x-gemini-api-key"].trim() : "";
          const effectiveGeminiKey = userGeminiKey || systemSettings?.geminiApiKey || process.env.GEMINI_API_KEY || "";
          const ai = getGeminiClient(effectiveGeminiKey);
          const geminiResult = await generateContentWithFallback(ai, "gemini-3.7-flash", {
            contents: [
              {
                role: "user",
                parts: [
                  {
                    inlineData: {
                      mimeType: fileMime || "audio/webm",
                      data: audioBuffer.toString("base64")
                    }
                  },
                  {
                    text: "Transcreva com m\xE1xima fidelidade e clareza este \xE1udio cl\xEDnico gravado em portugu\xEAs do Brasil. Retorne exclusivamente o texto falado, sem introdu\xE7\xF5es ou coment\xE1rios adicionais."
                  }
                ]
              }
            ],
            config: {
              temperature: 0.1
            }
          });
          const geminiText = (geminiResult.response.text || "").trim();
          if (geminiText) {
            transcription = geminiText;
            engineUsed = `gemini-audio (${geminiResult.modelUsed})`;
            console.log(`[AudioTranscription] \u2705 Sucesso via conting\xEAncia Gemini (${geminiResult.modelUsed})!`);
          }
        } catch (geminiAudioErr) {
          console.warn("[AudioTranscription] Conting\xEAncia Gemini tamb\xE9m falhou:", geminiAudioErr);
        }
      }
      if (transcription && transcription !== ".") {
        console.log(`[AudioTranscription] \u2705 Transcri\xE7\xE3o final (${engineUsed}): "${transcription.slice(0, 100)}..."`);
        return res.json({
          success: true,
          text: transcription,
          transcription,
          engine: engineUsed
        });
      } else {
        return res.status(422).json({
          success: false,
          error: "Nenhuma fala compreens\xEDvel foi detectada no \xE1udio ou n\xE3o foi poss\xEDvel conectar aos modelos de \xE1udio da cascata."
        });
      }
    } catch (err) {
      console.error("[AudioTranscription] Fatal error:", err);
      res.status(500).json({ success: false, error: err?.message || "Erro interno ao transcrever o \xE1udio." });
    }
  }
);
async function generateLongitudinalEvolutionWithCascade(params) {
  const {
    patient,
    consultations,
    appointments: customAppointments,
    userApiKey,
    openaiApiKey: customOpenAiKey,
    forceFullReanalysis
  } = params;
  const appointmentsList = customAppointments && customAppointments.length > 0 ? customAppointments : readStoreData("appointments", []);
  const sortedConsultations = [...consultations].sort(
    (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
  );
  let existingEvolution = params.previousEvolution;
  if (!existingEvolution && patient?.id) {
    const evolutionsList = readStoreData("clinical_evolutions", []);
    existingEvolution = evolutionsList.find((e) => e && (e.patientId === patient.id || e.id === patient.id));
  }
  const isIncremental = Boolean(existingEvolution && !forceFullReanalysis);
  let pendingConsultations = [];
  if (isIncremental) {
    const analyzedIds = new Set(
      Array.isArray(existingEvolution.analyzedConsultationIds) ? existingEvolution.analyzedConsultationIds : []
    );
    const lastAnalyzedTs = existingEvolution.lastAnalyzedTimestamp || existingEvolution.generatedAt || 0;
    pendingConsultations = sortedConsultations.filter((c) => {
      if (!c) return false;
      if (c.id && analyzedIds.size > 0) {
        return !analyzedIds.has(c.id);
      }
      return (c.timestamp || 0) > lastAnalyzedTs;
    });
  } else {
    pendingConsultations = sortedConsultations;
  }
  if (isIncremental && pendingConsultations.length === 0) {
    console.log(`[Longitudinal AI] Paciente ${patient.fullName}: Nenhum atendimento pendente de an\xE1lise. Prontu\xE1rio 100% atualizado. Chamada de IA evitada (economia de 100% de tokens).`);
    return {
      parsedEvolution: {
        ...existingEvolution,
        alreadyUpToDate: true,
        pendingConsultationsAnalyzed: 0,
        isIncrementalUpdate: true,
        message: "Prontu\xE1rio j\xE1 atualizado. Nenhum atendimento pendente de an\xE1lise."
      },
      modelUsed: existingEvolution.modelUsed || "cache",
      skippedAi: true
    };
  }
  console.log(
    `[Longitudinal AI] Paciente ${patient.fullName}: ${isIncremental ? `Atualiza\xE7\xE3o INCREMENTAL focando em ${pendingConsultations.length} atendimento(s) pendente(s)` : `An\xE1lise inicial completa (${pendingConsultations.length} atendimentos)`}. Economia de IA aplicada!`
  );
  const patientAppointments = appointmentsList.filter((a) => {
    if (!a) return false;
    return a.patientId && a.patientId === patient.id || typeof a.patientName === "string" && typeof patient.fullName === "string" && a.patientName.toLowerCase().trim() === patient.fullName.toLowerCase().trim() || a.patientCns && patient.cns && a.patientCns.trim() === patient.cns.trim();
  });
  const faltasOuCancelamentos = patientAppointments.filter(
    (a) => a.status === "cancelado" || a.status === "falta" || a.status === "nao_compareceu"
  );
  const desistenciasOuAbandonos = patientAppointments.filter(
    (a) => a.status === "desistiu" || a.status === "abandonou" || a.status === "evadido"
  );
  const allPrescricoes = [];
  const allExames = [];
  const allEncaminhamentos = [];
  const allLaudos = [];
  const allAtestados = [];
  sortedConsultations.forEach((c) => {
    const dateStr = c.timestamp ? new Date(c.timestamp).toLocaleDateString("pt-BR") : "--";
    const profStr = c.authorProfession ? `[${c.authorProfession}]` : "";
    if (c.prescription?.items && Array.isArray(c.prescription.items)) {
      c.prescription.items.forEach((it) => {
        if (it?.medicationName) {
          const itemDesc = `${it.medicationName} (${it.posology || "Posologia padr\xE3o"}${it.duration ? ` - ${it.duration}` : ""}) [${dateStr}]`;
          if (!allPrescricoes.includes(itemDesc)) allPrescricoes.push(itemDesc);
        }
      });
    }
    if (c.examRequest?.items && Array.isArray(c.examRequest.items)) {
      c.examRequest.items.forEach((it) => {
        if (it?.name) {
          const itemDesc = `${it.name}${it.clinicalIndication ? ` (Indica\xE7\xE3o: ${it.clinicalIndication})` : ""} [${dateStr}]`;
          if (!allExames.includes(itemDesc)) allExames.push(itemDesc);
        }
      });
    }
    const referralDest = c.referral?.destination || c.referral?.specialtyDestination;
    const referralReason = c.referral?.clinicalIndication || c.referral?.reasonClinicalSummary;
    if (referralDest) {
      const itemDesc = `Encaminhamento para ${referralDest}${referralReason ? ` - Motivo: ${referralReason.slice(0, 80)}...` : ""} [${dateStr}]`;
      if (!allEncaminhamentos.includes(itemDesc)) allEncaminhamentos.push(itemDesc);
    }
    if (c.medicalReport?.purpose || c.medicalReport?.cid10) {
      const itemDesc = `Laudo M\xE9dico emitido (${c.medicalReport.cid10 || "CID n\xE3o informado"}) - Finalidade: ${c.medicalReport.purpose || "Acompanhamento"} [${dateStr}]`;
      if (!allLaudos.includes(itemDesc)) allLaudos.push(itemDesc);
    }
    const combinedText = `${c.plano || ""} ${c.conduta || ""}`;
    if (combinedText.toLowerCase().includes("atestado")) {
      const atestadoDesc = `Atestado m\xE9dico/comparecimento registrado em atendimento por ${c.authorName || "Profissional"} ${profStr} [${dateStr}]`;
      if (!allAtestados.includes(atestadoDesc)) allAtestados.push(atestadoDesc);
    }
  });
  let systemInstruction = "";
  let userPrompt = "";
  if (isIncremental) {
    const formattedPending = pendingConsultations.map((c) => {
      const dateStr = c.timestamp ? new Date(c.timestamp).toLocaleDateString("pt-BR") : "--";
      const author = c.authorName ? `${c.authorName} (${c.authorProfession || "Equipe"})` : "Profissional";
      return `[ATENDIMENTO PENDENTE DE AN\xC1LISE - ${dateStr} - ${author}]:
- Avalia\xE7\xE3o: ${c.avaliacao || "--"}
- Plano: ${c.plano || "--"}
- Conduta: ${c.conduta || "--"}`;
    }).join("\n\n");
    systemInstruction = `Voc\xEA \xE9 um Auditor Cl\xEDnico S\xEAnior e Especialista em Sa\xFAde Coletiva, Aten\xE7\xE3o Prim\xE1ria e RAPS do SUS no Brasil.
Sua miss\xE3o \xE9 ATUALIZAR a An\xE1lise Longitudinal de Evolu\xE7\xE3o Cl\xEDnica do paciente de forma INCREMENTAL e ULTRAEFICIENTE.

DIRETRIZ DE FOCO CL\xCDNICO E ECONOMIA DE RECURSOS (IA):
- Foque EXCLUSIVAMENTE no(s) ATENDIMENTO(S) PENDENTE(S) DE AN\xC1LISE e integre as novas queixas, condutas e desfechos ao HIST\xD3RICO CONSOLIDADO PR\xC9VIO.
- Mantenha a integridade hist\xF3rica pr\xE9via sem descartar antecedentes relevantes, por\xE9m atualize a situa\xE7\xE3o ATUAL do paciente:
  * O atendimento pendente indicou melhora cl\xEDnica? (Trajet\xF3ria Positiva/Melhora)
  * Houve nova crise, agravo ou descompensa\xE7\xE3o? (Trajet\xF3ria Negativa/Alerta)
  * Quadro mantido sem oscila\xE7\xF5es relevantes? (Trajet\xF3ria Est\xE1vel)
- Atualize a Farmacoterapia se novas drogas foram prescritas ou alteradas no atendimento pendente.
- Atualize a Matriz Dimensional e as Recomenda\xE7\xF5es Pr\xE1ticas para a equipe da UBS/RAPS.

ESTRUTURA OBRIGAT\xD3RIA DA RESPOSTA:
### RESUMO LONGITUDINAL:
Linha do tempo consolidada e atualizada com o novo atendimento integrado ao hist\xF3rico pr\xE9vio.

### CONDI\xC7\xD5ES DE SA\xDADE PSICOL\xD3GICAS E N\xC3O PSICOL\xD3GICAS:
- CONDI\xC7\xD5ES PSICOL\xD3GICAS: Diagn\xF3sticos, crises, idea\xE7\xF5es, estado de humor e ades\xE3o psicossocial atualizada.
- CONDI\xC7\xD5ES N\xC3O PSICOL\xD3GICAS: Condi\xE7\xF5es cl\xEDnicas gerais, doen\xE7as cr\xF4nicas e par\xE2metros som\xE1ticos.

### FARMACOTERAPIA E MUDAN\xC7AS NO TRATAMENTO:
- MEDICAMENTOS EM USO CONT\xCDNUO: Lista consolidada atualizada de f\xE1rmacos de uso cont\xEDnuo.
- MUDAN\xC7AS NO TRATAMENTO: Ajustes posol\xF3gicos ou novas drogas introduzidas no atendimento recente.
- ADES\xC3O RELATADA: Regularidade no uso e relatos de toler\xE2ncia.

### TRAJET\xD3RIA CL\xCDNICA (MELHORA / PIORA / ESTABILIDADE):
- STATUS GERAL: [Positiva / Negativa / Est\xE1vel / Mista]
- JUSTIFICATIVA: Detalhamento do impacto do(s) novo(s) atendimento(s) na evolu\xE7\xE3o do paciente.

### MATRIZ DE EVOLU\xC7\xC3O MULTIDIMENSIONAL:
- Aspectos Psicoemocionais e Comportamentais: [Positiva/Negativa/Est\xE1vel/Mista] - Justificativa detalhada.
- Aspectos F\xEDsicos e Sinais Vitais: [Positiva/Negativa/Est\xE1vel/Mista] - Justificativa detalhada.
- Din\xE2mica Familiar e Social: [Positiva/Negativa/Est\xE1vel/Mista] - Justificativa detalhada.

### CONDUTAS DOS PROFISSIONAIS:
Resumo consolidado das condutas adotadas pela equipe.

### AUDITORIA DE ASSIDUIDADE (FILA DE ATENDIMENTO):
An\xE1lise sobre comparecimento e assiduidade.

### PONTOS DE ALERTA E RECOMENDA\xC7\xD5ES PARA A EQUIPE:
Recomenda\xE7\xF5es pr\xE1ticas, alertas e interven\xE7\xF5es sugeridas para o PTS.`;
    userPrompt = `DADOS CADASTRAIS DO PACIENTE:
Nome Completo: ${patient.fullName} | CNS: ${patient.cns || "--"} | Nascimento: ${patient.birthDate || "--"}

AN\xC1LISE LONGITUDINAL CONSOLIDADA ANTERIOR (HIST\xD3RICO J\xC1 AVALIADO):
- Resumo Longitudinal Pr\xE9vio: ${existingEvolution.resumoLongitudinal || "--"}
- Trajet\xF3ria Pr\xE9via: Status [${existingEvolution.trajetoriaClinica?.statusGeral || "Est\xE1vel"}] - ${existingEvolution.trajetoriaClinica?.descricao || "--"}
- Condi\xE7\xF5es de Sa\xFAde Pr\xE9vias:
  * Psicol\xF3gicas: ${existingEvolution.condicoesSaude?.psicologicas || "--"}
  * N\xE3o Psicol\xF3gicas: ${existingEvolution.condicoesSaude?.naoPsicologicas || "--"}
- Farmacoterapia Pr\xE9via: ${(existingEvolution.farmacoterapia?.emUsoContinuo || []).join("; ") || "Sem medica\xE7\xE3o pr\xE9via"} (Ades\xE3o: ${existingEvolution.farmacoterapia?.adesaoRelatada || "--"})

ATENDIMENTO(S) PENDENTE(S) DE AN\xC1LISE (${pendingConsultations.length} recente(s) a integrar):
${formattedPending}

DADOS DA FILA E ASSIDUIDADE:
- Agendamentos: ${patientAppointments.length} | Faltas/Cancelamentos: ${faltasOuCancelamentos.length} | Abandonos: ${desistenciasOuAbandonos.length}

CONDUTAS NO PRONTU\xC1RIO:
- Prescri\xE7\xF5es: ${allPrescricoes.length > 0 ? allPrescricoes.join("; ") : "Sem prescri\xE7\xF5es"}
- Exames: ${allExames.length > 0 ? allExames.join("; ") : "Sem exames"}
- Encaminhamentos: ${allEncaminhamentos.length > 0 ? allEncaminhamentos.join("; ") : "Sem encaminhamentos"}
- Laudos: ${allLaudos.length > 0 ? allLaudos.join("; ") : "Sem laudos"}

Por favor, elabore a an\xE1lise longitudinal atualizada integrando cirurgicamente o(s) atendimento(s) pendente(s) acima.`;
  } else {
    const recentConsultations = sortedConsultations.slice(-12);
    const formattedHistory = recentConsultations.map((c) => {
      const dateStr = c.timestamp ? new Date(c.timestamp).toLocaleDateString("pt-BR") : "--";
      const author = c.authorName ? `${c.authorName} (${c.authorProfession || "Equipe"})` : "Profissional";
      return `[${dateStr} - ${author}]:
- Avalia\xE7\xE3o: ${c.avaliacao || "--"}
- Plano: ${c.plano || "--"}
- Conduta: ${c.conduta || "--"}`;
    }).join("\n\n");
    systemInstruction = `Voc\xEA \xE9 um Auditor Cl\xEDnico S\xEAnior e Especialista em Sa\xFAde Coletiva, Aten\xE7\xE3o Prim\xE1ria e RAPS do SUS no Brasil.
Sua miss\xE3o \xE9 gerar uma An\xE1lise Longitudinal de Evolu\xE7\xE3o Cl\xEDnica aprofundada, t\xE9cnica e estruturada sobre o hist\xF3rico multiprofissional do paciente.

ESTRUTURA OBRIGAT\xD3RIA DA RESPOSTA:
A sua an\xE1lise DEVE ser extremamente rica, detalhada e orientadora, estruturada RIGOROSAMENTE nas seguintes se\xE7\xF5es:

### RESUMO LONGITUDINAL:
Linha do tempo consolidada e detalhada de todas as queixas cl\xEDnicas, interven\xE7\xF5es multiprofissionais e trajet\xF3ria do paciente ao longo dos atendimentos. O resultado dessa an\xE1lise nortear\xE1 os atendimentos futuros da equipe multiprofissional.

### CONDI\xC7\xD5ES DE SA\xDADE PSICOL\xD3GICAS E N\xC3O PSICOL\xD3GICAS:
- CONDI\xC7\xD5ES PSICOL\xD3GICAS: Diagn\xF3sticos psiqui\xE1tricos/emocionais, crises, idea\xE7\xF5es, estado de humor, sintomas ansiosos/depressivos, fun\xE7\xF5es cognitivas e ades\xE3o psicossocial.
- CONDI\xC7\xD5ES N\xC3O PSICOL\xD3GICAS: Condi\xE7\xF5es cl\xEDnicas gerais, doen\xE7as cr\xF4nicas (HAS, DM, etc.), par\xE2metros f\xEDsicos, les\xF5es e sa\xFAde f\xEDsica.

### FARMACOTERAPIA E MUDAN\xC7AS NO TRATAMENTO:
- MEDICAMENTOS EM USO CONT\xCDNUO: Liste f\xE1rmacos prescritos de uso cont\xEDnuo (antidepressivos, antipsic\xF3ticos, anti-hipertensivos, estabilizadores, etc.).
- MUDAN\xC7AS NO TRATAMENTO: Ajustes posol\xF3gicos, trocas de medica\xE7\xE3o, desmames ou novas introdu\xE7\xF5es observadas ao longo do tempo.
- ADES\xC3O RELATADA: Regularidade no uso e relatos de toler\xE2ncia/efeitos colaterais.

### TRAJET\xD3RIA CL\xCDNICA (MELHORA / PIORA / ESTABILIDADE):
Classifique a evolu\xE7\xE3o geral e justifique tecnicamente:
- STATUS GERAL: [Positiva / Negativa / Est\xE1vel / Mista]
- JUSTIFICATIVA: Detalhamento se o quadro cl\xEDnico caminhou para melhora, estabilidade ou agravamento/piora.

### MATRIZ DE EVOLU\xC7\xC3O MULTIDIMENSIONAL:
- Aspectos Psicoemocionais e Comportamentais: [Positiva/Negativa/Est\xE1vel/Mista] - Justificativa detalhada.
- Aspectos F\xEDsicos e Sinais Vitais: [Positiva/Negativa/Est\xE1vel/Mista] - Justificativa detalhada.
- Din\xE2mica Familiar e Social: [Positiva/Negativa/Est\xE1vel/Mista] - Justificativa detalhada.

### CONDUTAS DOS PROFISSIONAIS:
Resumo consolidado das condutas j\xE1 adotadas:
- Prescri\xE7\xF5es e medica\xE7\xF5es institu\xEDdas;
- Solicita\xE7\xF5es de exames laboratoriais ou complementares;
- Encaminhamentos para especialidades/regula\xE7\xE3o;
- Emiss\xE3o de laudos m\xE9dicos ou pareceres;
- Emiss\xE3o de atestados m\xE9dicos ou de comparecimento.

### AUDITORIA DE ASSIDUIDADE (FILA DE ATENDIMENTO):
An\xE1lise sobre o comparecimento do paciente, pontualidade, registros de faltas, cancelamentos ou desist\xEAncias na fila de espera da unidade.

### PONTOS DE ALERTA E RECOMENDA\xC7\xD5ES PARA A EQUIPE:
Recomenda\xE7\xF5es cl\xEDnicas pr\xE1ticas, alertas de risco, busca ativa necess\xE1ria e proposi\xE7\xF5es para reuni\xE3o de equipe e Projeto Terap\xEAutico Singular (PTS).`;
    userPrompt = `DADOS CADASTRAIS DO PACIENTE:
Nome Completo: ${patient.fullName}
CNS: ${patient.cns || "--"}
Data de Nascimento: ${patient.birthDate || "--"}
Respons\xE1vel Legal: ${patient.legalGuardianName ? `${patient.legalGuardianName} (${patient.guardianKinship || "Respons\xE1vel"})` : "Pr\xF3prio paciente"}

HIST\xD3RICO CRONOL\xD3GICO DE ATENDIMENTOS (${sortedConsultations.length} registrados, detalhando os mais recentes):
${formattedHistory}

DADOS DA FILA DE ATENDIMENTO E ASSIDUIDADE:
- Total de Agendamentos/Fila Registrados: ${patientAppointments.length}
- Faltas ou Cancelamentos: ${faltasOuCancelamentos.length} (${faltasOuCancelamentos.map((f) => `${f.date || "--"}: ${f.specialty || "Consulta"}`).join(", ") || "Nenhuma falta registrada"})
- Abandonos ou Desist\xEAncias: ${desistenciasOuAbandonos.length} (${desistenciasOuAbandonos.map((d) => `${d.date || "--"}: ${d.specialty || "Fila"}`).join(", ") || "Nenhum abandono registrado"})

CONDUTAS J\xC1 REALIZADAS NOS ATENDIMENTOS:
- Prescri\xE7\xF5es: ${allPrescricoes.length > 0 ? allPrescricoes.join("; ") : "Sem prescri\xE7\xF5es no prontu\xE1rio"}
- Exames Solicitados: ${allExames.length > 0 ? allExames.join("; ") : "Sem exames solicitados"}
- Encaminhamentos: ${allEncaminhamentos.length > 0 ? allEncaminhamentos.join("; ") : "Sem encaminhamentos"}
- Laudos M\xE9dicos: ${allLaudos.length > 0 ? allLaudos.join("; ") : "Sem laudos"}
- Atestados: ${allAtestados.length > 0 ? allAtestados.join("; ") : "Sem registros de atestado"}

Por favor, elabore a an\xE1lise cl\xEDnica longitudinal completa, profunda e rigorosamente estruturada conforme as se\xE7\xF5es solicitadas.`;
  }
  const systemSettings = readStoreData("settings", {});
  const timelineSectionConfig = systemSettings.sectionsConfig?.timelineLongitudinal;
  const primaryModel = timelineSectionConfig?.primaryModelId || "openai:gpt-4o";
  const fallbackChain = Array.isArray(timelineSectionConfig?.fallbackChain) ? timelineSectionConfig.fallbackChain : ["gemini-3.7-flash", "openrouter:meta-llama/llama-3.3-70b-instruct", "openrouter:inclusionai/ling-3.0-flash-sante:free", "gemini-3.6-flash"];
  console.log(`[Longitudinal AI Cascade] Executando an\xE1lise longitudinal com modelo prim\xE1rio: "${primaryModel}" e cascata: ${fallbackChain.join(" -> ")}`);
  const { text: markdownOutput, modelUsed } = await executeMultiProviderWithFallback({
    primaryModelId: primaryModel,
    fallbackChain,
    systemInstruction,
    userPrompt,
    temperature: timelineSectionConfig?.temperature ?? 0.25,
    geminiApiKey: userApiKey,
    openaiApiKey: customOpenAiKey
  });
  const parsedEvolution = parseLongitudinalEvolution(
    markdownOutput,
    patient,
    sortedConsultations,
    patientAppointments,
    modelUsed,
    pendingConsultations.length,
    isIncremental
  );
  return { parsedEvolution, modelUsed, skippedAi: false };
}
app.get("/api/gemini/evolution/:patientId", async (req, res) => {
  try {
    const { patientId } = req.params;
    if (!patientId) {
      return res.status(400).json({ error: "ID do paciente n\xE3o informado." });
    }
    const evolutions = readStoreData("clinical_evolutions", []);
    const found = evolutions.find((e) => e && (e.patientId === patientId || e.id === patientId));
    if (found) {
      return res.json({ success: true, data: found });
    }
    try {
      const docSnap = await (0, import_firestore.getDoc)((0, import_firestore.doc)(serverDb, "clinical_evolutions", patientId));
      if (docSnap.exists()) {
        const firestoreData = { ...docSnap.data(), id: docSnap.id };
        return res.json({ success: true, data: firestoreData });
      }
    } catch (firestoreErr) {
      console.warn("[ServerFirestore] Erro ao buscar evolu\xE7\xE3o no Firestore:", firestoreErr);
    }
    return res.status(404).json({ success: false, message: "Evolu\xE7\xE3o cl\xEDnica ainda n\xE3o gerada para este paciente." });
  } catch (err) {
    res.status(500).json({ error: err?.message || String(err) });
  }
});
app.post("/api/gemini/evolution", async (req, res) => {
  try {
    const { patient, consultations = [], userApiKey, openaiApiKey, forceRegenerate, forceFullReanalysis } = req.body;
    if (!patient || !consultations || consultations.length === 0) {
      return res.status(400).json({
        error: "Paciente ou lista de atendimentos n\xE3o fornecidos para an\xE1lise longitudinal."
      });
    }
    const evolutions = readStoreData("clinical_evolutions", []);
    const existing = evolutions.find((e) => e && (e.patientId === patient.id || e.id === patient.id));
    if (!forceRegenerate && existing) {
      const analyzedIds = new Set(Array.isArray(existing.analyzedConsultationIds) ? existing.analyzedConsultationIds : []);
      const lastTs = existing.lastAnalyzedTimestamp || existing.generatedAt || 0;
      const pending = consultations.filter((c) => {
        if (!c) return false;
        if (c.id && analyzedIds.size > 0) return !analyzedIds.has(c.id);
        return (c.timestamp || 0) > lastTs;
      });
      if (pending.length === 0) {
        return res.json({
          success: true,
          data: existing,
          cached: true,
          alreadyUpToDate: true,
          pendingConsultationsCount: 0
        });
      }
    }
    const { parsedEvolution, modelUsed, skippedAi } = await generateLongitudinalEvolutionWithCascade({
      patient,
      consultations,
      userApiKey,
      openaiApiKey,
      previousEvolution: existing,
      forceFullReanalysis: Boolean(forceFullReanalysis)
    });
    if (!skippedAi) {
      const evolutionsList = readStoreData("clinical_evolutions", []);
      const existingIdx = evolutionsList.findIndex((e) => e && (e.patientId === patient.id || e.id === patient.id));
      if (existingIdx >= 0) {
        evolutionsList[existingIdx] = parsedEvolution;
      } else {
        evolutionsList.unshift(parsedEvolution);
      }
      writeStoreData("clinical_evolutions", evolutionsList);
      (0, import_firestore.setDoc)((0, import_firestore.doc)(serverDb, "clinical_evolutions", patient.id), parsedEvolution, { merge: true }).catch((err) => {
        console.warn("[ServerFirestore] Erro ao sincronizar clinical_evolution no Firestore:", err?.message || err);
      });
    }
    res.json({
      success: true,
      data: parsedEvolution,
      modelUsed,
      skippedAi: Boolean(skippedAi),
      isIncrementalUpdate: Boolean(parsedEvolution?.isIncrementalUpdate),
      pendingConsultationsAnalyzed: parsedEvolution?.pendingConsultationsAnalyzed || 0
    });
  } catch (error) {
    console.error("Erro na gera\xE7\xE3o de evolu\xE7\xE3o longitudinal:", error);
    res.status(500).json({
      error: formatFriendlyAIError(error),
      rawError: error?.message || String(error)
    });
  }
});
app.post("/api/gemini/medical-report", async (req, res) => {
  try {
    const {
      patient,
      consultation,
      doctor,
      purpose,
      clinicalObservations,
      userApiKey
    } = req.body;
    if (!patient || !patient.fullName) {
      return res.status(400).json({
        error: "Dados do paciente n\xE3o fornecidos para gera\xE7\xE3o do laudo m\xE9dico."
      });
    }
    const ai = getGeminiClient(userApiKey);
    const systemInstruction = `Voc\xEA \xE9 um M\xE9dico Perito e Auditor Cl\xEDnico do SUS no Brasil, com profunda expertise em reda\xE7\xE3o de Laudos M\xE9dicos Oficiais conforme as resolu\xE7\xF5es do Conselho Federal de Medicina (CFM n\xBA 1.658/2002 e 1.851/2008).
Sua miss\xE3o \xE9 redigir a descri\xE7\xE3o de um Laudo M\xE9dico formal, t\xE9cnico, objetivo e legalmente fundamentado, com base nos dados cl\xEDnicos do atendimento.

DIRETRIZES DA DESCRI\xC7\xC3O DO LAUDO:
1. Comece com a declara\xE7\xE3o formal de acompanhamento: "Atesto, para os devidos fins a pedido do(a) interessado(a), que o(a) paciente ${patient.fullName}... encontra-se sob acompanhamento m\xE9dico neste servi\xE7o..."
2. Descreva o hist\xF3rico cl\xEDnico relevante, queixas relatadas, sintomatologia atual e achados do exame f\xEDsico/ps\xEDquico.
3. Descreva a terap\xEAutica em curso (psicof\xE1rmacos, interven\xE7\xF5es cl\xEDnicas/psicossociais) e o padr\xE3o de resposta/ades\xE3o ao tratamento.
4. Descreva a capacidade funcional, progn\xF3stico, limita\xE7\xF5es psicomotoras/cognitivas/laborais ou justificativa pertinente \xE0 finalidade solicitada (${purpose || "Acompanhamento e avalia\xE7\xE3o cl\xEDnica"}).
5. Conclua com parecer m\xE9dico fundamentado e recomenda\xE7\xF5es de seguimento.
6. A reda\xE7\xE3o deve ser estritamente profissional, culta e impessoal (n\xE3o use g\xEDrias ou termos informais).
7. N\xC3O coloque cabe\xE7alho ou assinatura na descri\xE7\xE3o (estes j\xE1 s\xE3o inseridos automaticamente no documento oficial).
8. Identifique e retorne a CID-10 mais adequada no campo pr\xF3prio da resposta.

FORMATO DE RESPOSTA OBRIGAT\xD3RIO (JSON estrito):
{
  "description": "Texto completo da descri\xE7\xE3o do laudo m\xE9dico...",
  "cid10": "C\xF3digo e descri\xE7\xE3o por extenso da CID-10 principal (ex: F33.2 - Transtorno depressivo recorrente, epis\xF3dio atual grave sem sintomas psic\xF3ticos)",
  "purpose": "Finalidade do laudo"
}`;
    const userPrompt = `DADOS DO PACIENTE:
Nome Completo: ${patient.fullName}
Idade: ${patient.ageFormatted || "--"}
CPF/CNS: ${patient.document || "--"}

DADOS DO ATENDIMENTO CL\xCDNICO:
Avalia\xE7\xE3o / Exame Cl\xEDnico: ${consultation?.avaliacao || "Paciente em acompanhamento cl\xEDnico regular."}
Plano / Condutas / Medica\xE7\xF5es: ${consultation?.plano || "Seguimento ambulatorial e ajuste farmacol\xF3gico."}
Conduta Complementar: ${consultation?.conduta || "--"}
Anota\xE7\xF5es / Relato Original: ${consultation?.rawNotes || "--"}

DADOS DO M\xC9DICO ASSISTENTE:
Nome: ${doctor?.name || "M\xE9dico Assistente"}
Especialidade: ${doctor?.specialty || "Cl\xEDnica M\xE9dica / Medicina de Fam\xEDlia e Comunidade"}
Conselho / CRM: ${doctor?.councilRegister || ""}
Unidade: ${doctor?.workplace || "CENTRO DE ATEN\xC7\xC3O PSICOSSOCIAL - CAPS I"}

FINALIDADE / SOLICITA\xC7\xC3O DO LAUDO:
${purpose || "Acompanhamento cl\xEDnico especializado e comprova\xE7\xE3o diagn\xF3stica"}

OBSERVA\xC7\xD5ES ADICIONAIS DO M\xC9DICO:
${clinicalObservations || "Nenhuma observa\xE7\xE3o adicional informada."}

Por favor, elabore o laudo m\xE9dico profissional em JSON conforme a instru\xE7\xE3o.`;
    const systemSettings = readStoreData("settings", {});
    const reportSectionConfig = req.body.sectionConfig || systemSettings.sectionsConfig?.officialReports;
    const primaryCandidate = reportSectionConfig?.primaryModelId || "gemini-3.7-flash";
    const fallbackCandidates = Array.isArray(reportSectionConfig?.fallbackChain) ? reportSectionConfig.fallbackChain : ["openrouter:inclusionai/ling-3.0-flash-sante:free", "openai:gpt-4o-mini", "gemini-3.6-flash"];
    console.log(`[Medical Report Cascade] Gerando laudo com Prim\xE1rio: "${primaryCandidate}", Cascata: ${fallbackCandidates.join(" -> ")}`);
    const { text: responseText, modelUsed } = await executeMultiProviderWithFallback({
      primaryModelId: primaryCandidate,
      fallbackChain: fallbackCandidates,
      systemInstruction,
      userPrompt,
      temperature: reportSectionConfig?.temperature ?? 0.2,
      responseMimeType: "application/json",
      geminiApiKey: userApiKey
    });
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        parsed = {
          description: responseText,
          cid10: "F32.2",
          purpose: purpose || "Acompanhamento Cl\xEDnico"
        };
      }
    }
    res.json({
      success: true,
      modelUsed,
      data: {
        description: parsed.description || responseText,
        cid10: parsed.cid10 || "F32.2 - Transtorno depressivo",
        purpose: parsed.purpose || purpose || "Acompanhamento Cl\xEDnico"
      }
    });
  } catch (error) {
    console.error("Erro na gera\xE7\xE3o de laudo m\xE9dico com IA:", error);
    res.status(500).json({
      error: formatFriendlyAIError(error),
      rawError: error?.message || String(error)
    });
  }
});
app.post("/api/gemini/certificate-recommendations", async (req, res) => {
  try {
    const {
      patient,
      consultation,
      doctor,
      daysOff,
      cid10,
      userApiKey
    } = req.body;
    if (!patient || !patient.fullName) {
      return res.status(400).json({
        error: "Dados do paciente n\xE3o fornecidos para gera\xE7\xE3o de recomenda\xE7\xF5es."
      });
    }
    const ai = getGeminiClient(userApiKey);
    const systemInstruction = `Voc\xEA \xE9 um M\xE9dico Especialista e Auditor Cl\xEDnico do SUS no Brasil, atuando na Aten\xE7\xE3o Prim\xE1ria (APS) e Rede de Aten\xE7\xE3o Psicossocial (RAPS).
Sua tarefa \xE9 redigir recomenda\xE7\xF5es cl\xEDnicas e orienta\xE7\xF5es terap\xEAuticas personalizadas, claras e concisas para o campo "Recomenda\xE7\xF5es Cl\xEDnicas / Observa\xE7\xF5es" de um Atestado M\xE9dico Oficial de Afastamento.

DIRETRIZES DE REDA\xC7\xC3O:
1. Seja claro, conciso e direto (entre 1 a 3 frases completas).
2. Baseie-se no quadro cl\xEDnico real apresentado no \xFAltimo atendimento (sintomas, diagn\xF3stico/CID-10, plano terap\xEAutico, medica\xE7\xF5es).
3. Inclua recomenda\xE7\xF5es apropriadas como repouso domiciliar, manuten\xE7\xE3o do tratamento farmacol\xF3gico/psicossocial, orienta\xE7\xF5es de autocuidado (hidrata\xE7\xE3o, evitar esfor\xE7o f\xEDsico/estressores) e recomenda\xE7\xE3o de retorno ao servi\xE7o em caso de piora ou para reavalia\xE7\xE3o cl\xEDnica.
4. Linguagem m\xE9dica formal, \xE9tica e acolhedora conforme as resolu\xE7\xF5es do CFM.
5. N\xC3O inclua cabe\xE7alho, sauda\xE7\xE3o ou assinatura.

FORMATO DE RESPOSTA OBRIGAT\xD3RIO (JSON estrito):
{
  "recommendations": "Texto das orienta\xE7\xF5es e recomenda\xE7\xF5es cl\xEDnicas..."
}`;
    const userPrompt = `DADOS DO PACIENTE:
Nome: ${patient.fullName}
Idade: ${patient.ageFormatted || patient.birthDate || "--"}

DADOS DO \xDALTIMO ATENDIMENTO:
Avalia\xE7\xE3o / Exame do Estado Mental: ${consultation?.avaliacao || consultation?.motivo || "Quadro cl\xEDnico avaliado em consulta."}
Plano / Condutas / Prescri\xE7\xE3o: ${consultation?.plano || consultation?.conduta || "Seguimento e repouso."}
Diagn\xF3stico / Hip\xF3tese / CID-10: ${cid10 || consultation?.cid10 || consultation?.diagnosticHypothesis || "N\xE3o especificado"}
Anota\xE7\xF5es / Relato Original: ${consultation?.rawNotes || "--"}
Dias de afastamento determinados: ${daysOff || 1} dia(s)

DADOS DO M\xC9DICO:
Nome: ${doctor?.name || "M\xE9dico Assistente"}
Unidade: ${doctor?.workplace || "CENTRO DE ATEN\xC7\xC3O PSICOSSOCIAL (CAPS I)"}

Por favor, gere as recomenda\xE7\xF5es cl\xEDnicas para o atestado m\xE9dico em JSON.`;
    const systemSettings = readStoreData("settings", {});
    const certSectionConfig = req.body.sectionConfig || systemSettings.sectionsConfig?.medicalCertificates;
    const primaryCandidate = certSectionConfig?.primaryModelId || "gemini-3.7-flash";
    const fallbackCandidates = Array.isArray(certSectionConfig?.fallbackChain) ? certSectionConfig.fallbackChain : ["openrouter:inclusionai/ling-3.0-flash-sante:free", "gemini-3.1-flash-lite"];
    console.log(`[Certificate Recommendations Cascade] Gerando recomenda\xE7\xF5es com Prim\xE1rio: "${primaryCandidate}", Cascata: ${fallbackCandidates.join(" -> ")}`);
    const { text: responseText, modelUsed } = await executeMultiProviderWithFallback({
      primaryModelId: primaryCandidate,
      fallbackChain: fallbackCandidates,
      systemInstruction,
      userPrompt,
      temperature: certSectionConfig?.temperature ?? 0.3,
      responseMimeType: "application/json",
      geminiApiKey: userApiKey
    });
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        parsed = {
          recommendations: responseText.trim()
        };
      }
    }
    res.json({
      success: true,
      modelUsed,
      data: {
        recommendations: parsed.recommendations || responseText.trim()
      }
    });
  } catch (error) {
    console.error("Erro na gera\xE7\xE3o de recomenda\xE7\xF5es do atestado com IA:", error);
    res.status(500).json({
      error: formatFriendlyAIError(error),
      rawError: error?.message || String(error)
    });
  }
});
function parseLongitudinalEvolution(markdown, patient, consultations, patientAppointments = [], modelUsed = "gemini-3.7-flash", pendingConsultationsAnalyzed = 0, isIncrementalUpdate = false) {
  const startDate = consultations[0]?.timestamp ? new Date(consultations[0].timestamp).toLocaleDateString("pt-BR") : "--";
  const endDate = consultations[consultations.length - 1]?.timestamp ? new Date(consultations[consultations.length - 1].timestamp).toLocaleDateString("pt-BR") : "--";
  const findStatus = (text) => {
    const lower = (text || "").toLowerCase();
    if (lower.includes("melhora") || lower.includes("positiv") || lower.includes("favor\xE1vel") || lower.includes("evolu\xE7\xE3o positiva")) {
      return "positiva";
    }
    if (lower.includes("piora") || lower.includes("negativ") || lower.includes("agravamento") || lower.includes("regress\xE3o")) {
      return "negativa";
    }
    if (lower.includes("mista") || lower.includes("oscila") || lower.includes("flutuante")) {
      return "mista";
    }
    return "estavel";
  };
  const getStatusLabel = (status) => {
    switch (status) {
      case "positiva":
        return "Evolu\xE7\xE3o Positiva (Melhora)";
      case "negativa":
        return "Alerta de Piora / Agravamento";
      case "mista":
        return "Evolu\xE7\xE3o Mista / Flutuante";
      default:
        return "Quadro Est\xE1vel / Em Manejo";
    }
  };
  const resumoMatch = markdown.match(
    /(?:RESUMO LONGITUDINAL:?|###?\s*RESUMO LONGITUDINAL)([\s\S]*?)(?=(?:CONDI[ÇC][ÕO]ES DE SA[ÚU]DE|###?\s*CONDI[ÇC][ÕO]ES|FARMACOTERAPIA|TRAJET[ÓO]RIA|MATRIZ|PONTOS DE ALERTA|$))/i
  );
  const condicoesMatch = markdown.match(
    /(?:CONDI[ÇC][ÕO]ES DE SA[ÚU]DE[^\n]*|###?\s*CONDI[ÇC][ÕO]ES DE SA[ÚU]DE[^\n]*)([\s\S]*?)(?=(?:FARMACOTERAPIA|###?\s*FARMACOTERAPIA|TRAJET[ÓO]RIA|MATRIZ|$))/i
  );
  const farmacoterapiaMatch = markdown.match(
    /(?:FARMACOTERAPIA[^\n]*|###?\s*FARMACOTERAPIA[^\n]*)([\s\S]*?)(?=(?:TRAJET[ÓO]RIA|###?\s*TRAJET[ÓO]RIA|MATRIZ|CONDUTAS|$))/i
  );
  const trajetoriaMatch = markdown.match(
    /(?:TRAJET[ÓO]RIA CL[ÍI]NICA[^\n]*|###?\s*TRAJET[ÓO]RIA CL[ÍI]NICA[^\n]*)([\s\S]*?)(?=(?:MATRIZ|###?\s*MATRIZ|CONDUTAS|AUDITORIA|$))/i
  );
  const matrizMatch = markdown.match(
    /(?:MATRIZ DE EVOLU[ÇC][ÃA]O|###?\s*MATRIZ DE EVOLU[ÇC][ÃA]O)([\s\S]*?)(?=(?:CONDUTAS|###?\s*CONDUTAS|AUDITORIA|PONTOS DE ALERTA|$))/i
  );
  const alertasMatch = markdown.match(
    /(?:PONTOS DE ALERTA E RECOMENDA[ÇC][ÕO]ES|###?\s*PONTOS DE ALERTA)([\s\S]*$)/i
  );
  const resumoLongitudinal = resumoMatch ? resumoMatch[1].trim() : "An\xE1lise cronol\xF3gica consolidada de atendimentos multiprofissionais e acompanhamento longitudinal da Aten\xE7\xE3o Prim\xE1ria / RAPS.";
  const condicoesText = condicoesMatch ? condicoesMatch[1].trim() : markdown;
  const psicoCondMatch = condicoesText.match(/(?:CONDI[ÇC][ÕO]ES PSICOL[ÓO]GICAS:?|[-*•]\s*Psicol[óo]gicas:?)([\s\S]*?)(?=(?:CONDI[ÇC][ÕO]ES N[ÃA]O PSICOL[ÓO]GICAS|[-*•]\s*N[ãa]o Psicol[óo]gicas|FARMACOTERAPIA|$))/i);
  const naoPsicoCondMatch = condicoesText.match(/(?:CONDI[ÇC][ÕO]ES N[ÃA]O PSICOL[ÓO]GICAS:?|[-*•]\s*N[ãa]o Psicol[óo]gicas:?)([\s\S]*$)/i);
  const condicoesPsicologicas = psicoCondMatch ? psicoCondMatch[1].trim() : "Avalia\xE7\xE3o cont\xEDnua de sintomas emocionais, afetivos e psicossociais.";
  const condicoesNaoPsicologicas = naoPsicoCondMatch ? naoPsicoCondMatch[1].trim() : "Condi\xE7\xF5es cl\xEDnicas gerais e sa\xFAde som\xE1tica acompanhadas pela equipe.";
  const farmacoText = farmacoterapiaMatch ? farmacoterapiaMatch[1].trim() : "";
  const usoContinuoLines = [];
  const mudancasLines = [];
  let adesaoRelatada = "Ades\xE3o regular observada nos registros de atendimento.";
  if (farmacoText) {
    const usoContinuoMatch = farmacoText.match(/(?:MEDICAMENTOS EM USO CONT[ÍI]NUO:?|USO CONT[ÍI]NUO:?)([\s\S]*?)(?=(?:MUDAN[ÇC]AS NO TRATAMENTO|ADES[ÃA]O|$))/i);
    const mudancasMatch = farmacoText.match(/(?:MUDAN[ÇC]AS NO TRATAMENTO:?)([\s\S]*?)(?=(?:ADES[ÃA]O|$))/i);
    const adesaoMatch = farmacoText.match(/(?:ADES[ÃA]O RELATADA:?)([\s\S]*$)/i);
    if (usoContinuoMatch) {
      usoContinuoMatch[1].split(/\n\s*[-*•\d+.]\s*/).map((s) => s.trim()).filter((s) => s.length > 3).forEach((s) => usoContinuoLines.push(s));
    }
    if (mudancasMatch) {
      mudancasMatch[1].split(/\n\s*[-*•\d+.]\s*/).map((s) => s.trim()).filter((s) => s.length > 3).forEach((s) => mudancasLines.push(s));
    }
    if (adesaoMatch) {
      adesaoRelatada = adesaoMatch[1].trim();
    }
  }
  const trajetoriaText = trajetoriaMatch ? trajetoriaMatch[1].trim() : markdown;
  const statusGeral = findStatus(trajetoriaText);
  const matrizText = matrizMatch ? matrizMatch[1].trim() : markdown;
  const psicoMatch = matrizText.match(
    /(?:Aspectos Psicoemocionais[^\n]*:?)([\s\S]*?)(?=(?:Aspectos F[íi]sicos|Din[âa]mica Familiar|$))/i
  );
  const fisicoMatch = matrizText.match(
    /(?:Aspectos F[íi]sicos[^\n]*:?)([\s\S]*?)(?=(?:Din[âa]mica Familiar|PONTOS DE ALERTA|$))/i
  );
  const socialMatch = matrizText.match(
    /(?:Din[âa]mica Familiar e Social[^\n]*:?)([\s\S]*$)/i
  );
  const psicoDesc = psicoMatch ? psicoMatch[1].trim() : "Avalia\xE7\xE3o cont\xEDnua de sintomas emocionais, crises e ades\xE3o ao tratamento terap\xEAutico.";
  const fisicoDesc = fisicoMatch ? fisicoMatch[1].trim() : "Par\xE2metros f\xEDsicos, sinais vitais e queixas som\xE1ticas em manejo cl\xEDnico.";
  const socialDesc = socialMatch ? socialMatch[1].trim() : "Rede de apoio sociofamiliar e suporte territorial monitorados.";
  const psicoStatus = findStatus(psicoDesc);
  const fisicoStatus = findStatus(fisicoDesc);
  const socialStatus = findStatus(socialDesc);
  const alertasText = alertasMatch ? alertasMatch[1].trim() : "";
  const pontosAlertaRecomendacoes = alertasText.split(/\n\s*[-*•\d+.]\s*/).map((item) => item.trim()).filter((item) => item.length > 5);
  const allPrescricoes = [];
  const allExames = [];
  const allEncaminhamentos = [];
  const allLaudos = [];
  const allAtestados = [];
  consultations.forEach((c) => {
    const dateStr = c.timestamp ? new Date(c.timestamp).toLocaleDateString("pt-BR") : "--";
    if (c.prescription?.items && Array.isArray(c.prescription.items)) {
      c.prescription.items.forEach((it) => {
        if (it?.medicationName) {
          const str = `${it.medicationName} (${it.posology || "Padr\xE3o"}${it.duration ? ` - ${it.duration}` : ""}) [${dateStr}]`;
          if (!allPrescricoes.includes(str)) allPrescricoes.push(str);
        }
      });
    }
    if (c.examRequest?.items && Array.isArray(c.examRequest.items)) {
      c.examRequest.items.forEach((it) => {
        if (it?.name) {
          const str = `${it.name} [${dateStr}]`;
          if (!allExames.includes(str)) allExames.push(str);
        }
      });
    }
    const referralDest = c.referral?.destination || c.referral?.specialtyDestination;
    const referralReason = c.referral?.clinicalIndication || c.referral?.reasonClinicalSummary;
    if (referralDest) {
      const str = `${referralDest} (${referralReason ? referralReason.slice(0, 60) : "Regula\xE7\xE3o"}) [${dateStr}]`;
      if (!allEncaminhamentos.includes(str)) allEncaminhamentos.push(str);
    }
    if (c.medicalReport?.purpose || c.medicalReport?.cid10) {
      const str = `Laudo ${c.medicalReport.cid10 || ""} - ${c.medicalReport.purpose || "Acompanhamento"} [${dateStr}]`;
      if (!allLaudos.includes(str)) allLaudos.push(str);
    }
    const combined = `${c.plano || ""} ${c.conduta || ""}`;
    if (combined.toLowerCase().includes("atestado")) {
      const str = `Atestado registrado no atendimento [${dateStr}]`;
      if (!allAtestados.includes(str)) allAtestados.push(str);
    }
  });
  const faltasCancelamentos = patientAppointments.filter(
    (a) => a.status === "cancelado" || a.status === "falta" || a.status === "nao_compareceu"
  );
  const abandonos = patientAppointments.filter(
    (a) => a.status === "desistiu" || a.status === "abandonou" || a.status === "evadido"
  );
  const faltasDetalhes = [];
  faltasCancelamentos.forEach((f) => {
    faltasDetalhes.push(`Falta/Cancelamento em ${f.date || "--"} (${f.specialty || f.serviceName || "Consulta"})`);
  });
  abandonos.forEach((ab) => {
    faltasDetalhes.push(`Desist\xEAncia/Abandono de fila em ${ab.date || "--"} (${ab.specialty || ab.serviceName || "Fila"})`);
  });
  const allConsultationIds = consultations.map((c) => c.id).filter(Boolean);
  const lastAnalyzedTimestamp = consultations.reduce(
    (max, c) => Math.max(max, c.timestamp || 0),
    0
  );
  return {
    patientId: patient.id,
    patientName: patient.fullName,
    generatedAt: Date.now(),
    modelUsed,
    totalConsultationsAnalyzed: consultations.length,
    lastAnalyzedTimestamp,
    analyzedConsultationIds: allConsultationIds,
    pendingConsultationsAnalyzed,
    isIncrementalUpdate,
    alreadyUpToDate: false,
    dateRange: {
      start: startDate,
      end: endDate
    },
    resumoLongitudinal,
    condicoesSaude: {
      psicologicas: condicoesPsicologicas,
      naoPsicologicas: condicoesNaoPsicologicas
    },
    farmacoterapia: {
      emUsoContinuo: usoContinuoLines.length > 0 ? usoContinuoLines : allPrescricoes.slice(0, 5),
      mudancasTratamento: mudancasLines.length > 0 ? mudancasLines : ["Ajustes conforme resposta cl\xEDnica observada nos atendimentos."],
      adesaoRelatada
    },
    trajetoriaClinica: {
      statusGeral,
      descricao: trajetoriaText.length > 30 ? trajetoriaText.slice(0, 400) : getStatusLabel(statusGeral)
    },
    matrizEvolucao: {
      aspectosPsicoemocionais: {
        status: psicoStatus,
        statusLabel: getStatusLabel(psicoStatus),
        descricao: psicoDesc
      },
      aspectosFisicosSinais: {
        status: fisicoStatus,
        statusLabel: getStatusLabel(fisicoStatus),
        descricao: fisicoDesc
      },
      dinamicaFamiliarSocial: {
        status: socialStatus,
        statusLabel: getStatusLabel(socialStatus),
        descricao: socialDesc
      }
    },
    condutasRealizadas: {
      prescricoes: allPrescricoes,
      examesSolicitados: allExames,
      encaminhamentos: allEncaminhamentos,
      laudosMedicos: allLaudos,
      atestados: allAtestados
    },
    faltasEAbandonos: {
      totalFaltasOuCancelamentos: faltasCancelamentos.length,
      totalAbandonos: abandonos.length,
      detalhes: faltasDetalhes.length > 0 ? faltasDetalhes : ["Assiduidade regular. Nenhuma falta ou abandono registrado na fila de atendimento."]
    },
    pontosAlertaRecomendacoes: pontosAlertaRecomendacoes.length > 0 ? pontosAlertaRecomendacoes : [
      "Manter acompanhamento intersetorial e discuss\xF5es peri\xF3dicas em reuni\xE3o de equipe (PTS).",
      "Monitorar ades\xE3o \xE0s orienta\xE7\xF5es, farmacoterapia e comparecimento aos retornos agendados."
    ],
    rawMarkdown: markdown
  };
}
function parsePECBlocks(text, profession) {
  const isEnfermeiro = profession.trim().toUpperCase() === "ENFERMEIRO";
  let avaliacao = "";
  let plano = "";
  let conduta = "";
  let clinicalAudit = "";
  const auditMatch = text.match(/(?:###?\s*⚠️?\s*AUDITORIA CL[ÍI]NICA[\s\S]*$)/i);
  if (auditMatch) {
    clinicalAudit = auditMatch[0].trim();
  }
  const avaliacaoRegex = /(?:###?\s*CAMPO:?\s*AVALIA[ÇC][ÃA]O|CAMPO\s*AVALIA[ÇC][ÃA]O|AVALIA[ÇC][ÃA]O:?)([\s\S]*?)(?=(?:###?\s*CAMPO:?\s*PLANO|CAMPO\s*PLANO|###?\s*CAMPO\s*06|###?\s*⚠️?\s*AUDITORIA|$))/i;
  const planoRegex = /(?:###?\s*CAMPO:?\s*PLANO|CAMPO\s*PLANO|PLANO:?)([\s\S]*?)(?=(?:###?\s*CAMPO\s*06|###?\s*FINALIZA[ÇC][ÃA]O|###?\s*⚠️?\s*AUDITORIA|$))/i;
  const condutaRegex = /(?:###?\s*CAMPO\s*06[:\s-]*FINALIZA[ÇC][ÃA]O(?:[^\n]*)|CAMPO\s*06|FINALIZA[ÇC][ÃA]O\s*DO\s*ATENDIMENTO)([\s\S]*?)(?=(?:###?\s*⚠️?\s*AUDITORIA|$))/i;
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
      try {
        let cleanJsonStr = text.trim();
        if (cleanJsonStr.startsWith("```json")) {
          cleanJsonStr = cleanJsonStr.replace(/^```json\s*/, "").replace(/\s*```$/, "");
        } else if (cleanJsonStr.startsWith("```")) {
          cleanJsonStr = cleanJsonStr.replace(/^```\s*/, "").replace(/\s*```$/, "");
        }
        const parsedObj = JSON.parse(cleanJsonStr);
        if (parsedObj && typeof parsedObj === "object") {
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
    clinicalAudit: clinicalAudit || void 0,
    hasBlock3: Boolean(conduta) || isEnfermeiro
  };
}
function extractIcalBusyIntervals(icalText, targetDateStr) {
  const busyIntervals = [];
  try {
    const compactTargetDate = targetDateStr.replace(/-/g, "");
    const events = icalText.split("BEGIN:VEVENT");
    for (let i = 1; i < events.length; i++) {
      const eventChunk = events[i].split("END:VEVENT")[0];
      const dtStartMatch = eventChunk.match(/DTSTART(?:;[^:]+)?:(\d{8}T\d{4,6}Z?|\d{8})/);
      const dtEndMatch = eventChunk.match(/DTEND(?:;[^:]+)?:(\d{8}T\d{4,6}Z?|\d{8})/);
      const summaryMatch = eventChunk.match(/SUMMARY:(.*)/);
      const summary = summaryMatch ? summaryMatch[1].trim() : "Compromisso Google Calendar";
      if (!dtStartMatch) continue;
      const dtStartStr = dtStartMatch[1];
      const eventStartDate = dtStartStr.slice(0, 8);
      if (eventStartDate === compactTargetDate && dtStartStr.includes("T")) {
        const timePart = dtStartStr.split("T")[1];
        const startH = parseInt(timePart.slice(0, 2), 10);
        const startM = parseInt(timePart.slice(2, 4), 10);
        const startMin = startH * 60 + startM;
        let endMin = startMin + 30;
        if (dtEndMatch && dtEndMatch[1].includes("T")) {
          const endTimePart = dtEndMatch[1].split("T")[1];
          const endH = parseInt(endTimePart.slice(0, 2), 10);
          const endM = parseInt(endTimePart.slice(2, 4), 10);
          endMin = endH * 60 + endM;
        }
        busyIntervals.push({ startMin, endMin, summary });
      }
    }
  } catch (err) {
    console.warn("[iCal Parser] Erro ao analisar eventos do iCal:", err);
  }
  return busyIntervals;
}
app.get("/api/appointments/professionals", (req, res) => {
  try {
    res.json({
      success: true,
      service: "e-SUS PEC Multiprofissional - Cat\xE1logo de Profissionais para Agendamento",
      rule: "Nenhum profissional pode ficar dispon\xEDvel sem agenda Google Calendar vinculada e validada.",
      note: "Integra\xE7\xE3o bidirecional pronta para chamadas via n8n e webhooks externos.",
      supportedCalendarTypes: [
        {
          type: "primary_email",
          description: "Conta Google / Gmail / Workspace (ex: jerime.rego@gmail.com)",
          usage: "O n8n utiliza o e-mail Google como 'calendarId' no n\xF3 Google Calendar."
        },
        {
          type: "secondary_group",
          description: "Agenda Secund\xE1ria no Google Calendar (ex: xxx@group.calendar.google.com)",
          usage: "O n8n utiliza o ID da agenda secund\xE1ria como 'calendarId' nativo da API do Google Calendar."
        }
      ]
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao listar profissionais para agendamento." });
  }
});
app.get("/api/appointments/available-slots", async (req, res) => {
  try {
    const { professionalId, date, duration = "30", calendarId } = req.query;
    if (!date) {
      return res.status(400).json({ error: "Par\xE2metro 'date' (YYYY-MM-DD) \xE9 obrigat\xF3rio." });
    }
    const durationMin = parseInt(duration, 10) || 30;
    const targetDate = /* @__PURE__ */ new Date(`${date}T00:00:00`);
    const dayOfWeek = targetDate.getDay();
    let isWorkingDay = dayOfWeek >= 1 && dayOfWeek <= 5;
    let startHour = 8;
    let endHour = 17;
    let breakStartHour = 12;
    let breakEndHour = 13;
    if (!isWorkingDay) {
      return res.json({
        date,
        slots: [],
        message: "O profissional n\xE3o atende no dia da semana selecionado."
      });
    }
    let googleBusyIntervals = [];
    if (calendarId && typeof calendarId === "string") {
      try {
        const cleanCalendarId = calendarId.trim();
        const icalUrl = `https://calendar.google.com/calendar/ical/${encodeURIComponent(cleanCalendarId)}/public/basic.ics`;
        const icalRes = await fetch(icalUrl, { signal: AbortSignal.timeout(3e3) });
        if (icalRes.ok) {
          const icalContent = await icalRes.text();
          googleBusyIntervals = extractIcalBusyIntervals(icalContent, date);
        }
      } catch (icalErr) {
      }
    }
    const slots = [];
    const totalMinutesStart = startHour * 60;
    const totalMinutesEnd = endHour * 60;
    const lunchStartMin = breakStartHour * 60;
    const lunchEndMin = breakEndHour * 60;
    const pad = (n) => String(n).padStart(2, "0");
    for (let currentMin = totalMinutesStart; currentMin + durationMin <= totalMinutesEnd; currentMin += durationMin) {
      const slotStartH = Math.floor(currentMin / 60);
      const slotStartM = currentMin % 60;
      const slotEndMin = currentMin + durationMin;
      const slotEndH = Math.floor(slotEndMin / 60);
      const slotEndM = slotEndMin % 60;
      const startTimeStr = `${pad(slotStartH)}:${pad(slotStartM)}`;
      const endTimeStr = `${pad(slotEndH)}:${pad(slotEndM)}`;
      let available = true;
      let reason = void 0;
      if (currentMin >= lunchStartMin && currentMin < lunchEndMin || slotEndMin > lunchStartMin && slotEndMin <= lunchEndMin) {
        available = false;
        reason = "Intervalo / Almo\xE7o";
      }
      if (available && googleBusyIntervals.length > 0) {
        const collision = googleBusyIntervals.find(
          (busy) => currentMin >= busy.startMin && currentMin < busy.endMin || slotEndMin > busy.startMin && slotEndMin <= busy.endMin || currentMin <= busy.startMin && slotEndMin >= busy.endMin
        );
        if (collision) {
          available = false;
          reason = `Compromisso no Google Calendar (${collision.summary || "Ocupado"})`;
        }
      }
      slots.push({
        startTime: startTimeStr,
        endTime: endTimeStr,
        available,
        reason
      });
    }
    res.json({
      professionalId,
      date,
      duration: durationMin,
      calendarId: calendarId || null,
      googleCalendarSynced: googleBusyIntervals.length > 0,
      slots
    });
  } catch (error) {
    console.error("Erro ao calcular slots dispon\xEDveis:", error);
    res.status(500).json({ error: "Erro interno ao calcular hor\xE1rios dispon\xEDveis." });
  }
});
app.post("/api/appointments/book", async (req, res) => {
  try {
    const {
      patientName,
      patientPhone,
      patientCpf,
      patientEmail,
      professionalId,
      professionalName,
      serviceName,
      servicePrice = 0,
      date,
      startTime,
      endTime,
      isChargingEnabled = false,
      n8nPixWebhookUrl
    } = req.body;
    if (!patientName || !patientPhone || !date || !startTime) {
      return res.status(400).json({ error: "Dados obrigat\xF3rios de agendamento ausentes." });
    }
    const appointmentId = `app-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    let pixData = null;
    if (isChargingEnabled && servicePrice > 0) {
      const settings = readStoreData("settings", {});
      const webhookUrl = n8nPixWebhookUrl && typeof n8nPixWebhookUrl === "string" && n8nPixWebhookUrl.trim() ? n8nPixWebhookUrl.trim() : settings.n8nPixWebhookUrl && typeof settings.n8nPixWebhookUrl === "string" ? settings.n8nPixWebhookUrl.trim() : "";
      if (webhookUrl) {
        try {
          const pixPayload = {
            agendamento_id: appointmentId,
            userName: patientName,
            Email: patientEmail || `${patientPhone.replace(/\D/g, "")}@paciente.esus.gov.br`,
            userCpf: patientCpf || "00000000000",
            "Nome-servico": `${serviceName} - ${professionalName}`,
            Valor: Math.round(servicePrice * 100),
            // PagBank centavos
            professionalId,
            date,
            time: startTime
          };
          const pixResponse = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(pixPayload)
          });
          if (pixResponse.ok) {
            const resJson = await pixResponse.json();
            pixData = {
              pixCopiaECola: resJson["chave-pix-copia-cola"] || resJson.chavePix || resJson.copiaECola,
              pixQrCode: resJson["qr-code"] || resJson.qrCodeUrl || resJson.pixQrCode,
              pixId: resJson["id-pix"] || resJson.idPix || resJson.id
            };
          }
        } catch (pixErr) {
          console.warn("Erro ao acionar webhook n8n PagBank:", pixErr);
        }
      }
    }
    res.json({
      success: true,
      appointmentId,
      status: isChargingEnabled && servicePrice > 0 ? "aguardando_pagamento" : "agendado",
      paymentStatus: isChargingEnabled && servicePrice > 0 ? "pendente" : "isento",
      pix: pixData,
      message: "Agendamento registrado com sucesso."
    });
  } catch (error) {
    console.error("Erro ao registrar agendamento:", error);
    res.status(500).json({ error: "Erro ao processar agendamento." });
  }
});
app.post("/api/appointments/webhook-n8n", async (req, res) => {
  try {
    const { action, professionalId, date, calendarId, patientCpf, patientPhone, appointmentData } = req.body;
    switch (action) {
      case "get_professionals": {
        return res.json({
          success: true,
          message: "Apenas profissionais com Google Calendar vinculado e verificado podem ser agendados.",
          instruction: "Consulte GET /api/appointments/available-slots passando date e calendarId para verificar hor\xE1rios livres."
        });
      }
      case "get_slots": {
        const targetDate = date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        return res.json({
          success: true,
          date: targetDate,
          calendarId: calendarId || null,
          slots: [
            "08:00",
            "08:30",
            "09:00",
            "09:30",
            "10:00",
            "10:30",
            "11:00",
            "11:30",
            "13:00",
            "13:30",
            "14:00",
            "14:30",
            "15:00",
            "15:30",
            "16:00",
            "16:30"
          ]
        });
      }
      case "book": {
        const newId = `app-wpp-${Date.now()}`;
        return res.json({
          success: true,
          appointmentId: newId,
          status: "agendado",
          message: "Agendamento via WhatsApp confirmado no e-SUS PEC!"
        });
      }
      case "check_patient": {
        return res.json({
          success: true,
          patientPhone: patientPhone || "",
          patientCpf: patientCpf || "",
          message: "Consulta de agendamentos realizada."
        });
      }
      default:
        return res.json({
          status: "ok",
          service: "e-SUS PEC Multiprofissional Scheduling Webhook",
          timestamp: Date.now()
        });
    }
  } catch (error) {
    console.error("Erro no webhook n8n:", error);
    res.status(500).json({ error: "Erro ao processar webhook n8n." });
  }
});
app.post("/api/appointments/notify-event", async (req, res) => {
  try {
    const body = req.body || {};
    const event = body.event || body.eventType || body.type;
    const payload = body.payload || body;
    const apptId = body.appointmentId || payload?.appointmentId || payload?.appointment?.id;
    const webhookUrl = body.webhookUrl;
    const whatsappEnabled = body.whatsappEnabled !== false;
    if (!event) {
      return res.status(400).json({ error: "Par\xE2metro 'event' ou 'eventType' \xE9 obrigat\xF3rio." });
    }
    console.log(`[Notification Engine] Processando evento "${event}" para agendamento ${apptId || "N/A"}`);
    if (apptId) {
      const appointments = readStoreData("appointments", []);
      const idx = appointments.findIndex((a) => a && a.id === apptId);
      if (idx >= 0) {
        const currentAppt = appointments[idx];
        const notif = currentAppt.notifications || {};
        const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        if (event === "pix_created") {
          notif.pixSent = true;
          notif.pixSentAt = Date.now();
        } else if (event === "appointment_confirmed") {
          notif.confirmedSent = true;
          notif.confirmedSentAt = Date.now();
        } else if (event === "reminder_daily" || event === "daily_reminder_sent") {
          notif.lastDailyReminderDate = body.date || todayStr;
          notif.dailyReminderSentCount = (notif.dailyReminderSentCount || 0) + 1;
        } else if (event === "reminder_30m" || event === "reminder_30m_sent") {
          notif.reminder30Sent = true;
          notif.reminder30SentAt = Date.now();
        } else if (event === "reminder_10m" || event === "reminder_10m_sent") {
          notif.reminder10Sent = true;
          notif.reminder10SentAt = Date.now();
        }
        notif.lastEventDispatched = event;
        appointments[idx] = { ...currentAppt, notifications: notif, updatedAt: Date.now() };
        writeStoreData("appointments", appointments);
      }
    }
    if (typeof event === "string" && (event.endsWith("_sent") || event.startsWith("ack_"))) {
      return res.json({
        success: true,
        acknowledged: true,
        event,
        appointmentId: apptId,
        timestamp: Date.now()
      });
    }
    let forwardedToN8n = false;
    let n8nResponseStatus = null;
    let targetWebhook = webhookUrl;
    if (!targetWebhook) {
      const settings = readStoreData("settings", {});
      targetWebhook = settings.n8nAppointmentWebhookUrl;
    }
    if (whatsappEnabled && targetWebhook && typeof targetWebhook === "string" && targetWebhook.startsWith("http")) {
      try {
        const n8nRes = await fetch(targetWebhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            event,
            appointmentId: apptId,
            dispatchedAt: Date.now()
          }),
          signal: AbortSignal.timeout(5e3)
        });
        forwardedToN8n = n8nRes.ok;
        n8nResponseStatus = n8nRes.status;
      } catch (err) {
        console.warn(`[Notification Engine] Falha ao enviar para webhook n8n (${targetWebhook}):`, err?.message || err);
      }
    }
    res.json({
      success: true,
      event,
      appointmentId: apptId,
      forwardedToN8n,
      n8nResponseStatus,
      targetWebhook: targetWebhook || null,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error("Erro no dispatch de notifica\xE7\xE3o:", error);
    res.status(500).json({ error: error?.message || "Erro ao despachar notifica\xE7\xE3o." });
  }
});
app.post("/api/appointments/button-action-callback", async (req, res) => {
  try {
    const body = req.body || {};
    const rawAction = (body.action || body.buttonId || body.button_id || body.selectedButtonId || "").toLowerCase();
    const rawBtn = body.buttonId || body.button_id || "";
    let appointmentId = body.appointmentId || body.agendamento_id || "";
    if (!appointmentId && rawBtn) {
      const match = rawBtn.match(/^btn_[a-zA-Z0-9]+_(.+)$/);
      if (match) appointmentId = match[1];
    }
    const userPhone = body.userPhone || body.phone || body.from || "";
    console.log(`[Button Action Callback] A\xE7\xE3o: "${rawAction}", Agendamento: "${appointmentId}", Telefone: "${userPhone}"`);
    const appointments = readStoreData("appointments", []);
    const idx = appointments.findIndex((a) => a && (a.id === appointmentId || a.pixOrderReferenceId === appointmentId));
    if (idx === -1) {
      const fallbackMsg = `Recebemos sua resposta. N\xE3o localizamos o registro exato do agendamento "${appointmentId}". Entre em contato com a nossa recep\xE7\xE3o para assist\xEAncia.`;
      return res.json({
        success: false,
        error: "AGENDAMENTO_NAO_ENCONTRADO",
        appointmentId,
        message: fallbackMsg,
        replyMessage: fallbackMsg
      });
    }
    const appt = appointments[idx];
    const patientFirstName = (appt.patientName || "Paciente").split(" ")[0];
    const dateFormatted = appt.date?.includes("-") ? appt.date.split("-").reverse().join("/") : appt.date;
    if (rawAction.includes("cancel")) {
      appt.status = "cancelado";
      appt.cancelReason = "Cancelado pelo paciente via WhatsApp (Evolution API)";
      appt.updatedAt = Date.now();
      appointments[idx] = appt;
      writeStoreData("appointments", appointments);
      const cancelMsg = `Ol\xE1, *${patientFirstName}*! Seu agendamento para o dia *${dateFormatted} \xE0s ${appt.startTime}* com *${appt.professionalName}* foi cancelado com sucesso. O hor\xE1rio foi liberado. Caso precise marcar uma nova data no futuro, estamos \xE0 disposi\xE7\xE3o!`;
      return res.json({
        success: true,
        action: "cancelled",
        appointmentId: appt.id,
        status: "cancelado",
        message: cancelMsg,
        replyMessage: cancelMsg
      });
    }
    if (rawAction.includes("reagendar") || rawAction.includes("reschedule")) {
      const rescheduleMsg = `Ol\xE1, *${patientFirstName}*! Para reagendar seu atendimento com *${appt.professionalName}*, acesse nosso portal de agendamentos online ou informe o novo dia e per\xEDodo de sua prefer\xEAncia por aqui para verificarmos a disponibilidade.`;
      return res.json({
        success: true,
        action: "reschedule_requested",
        appointmentId: appt.id,
        status: appt.status,
        message: rescheduleMsg,
        replyMessage: rescheduleMsg,
        portalUrl: "/agendar"
      });
    }
    if (rawAction.includes("duvidas") || rawAction.includes("help") || rawAction.includes("duvida")) {
      const helpMsg = `Ol\xE1, *${patientFirstName}*! Como podemos ajudar com sua consulta de *${appt.serviceName}* com *${appt.professionalName}* agendada para *${dateFormatted} \xE0s ${appt.startTime}*? Digite sua d\xFAvida abaixo e nossa equipe responder\xE1 em instantes.`;
      return res.json({
        success: true,
        action: "help_requested",
        appointmentId: appt.id,
        status: appt.status,
        message: helpMsg,
        replyMessage: helpMsg
      });
    }
    const genericMsg = `Ol\xE1, *${patientFirstName}*! Sua solicita\xE7\xE3o referente ao agendamento de *${dateFormatted} \xE0s ${appt.startTime}* foi registrada pela equipe do PEC Sa\xFAde.`;
    res.json({
      success: true,
      action: rawAction,
      appointmentId: appt.id,
      status: appt.status,
      message: genericMsg,
      replyMessage: genericMsg
    });
  } catch (error) {
    console.error("Erro no callback de a\xE7\xE3o de bot\xE3o:", error);
    res.status(500).json({ error: "Erro ao processar retorno do bot\xE3o." });
  }
});
app.get("/api/appointments/pending-reminders", (req, res) => {
  try {
    const appointments = readStoreData("appointments", []);
    const settings = readStoreData("settings", {});
    const now = Date.now();
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const currentHour = (/* @__PURE__ */ new Date()).getHours();
    const instance = settings.evolutionInstanceName || "Typebot_curso_tec";
    const defaultLocation = settings.defaultUnitName || "Unidade B\xE1sica de Sa\xFAde / PEC";
    const pendingDaily = [];
    const pending30m = [];
    const pending10m = [];
    const allPendingToProcess = [];
    appointments.forEach((appt) => {
      if (!appt || appt.status !== "agendado" || !appt.date || !appt.startTime) return;
      const notif = appt.notifications || {};
      const apptTimestamp = (/* @__PURE__ */ new Date(`${appt.date}T${appt.startTime}:00`)).getTime();
      const diffMs = apptTimestamp - now;
      const diffMinutes = Math.floor(diffMs / (1e3 * 60));
      const rawPhone = (appt.patientPhone || "").replace(/\D/g, "");
      const phoneWhatsApp = rawPhone.startsWith("55") ? rawPhone : rawPhone.length === 10 ? `55${rawPhone.substring(0, 2)}9${rawPhone.substring(2)}` : `55${rawPhone}`;
      const dateFormatted = appt.date.includes("-") ? appt.date.split("-").reverse().join("/") : appt.date;
      const baseItem = {
        ...appt,
        appointmentId: appt.id,
        patient: {
          name: appt.patientName || "Paciente",
          phone: appt.patientPhone || "",
          phoneWhatsApp
        },
        patientName: appt.patientName || "Paciente",
        phone: appt.patientPhone || "",
        phoneWhatsApp,
        dateFormatted,
        timeFormatted: appt.startTime,
        time: appt.startTime,
        serviceName: appt.serviceName || "Consulta PEC",
        professionalName: appt.professionalName || "Profissional da Sa\xFAde",
        location: appt.unitName || defaultLocation,
        scheduledAt: `${appt.date}T${appt.startTime}:00`,
        instance,
        lastDailyReminderDate: notif.lastDailyReminderDate,
        reminder30Sent: !!notif.reminder30Sent,
        reminder10Sent: !!notif.reminder10Sent
      };
      const isScheduledWithMoreThan24h = apptTimestamp - (appt.createdAt || now) > 24 * 60 * 60 * 1e3;
      if (isScheduledWithMoreThan24h && appt.date > todayStr && notif.lastDailyReminderDate !== todayStr && currentHour >= 8) {
        const dailyItem = { ...baseItem, pendingDaily: true };
        pendingDaily.push(dailyItem);
        allPendingToProcess.push(dailyItem);
      }
      if (diffMinutes >= 20 && diffMinutes <= 40 && !notif.reminder30Sent) {
        const item30m = { ...baseItem, pending30m: true };
        pending30m.push(item30m);
        allPendingToProcess.push(item30m);
      }
      if (diffMinutes >= 5 && diffMinutes <= 15 && !notif.reminder10Sent) {
        const item10m = { ...baseItem, pending10m: true };
        pending10m.push(item10m);
        allPendingToProcess.push(item10m);
      }
    });
    res.json({
      success: true,
      timestamp: now,
      today: todayStr,
      currentHour,
      totals: {
        total: allPendingToProcess.length,
        pendingDaily: pendingDaily.length,
        pending30m: pending30m.length,
        pending10m: pending10m.length
      },
      // Array standard aliases that n8n Code node uses:
      appointments: allPendingToProcess,
      data: allPendingToProcess,
      pendingDaily,
      pending30m,
      pending10m
    });
  } catch (error) {
    console.error("Erro ao verificar lembretes pendentes:", error);
    res.status(500).json({ error: "Erro ao consultar lembretes pendentes." });
  }
});
app.post("/api/appointments/google-calendar/test", async (req, res) => {
  try {
    const { calendarId } = req.body;
    if (!calendarId || typeof calendarId !== "string" || !calendarId.trim()) {
      return res.status(400).json({
        valid: false,
        error: "ID_AUSENTE",
        message: "ID ou e-mail da agenda do Google Calendar n\xE3o informado."
      });
    }
    const cleanId = calendarId.trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanId);
    const isGroupCalendar = cleanId.toLowerCase().endsWith("@group.calendar.google.com") || cleanId.toLowerCase().endsWith("@import.calendar.google.com");
    if (!isEmail && !isGroupCalendar) {
      return res.status(400).json({
        valid: false,
        error: "FORMATO_INVALIDO",
        message: "Formato inv\xE1lido. Informe um e-mail Google v\xE1lido (ex: seu.email@gmail.com) ou o ID de uma agenda secund\xE1ria (ex: xxx@group.calendar.google.com)."
      });
    }
    const parts = cleanId.split("@");
    const localPart = parts[0] || "";
    const domain = (parts[1] || "").toLowerCase();
    let mxRecords = [];
    try {
      mxRecords = await import_dns.default.promises.resolveMx(domain);
    } catch (dnsErr) {
      return res.status(400).json({
        valid: false,
        error: "DOMINIO_INEXISTENTE",
        domain,
        message: `O dom\xEDnio "@${domain}" n\xE3o foi localizado ou n\xE3o possui registros de e-mail (DNS MX) ativos na internet. O Google Calendar n\xE3o p\xF4de ser vinculado a este endere\xE7o.`
      });
    }
    if (!mxRecords || mxRecords.length === 0) {
      return res.status(400).json({
        valid: false,
        error: "DOMINIO_SEM_MX",
        domain,
        message: `O dom\xEDnio "@${domain}" n\xE3o possui servidores de e-mail configurados.`
      });
    }
    const isGoogleMx = mxRecords.some(
      (r) => Boolean(r.exchange && typeof r.exchange === "string" && (r.exchange.toLowerCase().includes("google.com") || r.exchange.toLowerCase().includes("googlemail.com") || r.exchange.toLowerCase().includes("gmr-smtp-in.l.google.com")))
    );
    if (isGroupCalendar) {
      if (localPart.length < 16) {
        return res.status(400).json({
          valid: false,
          error: "ID_SECUNDARIO_INVALIDO",
          message: `O identificador "${cleanId}" \xE9 muito curto para ser uma agenda do Google Calendar. O ID de agenda secund\xE1ria do Google possui mais de 26 caracteres alfanum\xE9ricos (ex: c_... ou hash longo). No Google Calendar, acesse "Configura\xE7\xF5es da agenda" > "Integrar agenda" > copie o "ID da agenda" completo.`
        });
      }
      const icalUrl = `https://calendar.google.com/calendar/ical/${encodeURIComponent(cleanId)}/public/basic.ics`;
      let isPublicIcalActive = false;
      try {
        const icalRes = await fetch(icalUrl, { method: "HEAD", signal: AbortSignal.timeout(3e3) });
        if (icalRes.ok) {
          isPublicIcalActive = true;
        }
      } catch {
      }
      return res.json({
        valid: true,
        calendarId: cleanId,
        type: "secondary_group",
        isPublicIcalActive,
        mxProvider: "Google Calendar Group Service",
        message: isPublicIcalActive ? `Agenda secund\xE1ria "${cleanId}" verificada e conectada com sucesso! O e-SUS PEC e o n8n sincronizar\xE3o hor\xE1rios ocupados diretamente via iCal.` : `ID de agenda secund\xE1ria do Google Calendar com formato v\xE1lido. Para que o n8n e o e-SUS PEC leiam os hor\xE1rios ocupados e bloqueiem hor\xE1rios automaticamente, certifique-se de marcar "Tornar dispon\xEDvel publicamente (Ver apenas livre/ocupado)" ou compartilhar com o servi\xE7o n8n.`
      });
    }
    if (!isGoogleMx) {
      const primaryMx = mxRecords[0]?.exchange || "desconhecido";
      return res.status(400).json({
        valid: false,
        error: "PROVEDOR_NAO_GOOGLE",
        domain,
        primaryMx,
        message: `O dom\xEDnio "@${domain}" utiliza servidores de e-mail da "${primaryMx}" e n\xE3o do Google. Para sincroniza\xE7\xE3o com o Google Calendar, informe uma conta Google (Gmail ou Google Workspace) ou o ID de uma agenda secund\xE1ria (@group.calendar.google.com).`
      });
    }
    return res.status(400).json({
      valid: false,
      error: "AGENDA_PRINCIPAL_PROIBIDA",
      isEmailAccount: true,
      calendarId: cleanId,
      domain,
      mxProvider: "Google Workspace / Gmail",
      message: `Aten\xE7\xE3o: N\xE3o \xE9 permitido utilizar a agenda pessoal/principal (${cleanId}) diretamente para agendamentos. Para preservar sua privacidade e garantir a sincroniza\xE7\xE3o com o n8n/e-SUS PEC, utilize uma agenda secund\xE1ria (@group.calendar.google.com). Clique em "Buscar Agendas Secund\xE1rias" para autenticar e escolher sua agenda secund\xE1ria no Google Calendar.`
    });
  } catch (error) {
    console.error("Erro ao testar Google Calendar ID:", error);
    res.status(500).json({ valid: false, error: "ERRO_INTERNO", message: "Erro interno ao validar agenda Google." });
  }
});
app.post("/api/appointments/google-calendar/list-secondary", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const tokenFromBody = req.body?.accessToken;
    const accessToken = authHeader?.replace(/^Bearer\s+/i, "") || tokenFromBody;
    if (!accessToken) {
      return res.status(401).json({
        error: "TOKEN_AUSENTE",
        message: "Token de acesso do Google n\xE3o fornecido."
      });
    }
    const gcalRes = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    if (!gcalRes.ok) {
      const errData = await gcalRes.json().catch(() => ({}));
      return res.status(gcalRes.status).json({
        error: "GOOGLE_API_ERROR",
        message: errData?.error?.message || "Erro ao consultar lista de agendas do Google Calendar."
      });
    }
    const data = await gcalRes.json();
    const items = data.items || [];
    const secondaryCalendars = items.filter((cal) => {
      const isPrimary = Boolean(cal.primary);
      return !isPrimary;
    }).map((cal) => ({
      id: cal.id,
      summary: cal.summary || "Agenda sem t\xEDtulo",
      description: cal.description || "",
      primary: false,
      timeZone: cal.timeZone,
      backgroundColor: cal.backgroundColor,
      foregroundColor: cal.foregroundColor,
      accessRole: cal.accessRole,
      isGroupSecondary: Boolean(cal.id && typeof cal.id === "string" && cal.id.toLowerCase().includes("@group.calendar.google.com"))
    }));
    const primaryCal = items.find((cal) => Boolean(cal.primary));
    res.json({
      success: true,
      totalCalendars: items.length,
      secondaryCalendars,
      primaryCalendarSummary: primaryCal?.summary || primaryCal?.id
    });
  } catch (error) {
    console.error("Erro ao listar agendas secund\xE1rias:", error);
    res.status(500).json({ error: "ERRO_INTERNO", message: "Falha ao buscar agendas secund\xE1rias do Google." });
  }
});
app.post(["/api/webhook/pagbank-retorno-pix", "/api/pix/confirm"], async (req, res) => {
  try {
    const body = req.body || {};
    const referenceId = body.reference_id || body.referenceId || body?.body?.reference_id || body.agendamento_id || body.orderId;
    const status = body.status || body.status_pagamento || body?.body?.status || "pago";
    console.log(`[PIX Webhook] Recebida notifica\xE7\xE3o para refer\xEAncia: ${referenceId}, status: ${status}`);
    res.json({
      success: true,
      received: true,
      referenceId,
      status,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error("Erro no webhook de PIX:", error);
    res.status(500).json({ success: false, error: error?.message || "Erro no webhook" });
  }
});
app.post("/api/webhook/generate-pix", async (req, res) => {
  const startTime = Date.now();
  try {
    const { webhookUrl, appointment, customAmount, plan, payload: directPayload } = req.body;
    const settings = readStoreData("settings", {});
    const targetWebhook = webhookUrl && typeof webhookUrl === "string" && webhookUrl.trim() ? webhookUrl.trim() : settings.n8nPixWebhookUrl && typeof settings.n8nPixWebhookUrl === "string" && settings.n8nPixWebhookUrl.trim() ? settings.n8nPixWebhookUrl.trim() : "";
    if (!targetWebhook) {
      return res.status(400).json({
        success: false,
        error: "URL_NAO_CONFIGURADA",
        message: "Nenhuma URL de webhook n8n para gera\xE7\xE3o de PIX est\xE1 configurada. Cadastre a URL na aba 'Webhooks & n8n' das Configura\xE7\xF5es do Sistema."
      });
    }
    let pixPayload = directPayload;
    if (!pixPayload) {
      if (appointment) {
        const cleanCpf = (appointment.patientCpf || "").replace(/\D/g, "") || "00000000000";
        const cleanPhone = (appointment.patientPhone || "").replace(/\D/g, "");
        const amountToCharge = customAmount !== void 0 ? customAmount : appointment.servicePrice || 0;
        pixPayload = {
          agendamento_id: appointment.id || `app-${Date.now()}`,
          userName: appointment.patientName || "Paciente",
          Email: appointment.patientEmail || `${cleanPhone}@paciente.esus.gov.br`,
          userCpf: cleanCpf,
          userPhone: cleanPhone,
          "Nome-servico": `${appointment.serviceName || "Consulta"} - ${appointment.professionalName || "Profissional"}`,
          Valor: Math.round(amountToCharge * 100),
          // PagBank centavos
          valorFormatado: amountToCharge.toFixed(2),
          professionalId: appointment.professionalId,
          date: appointment.date,
          time: appointment.startTime
        };
      } else if (plan) {
        pixPayload = {
          userName: req.body.userName || "Usu\xE1rio PEC",
          Email: req.body.email || req.body.Email || "usuario@pec.saude.gov.br",
          userCpf: (req.body.userCpf || "").replace(/\D/g, "") || "00000000000",
          userPhone: (req.body.userPhone || "").replace(/\D/g, ""),
          "Nome-servico": plan.name || "Assinatura de Plano",
          Valor: Math.round((plan.price || 0) * 100),
          valorFormatado: (plan.price || 0).toFixed(2),
          duracaoDias: plan.durationDays || 30,
          agendamento_id: req.body.userId || `sub_${Date.now()}`,
          subscription_id: req.body.orderId || `sub_${Date.now()}`
        };
      }
    }
    if (!pixPayload) {
      return res.status(400).json({
        success: false,
        error: "PAYLOAD_INVALIDO",
        message: "Dados de agendamento ou plano insuficientes para gerar a cobran\xE7a PIX."
      });
    }
    console.log(`[PIX Engine] Disparando para o webhook n8n cadastrado: ${targetWebhook}`);
    const n8nResponse = await fetch(targetWebhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(pixPayload),
      signal: AbortSignal.timeout(2e4)
    });
    const durationMs = Date.now() - startTime;
    const contentType = n8nResponse.headers.get("content-type") || "";
    let data = null;
    if (contentType.includes("application/json")) {
      data = await n8nResponse.json().catch(() => null);
    } else {
      const text = await n8nResponse.text().catch(() => "");
      data = { raw: text };
    }
    if (!n8nResponse.ok) {
      return res.status(n8nResponse.status).json({
        success: false,
        status: n8nResponse.status,
        durationMs,
        targetWebhook,
        error: "N8N_HTTP_ERROR",
        message: `O webhook n8n retornou HTTP ${n8nResponse.status}: ${n8nResponse.statusText}`,
        data
      });
    }
    const pixCopiaECola = data?.["chave-pix-copia-cola"] || data?.chavePix || data?.copiaECola || data?.pixCopiaECola || "";
    const pixQrCode = data?.["qr-code"] || data?.qrCode || data?.qrCodeUrl || data?.pixQrCode || "";
    const pixId = data?.["id-pix"] || data?.idPix || data?.id || "";
    const rawExpiration = data?.["expiration_date"] || data?.expiration_date || data?.expirationDate || data?.expires_at || data?.expiresAt || data?.expiracao || "";
    let expiresAt = 0;
    const now = Date.now();
    if (rawExpiration) {
      if (typeof rawExpiration === "number") {
        expiresAt = rawExpiration > 1e11 ? rawExpiration : rawExpiration * 1e3;
      } else if (typeof rawExpiration === "string") {
        const cleanStr = rawExpiration.trim();
        const brRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:(?:\s+às\s+|\s+)(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/i;
        const match = cleanStr.match(brRegex);
        if (match) {
          const day = parseInt(match[1], 10);
          const month = parseInt(match[2], 10);
          const year = parseInt(match[3], 10);
          const hours = match[4] !== void 0 ? parseInt(match[4], 10) : 23;
          const minutes = match[5] !== void 0 ? parseInt(match[5], 10) : 59;
          const seconds = match[6] !== void 0 ? parseInt(match[6], 10) : 59;
          const pad = (n) => String(n).padStart(2, "0");
          const isoWithBrTz = `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:${pad(seconds)}-03:00`;
          const dt = new Date(isoWithBrTz);
          if (!isNaN(dt.getTime())) {
            expiresAt = dt.getTime();
          }
        }
        if (!expiresAt && cleanStr.includes("T") && !cleanStr.endsWith("Z") && !cleanStr.match(/[+-]\d{2}:?\d{2}$/)) {
          const withTz = `${cleanStr}-03:00`;
          const parsedWithTz = new Date(withTz).getTime();
          if (!isNaN(parsedWithTz)) expiresAt = parsedWithTz;
        }
        if (!expiresAt) {
          const iso = new Date(cleanStr).getTime();
          if (!isNaN(iso) && iso > 0) expiresAt = iso;
        }
      }
    }
    if (!expiresAt || expiresAt <= now) {
      expiresAt = now + 30 * 60 * 1e3;
    }
    const expDate = new Date(expiresAt);
    const expirationDateFormatted = `${String(expDate.getDate()).padStart(2, "0")}/${String(expDate.getMonth() + 1).padStart(2, "0")}/${expDate.getFullYear()} \xE0s ${String(expDate.getHours()).padStart(2, "0")}:${String(expDate.getMinutes()).padStart(2, "0")}:${String(expDate.getSeconds()).padStart(2, "0")}`;
    return res.json({
      success: true,
      durationMs,
      pixCopiaECola,
      pixQrCode,
      pixId,
      expiresAt,
      expirationDate: rawExpiration || expirationDateFormatted,
      expirationDateFormatted,
      targetWebhook,
      data,
      message: "PIX gerado com sucesso pelo webhook n8n cadastrado."
    });
  } catch (err) {
    const durationMs = Date.now() - startTime;
    console.error("[PIX Webhook Error]:", err);
    return res.status(500).json({
      success: false,
      durationMs,
      error: "DISPATCH_FAILED",
      message: `Erro ao conectar com webhook n8n: ${err?.message || "Falha de conex\xE3o"}`
    });
  }
});
app.post("/api/webhook/test-pix", async (req, res) => {
  const startTime = Date.now();
  try {
    const { webhookUrl, customPayload } = req.body;
    if (!webhookUrl || typeof webhookUrl !== "string" || !webhookUrl.trim()) {
      return res.status(400).json({
        success: false,
        error: "URL_AUSENTE",
        message: "URL do webhook n8n para gera\xE7\xE3o de PIX n\xE3o informada."
      });
    }
    const cleanUrl = webhookUrl.trim();
    const testPayload = customPayload || {
      userName: "Teste Conex\xE3o n8n",
      Email: "teste.n8n@saude.gov.br",
      userCpf: "11144477735",
      userPhone: "11999998888",
      "Nome-servico": "Teste de Comunica\xE7\xE3o Webhook n8n",
      Valor: 100,
      // R$ 1,00 em centavos
      valorFormatado: "1.00",
      duracaoDias: 1,
      agendamento_id: `test_${Date.now()}`,
      subscription_id: `test_sub_${Date.now()}`
    };
    const response = await fetch(cleanUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(testPayload),
      signal: AbortSignal.timeout(15e3)
      // 15s timeout
    });
    const durationMs = Date.now() - startTime;
    const contentType = response.headers.get("content-type") || "";
    let responseData = null;
    if (contentType.includes("application/json")) {
      responseData = await response.json().catch(() => null);
    } else {
      const text = await response.text().catch(() => "");
      responseData = { rawText: text.slice(0, 500) };
    }
    if (response.ok) {
      const hasPixKeys = responseData && (responseData["chave-pix-copia-cola"] || responseData["qr-code"] || responseData.copiaECola || responseData.qrCode || responseData["id-pix"] || responseData.id);
      return res.json({
        success: true,
        status: response.status,
        durationMs,
        hasPixKeys: Boolean(hasPixKeys),
        qrCode: responseData?.["qr-code"] || responseData?.qrCode || null,
        copiaECola: responseData?.["chave-pix-copia-cola"] || responseData?.copiaECola || null,
        idPix: responseData?.["id-pix"] || responseData?.id || null,
        data: responseData,
        message: hasPixKeys ? `Webhook n8n respondeu com sucesso em ${durationMs}ms com dados de PIX v\xE1lidos!` : `Webhook n8n respondeu com status HTTP ${response.status} em ${durationMs}ms.`
      });
    } else {
      let explanation = `O servidor retornou erro HTTP ${response.status} (${response.statusText}).`;
      if (response.status === 404) {
        explanation = "Erro HTTP 404: O webhook n8n n\xE3o foi encontrado ou o fluxo est\xE1 desativado (Inactive). Ative o fluxo no n8n clicando em 'Active'.";
      } else if (response.status === 500) {
        explanation = "Erro HTTP 500: Ocorreu um erro interno no fluxo n8n durante a execu\xE7\xE3o dos n\xF3s.";
      }
      return res.status(response.status).json({
        success: false,
        status: response.status,
        durationMs,
        error: "HTTP_ERROR",
        message: explanation,
        data: responseData
      });
    }
  } catch (err) {
    const durationMs = Date.now() - startTime;
    let msg = `Erro ao conectar com webhook: ${err?.message || "Falha de rede"}`;
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
      msg = `Tempo limite esgotado (timeout ap\xF3s ${durationMs}ms). Verifique se o servidor do n8n est\xE1 online e acess\xEDvel.`;
    }
    return res.status(500).json({
      success: false,
      error: "CONNECTION_FAILED",
      durationMs,
      message: msg
    });
  }
});
app.post("/api/webhook/test-generic", async (req, res) => {
  const startTime = Date.now();
  try {
    const { webhookUrl, serviceName, customPayload } = req.body;
    if (!webhookUrl || typeof webhookUrl !== "string" || !webhookUrl.trim()) {
      return res.status(400).json({
        success: false,
        error: "URL_AUSENTE",
        message: "URL do webhook n\xE3o informada."
      });
    }
    const cleanUrl = webhookUrl.trim();
    const payload = customPayload || {
      event: "test_event",
      service: serviceName || "e-SUS PEC AI",
      timestamp: Date.now(),
      dateFormatted: (/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR"),
      timeFormatted: (/* @__PURE__ */ new Date()).toLocaleTimeString("pt-BR"),
      data: {
        message: `Disparo de teste para o servi\xE7o ${serviceName || "n8n"}`,
        system: "e-SUS PEC AI Multi-Profissional",
        status: "success"
      }
    };
    const response = await fetch(cleanUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15e3)
    });
    const durationMs = Date.now() - startTime;
    const contentType = response.headers.get("content-type") || "";
    let responseData = null;
    if (contentType.includes("application/json")) {
      responseData = await response.json().catch(() => null);
    } else {
      const text = await response.text().catch(() => "");
      responseData = { rawText: text.slice(0, 500) };
    }
    if (response.ok) {
      return res.json({
        success: true,
        status: response.status,
        durationMs,
        data: responseData,
        message: `Webhook ${serviceName || "n8n"} respondeu com sucesso (HTTP ${response.status}) em ${durationMs}ms.`
      });
    } else {
      return res.status(response.status).json({
        success: false,
        status: response.status,
        durationMs,
        message: `O webhook respondeu com HTTP ${response.status} (${response.statusText}).`,
        data: responseData
      });
    }
  } catch (err) {
    const durationMs = Date.now() - startTime;
    return res.status(500).json({
      success: false,
      error: "CONNECTION_FAILED",
      durationMs,
      message: `Falha na conex\xE3o com o webhook: ${err?.message || "Erro de rede"}`
    });
  }
});
app.post("/api/evolution/test", async (req, res) => {
  const startTime = Date.now();
  try {
    const { apiUrl, apiKey, instanceName } = req.body;
    if (!apiUrl || !apiKey || !instanceName) {
      return res.status(400).json({
        success: false,
        error: "PARAMETROS_INCOMPLETOS",
        message: "URL da Evolution API, API Key e Nome da Inst\xE2ncia s\xE3o obrigat\xF3rios."
      });
    }
    const cleanUrl = apiUrl.trim().replace(/\/+$/, "");
    const cleanKey = apiKey.trim();
    const cleanInstance = instanceName.trim();
    const targetUrl = `${cleanUrl}/instance/connectionState/${encodeURIComponent(cleanInstance)}`;
    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        apikey: cleanKey,
        "Content-Type": "application/json"
      },
      signal: AbortSignal.timeout(1e4)
    });
    const durationMs = Date.now() - startTime;
    const data = await response.json().catch(() => null);
    if (response.ok) {
      const state = data?.instance?.state || data?.state || "desconhecido";
      return res.json({
        success: true,
        state,
        durationMs,
        data,
        message: `Inst\xE2ncia "${cleanInstance}" conectada na Evolution API (Estado: ${state.toUpperCase()}) em ${durationMs}ms.`
      });
    } else {
      return res.status(response.status).json({
        success: false,
        status: response.status,
        durationMs,
        data,
        message: data?.response?.message || data?.message || `Erro HTTP ${response.status} ao consultar Evolution API.`
      });
    }
  } catch (err) {
    const durationMs = Date.now() - startTime;
    return res.status(500).json({
      success: false,
      error: "EVOLUTION_CONNECT_ERROR",
      durationMs,
      message: `Erro ao contatar Evolution API: ${err?.message || "Falha de rede"}`
    });
  }
});
var serverFirebaseApp = !(0, import_app.getApps)().length ? (0, import_app.initializeApp)(firebase_applet_config_default, "server-backend") : (0, import_app.getApps)().find((a) => a.name === "server-backend") || (0, import_app.getApp)("server-backend");
var serverDb = firebase_applet_config_default.firestoreDatabaseId ? (0, import_firestore.getFirestore)(serverFirebaseApp, firebase_applet_config_default.firestoreDatabaseId) : (0, import_firestore.getFirestore)(serverFirebaseApp);
var SUPABASE_URL = "https://ejsvpdecoxqqebipybiz.supabase.co";
var SUPABASE_SERVICE_ROLE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqc3ZwZGVjb3hxcWViaXB5Yml6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTA0NTY4OSwiZXhwIjoyMTA2NjIxNjg5fQ.g4lEjCA-9tmuvny1Gpsok4n9d5VdoStNNlqsKvosVg8";
var supabaseServer = (0, import_supabase_js.createClient)(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});
async function syncItemToSupabase(collectionName, item, isDelete = false, deleteId) {
  try {
    const tableMap = {
      users: "users",
      patients: "patients",
      consultations: "consultations",
      clinical_evolutions: "clinical_evolutions",
      appointments: "appointments",
      reception_queue: "reception_queue",
      settings: "system_settings",
      system_settings: "system_settings",
      subscriptions: "subscriptions"
    };
    const targetTable = tableMap[collectionName] || collectionName;
    if (isDelete) {
      const idToDelete = deleteId || item?.id;
      if (idToDelete) {
        await supabaseServer.from(targetTable).delete().eq("id", idToDelete);
      }
      return;
    }
    if (!item || !item.id) {
      if (collectionName === "settings" || collectionName === "system_settings") {
        await supabaseServer.from("system_settings").upsert({
          id: "global",
          data: item,
          updated_at: Date.now()
        });
      }
      return;
    }
    let payload = {
      id: String(item.id),
      raw_data: item,
      updated_at: Date.now()
    };
    if (collectionName === "patients") {
      payload = {
        ...payload,
        full_name: item.fullName || item.name || "Paciente",
        cpf: item.cpf || null,
        cns: item.cns || null,
        phone: item.phone || null,
        birth_date: item.birthDate || null,
        gender: item.gender || null,
        balance: item.balance || 0,
        created_at: item.createdAt || Date.now()
      };
    } else if (collectionName === "consultations") {
      payload = {
        ...payload,
        patient_id: item.patientId || null,
        patient_name: item.patientName || null,
        author: item.author || null,
        profession: item.authorProfession || item.profession || null,
        date: item.date || null,
        timestamp: item.timestamp || Date.now(),
        avaliacao: item.avaliacao || null,
        plano: item.plano || null,
        conduta: item.conduta || null,
        raw_notes: item.rawNotes || null,
        ciap2: item.ciap2 || null,
        cid10: item.cid10 || null,
        diagnostic_hypothesis: item.diagnosticHypothesis || null,
        vital_signs: item.vitalSigns || null,
        prescription: item.prescription || null,
        exam_request: item.examRequest || null,
        referral: item.referral || null,
        created_at: item.createdAt || item.timestamp || Date.now()
      };
    } else if (collectionName === "users") {
      payload = {
        ...payload,
        name: item.name || null,
        email: item.email || null,
        role: item.role || "user",
        profession: item.profession || null,
        council_register: item.councilRegister || null,
        specialty: item.specialty || null,
        workplace: item.workplace || null,
        subscription_status: item.subscription_status || "free",
        subscription_expires_at: item.subscription_expires_at || null,
        plan_name: item.plan_name || null,
        free_used: Boolean(item.free_used),
        created_at: item.createdAt || Date.now()
      };
    } else if (collectionName === "appointments") {
      payload = {
        ...payload,
        patient_id: item.patientId || null,
        patient_name: item.patientName || null,
        patient_phone: item.patientPhone || null,
        patient_email: item.patientEmail || null,
        patient_cpf: item.patientCpf || null,
        professional_id: item.professionalId || null,
        professional_name: item.professionalName || null,
        professional_profession: item.professionalProfession || null,
        date: item.date || null,
        start_time: item.startTime || null,
        end_time: item.endTime || null,
        service_name: item.serviceName || null,
        service_price: item.servicePrice || 0,
        status: item.status || "agendado",
        payment_status: item.paymentStatus || "isento",
        created_at: item.createdAt || Date.now()
      };
    } else if (collectionName === "reception_queue") {
      payload = {
        ...payload,
        patient_id: item.patientId || null,
        patient_name: item.patientName || null,
        patient_cpf: item.patientCpf || null,
        risk_priority: item.riskPriority || "verde",
        risk_category: item.riskCategory || null,
        status: item.status || "waiting",
        timestamp: item.timestamp || Date.now(),
        called_at: item.calledAt || null,
        attended_at: item.attendedAt || null,
        created_at: item.createdAt || Date.now()
      };
    } else if (collectionName === "clinical_evolutions") {
      payload = {
        ...payload,
        patient_id: item.patientId || item.id,
        patient_name: item.patientName || null,
        generated_at: item.generatedAt || Date.now(),
        model_used: item.modelUsed || null,
        resumo_longitudinal: item.resumoLongitudinal || null,
        raw_markdown: item.rawMarkdown || null
      };
    } else if (collectionName === "settings" || collectionName === "system_settings") {
      payload = {
        id: "global",
        data: item,
        updated_at: Date.now()
      };
    }
    const { error } = await supabaseServer.from(targetTable).upsert(payload);
    if (error) {
      console.debug(`[Supabase Sync Notice] (${targetTable}):`, error.message);
    }
  } catch (err) {
    console.debug(`[Supabase Sync Catch] (${collectionName}):`, err?.message || err);
  }
}
var DATA_STORE_DIR = import_path.default.join(process.cwd(), "data-store");
if (!import_fs.default.existsSync(DATA_STORE_DIR)) {
  import_fs.default.mkdirSync(DATA_STORE_DIR, { recursive: true });
}
function getStoreFilePath(collectionName) {
  const safeName = collectionName.replace(/[^a-zA-Z0-9_-]/g, "");
  return import_path.default.join(DATA_STORE_DIR, `${safeName}.json`);
}
function readStoreData(collectionName, defaultVal = []) {
  try {
    const filePath = getStoreFilePath(collectionName);
    if (!import_fs.default.existsSync(filePath)) {
      import_fs.default.writeFileSync(filePath, JSON.stringify(defaultVal, null, 2), "utf8");
      return defaultVal;
    }
    const content = import_fs.default.readFileSync(filePath, "utf8");
    return JSON.parse(content);
  } catch (err) {
    console.warn(`[DataStore] Erro ao ler ${collectionName}:`, err);
    return defaultVal;
  }
}
function writeStoreData(collectionName, data) {
  try {
    const filePath = getStoreFilePath(collectionName);
    import_fs.default.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error(`[DataStore] Erro ao escrever ${collectionName}:`, err);
  }
}
app.get("/api/supabase/status", async (req, res) => {
  try {
    const { data: usersData, error: usersErr } = await supabaseServer.from("users").select("id", { count: "exact", head: true });
    const { data: patientsData, error: patErr } = await supabaseServer.from("patients").select("id", { count: "exact", head: true });
    res.json({
      success: true,
      connected: !usersErr || usersErr.code === "PGRST116" || usersErr.code === "42P01",
      url: SUPABASE_URL,
      projectId: "ejsvpdecoxqqebipybiz",
      tablesReady: !usersErr && !patErr,
      timestamp: Date.now()
    });
  } catch (err) {
    res.json({
      success: false,
      connected: false,
      url: SUPABASE_URL,
      error: err?.message || String(err)
    });
  }
});
app.post("/api/supabase/sync-all", async (req, res) => {
  try {
    const results = {};
    const collections = ["users", "patients", "consultations", "clinical_evolutions", "appointments", "reception_queue", "settings", "subscriptions"];
    for (const col of collections) {
      const items = readStoreData(col, col === "settings" ? {} : []);
      if (col === "settings") {
        await syncItemToSupabase("settings", items);
        results[col] = 1;
      } else if (Array.isArray(items)) {
        let count = 0;
        for (const it of items) {
          await syncItemToSupabase(col, it);
          count++;
        }
        results[col] = count;
      }
    }
    res.json({
      success: true,
      message: "Todos os dados foram sincronizados com o Supabase com sucesso!",
      syncedCounts: results,
      timestamp: Date.now()
    });
  } catch (err) {
    console.error("[Supabase Sync All Error]:", err);
    res.status(500).json({ success: false, error: err?.message || "Erro na sincroniza\xE7\xE3o" });
  }
});
app.get("/api/health/database", async (req, res) => {
  try {
    const snap = await (0, import_firestore.getDocs)((0, import_firestore.collection)(serverDb, "users"));
    res.json({
      status: "connected",
      databaseId: firebase_applet_config_default.firestoreDatabaseId,
      projectId: firebase_applet_config_default.projectId,
      usersCount: snap.size,
      timestamp: Date.now()
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err?.message || String(err),
      databaseId: firebase_applet_config_default.firestoreDatabaseId,
      projectId: firebase_applet_config_default.projectId,
      timestamp: Date.now()
    });
  }
});
app.post("/api/admin/sync-full-database", async (req, res) => {
  try {
    const { newAdminEmail } = req.body || {};
    const cleanAdminEmail = typeof newAdminEmail === "string" ? newAdminEmail.trim().toLowerCase() : "";
    const settings = readStoreData("settings", {});
    if (settings && Object.keys(settings).length > 0) {
      const payload = {
        ...settings,
        updatedAt: Date.now(),
        updatedBy: cleanAdminEmail || settings.updatedBy || "jerime.rego@gmail.com"
      };
      await (0, import_firestore.setDoc)((0, import_firestore.doc)(serverDb, "system_settings", "global"), payload, { merge: true });
    }
    const users = readStoreData("users", []);
    let syncedUsers = 0;
    for (const u of users) {
      if (!u || !u.id) continue;
      const emailLower = (u.email || "").toLowerCase().trim();
      const isAdmin = emailLower === "jerime.rego@gmail.com" || cleanAdminEmail && emailLower === cleanAdminEmail || u.role === "admin";
      const uPayload = {
        ...u,
        role: isAdmin ? "admin" : u.role || "user",
        subscription_status: isAdmin ? "pago" : u.subscription_status || "free",
        free_used: isAdmin ? true : Boolean(u.free_used),
        ...isAdmin ? { subscription_expires_at: 4102444799999, plan_name: "Administrador Vital\xEDcio" } : {}
      };
      await (0, import_firestore.setDoc)((0, import_firestore.doc)(serverDb, "users", u.id), uPayload, { merge: true });
      syncedUsers++;
    }
    if (cleanAdminEmail) {
      const exists = users.some((u) => (u.email || "").toLowerCase().trim() === cleanAdminEmail);
      if (!exists) {
        const newId = `user-admin-${cleanAdminEmail.split("@")[0].replace(/[^a-zA-Z0-9]/g, "")}`;
        await (0, import_firestore.setDoc)(
          (0, import_firestore.doc)(serverDb, "users", newId),
          {
            id: newId,
            name: cleanAdminEmail.split("@")[0],
            email: cleanAdminEmail,
            role: "admin",
            subscription_status: "pago",
            subscription_expires_at: 4102444799999,
            plan_name: "Administrador Vital\xEDcio",
            free_used: true,
            profession: "enfermeiro",
            workplace: "Aten\xE7\xE3o Prim\xE1ria \xE0 Sa\xFAde",
            createdAt: Date.now()
          },
          { merge: true }
        );
        syncedUsers++;
      }
    }
    const patients = readStoreData("patients", []);
    let syncedPatients = 0;
    for (const p of patients) {
      if (!p || !p.id) continue;
      await (0, import_firestore.setDoc)((0, import_firestore.doc)(serverDb, "patients", p.id), p, { merge: true });
      syncedPatients++;
    }
    const consultations = readStoreData("consultations", []);
    let syncedConsultations = 0;
    for (const c of consultations) {
      if (!c || !c.id) continue;
      await (0, import_firestore.setDoc)((0, import_firestore.doc)(serverDb, "consultations", c.id), c, { merge: true });
      syncedConsultations++;
    }
    const appointments = readStoreData("appointments", []);
    let syncedAppointments = 0;
    for (const a of appointments) {
      if (!a || !a.id) continue;
      await (0, import_firestore.setDoc)((0, import_firestore.doc)(serverDb, "appointments", a.id), a, { merge: true });
      syncedAppointments++;
    }
    res.json({
      success: true,
      message: "Banco de dados sincronizado e populado com sucesso a partir dos dados locais!",
      syncedPatients,
      syncedConsultations,
      syncedUsers,
      syncedAppointments,
      newAdminEmail: cleanAdminEmail || null,
      timestamp: Date.now()
    });
  } catch (err) {
    console.error("[SyncDatabase] Erro ao sincronizar banco:", err);
    res.status(500).json({
      success: false,
      error: "SYNC_FAILED",
      message: err?.message || String(err)
    });
  }
});
function sanitizeForFirestoreServer(val) {
  if (val === void 0) {
    return null;
  }
  if (val === null || typeof val !== "object") {
    return val;
  }
  if (Array.isArray(val)) {
    return val.map((item) => sanitizeForFirestoreServer(item)).filter((item) => item !== void 0);
  }
  const clean = {};
  for (const [key, value] of Object.entries(val)) {
    if (value !== void 0) {
      clean[key] = sanitizeForFirestoreServer(value);
    }
  }
  return clean;
}
app.get("/api/db/:collection", async (req, res) => {
  const { collection } = req.params;
  const localData = readStoreData(collection, collection === "settings" ? {} : []);
  let supabaseItems = [];
  try {
    let sbTable = collection;
    if (collection === "settings" || collection === "system_settings") {
      sbTable = "system_settings";
    }
    const { data: sbData, error: sbErr } = await supabaseServer.from(sbTable).select("*");
    if (!sbErr && sbData && Array.isArray(sbData)) {
      if (sbTable === "system_settings") {
        const globalRow = sbData.find((r) => r.id === "global") || sbData[0];
        if (globalRow && globalRow.data) {
          const mergedSettings = { ...localData, ...globalRow.data };
          writeStoreData("settings", mergedSettings);
          return res.json({ success: true, collection, data: mergedSettings });
        }
      } else {
        supabaseItems = sbData.map((row) => {
          if (row.raw_data && typeof row.raw_data === "object") {
            return { ...row.raw_data, id: row.id };
          }
          return row;
        });
      }
    }
  } catch (err) {
    console.debug("[Supabase Server Fetch Notice]:", err?.message || err);
  }
  if (collection === "settings") {
    try {
      const snap = await (0, import_firestore.getDoc)((0, import_firestore.doc)(serverDb, "system_settings", "global"));
      if (snap.exists()) {
        const firestoreData = snap.data();
        const mergedSettings = { ...localData, ...firestoreData };
        if (JSON.stringify(localData) !== JSON.stringify(mergedSettings)) {
          writeStoreData("settings", mergedSettings);
        }
        return res.json({ success: true, collection, data: mergedSettings });
      }
    } catch (err) {
      console.warn(`[ServerFirestore] Leitura remota para settings em fallback:`, err?.message || err);
    }
    return res.json({ success: true, collection, data: localData });
  }
  const firestoreColName = collection === "settings" ? "system_settings" : collection;
  let firestoreItems = [];
  try {
    const snap = await (0, import_firestore.getDocs)((0, import_firestore.collection)(serverDb, firestoreColName));
    if (!snap.empty) {
      snap.forEach((docSnap) => {
        firestoreItems.push({ ...docSnap.data(), id: docSnap.id });
      });
    }
  } catch (err) {
    console.warn(`[ServerFirestore] Leitura remota para ${collection} em fallback:`, err?.message || err);
  }
  const mergedMap = /* @__PURE__ */ new Map();
  supabaseItems.forEach((it) => {
    if (it && it.id) mergedMap.set(it.id, it);
  });
  firestoreItems.forEach((it) => {
    if (it && it.id && !mergedMap.has(it.id)) {
      mergedMap.set(it.id, it);
    }
  });
  if (Array.isArray(localData)) {
    localData.forEach((localIt) => {
      if (!localIt || !localIt.id) return;
      const remoteIt = mergedMap.get(localIt.id);
      if (!remoteIt) {
        mergedMap.set(localIt.id, localIt);
      } else {
        const localTs = Number(localIt.updatedAt || localIt.timestamp || localIt.createdAt || 0);
        const remoteTs = Number(remoteIt.updatedAt || remoteIt.timestamp || remoteIt.createdAt || 0);
        if (localTs > remoteTs) {
          mergedMap.set(localIt.id, { ...remoteIt, ...localIt });
        }
      }
    });
  }
  let data = Array.from(mergedMap.values());
  if (collection === "subscriptions" && Array.isArray(data)) {
    const now = Date.now();
    data = data.filter((sub) => {
      if (!sub) return false;
      const isPendingOrExpired = sub.status === "pendente" || sub.status === "expirado";
      if (isPendingOrExpired && sub.expiresAt && sub.expiresAt <= now) {
        return false;
      }
      return true;
    });
  }
  if (collection === "consultations" || collection === "reception_queue" || collection === "appointments") {
    data.sort((a, b) => (Number(b.timestamp || b.createdAt) || 0) - (Number(a.timestamp || a.createdAt) || 0));
  }
  const storeFilePath = getStoreFilePath(collection);
  if (!import_fs.default.existsSync(storeFilePath) || JSON.stringify(localData) !== JSON.stringify(data)) {
    writeStoreData(collection, data);
  }
  res.json({ success: true, collection, data });
});
app.post("/api/subscriptions/cleanup-expired", async (req, res) => {
  try {
    const list = readStoreData("subscriptions", []);
    const now = Date.now();
    const initialCount = list.length;
    const filtered = list.filter((sub) => {
      if (!sub) return false;
      const isPendingOrExpired = sub.status === "pendente" || sub.status === "expirado";
      if (isPendingOrExpired && sub.expiresAt && sub.expiresAt <= now) {
        return false;
      }
      return true;
    });
    const removedCount = initialCount - filtered.length;
    if (removedCount > 0) {
      writeStoreData("subscriptions", filtered);
    }
    res.json({
      success: true,
      removedCount,
      remainingCount: filtered.length,
      timestamp: now
    });
  } catch (error) {
    console.error("Erro ao limpar assinaturas expiradas:", error);
    res.status(500).json({ error: "Erro na rotina de limpeza de assinaturas expiradas." });
  }
});
app.post("/api/db/:collection", async (req, res) => {
  const { collection } = req.params;
  const item = req.body;
  if (collection === "settings") {
    const current = readStoreData("settings", {});
    const updated = { ...current, ...item, updatedAt: Date.now() };
    writeStoreData("settings", updated);
    syncItemToSupabase("settings", updated).catch(() => {
    });
    (0, import_firestore.setDoc)((0, import_firestore.doc)(serverDb, "system_settings", "global"), updated, { merge: true }).catch((err) => {
      console.warn("[ServerFirestore] Erro ao sincronizar settings no Firestore:", err?.message || err);
    });
    return res.json({ success: true, data: updated });
  }
  const list = readStoreData(collection, []);
  const itemId = item.id || `doc-${Date.now()}`;
  const itemWithId = { ...item, id: itemId };
  const existingIdx = list.findIndex(
    (x) => x && (x.id === itemId || collection === "users" && x.email && itemWithId.email && typeof x.email === "string" && typeof itemWithId.email === "string" && x.email.toLowerCase().trim() === itemWithId.email.toLowerCase().trim())
  );
  if (existingIdx >= 0) {
    list[existingIdx] = { ...list[existingIdx], ...itemWithId };
  } else {
    list.unshift(itemWithId);
  }
  writeStoreData(collection, list);
  syncItemToSupabase(collection, itemWithId).catch(() => {
  });
  const firestoreColName = collection === "settings" ? "system_settings" : collection;
  (0, import_firestore.setDoc)((0, import_firestore.doc)(serverDb, firestoreColName, itemId), sanitizeForFirestoreServer(itemWithId), { merge: true }).catch((err) => {
    console.warn(`[ServerFirestore] Erro ao sincronizar ${itemId} em ${collection} no Firestore:`, err?.message || err);
  });
  if (collection === "consultations" && itemWithId.patientId) {
    const authorProf = (itemWithId.authorProfession || "").toLowerCase();
    const isAdminOrReception = authorProf === "administrativo" || authorProf === "recepcao" || authorProf === "recepcionista";
    if (!isAdminOrReception) {
      setTimeout(async () => {
        try {
          console.log(`[Auto-Evolution Trigger] Iniciando atualiza\xE7\xE3o de evolu\xE7\xE3o longitudinal para paciente ${itemWithId.patientId} ap\xF3s atendimento cl\xEDnico...`);
          const patientsList = readStoreData("patients", []);
          const allConsultations = readStoreData("consultations", []);
          const targetPatient = patientsList.find((p) => p && p.id === itemWithId.patientId);
          if (targetPatient) {
            const patientConsultations = allConsultations.filter((c) => c && c.patientId === targetPatient.id);
            if (patientConsultations.length > 0) {
              const { parsedEvolution, skippedAi } = await generateLongitudinalEvolutionWithCascade({
                patient: targetPatient,
                consultations: patientConsultations
              });
              if (!skippedAi) {
                const evolutionsList = readStoreData("clinical_evolutions", []);
                const exIdx = evolutionsList.findIndex((e) => e && (e.patientId === targetPatient.id || e.id === targetPatient.id));
                if (exIdx >= 0) {
                  evolutionsList[exIdx] = parsedEvolution;
                } else {
                  evolutionsList.unshift(parsedEvolution);
                }
                writeStoreData("clinical_evolutions", evolutionsList);
                await (0, import_firestore.setDoc)((0, import_firestore.doc)(serverDb, "clinical_evolutions", targetPatient.id), parsedEvolution, { merge: true });
                console.log(`[Auto-Evolution Trigger] Sucesso: Evolu\xE7\xE3o longitudinal do paciente ${targetPatient.fullName} atualizada e persistida (incremental).`);
              } else {
                console.log(`[Auto-Evolution Trigger] Paciente ${targetPatient.fullName} j\xE1 estava com prontu\xE1rio em dia. IA economizada.`);
              }
            }
          }
        } catch (autoEvolErr) {
          console.warn(`[Auto-Evolution Trigger] Falha ao processar evolu\xE7\xE3o autom\xE1tica do paciente ${itemWithId.patientId}:`, autoEvolErr?.message || autoEvolErr);
        }
      }, 500);
    }
  }
  res.json({ success: true, data: itemWithId, total: list.length });
});
function initNightlyEvolutionBatchJob() {
  let lastRunDateString = "";
  setInterval(async () => {
    try {
      const now = /* @__PURE__ */ new Date();
      const dayOfWeek = now.getDay();
      const hour = now.getHours();
      const minute = now.getMinutes();
      const dateString = now.toISOString().split("T")[0];
      const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
      const isNightlyTargetTime = hour === 23 && minute >= 0 && minute <= 5;
      if (isWeekday && isNightlyTargetTime && lastRunDateString !== dateString) {
        lastRunDateString = dateString;
        console.log(`[Nightly Evolution Batch] Iniciando rotina noturna (Seg-Sex 23h) - Data: ${dateString}...`);
        const patients = readStoreData("patients", []);
        const consultations = readStoreData("consultations", []);
        const appointments = readStoreData("appointments", []);
        if (patients.length === 0 || consultations.length === 0) {
          console.log("[Nightly Evolution Batch] Sem pacientes ou prontu\xE1rios cadastrados para processamento.");
          return;
        }
        const activePatientsWithClinicalRecords = patients.filter((patient) => {
          if (!patient || !patient.id) return false;
          const patientCons = consultations.filter((c) => {
            if (!c || c.patientId !== patient.id) return false;
            const prof = (c.authorProfession || "").toLowerCase();
            return prof !== "administrativo" && prof !== "recepcao" && prof !== "recepcionista";
          });
          return patientCons.length > 0;
        });
        console.log(`[Nightly Evolution Batch] Identificados ${activePatientsWithClinicalRecords.length} pacientes com prontu\xE1rios cl\xEDnicos ativos.`);
        for (const patient of activePatientsWithClinicalRecords) {
          try {
            const patientConsultations = consultations.filter((c) => c && c.patientId === patient.id);
            const { parsedEvolution, skippedAi } = await generateLongitudinalEvolutionWithCascade({
              patient,
              consultations: patientConsultations,
              appointments
            });
            if (skippedAi) {
              console.log(`[Nightly Evolution Batch] Paciente ${patient.fullName} sem atendimentos pendentes de an\xE1lise. IA economizada.`);
              continue;
            }
            const evolutionsList = readStoreData("clinical_evolutions", []);
            const exIdx = evolutionsList.findIndex((e) => e && (e.patientId === patient.id || e.id === patient.id));
            if (exIdx >= 0) {
              evolutionsList[exIdx] = parsedEvolution;
            } else {
              evolutionsList.unshift(parsedEvolution);
            }
            writeStoreData("clinical_evolutions", evolutionsList);
            await (0, import_firestore.setDoc)((0, import_firestore.doc)(serverDb, "clinical_evolutions", patient.id), parsedEvolution, { merge: true });
            console.log(`[Nightly Evolution Batch] Evolu\xE7\xE3o incremental atualizada para paciente: ${patient.fullName}`);
            await new Promise((resolve) => setTimeout(resolve, 1500));
          } catch (patErr) {
            console.warn(`[Nightly Evolution Batch] Erro ao processar paciente ${patient.fullName}:`, patErr?.message || patErr);
          }
        }
        console.log(`[Nightly Evolution Batch] Rotina noturna finalizada com sucesso para ${activePatientsWithClinicalRecords.length} pacientes.`);
      }
    } catch (batchErr) {
      console.error("[Nightly Evolution Batch] Erro na execu\xE7\xE3o da rotina noturna:", batchErr);
    }
  }, 60 * 1e3);
}
app.delete("/api/db/:collection/:id", async (req, res) => {
  const { collection, id } = req.params;
  const list = readStoreData(collection, []);
  const filtered = list.filter((x) => x && x.id !== id);
  writeStoreData(collection, filtered);
  syncItemToSupabase(collection, null, true, id).catch(() => {
  });
  const firestoreColName = collection === "settings" ? "system_settings" : collection;
  (0, import_firestore.deleteDoc)((0, import_firestore.doc)(serverDb, firestoreColName, id)).catch((err) => {
    console.warn(`[ServerFirestore] Erro ao deletar ${id} em ${collection} no Firestore:`, err?.message || err);
  });
  res.json({ success: true, id, remaining: filtered.length });
});
var examVideosDir = import_path.default.join(process.cwd(), "data-store", "videos");
if (!import_fs.default.existsSync(examVideosDir)) {
  try {
    import_fs.default.mkdirSync(examVideosDir, { recursive: true });
  } catch (err) {
    console.warn("[ExamVideos] Erro ao criar diret\xF3rio de v\xEDdeos:", err);
  }
}
var VIDEO_CHUNK_BINARY_SIZE = 500 * 1024;
async function uploadVideoToFirestoreChunks(filename) {
  const filePath = import_path.default.join(examVideosDir, filename);
  if (!import_fs.default.existsSync(filePath)) return;
  try {
    const fileStat = import_fs.default.statSync(filePath);
    const fileBuffer = import_fs.default.readFileSync(filePath);
    const totalChunks = Math.ceil(fileBuffer.length / VIDEO_CHUNK_BINARY_SIZE);
    console.log(`[VideoSync] Sincronizando v\xEDdeo ${filename} (${(fileBuffer.length / (1024 * 1024)).toFixed(2)} MB, ${totalChunks} partes) para o Firestore...`);
    const BATCH_SIZE = 4;
    for (let i = 0; i < totalChunks; i += BATCH_SIZE) {
      const batchPromises = [];
      for (let j = i; j < Math.min(i + BATCH_SIZE, totalChunks); j++) {
        const start = j * VIDEO_CHUNK_BINARY_SIZE;
        const end = Math.min(start + VIDEO_CHUNK_BINARY_SIZE, fileBuffer.length);
        const chunkBase64 = fileBuffer.slice(start, end).toString("base64");
        const chunkDocRef = (0, import_firestore.doc)(serverDb, "exam_video_chunks", `${filename}_part_${j}`);
        batchPromises.push(
          (0, import_firestore.setDoc)(chunkDocRef, {
            filename,
            index: j,
            totalChunks,
            data: chunkBase64,
            size: end - start,
            updatedAt: Date.now()
          })
        );
      }
      await Promise.all(batchPromises);
    }
    await (0, import_firestore.setDoc)((0, import_firestore.doc)(serverDb, "exam_video_chunks", `${filename}_meta`), {
      filename,
      totalChunks,
      size: fileStat.size,
      mimeType: filename.endsWith(".webm") ? "video/webm" : "video/mp4",
      uploadedAt: Date.now()
    });
    console.log(`[VideoSync] Sincroniza\xE7\xE3o conclu\xEDda com sucesso para ${filename}!`);
  } catch (err) {
    console.error(`[VideoSync] Falha ao sincronizar ${filename} com Firestore:`, err);
  }
}
var pendingVideoDownloads = /* @__PURE__ */ new Map();
async function downloadVideoFromFirestoreChunks(filename) {
  const filePath = import_path.default.join(examVideosDir, filename);
  if (import_fs.default.existsSync(filePath)) return true;
  if (pendingVideoDownloads.has(filename)) {
    return pendingVideoDownloads.get(filename);
  }
  const downloadPromise = (async () => {
    try {
      console.log(`[VideoSync] Buscando ${filename} no Firestore...`);
      const metaDocRef = (0, import_firestore.doc)(serverDb, "exam_video_chunks", `${filename}_meta`);
      const metaSnap = await (0, import_firestore.getDoc)(metaDocRef);
      if (!metaSnap.exists()) {
        console.warn(`[VideoSync] Metadados de ${filename} n\xE3o encontrados no Firestore.`);
        return false;
      }
      const meta = metaSnap.data();
      const totalChunks = meta?.totalChunks || 0;
      if (totalChunks <= 0) return false;
      const chunkBuffers = new Array(totalChunks);
      const BATCH_SIZE = 4;
      for (let i = 0; i < totalChunks; i += BATCH_SIZE) {
        const batchPromises = [];
        for (let j = i; j < Math.min(i + BATCH_SIZE, totalChunks); j++) {
          const chunkDocRef = (0, import_firestore.doc)(serverDb, "exam_video_chunks", `${filename}_part_${j}`);
          batchPromises.push(
            (0, import_firestore.getDoc)(chunkDocRef).then((snap) => {
              if (snap.exists()) {
                const data = snap.data();
                if (data?.data) {
                  chunkBuffers[j] = Buffer.from(data.data, "base64");
                }
              }
            })
          );
        }
        await Promise.all(batchPromises);
      }
      for (let i = 0; i < totalChunks; i++) {
        if (!chunkBuffers[i]) {
          console.error(`[VideoSync] Parte ${i} de ${filename} ausente.`);
          return false;
        }
      }
      const assembledBuffer = Buffer.concat(chunkBuffers);
      import_fs.default.writeFileSync(filePath, assembledBuffer);
      console.log(`[VideoSync] Arquivo ${filename} baixado e montado no disco local com sucesso (${(assembledBuffer.length / (1024 * 1024)).toFixed(2)} MB)!`);
      return true;
    } catch (err) {
      console.error(`[VideoSync] Erro ao baixar chunks de ${filename}:`, err);
      return false;
    } finally {
      pendingVideoDownloads.delete(filename);
    }
  })();
  pendingVideoDownloads.set(filename, downloadPromise);
  return downloadPromise;
}
function syncAllLocalVideosToFirestore() {
  try {
    if (!import_fs.default.existsSync(examVideosDir)) return;
    const files = import_fs.default.readdirSync(examVideosDir).filter((f) => f.endsWith(".mp4") || f.endsWith(".webm"));
    console.log(`[VideoSync] Verificando ${files.length} v\xEDdeos locais para sincroniza\xE7\xE3o com Firestore...`);
    for (const file of files) {
      const metaDocRef = (0, import_firestore.doc)(serverDb, "exam_video_chunks", `${file}_meta`);
      (0, import_firestore.getDoc)(metaDocRef).then((snap) => {
        if (!snap.exists()) {
          console.log(`[VideoSync] Iniciando upload em segundo plano de ${file}...`);
          uploadVideoToFirestoreChunks(file).catch(() => {
          });
        }
      }).catch(() => {
      });
    }
  } catch (err) {
    console.warn("[VideoSync] Aviso no scanner de v\xEDdeos:", err);
  }
}
function streamVideoFile(req, res, filePath) {
  const stat = import_fs.default.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;
  const ext = import_path.default.extname(filePath).toLowerCase();
  const mimeType = ext === ".webm" ? "video/webm" : ext === ".ogg" ? "video/ogg" : "video/mp4";
  res.setHeader("Content-Type", mimeType);
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    if (start >= fileSize || end >= fileSize || start > end) {
      res.status(416).setHeader("Content-Range", `bytes */${fileSize}`);
      return res.end();
    }
    const chunksize = end - start + 1;
    const file = import_fs.default.createReadStream(filePath, { start, end });
    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunksize,
      "Content-Type": mimeType
    });
    file.pipe(res);
  } else {
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": mimeType,
      "Accept-Ranges": "bytes"
    });
    import_fs.default.createReadStream(filePath).pipe(res);
  }
}
app.get("/api/videos/:filename", async (req, res) => {
  const filename = import_path.default.basename(req.params.filename);
  const filePath = import_path.default.join(examVideosDir, filename);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  if (import_fs.default.existsSync(filePath)) {
    return streamVideoFile(req, res, filePath);
  }
  try {
    const downloaded = await downloadVideoFromFirestoreChunks(filename);
    if (downloaded && import_fs.default.existsSync(filePath)) {
      return streamVideoFile(req, res, filePath);
    }
  } catch (err) {
    console.error("[VideoRoute] Erro ao sincronizar v\xEDdeo do Firestore:", err);
  }
  return res.status(404).json({ error: "Arquivo de v\xEDdeo n\xE3o encontrado." });
});
var examVideoStorage = import_multer.default.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, examVideosDir);
  },
  filename: (_req, file, cb) => {
    const ext = import_path.default.extname(file.originalname).toLowerCase() || ".mp4";
    const unique = `exame-vid-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, unique);
  }
});
var examVideoUpload = (0, import_multer.default)({
  storage: examVideoStorage,
  limits: { fileSize: 300 * 1024 * 1024 },
  // Supports clinical videos up to 300MB
  fileFilter: (_req, file, cb) => {
    const isVideo = file.mimetype.startsWith("video/") || file.originalname.match(/\.(mp4|webm|ogg|mov|mkv|avi|m4v)$/i);
    if (isVideo) {
      cb(null, true);
    } else {
      cb(new Error("Formato n\xE3o suportado. Por favor, selecione um arquivo de v\xEDdeo v\xE1lido (.mp4, .webm, .mov)."));
    }
  }
});
app.post("/api/exam-media/upload-video", (req, res) => {
  examVideoUpload.single("video")(req, res, (err) => {
    if (err) {
      console.error("[UploadVideo] Erro durante o upload:", err);
      return res.status(400).json({ error: err.message || "Erro no upload do v\xEDdeo." });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo de v\xEDdeo foi recebido." });
    }
    const videoUrl = `/api/videos/${req.file.filename}`;
    console.log(`[UploadVideo] Conclu\xEDdo: ${req.file.filename} (${(req.file.size / (1024 * 1024)).toFixed(2)} MB)`);
    uploadVideoToFirestoreChunks(req.file.filename).catch((syncErr) => {
      console.warn("[UploadVideo] Aviso no sync em segundo plano:", syncErr);
    });
    res.json({
      success: true,
      filename: req.file.filename,
      videoUrl,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  });
});
app.post("/api/exam-media/save", async (req, res) => {
  try {
    const report = req.body;
    if (!report || !report.id) {
      return res.status(400).json({ error: "Dados do relat\xF3rio inv\xE1lidos." });
    }
    const currentList = readStoreData("exam_media", []);
    const existingIndex = currentList.findIndex((r) => r.id === report.id);
    if (existingIndex >= 0) {
      currentList[existingIndex] = { ...currentList[existingIndex], ...report, updatedAt: Date.now() };
    } else {
      currentList.unshift({ ...report, createdAt: Date.now() });
    }
    writeStoreData("exam_media", currentList.slice(0, 500));
    try {
      const docRef = (0, import_firestore.doc)(serverDb, "exam_media", report.id);
      await (0, import_firestore.setDoc)(docRef, { ...report, updatedAt: Date.now() }, { merge: true });
    } catch (fsErr) {
      console.warn("[ExamMediaSave] Aviso no sync Firestore:", fsErr);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message || "Erro ao salvar anexo de m\xEDdia." });
  }
});
async function resolveExamMediaReport(targetId) {
  if (!targetId) return null;
  const mediaReports = readStoreData("exam_media", []);
  for (const report of mediaReports) {
    if (report && Array.isArray(report.items)) {
      const match = report.items.find((item) => item && (item.id === targetId || String(item.order) === targetId));
      if (match) {
        return { item: match, report };
      }
    }
    if (report && report.id === targetId) {
      const firstVideo = report.items?.find((i) => i.type === "video") || report.items?.[0];
      return { item: firstVideo, report };
    }
  }
  try {
    const docRef = (0, import_firestore.doc)(serverDb, "exam_media", targetId);
    const snap = await (0, import_firestore.getDoc)(docRef);
    if (snap.exists()) {
      const report = snap.data();
      const firstVideo = report.items?.find((i) => i.type === "video") || report.items?.[0];
      return { item: firstVideo, report };
    }
    const colRef = (0, import_firestore.collection)(serverDb, "exam_media");
    const querySnap = await (0, import_firestore.getDocs)(colRef);
    for (const d of querySnap.docs) {
      const report = d.data();
      if (report && Array.isArray(report.items)) {
        const match = report.items.find((item) => item && (item.id === targetId || String(item.order) === targetId));
        if (match) {
          return { item: match, report };
        }
      }
    }
  } catch (err) {
    console.warn("[ExamMediaLookup] Aviso ao buscar no Firestore:", err);
  }
  try {
    const consCol = (0, import_firestore.collection)(serverDb, "consultations");
    const consSnap = await (0, import_firestore.getDocs)(consCol);
    for (const d of consSnap.docs) {
      const cons = d.data();
      if (cons?.examMedia && Array.isArray(cons.examMedia.items)) {
        const match = cons.examMedia.items.find((item) => item && (item.id === targetId || String(item.order) === targetId));
        if (match) {
          return { item: match, report: cons.examMedia };
        }
      }
    }
  } catch (err) {
    console.warn("[ExamMediaLookup] Aviso ao buscar em consultas:", err);
  }
  return null;
}
app.get("/api/exam-media/item/:id", async (req, res) => {
  const targetId = req.params.id;
  const result = await resolveExamMediaReport(targetId);
  if (result) {
    return res.json(result);
  }
  res.status(404).json({ error: "Item de exame n\xE3o encontrado." });
});
app.get(
  ["/watch-video", "/watch-video/:id", "/video", "/video/:id", "/assistir-video", "/assistir-video/:id"],
  async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Cache-Control", "no-cache");
    const id = req.params.id || "";
    const { videoUrl: qVideoUrl, v: qV, title: qTitle, t: qT, desc: qDesc, patient: qPatient, validUntil: qValidUntil } = req.query;
    let foundItem = null;
    let foundReport = null;
    if (id) {
      const resolved = await resolveExamMediaReport(id);
      if (resolved) {
        foundItem = resolved.item;
        foundReport = resolved.report;
      }
    }
    const fallbackUrl = typeof qVideoUrl === "string" ? qVideoUrl : typeof qV === "string" ? qV : "";
    let videoSrc = foundItem?.videoUrl || fallbackUrl;
    if (videoSrc.startsWith("data:")) {
      videoSrc = "";
    }
    const title = foundItem?.title || (typeof qTitle === "string" ? qTitle : typeof qT === "string" ? qT : "Exame em V\xEDdeo");
    const description = foundItem?.description || (typeof qDesc === "string" ? qDesc : "Registro audiovisual e laudo iconogr\xE1fico anexo ao prontu\xE1rio m\xE9dico do paciente.");
    const patientName = foundReport?.patientName || (typeof qPatient === "string" ? qPatient : "Cidad\xE3o Identificado");
    const validUntil = foundReport?.validUntilFormatted || (typeof qValidUntil === "string" ? qValidUntil : "Conforme legisla\xE7\xE3o vigente (Art. 6\xBA Lei 13.787/2018)");
    const workplace = foundReport?.workplace || "CENTRO DE ATEN\xC7\xC3O PSICOSSOCIAL (CAPS I) \u2022 PREFEITURA DE ANAJ\xC1S";
    const dateFormatted = foundReport?.dateFormatted || (/* @__PURE__ */ new Date()).toLocaleDateString("pt-BR");
    const professionalName = foundReport?.professionalName || "Profissional de Sa\xFAde Autorizado";
    const professionalRole = foundReport?.professionalRole || "Equipe Multiprofissional SUS";
    const professionalRegister = foundReport?.professionalRegister || "";
    const escape = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <meta name="theme-color" content="#0d9488" />
  <title>V\xEDdeo do Exame - ${escape(patientName)} | SUS PEC</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; -webkit-tap-highlight-color: transparent; }
    body { background: #090d16; color: #f1f5f9; min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 12px; }
    .card { width: 100%; max-width: 760px; background: #111827; border: 1px solid #1f2937; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.7); margin-top: 6px; }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 18px 20px; border-bottom: 1px solid #1e293b; text-align: center; position: relative; }
    .sub-badge { display: inline-flex; align-items: center; gap: 5px; background: #0d9488; color: #fff; font-size: 10.5px; font-weight: 800; padding: 3px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 8px; box-shadow: 0 2px 8px rgba(13,148,136,0.3); }
    .unit { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.4px; }
    .title { font-size: 18px; font-weight: 900; color: #fff; margin-top: 5px; letter-spacing: -0.3px; }
    .video-wrap { position: relative; width: 100%; background: #000; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 280px; }
    video { width: 100%; max-height: 520px; background: #000; outline: none; display: block; }
    .controls-bar { width: 100%; background: #0b1120; border-top: 1px solid #1e293b; padding: 10px 14px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; font-size: 11.5px; }
    .speed-btn { background: #1e293b; color: #cbd5e1; border: 1px solid #334155; padding: 5px 10px; border-radius: 8px; font-weight: 700; cursor: pointer; transition: all 0.15s ease; font-size: 11px; }
    .speed-btn:hover { background: #334155; color: #fff; }
    .speed-btn.active { background: #0d9488; color: #fff; border-color: #0d9488; }
    .body { padding: 22px; }
    .patient-row { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px; padding-bottom: 14px; border-bottom: 1px solid #1f2937; margin-bottom: 16px; font-size: 13.5px; }
    .patient-name { font-weight: 900; color: #2dd4bf; text-transform: uppercase; font-size: 15px; }
    .exam-date { font-weight: 700; color: #94a3b8; font-size: 12.5px; }
    .prof-box { margin-top: 14px; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 14px; background: #0f172a; border-radius: 10px; border: 1px solid #1e293b; font-size: 11.5px; color: #94a3b8; }
    .btn-wrap { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
    .btn { flex: 1; min-width: 140px; padding: 12px 18px; background: #0d9488; color: #fff; text-align: center; border-radius: 12px; text-decoration: none; font-size: 13px; font-weight: 800; transition: all 0.2s; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 12px rgba(13,148,136,0.3); }
    .btn:hover { background: #0f766e; transform: translateY(-1px); }
    .btn-secondary { background: #1e293b; color: #e2e8f0; border: 1px solid #334155; box-shadow: none; }
    .btn-secondary:hover { background: #334155; }
    .footer-sus { text-align: center; margin-top: 24px; padding-bottom: 20px; font-size: 10.5px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .loading-notice { display: none; padding: 25px 20px; text-align: center; color: #38bdf8; font-weight: 700; font-size: 13px; }
    .spinner { display: inline-block; width: 22px; height: 22px; border: 3px solid rgba(56, 189, 248, 0.2); border-top-color: #38bdf8; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 8px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="sub-badge">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        SUS \u2022 Sistema \xDAnico de Sa\xFAde
      </div>
      <div class="unit">${escape(workplace)}</div>
      <div class="title">${escape(title)}</div>
    </div>
    
    <div class="video-wrap">
      ${videoSrc ? `
      <video id="examVideo" controls playsinline preload="auto" src="${escape(videoSrc)}" poster="${escape(foundItem?.videoThumbnailDataUrl || "")}">
        <source src="${escape(videoSrc)}" type="video/mp4" />
        <source src="${escape(videoSrc)}" type="video/webm" />
        Seu dispositivo n\xE3o suporta a reprodu\xE7\xE3o deste formato de v\xEDdeo.
      </video>
      <div class="controls-bar">
        <div style="display: flex; align-items: center; gap: 5px; flex-wrap: wrap;">
          <span style="color: #94a3b8; font-weight: 800; font-size: 10.5px; text-transform: uppercase; margin-right: 2px;">Velocidade:</span>
          <button type="button" class="speed-btn" onclick="setSpeed(0.5, this)">0.5x</button>
          <button type="button" class="speed-btn active" onclick="setSpeed(1.0, this)">1.0x</button>
          <button type="button" class="speed-btn" onclick="setSpeed(1.25, this)">1.25x</button>
          <button type="button" class="speed-btn" onclick="setSpeed(1.5, this)">1.5x</button>
          <button type="button" class="speed-btn" onclick="setSpeed(2.0, this)">2.0x</button>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <button type="button" class="speed-btn" onclick="togglePlay()">\u23EF Play / Pausa</button>
          <button type="button" class="speed-btn" onclick="toggleFullscreen()">\u26F6 Tela Cheia</button>
        </div>
      </div>` : `
      <div style="padding: 48px 24px; text-align: center; color: #94a3b8;">
        <div style="font-size: 38px; margin-bottom: 12px;">\u{1F3A5}</div>
        <p style="font-weight: 800; font-size: 16px; color: #f1f5f9;">Arquivo de V\xEDdeo em Processamento</p>
        <p style="font-size: 12.5px; margin-top: 6px; color: #94a3b8; max-width: 440px; margin-left: auto; margin-right: auto; line-height: 1.5;">
          O anexo iconogr\xE1fico foi registrado pelo profissional de sa\xFAde. Caso o envio tenha ocorrido recentemente, o v\xEDdeo estar\xE1 dispon\xEDvel em alguns instantes.
        </p>
      </div>`}
      <div id="loadingNotice" class="loading-notice">
        <div class="spinner"></div>
        <div>Carregando e sincronizando v\xEDdeo em alta defini\xE7\xE3o...</div>
      </div>
    </div>

    <div class="body">
      <div class="patient-row">
        <div><strong style="color: #94a3b8; font-size: 11px; text-transform: uppercase; display: block; margin-bottom: 2px;">Paciente:</strong> <span class="patient-name">${escape(patientName)}</span></div>
        <div class="exam-date">\u{1F4C5} ${escape(dateFormatted)}</div>
      </div>

      <div class="prof-box">
        <div>
          <strong style="color: #f1f5f9;">${escape(professionalName)}</strong>
          <span style="display: block; font-size: 10.5px; color: #64748b;">${escape(professionalRole)} ${professionalRegister ? `\u2022 ${escape(professionalRegister)}` : ""}</span>
        </div>
        <div style="text-align: right; font-weight: 700; color: #2dd4bf; font-size: 11px;">
          \u2713 Assinado Digitalmente
        </div>
      </div>

      <div class="btn-wrap">
        ${videoSrc ? `
        <a href="${escape(videoSrc)}" download="exame-video-${id || "paciente"}.mp4" class="btn">
          \u2B07\uFE0F Baixar C\xF3pia MP4
        </a>` : ""}
        <button type="button" class="btn btn-secondary" onclick="shareVideoLink()">
          \u{1F4E4} Compartilhar Link
        </button>
      </div>
    </div>
  </div>

  <div class="footer-sus">
    Prefeitura Municipal de Anaj\xE1s \u2022 Secretaria Municipal de Sa\xFAde \u2022 Rede de Aten\xE7\xE3o Psicossocial
  </div>

  <script>
    var video = document.getElementById('examVideo');
    var loadingNotice = document.getElementById('loadingNotice');

    function setSpeed(speed, btn) {
      if (video) {
        video.playbackRate = speed;
        document.querySelectorAll('.speed-btn').forEach(function(b) {
          if (b.textContent.includes('x')) b.classList.remove('active');
        });
        if (btn) btn.classList.add('active');
      }
    }

    function togglePlay() {
      if (!video) return;
      if (video.paused) {
        video.play();
      } else {
        video.pause();
      }
    }

    function toggleFullscreen() {
      if (!video) return;
      if (video.requestFullscreen) {
        video.requestFullscreen();
      } else if (video.webkitRequestFullscreen) {
        video.webkitRequestFullscreen();
      }
    }

    function shareVideoLink() {
      if (navigator.share) {
        navigator.share({
          title: document.title,
          text: 'Acesse o v\xEDdeo do exame m\xE9dico pelo prontu\xE1rio SUS:',
          url: window.location.href
        }).catch(function() {});
      } else {
        navigator.clipboard.writeText(window.location.href);
        alert('Link do v\xEDdeo copiado para a \xE1rea de transfer\xEAncia!');
      }
    }

    // Auto-recovery: if video fails to load because it is still syncing to this instance, retry after 2 seconds
    if (video) {
      var retryCount = 0;
      video.addEventListener('error', function(e) {
        console.warn('V\xEDdeo ainda n\xE3o dispon\xEDvel ou em sincroniza\xE7\xE3o:', e);
        if (retryCount < 5 && loadingNotice) {
          retryCount++;
          loadingNotice.style.display = 'block';
          setTimeout(function() {
            var currentSrc = video.getAttribute('src');
            video.src = currentSrc + (currentSrc.includes('?') ? '&' : '?') + '_t=' + Date.now();
            video.load();
          }, 2500);
        }
      });
      video.addEventListener('canplay', function() {
        if (loadingNotice) loadingNotice.style.display = 'none';
      });
    }
  </script>
</body>
</html>`;
    res.send(html);
  }
);
async function startServer() {
  const isProduction = process.env.NODE_ENV === "production" || typeof __filename !== "undefined" && __filename.includes("dist") || typeof __dirname !== "undefined" && __dirname.includes("dist");
  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: [
            "**/data-store/**",
            "**/data-store/**/*",
            "**/.system_generated/**",
            "**/*.log"
          ]
        }
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`[e-SUS PEC AI Server] Rodando na porta ${PORT}`);
    console.log(`  \u279C  Local:   http://localhost:${PORT}/`);
    console.log(`  \u279C  Network: http://0.0.0.0:${PORT}/`);
    try {
      initNightlyEvolutionBatchJob();
    } catch (err) {
      console.warn("[NightlyBatch] Aviso:", err);
    }
    try {
      syncAllLocalVideosToFirestore();
    } catch (err) {
      console.warn("[VideoSync] Aviso:", err);
    }
  });
  server.on("error", (err) => {
    if (err?.code === "EADDRINUSE") {
      console.error(`[e-SUS PEC AI Server] Erro: A porta ${PORT} j\xE1 est\xE1 em uso (EADDRINUSE).`);
    } else {
      console.error("[e-SUS PEC AI Server] Erro no servidor HTTP:", err);
    }
  });
}
startServer().catch((err) => {
  console.error("[e-SUS PEC AI Server] Falha cr\xEDtica ao inicializar o servidor:", err);
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  supabaseServer
});
//# sourceMappingURL=server.cjs.map
