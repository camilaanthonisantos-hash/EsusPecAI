import express from "express";
import path from "path";
import dns from "dns";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import multer from "multer";

dotenv.config();

const app = express();

// Parse port dynamically from command line arguments (--port 3000) or env, defaulting to 3000
let PORT = 3000;
const portArgIndex = process.argv.indexOf("--port");
if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
  const parsed = parseInt(process.argv[portArgIndex + 1], 10);
  if (!isNaN(parsed)) PORT = parsed;
} else if (process.env.PORT) {
  const parsed = parseInt(process.env.PORT, 10);
  if (!isNaN(parsed)) PORT = parsed;
}

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

function getFriendlyModelNameServer(modelId?: string): string {
  if (!modelId || typeof modelId !== 'string') return 'Gemini 3.7 Flash';
  const clean = modelId.trim().toLowerCase();
  if (clean.includes('ling-3.0-flash-sante') || clean.includes('sante')) return 'Ling 3.0 Flash Santé (Free)';
  if (clean.includes('ling-3.0-flash') || clean.includes('ling-3.0')) return 'Ling 3.0 Flash (Free)';
  if (clean.includes('whisper-large-v3-turbo') || clean.includes('v3-turbo')) return 'Groq Whisper Large v3 Turbo';
  if (clean.includes('whisper-large-v3') || clean.includes('whisper')) return 'Groq Whisper Large v3';
  if (clean.includes('3.7-flash') || clean === 'gemini-3.7-flash') return 'Gemini 3.7 Flash';
  if (clean.includes('3.8-flash') || clean === 'gemini-3.8-flash') return 'Gemini 3.8 Flash';
  if (clean.includes('3.6-flash') || clean === 'gemini-3.6-flash') return 'Gemini 3.6 Flash';
  if (clean.includes('3.1-flash-lite') || clean.includes('lite')) return 'Gemini 3.1 Flash Lite';
  if (clean.includes('3.1-pro') || clean.includes('gemini-pro') || clean.includes('2.5-pro')) return 'Gemini 3.1 Pro';
  if (clean.includes('2.5-flash')) return 'Gemini 2.5 Flash';
  if (clean.includes('2.0-flash-thinking')) return 'Gemini 2.0 Flash Thinking (OpenRouter Free)';
  if (clean.includes('2.0-flash-lite')) return 'Gemini 2.0 Flash Lite';
  if (clean.includes('2.0-flash-exp')) return 'Gemini 2.0 Flash (OpenRouter Free)';
  if (clean.includes('2.0-flash')) return 'Gemini 2.0 Flash';
  if (clean.includes('gpt-4o-mini')) return clean.includes('openrouter') ? 'GPT-4o Mini (OpenRouter)' : 'OpenAI GPT-4o Mini';
  if (clean.includes('gpt-4o')) return 'OpenAI GPT-4o';
  if (clean.includes('o3-mini')) return clean.includes('openrouter') ? 'OpenAI o3-mini (OpenRouter)' : 'OpenAI o3-mini';
  if (clean.includes('o1-preview')) return 'OpenAI o1 Preview';
  if (clean.includes('o1-mini')) return 'OpenAI o1 Mini';
  if (clean === 'openai:o1' || clean.endsWith(':o1') || clean === 'o1') return 'OpenAI o1';
  if (clean.includes('deepseek-r1')) return 'DeepSeek R1 (OpenRouter Free)';
  if (clean.includes('deepseek-chat') || clean.includes('deepseek-v3')) return 'DeepSeek V3 (OpenRouter Free)';
  if (clean.includes('llama-3.3-70b-instruct:free') || (clean.includes('llama-3.3') && clean.includes('free'))) return 'Llama 3.3 70B Instruct (OpenRouter Free)';
  if (clean.includes('llama-3.3')) return 'Llama 3.3 70B (OpenRouter)';
  if (clean.includes('llama-3.1-8b-instruct:free') || (clean.includes('llama-3.1-8b') && clean.includes('free'))) return 'Llama 3.1 8B Instruct (OpenRouter Free)';
  if (clean.includes('llama-3.1-8b')) return 'Llama 3.1 8B (OpenRouter)';
  if (clean.includes('llama-3.2-3b')) return 'Llama 3.2 3B Instruct (OpenRouter Free)';
  if (clean.includes('llama-3.2-1b')) return 'Llama 3.2 1B Instruct (OpenRouter Free)';
  if (clean.includes('llama-3.1-70b')) return 'Llama 3.1 70B Instruct (OpenRouter Free)';
  if (clean.includes('qwen-2.5-coder')) return 'Qwen 2.5 Coder 32B (OpenRouter Free)';
  if (clean.includes('qwen-2.5-72b:free') || (clean.includes('qwen-2.5') && clean.includes('free'))) return 'Qwen 2.5 72B Instruct (OpenRouter Free)';
  if (clean.includes('qwen-2.5') || clean.includes('qwen')) return 'Qwen 2.5 72B Instruct (OpenRouter)';
  if (clean.includes('claude-3.5-haiku')) return 'Claude 3.5 Haiku (OpenRouter)';
  if (clean.includes('claude-3.5-sonnet') || clean.includes('claude')) return 'Claude 3.5 Sonnet (OpenRouter)';
  if (clean.includes('gemma-2')) return 'Google Gemma 2 9B (OpenRouter)';
  if (clean.includes('mistral-small')) return 'Mistral Small 24B (OpenRouter Free)';
  if (clean.includes('mistral-7b')) return 'Mistral 7B Instruct (OpenRouter Free)';
  if (clean.includes('mistral-nemo') || clean.includes('mistral')) return 'Mistral Nemo (OpenRouter)';
  if (clean.includes('phi-3')) return 'Microsoft Phi-3 Medium (OpenRouter Free)';
  return modelId
    .replace(/^(openai:|openrouter:|groq:|google\/|meta-llama\/|anthropic\/|inclusionai\/|deepseek\/|qwen\/|mistralai\/|microsoft\/)/i, '')
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Resilient multi-provider fallback executor (OpenRouter / OpenAI / Google Gemini)
interface MultiProviderFallbackParams {
  primaryModelId: string;
  fallbackChain?: string[];
  systemInstruction?: string;
  userPrompt: string;
  temperature?: number;
  responseMimeType?: string;
  geminiApiKey?: string;
  openaiApiKey?: string;
  openrouterApiKey?: string;
  onModelTransition?: (info: { currentModel: string; previousModel?: string; isFallback: boolean; reason?: string }) => void;
}

async function executeMultiProviderWithFallback(
  params: MultiProviderFallbackParams
): Promise<{ text: string; modelUsed: string }> {
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
    onModelTransition,
  } = params;

  // Retrieve global settings from persistent store
  const systemSettings = readStoreData("settings", {});

  // Build candidate chain starting with primaryModelId, followed by fallbackChain without duplicates
  const candidateModels: string[] = [];
  const rawList = [primaryModelId, ...fallbackChain];
  for (const m of rawList) {
    if (typeof m === "string" && m.trim()) {
      const clean = m.trim();
      if (!candidateModels.includes(clean)) {
        candidateModels.push(clean);
      }
    }
  }

  // Safety fallbacks if list doesn't contain reliable Gemini models
  if (!candidateModels.includes("gemini-3.7-flash")) candidateModels.push("gemini-3.7-flash");
  if (!candidateModels.includes("gemini-3.6-flash")) candidateModels.push("gemini-3.6-flash");
  if (!candidateModels.includes("gemini-3.1-flash-lite")) candidateModels.push("gemini-3.1-flash-lite");

  let lastError: any = null;

  for (let i = 0; i < candidateModels.length; i++) {
    const candidate = candidateModels[i];
    const previousModel = i > 0 ? candidateModels[i - 1] : undefined;

    const isOpenRouter = candidate.startsWith("openrouter:") || candidate.includes("inclusionai/") || candidate.includes("meta-llama/") || candidate.includes("anthropic/") || candidate.includes("mistralai/") || candidate.includes("google/gemma") || candidate.includes("deepseek/") || candidate.includes("qwen/") || candidate.includes("microsoft/");
    const isOpenAI = !isOpenRouter && (candidate.startsWith("openai:") || candidate.startsWith("gpt-") || candidate.startsWith("o1") || candidate.startsWith("o3"));
    const isGemini = !isOpenRouter && !isOpenAI;

    if (i > 0 && onModelTransition) {
      onModelTransition({
        currentModel: candidate,
        previousModel,
        isFallback: true,
        reason: `Alternando para modelo de contingência (${getFriendlyModelNameServer(candidate)})`,
      });
    }

    // 1. OPENROUTER
    if (isOpenRouter) {
      const effectiveKey = (customOpenRouterKey || systemSettings.openrouterApiKey || process.env.OPENROUTER_API_KEY || "").trim();
      if (!effectiveKey) {
        console.warn(`[AI Cascade] Chave de API do OpenRouter não configurada. Pulando modelo ${candidate} imediatamente...`);
        continue;
      }

      // CRITICAL: Strip "openrouter:" prefix so OpenRouter API receives pure slug (e.g. "inclusionai/ling-3.0-flash-sante:free")
      const cleanSlug = candidate.replace(/^openrouter:\s*/i, "").trim();
      console.log(`[AI Cascade] Tentando OpenRouter (${cleanSlug})...`);

      try {
        const client = new OpenAI({
          apiKey: effectiveKey,
          baseURL: "https://openrouter.ai/api/v1",
          defaultHeaders: {
            "HTTP-Referer": "https://esus-pec-multiprofissional.gov.br",
            "X-Title": "e-SUS PEC Multiprofissional",
          },
          timeout: 30000,
        });

        const completion = await client.chat.completions.create({
          model: cleanSlug,
          temperature,
          messages: [
            ...(systemInstruction ? [{ role: "system" as const, content: systemInstruction }] : []),
            { role: "user" as const, content: userPrompt },
          ],
          response_format: responseMimeType === "application/json" ? { type: "json_object" } : undefined,
        });

        const outputText = completion.choices[0]?.message?.content || "";
        if (outputText && outputText.trim().length > 0) {
          console.log(`[AI Cascade] Sucesso com OpenRouter (${cleanSlug})!`);
          return { text: outputText, modelUsed: candidate };
        }
      } catch (err: any) {
        console.warn(`[AI Cascade] OpenRouter (${cleanSlug}) falhou:`, err?.message || err);
        lastError = err;
        continue;
      }
    } else if (isOpenAI) {
      // 2. OPENAI
      const effectiveKey = (customOpenAiKey || systemSettings.openaiApiKey || process.env.OPENAI_API_KEY || "").trim();
      if (!effectiveKey) {
        console.warn(`[AI Cascade] Chave de API da OpenAI não configurada. Pulando modelo ${candidate} imediatamente...`);
        continue;
      }

      const cleanSlug = candidate.replace(/^openai:\s*/i, "").trim();
      console.log(`[AI Cascade] Tentando OpenAI (${cleanSlug})...`);

      try {
        const client = new OpenAI({
          apiKey: effectiveKey,
          timeout: 30000,
        });

        const completion = await client.chat.completions.create({
          model: cleanSlug,
          temperature,
          messages: [
            ...(systemInstruction ? [{ role: "system" as const, content: systemInstruction }] : []),
            { role: "user" as const, content: userPrompt },
          ],
          response_format: responseMimeType === "application/json" ? { type: "json_object" } : undefined,
        });

        const outputText = completion.choices[0]?.message?.content || "";
        if (outputText && outputText.trim().length > 0) {
          console.log(`[AI Cascade] Sucesso com OpenAI (${cleanSlug})!`);
          return { text: outputText, modelUsed: candidate };
        }
      } catch (err: any) {
        console.warn(`[AI Cascade] OpenAI (${cleanSlug}) falhou:`, err?.message || err);
        lastError = err;
        continue;
      }
    } else {
      // 3. GEMINI
      const effectiveKey = (customGeminiKey || systemSettings.geminiApiKey || process.env.GEMINI_API_KEY || "").trim();
      if (!effectiveKey) {
        console.warn(`[AI Cascade] Chave de API do Gemini não configurada. Pulando modelo ${candidate}...`);
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
            responseMimeType,
          },
        });

        const outputText = resp.text || "";
        if (outputText && outputText.trim().length > 0) {
          console.log(`[AI Cascade] Sucesso com Gemini (${cleanSlug})!`);
          return { text: outputText, modelUsed: candidate };
        }
      } catch (err: any) {
        console.warn(`[AI Cascade] Gemini (${cleanSlug}) falhou:`, err?.message || err);
        lastError = err;
        continue;
      }
    }
  }

  throw lastError || new Error("Não foi possível obter resposta de nenhum modelo da cascata de contingência.");
}

// Resilient helper to call Gemini models with automatic fallback on timeout or model availability
async function generateContentWithFallback(
  ai: GoogleGenAI,
  preferredModel: string,
  generateParams: {
    contents: any;
    config?: any;
  },
  onModelTransition?: (info: { currentModel: string; previousModel?: string; isFallback: boolean; reason?: string }) => void
) {
  // Ordered model candidates starting with preferredModel
  const candidateModels: string[] = [];

  if (preferredModel) {
    candidateModels.push(preferredModel);
  }

  // Fast, high-availability free-tier compatible candidates
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

  let lastError: any = null;

  for (let i = 0; i < candidateModels.length; i++) {
    const modelToTry = candidateModels[i];
    const previousModel = i > 0 ? candidateModels[i - 1] : undefined;

    if (i > 0 && onModelTransition) {
      onModelTransition({
        currentModel: modelToTry,
        previousModel,
        isFallback: true,
        reason: 'Alternando modelo devido a limite de cota ou instabilidade'
      });
    }

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

      // If Quota Exceeded (429) because model has limit: 0 on free tier (e.g. Pro on free key), switch immediately
      if (errMsg.includes("limit: 0")) {
        console.warn(`[Gemini API] Modelo ${modelToTry} possui cota 0 no plano atual. Alternando imediatamente para candidato com cota gratuita...`);
        continue;
      }

      // If Quota Exceeded (429) rate limit or 503, wait briefly before trying next model
      if (err?.status === 429 || err?.status === 503) {
        console.warn(`[Gemini API] Taxa limite atingida (429/503). Tentando próximo modelo...`);
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
  }

  throw lastError || new Error("Não foi possível obter resposta dos modelos do Gemini.");
}

// Friendly AI error formatter
function formatFriendlyAIError(error: any): string {
  if (!error) return "Ocorreu um erro desconhecido ao processar com a IA.";

  const rawMsg = String(error.message || error || "");
  const status = error.status || error.statusCode || error.response?.status;

  // 1. Google Gemini Quota / Resource Exhausted (429)
  if (status === 429 || rawMsg.includes("RESOURCE_EXHAUSTED") || rawMsg.includes("Quota exceeded")) {
    if (rawMsg.includes("limit: 0")) {
      return "O modelo solicitado (ex: Gemini Pro) requer faturamento ativo (chave paga) na Google AI Studio e possui cota 0 no plano gratuito. Por favor, selecione Gemini 3.7 Flash, Gemini 3.1 Flash Lite ou utilize outro provedor (OpenAI/OpenRouter).";
    }

    const retryMatch = rawMsg.match(/retry in\s+([0-9.]+\s*s(?:ec)?)/i) || rawMsg.match(/retryDelay[:"\s]+(\d+s?)/i);
    const retryDelay = retryMatch ? ` (tente novamente em ~${retryMatch[1].trim()})` : "";
    return `Limite de requisições por minuto da cota gratuita do Gemini atingido temporariamente${retryDelay}. Por favor, aguarde alguns instantes ou alterne para outro modelo/provedor nas Configurações.`;
  }

  // 2. Model Not Found / Access Denied (404)
  if (status === 404 || rawMsg.includes("404") || rawMsg.includes("does not exist or you do not have access")) {
    return "O modelo selecionado não foi encontrado ou não está acessível com a sua chave de API. Verifique o nome do modelo e as permissões de acesso da sua conta.";
  }

  // 3. Invalid API Key / Unauthorized (401 / 403)
  if (status === 401 || status === 403 || rawMsg.includes("API_KEY_INVALID") || rawMsg.includes("invalid_api_key")) {
    return "Chave de API inválida ou sem permissão de acesso. Verifique a chave configurada no menu de Configurações do Sistema.";
  }

  // 4. OpenAI / OpenRouter Quota or Insufficient Credits (429)
  if (rawMsg.includes("insufficient_quota") || rawMsg.includes("billing_not_active")) {
    return "Cota ou créditos insuficientes na sua conta do provedor de IA (OpenAI / OpenRouter). Verifique o saldo ou plano de faturamento da sua chave.";
  }

  // Return clean message if not a raw JSON
  if (rawMsg.startsWith("{") && rawMsg.endsWith("}")) {
    try {
      const parsed = JSON.parse(rawMsg);
      if (parsed?.error?.message) {
        return parsed.error.message;
      }
    } catch {}
  }

  return rawMsg.length > 250 ? rawMsg.substring(0, 250) + "..." : rawMsg;
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
  const isStream = req.body?.stream === true || (req.headers.accept && req.headers.accept.includes("text/event-stream"));

  const sendEvent = (eventData: any) => {
    if (isStream) {
      res.write(`data: ${JSON.stringify(eventData)}\n\n`);
    }
  };

  if (isStream) {
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    if (typeof (res as any).flushHeaders === "function") {
      (res as any).flushHeaders();
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
    const userApiKey = typeof req.body.userApiKey === "string" ? req.body.userApiKey : undefined;
    const openaiApiKey = typeof req.body.openaiApiKey === "string" ? req.body.openaiApiKey : undefined;
    const openrouterApiKey = typeof req.body.openrouterApiKey === "string" ? req.body.openrouterApiKey : undefined;

    if (!rawNotes && !audioData && (!images || images.length === 0)) {
      if (isStream) {
        sendEvent({
          type: "error",
          error: "Por favor, insira um relato em texto, grave um áudio ou anexe um documento/foto.",
        });
        return res.end();
      }
      return res.status(400).json({
        error: "Por favor, insira um relato em texto, grave um áudio ou anexe um documento/foto.",
      });
    }

    const systemInstruction = buildSystemPrompt(profession, Boolean(isFirstConsultation), customContext);
    const sysSettings = readStoreData("settings", {});
    const soapSectionConfig = req.body.sectionConfig || sysSettings.sectionsConfig?.soapPec;
    const requestedModel = (req.body.model || req.body.modelName || "").trim();

    // Priority: Explicit section config primaryModelId > requestedModel > default gemini-3.7-flash
    const primaryCandidate = soapSectionConfig?.primaryModelId || requestedModel || "gemini-3.7-flash";
    const fallbackCandidates = Array.isArray(soapSectionConfig?.fallbackChain)
      ? soapSectionConfig.fallbackChain
      : ["openrouter:inclusionai/ling-3.0-flash-sante:free", "gemini-3.6-flash", "gemini-3.1-flash-lite"];

    let targetModel = primaryCandidate;
    const isGemini = targetModel.includes("gemini") && !targetModel.startsWith("openrouter:");
    const isOpenAI = (targetModel.startsWith("openai:") || targetModel.includes("gpt") || targetModel.startsWith("o1")) && !targetModel.startsWith("openrouter:");
    const isOpenRouter = !isGemini && !isOpenAI;

    console.log(`[AI Generation] Model requested: "${requestedModel || 'auto'}" -> Executing Primary: "${primaryCandidate}", Cascade: ${fallbackCandidates.join(" -> ")}`);

    // Notify client about initial true model
    sendEvent({
      type: "status",
      model: targetModel,
      modelName: getFriendlyModelNameServer(targetModel),
      message: `Processando com ${getFriendlyModelNameServer(targetModel)}...`,
    });

    const onModelTransition = (info: { currentModel: string; previousModel?: string; isFallback: boolean; reason?: string }) => {
      console.log(`[AI Generation Transition] ${info.previousModel} -> ${info.currentModel}`);
      sendEvent({
        type: "transition",
        fromModel: info.previousModel,
        fromModelName: getFriendlyModelNameServer(info.previousModel),
        toModel: info.currentModel,
        toModelName: getFriendlyModelNameServer(info.currentModel),
        reason: info.reason || "Alternando modelo",
        message: `Alternando para ${getFriendlyModelNameServer(info.currentModel)}...`,
      });
    };

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
        }, onModelTransition);
        
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
        }, onModelTransition);
        
        if (response.text) {
          userTextPrompt += `[TRANSCRIÇÃO/DESCRIÇÃO DO MULTIMÍDIA GERADA POR IA]:\n${response.text}\n\n`;
        }
      }
    }

    let fullText = transcribedText;

    // 2. Generate Text using Resilient Fallback Cascade
    if (!isGemini || (!audioData && (!images || images.length === 0))) {
      userTextPrompt += `Gere o prontuário estruturado pronto para cópia conforme os blocos e regras obrigatórias.`;

      const sysSettings = readStoreData("settings", {});
      const soapSectionConfig = req.body.sectionConfig || sysSettings.sectionsConfig?.soapPec;
      const primaryCandidate = soapSectionConfig?.primaryModelId || targetModel || "gemini-3.7-flash";
      const fallbackCandidates = Array.isArray(soapSectionConfig?.fallbackChain)
        ? soapSectionConfig.fallbackChain
        : ["openrouter:inclusionai/ling-3.0-flash-sante:free", "gemini-3.6-flash", "gemini-3.1-flash-lite"];

      console.log(`[AI Generation Cascade] Executando SOAP com Primário: ${primaryCandidate}, Cascata: ${fallbackCandidates.join(" -> ")}`);

      const executionResult = await executeMultiProviderWithFallback({
        primaryModelId: primaryCandidate,
        fallbackChain: fallbackCandidates,
        systemInstruction,
        userPrompt: userTextPrompt,
        temperature: soapSectionConfig?.temperature ?? 0.2,
        geminiApiKey: userApiKey,
        openaiApiKey,
        openrouterApiKey,
        onModelTransition,
      });

      fullText = executionResult.text;
      targetModel = executionResult.modelUsed;
    }

    // Parse the output into distinct blocks for the PEC cards
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
      timestamp: Date.now(),
    };

    if (isStream) {
      sendEvent({
        type: "complete",
        data: resultPayload,
      });
      return res.end();
    }

    return res.json(resultPayload);
  } catch (error: any) {
    console.error("Erro na chamada de IA (geração de prontuário):", error);
    const friendlyMessage = formatFriendlyAIError(error);
    if (isStream) {
      sendEvent({
        type: "error",
        error: friendlyMessage,
        rawError: error?.message || String(error),
      });
      return res.end();
    }
    return res.status(500).json({
      error: friendlyMessage,
      rawError: error?.message || String(error),
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
// Uses multer with resilient error boundary and dual fallback (Groq Whisper + Gemini Multimodal)
const audioUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

app.post(
  ["/api/audio/transcribe", "/api/gemini/transcribe"],
  (req: any, res: any, next) => {
    // Wrap multer safely so JSON payloads or boundary issues never crash or return HTML
    audioUpload.single("audio")(req, res, (err) => {
      if (err) {
        console.warn("[AudioTranscription] Multer warning/notice:", err?.message || err);
      }
      next();
    });
  },
  async (req: any, res) => {
    try {
      // ── Resolve the audio buffer ──────────────────────────────────────────
      let audioBuffer: Buffer | null = null;
      let fileName = "audio.webm";
      let fileMime = "audio/webm";

      if (req.file && req.file.buffer) {
        // Multipart upload path
        audioBuffer = req.file.buffer;
        fileName = req.file.originalname || "audio.webm";
        fileMime = req.file.mimetype || "audio/webm";
      } else if (req.body?.audioData?.data) {
        // Base64 JSON path
        const base64Data = String(req.body.audioData.data);
        const rawMime = String(req.body.audioData.mimeType || "audio/webm");
        fileMime = rawMime.split(";")[0].trim();
        const ext = fileMime.includes("mp4") ? "mp4" : fileMime.includes("ogg") ? "ogg" : fileMime.includes("wav") ? "wav" : "webm";
        fileName = `audio.${ext}`;
        audioBuffer = Buffer.from(base64Data, "base64");
      } else if (req.body?.audio && typeof req.body.audio === "string") {
        // Direct base64 string
        const base64Data = req.body.audio.replace(/^data:[^;]+;base64,/, "");
        audioBuffer = Buffer.from(base64Data, "base64");
      }

      if (!audioBuffer || audioBuffer.length < 300) {
        return res.status(400).json({ success: false, error: "Nenhum dado de áudio fornecido ou áudio muito curto." });
      }

      // ── Resolve API keys ──────────────────────────────────────────────────
      const systemSettings = readStoreData("settings", {});
      const headerGroqKey = typeof req.headers["x-groq-api-key"] === "string" ? req.headers["x-groq-api-key"].trim() : "";
      const bodyGroqKey = typeof req.body?.groqApiKey === "string" ? req.body.groqApiKey.trim() : "";
      const groqApiKey = bodyGroqKey || headerGroqKey || systemSettings?.groqApiKey || process.env.GROQ_API_KEY || "";

      console.log(`[AudioTranscription] file="${fileName}" | size=${audioBuffer.length} bytes | mime="${fileMime}" | groqKey=${groqApiKey ? groqApiKey.slice(0, 8) + "..." : "MISSING"}`);

      let transcription = "";
      let engineUsed = "groq-whisper";

      // ── Call Groq Whisper API directly via fetch + FormData if key available ──
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

          if (groqResponse.ok) {
            const groqResult: any = await groqResponse.json();
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

      // ── Resilient Fallback to Gemini Multimodal Audio if Groq produced no text ──
      if (!transcription) {
        console.log("[AudioTranscription] Acionando cascata de contingência: Google Gemini Multimodal...");
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
                      data: audioBuffer.toString("base64"),
                    },
                  },
                  {
                    text: "Transcreva com máxima fidelidade e clareza este áudio clínico gravado em português do Brasil. Retorne exclusivamente o texto falado, sem introduções ou comentários adicionais.",
                  },
                ],
              },
            ],
            config: {
              temperature: 0.1,
            },
          });

          const geminiText = (geminiResult.response.text || "").trim();
          if (geminiText) {
            transcription = geminiText;
            engineUsed = `gemini-audio (${geminiResult.modelUsed})`;
            console.log(`[AudioTranscription] ✅ Sucesso via contingência Gemini (${geminiResult.modelUsed})!`);
          }
        } catch (geminiAudioErr) {
          console.warn("[AudioTranscription] Contingência Gemini também falhou:", geminiAudioErr);
        }
      }

      if (transcription && transcription !== ".") {
        console.log(`[AudioTranscription] ✅ Transcrição final (${engineUsed}): "${transcription.slice(0, 100)}..."`);
        return res.json({
          success: true,
          text: transcription,
          transcription,
          engine: engineUsed,
        });
      } else {
        return res.status(422).json({
          success: false,
          error: "Nenhuma fala compreensível foi detectada no áudio ou não foi possível conectar aos modelos de áudio da cascata.",
        });
      }
    } catch (err: any) {
      console.error("[AudioTranscription] Fatal error:", err);
      res.status(500).json({ success: false, error: err?.message || "Erro interno ao transcrever o áudio." });
    }
  }
);




// Helper: Generate Longitudinal Evolution with AI Cascading Logic (GPT-4o -> Gemini 3.7 Flash -> Gemini 3.8/3.6/3.1/2.5)
// Optimizado com análise incremental: olha exclusivamente para o(s) atendimento(s) pendente(s) de análise para economizar IA.
async function generateLongitudinalEvolutionWithCascade(params: {
  patient: any;
  consultations: any[];
  appointments?: any[];
  userApiKey?: string;
  openaiApiKey?: string;
  previousEvolution?: any;
  forceFullReanalysis?: boolean;
}): Promise<{ parsedEvolution: any; modelUsed: string; skippedAi?: boolean }> {
  const {
    patient,
    consultations,
    appointments: customAppointments,
    userApiKey,
    openaiApiKey: customOpenAiKey,
    forceFullReanalysis,
  } = params;

  // Retrieve appointments for cross-referencing faltas/cancelamentos/abandonos
  const appointmentsList: any[] = customAppointments && customAppointments.length > 0
    ? customAppointments
    : readStoreData("appointments", []);

  // Sort consultations chronologically (oldest to newest)
  const sortedConsultations = [...consultations].sort(
    (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
  );

  // Retrieve previous saved evolution if not provided
  let existingEvolution = params.previousEvolution;
  if (!existingEvolution && patient?.id) {
    const evolutionsList: any[] = readStoreData("clinical_evolutions", []);
    existingEvolution = evolutionsList.find((e) => e && (e.patientId === patient.id || e.id === patient.id));
  }

  // Check if we can perform incremental update focusing ONLY on pending consultations
  const isIncremental = Boolean(existingEvolution && !forceFullReanalysis);
  let pendingConsultations: any[] = [];

  if (isIncremental) {
    const analyzedIds = new Set<string>(
      Array.isArray(existingEvolution.analyzedConsultationIds)
        ? existingEvolution.analyzedConsultationIds
        : []
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
    // Initial analysis or explicit full re-analysis
    pendingConsultations = sortedConsultations;
  }

  // If incremental and NO pending consultations exist, return cached evolution without calling AI!
  if (isIncremental && pendingConsultations.length === 0) {
    console.log(`[Longitudinal AI] Paciente ${patient.fullName}: Nenhum atendimento pendente de análise. Prontuário 100% atualizado. Chamada de IA evitada (economia de 100% de tokens).`);
    return {
      parsedEvolution: {
        ...existingEvolution,
        alreadyUpToDate: true,
        pendingConsultationsAnalyzed: 0,
        isIncrementalUpdate: true,
        message: "Prontuário já atualizado. Nenhum atendimento pendente de análise.",
      },
      modelUsed: existingEvolution.modelUsed || "cache",
      skippedAi: true,
    };
  }

  console.log(
    `[Longitudinal AI] Paciente ${patient.fullName}: ${
      isIncremental
        ? `Atualização INCREMENTAL focando em ${pendingConsultations.length} atendimento(s) pendente(s)`
        : `Análise inicial completa (${pendingConsultations.length} atendimentos)`
    }. Economia de IA aplicada!`
  );

  // Filter appointments for this patient
  const patientAppointments = appointmentsList.filter((a: any) => {
    if (!a) return false;
    return (
      (a.patientId && a.patientId === patient.id) ||
      (typeof a.patientName === 'string' && typeof patient.fullName === 'string' && a.patientName.toLowerCase().trim() === patient.fullName.toLowerCase().trim()) ||
      (a.patientCns && patient.cns && a.patientCns.trim() === patient.cns.trim())
    );
  });

  const faltasOuCancelamentos = patientAppointments.filter((a: any) =>
    a.status === 'cancelado' || a.status === 'falta' || a.status === 'nao_compareceu'
  );
  const desistenciasOuAbandonos = patientAppointments.filter((a: any) =>
    a.status === 'desistiu' || a.status === 'abandonou' || a.status === 'evadido'
  );

  // Extract condutas from all consultations (maintaining total cumulative clinical record)
  const allPrescricoes: string[] = [];
  const allExames: string[] = [];
  const allEncaminhamentos: string[] = [];
  const allLaudos: string[] = [];
  const allAtestados: string[] = [];

  sortedConsultations.forEach((c) => {
    const dateStr = c.timestamp ? new Date(c.timestamp).toLocaleDateString("pt-BR") : "--";
    const profStr = c.authorProfession ? `[${c.authorProfession}]` : "";

    // Prescriptions
    if (c.prescription?.items && Array.isArray(c.prescription.items)) {
      c.prescription.items.forEach((it: any) => {
        if (it?.medicationName) {
          const itemDesc = `${it.medicationName} (${it.posology || 'Posologia padrão'}${it.duration ? ` - ${it.duration}` : ''}) [${dateStr}]`;
          if (!allPrescricoes.includes(itemDesc)) allPrescricoes.push(itemDesc);
        }
      });
    }

    // Exam Requests
    if (c.examRequest?.items && Array.isArray(c.examRequest.items)) {
      c.examRequest.items.forEach((it: any) => {
        if (it?.name) {
          const itemDesc = `${it.name}${it.clinicalIndication ? ` (Indicação: ${it.clinicalIndication})` : ''} [${dateStr}]`;
          if (!allExames.includes(itemDesc)) allExames.push(itemDesc);
        }
      });
    }

    // Referrals
    const referralDest = c.referral?.destination || c.referral?.specialtyDestination;
    const referralReason = c.referral?.clinicalIndication || c.referral?.reasonClinicalSummary;
    if (referralDest) {
      const itemDesc = `Encaminhamento para ${referralDest}${referralReason ? ` - Motivo: ${referralReason.slice(0, 80)}...` : ''} [${dateStr}]`;
      if (!allEncaminhamentos.includes(itemDesc)) allEncaminhamentos.push(itemDesc);
    }

    // Medical Reports (Laudos)
    if (c.medicalReport?.purpose || c.medicalReport?.cid10) {
      const itemDesc = `Laudo Médico emitido (${c.medicalReport.cid10 || 'CID não informado'}) - Finalidade: ${c.medicalReport.purpose || 'Acompanhamento'} [${dateStr}]`;
      if (!allLaudos.includes(itemDesc)) allLaudos.push(itemDesc);
    }

    // Check textual condutas / atestados in plano or conduta
    const combinedText = `${c.plano || ''} ${c.conduta || ''}`;
    if (combinedText.toLowerCase().includes('atestado')) {
      const atestadoDesc = `Atestado médico/comparecimento registrado em atendimento por ${c.authorName || 'Profissional'} ${profStr} [${dateStr}]`;
      if (!allAtestados.includes(atestadoDesc)) allAtestados.push(atestadoDesc);
    }
  });

  let systemInstruction = "";
  let userPrompt = "";

  if (isIncremental) {
    // Incremental Prompt: focando EXCLUSIVAMENTE nos atendimentos pendentes de análise para economizar IA
    const formattedPending = pendingConsultations
      .map((c) => {
        const dateStr = c.timestamp ? new Date(c.timestamp).toLocaleDateString("pt-BR") : "--";
        const author = c.authorName ? `${c.authorName} (${c.authorProfession || 'Equipe'})` : 'Profissional';
        return `[ATENDIMENTO PENDENTE DE ANÁLISE - ${dateStr} - ${author}]:
- Avaliação: ${c.avaliacao || "--"}
- Plano: ${c.plano || "--"}
- Conduta: ${c.conduta || "--"}`;
      })
      .join("\n\n");

    systemInstruction = `Você é um Auditor Clínico Sênior e Especialista em Saúde Coletiva, Atenção Primária e RAPS do SUS no Brasil.
Sua missão é ATUALIZAR a Análise Longitudinal de Evolução Clínica do paciente de forma INCREMENTAL e ULTRAEFICIENTE.

DIRETRIZ DE FOCO CLÍNICO E ECONOMIA DE RECURSOS (IA):
- Foque EXCLUSIVAMENTE no(s) ATENDIMENTO(S) PENDENTE(S) DE ANÁLISE e integre as novas queixas, condutas e desfechos ao HISTÓRICO CONSOLIDADO PRÉVIO.
- Mantenha a integridade histórica prévia sem descartar antecedentes relevantes, porém atualize a situação ATUAL do paciente:
  * O atendimento pendente indicou melhora clínica? (Trajetória Positiva/Melhora)
  * Houve nova crise, agravo ou descompensação? (Trajetória Negativa/Alerta)
  * Quadro mantido sem oscilações relevantes? (Trajetória Estável)
- Atualize a Farmacoterapia se novas drogas foram prescritas ou alteradas no atendimento pendente.
- Atualize a Matriz Dimensional e as Recomendações Práticas para a equipe da UBS/RAPS.

ESTRUTURA OBRIGATÓRIA DA RESPOSTA:
### RESUMO LONGITUDINAL:
Linha do tempo consolidada e atualizada com o novo atendimento integrado ao histórico prévio.

### CONDIÇÕES DE SAÚDE PSICOLÓGICAS E NÃO PSICOLÓGICAS:
- CONDIÇÕES PSICOLÓGICAS: Diagnósticos, crises, ideações, estado de humor e adesão psicossocial atualizada.
- CONDIÇÕES NÃO PSICOLÓGICAS: Condições clínicas gerais, doenças crônicas e parâmetros somáticos.

### FARMACOTERAPIA E MUDANÇAS NO TRATAMENTO:
- MEDICAMENTOS EM USO CONTÍNUO: Lista consolidada atualizada de fármacos de uso contínuo.
- MUDANÇAS NO TRATAMENTO: Ajustes posológicos ou novas drogas introduzidas no atendimento recente.
- ADESÃO RELATADA: Regularidade no uso e relatos de tolerância.

### TRAJETÓRIA CLÍNICA (MELHORA / PIORA / ESTABILIDADE):
- STATUS GERAL: [Positiva / Negativa / Estável / Mista]
- JUSTIFICATIVA: Detalhamento do impacto do(s) novo(s) atendimento(s) na evolução do paciente.

### MATRIZ DE EVOLUÇÃO MULTIDIMENSIONAL:
- Aspectos Psicoemocionais e Comportamentais: [Positiva/Negativa/Estável/Mista] - Justificativa detalhada.
- Aspectos Físicos e Sinais Vitais: [Positiva/Negativa/Estável/Mista] - Justificativa detalhada.
- Dinâmica Familiar e Social: [Positiva/Negativa/Estável/Mista] - Justificativa detalhada.

### CONDUTAS DOS PROFISSIONAIS:
Resumo consolidado das condutas adotadas pela equipe.

### AUDITORIA DE ASSIDUIDADE (FILA DE ATENDIMENTO):
Análise sobre comparecimento e assiduidade.

### PONTOS DE ALERTA E RECOMENDAÇÕES PARA A EQUIPE:
Recomendações práticas, alertas e intervenções sugeridas para o PTS.`;

    userPrompt = `DADOS CADASTRAIS DO PACIENTE:
Nome Completo: ${patient.fullName} | CNS: ${patient.cns || "--"} | Nascimento: ${patient.birthDate || "--"}

ANÁLISE LONGITUDINAL CONSOLIDADA ANTERIOR (HISTÓRICO JÁ AVALIADO):
- Resumo Longitudinal Prévio: ${existingEvolution.resumoLongitudinal || "--"}
- Trajetória Prévia: Status [${existingEvolution.trajetoriaClinica?.statusGeral || "Estável"}] - ${existingEvolution.trajetoriaClinica?.descricao || "--"}
- Condições de Saúde Prévias:
  * Psicológicas: ${existingEvolution.condicoesSaude?.psicologicas || "--"}
  * Não Psicológicas: ${existingEvolution.condicoesSaude?.naoPsicologicas || "--"}
- Farmacoterapia Prévia: ${(existingEvolution.farmacoterapia?.emUsoContinuo || []).join("; ") || "Sem medicação prévia"} (Adesão: ${existingEvolution.farmacoterapia?.adesaoRelatada || "--"})

ATENDIMENTO(S) PENDENTE(S) DE ANÁLISE (${pendingConsultations.length} recente(s) a integrar):
${formattedPending}

DADOS DA FILA E ASSIDUIDADE:
- Agendamentos: ${patientAppointments.length} | Faltas/Cancelamentos: ${faltasOuCancelamentos.length} | Abandonos: ${desistenciasOuAbandonos.length}

CONDUTAS NO PRONTUÁRIO:
- Prescrições: ${allPrescricoes.length > 0 ? allPrescricoes.join('; ') : 'Sem prescrições'}
- Exames: ${allExames.length > 0 ? allExames.join('; ') : 'Sem exames'}
- Encaminhamentos: ${allEncaminhamentos.length > 0 ? allEncaminhamentos.join('; ') : 'Sem encaminhamentos'}
- Laudos: ${allLaudos.length > 0 ? allLaudos.join('; ') : 'Sem laudos'}

Por favor, elabore a análise longitudinal atualizada integrando cirurgicamente o(s) atendimento(s) pendente(s) acima.`;
  } else {
    // Full Analysis (Initial or forced full reanalysis)
    const recentConsultations = sortedConsultations.slice(-12);
    const formattedHistory = recentConsultations
      .map((c) => {
        const dateStr = c.timestamp ? new Date(c.timestamp).toLocaleDateString("pt-BR") : "--";
        const author = c.authorName ? `${c.authorName} (${c.authorProfession || 'Equipe'})` : 'Profissional';
        return `[${dateStr} - ${author}]:
- Avaliação: ${c.avaliacao || "--"}
- Plano: ${c.plano || "--"}
- Conduta: ${c.conduta || "--"}`;
      })
      .join("\n\n");

    systemInstruction = `Você é um Auditor Clínico Sênior e Especialista em Saúde Coletiva, Atenção Primária e RAPS do SUS no Brasil.
Sua missão é gerar uma Análise Longitudinal de Evolução Clínica aprofundada, técnica e estruturada sobre o histórico multiprofissional do paciente.

ESTRUTURA OBRIGATÓRIA DA RESPOSTA:
A sua análise DEVE ser extremamente rica, detalhada e orientadora, estruturada RIGOROSAMENTE nas seguintes seções:

### RESUMO LONGITUDINAL:
Linha do tempo consolidada e detalhada de todas as queixas clínicas, intervenções multiprofissionais e trajetória do paciente ao longo dos atendimentos. O resultado dessa análise norteará os atendimentos futuros da equipe multiprofissional.

### CONDIÇÕES DE SAÚDE PSICOLÓGICAS E NÃO PSICOLÓGICAS:
- CONDIÇÕES PSICOLÓGICAS: Diagnósticos psiquiátricos/emocionais, crises, ideações, estado de humor, sintomas ansiosos/depressivos, funções cognitivas e adesão psicossocial.
- CONDIÇÕES NÃO PSICOLÓGICAS: Condições clínicas gerais, doenças crônicas (HAS, DM, etc.), parâmetros físicos, lesões e saúde física.

### FARMACOTERAPIA E MUDANÇAS NO TRATAMENTO:
- MEDICAMENTOS EM USO CONTÍNUO: Liste fármacos prescritos de uso contínuo (antidepressivos, antipsicóticos, anti-hipertensivos, estabilizadores, etc.).
- MUDANÇAS NO TRATAMENTO: Ajustes posológicos, trocas de medicação, desmames ou novas introduções observadas ao longo do tempo.
- ADESÃO RELATADA: Regularidade no uso e relatos de tolerância/efeitos colaterais.

### TRAJETÓRIA CLÍNICA (MELHORA / PIORA / ESTABILIDADE):
Classifique a evolução geral e justifique tecnicamente:
- STATUS GERAL: [Positiva / Negativa / Estável / Mista]
- JUSTIFICATIVA: Detalhamento se o quadro clínico caminhou para melhora, estabilidade ou agravamento/piora.

### MATRIZ DE EVOLUÇÃO MULTIDIMENSIONAL:
- Aspectos Psicoemocionais e Comportamentais: [Positiva/Negativa/Estável/Mista] - Justificativa detalhada.
- Aspectos Físicos e Sinais Vitais: [Positiva/Negativa/Estável/Mista] - Justificativa detalhada.
- Dinâmica Familiar e Social: [Positiva/Negativa/Estável/Mista] - Justificativa detalhada.

### CONDUTAS DOS PROFISSIONAIS:
Resumo consolidado das condutas já adotadas:
- Prescrições e medicações instituídas;
- Solicitações de exames laboratoriais ou complementares;
- Encaminhamentos para especialidades/regulação;
- Emissão de laudos médicos ou pareceres;
- Emissão de atestados médicos ou de comparecimento.

### AUDITORIA DE ASSIDUIDADE (FILA DE ATENDIMENTO):
Análise sobre o comparecimento do paciente, pontualidade, registros de faltas, cancelamentos ou desistências na fila de espera da unidade.

### PONTOS DE ALERTA E RECOMENDAÇÕES PARA A EQUIPE:
Recomendações clínicas práticas, alertas de risco, busca ativa necessária e proposições para reunião de equipe e Projeto Terapêutico Singular (PTS).`;

    userPrompt = `DADOS CADASTRAIS DO PACIENTE:
Nome Completo: ${patient.fullName}
CNS: ${patient.cns || "--"}
Data de Nascimento: ${patient.birthDate || "--"}
Responsável Legal: ${patient.legalGuardianName ? `${patient.legalGuardianName} (${patient.guardianKinship || "Responsável"})` : "Próprio paciente"}

HISTÓRICO CRONOLÓGICO DE ATENDIMENTOS (${sortedConsultations.length} registrados, detalhando os mais recentes):
${formattedHistory}

DADOS DA FILA DE ATENDIMENTO E ASSIDUIDADE:
- Total de Agendamentos/Fila Registrados: ${patientAppointments.length}
- Faltas ou Cancelamentos: ${faltasOuCancelamentos.length} (${faltasOuCancelamentos.map((f: any) => `${f.date || '--'}: ${f.specialty || 'Consulta'}`).join(', ') || 'Nenhuma falta registrada'})
- Abandonos ou Desistências: ${desistenciasOuAbandonos.length} (${desistenciasOuAbandonos.map((d: any) => `${d.date || '--'}: ${d.specialty || 'Fila'}`).join(', ') || 'Nenhum abandono registrado'})

CONDUTAS JÁ REALIZADAS NOS ATENDIMENTOS:
- Prescrições: ${allPrescricoes.length > 0 ? allPrescricoes.join('; ') : 'Sem prescrições no prontuário'}
- Exames Solicitados: ${allExames.length > 0 ? allExames.join('; ') : 'Sem exames solicitados'}
- Encaminhamentos: ${allEncaminhamentos.length > 0 ? allEncaminhamentos.join('; ') : 'Sem encaminhamentos'}
- Laudos Médicos: ${allLaudos.length > 0 ? allLaudos.join('; ') : 'Sem laudos'}
- Atestados: ${allAtestados.length > 0 ? allAtestados.join('; ') : 'Sem registros de atestado'}

Por favor, elabore a análise clínica longitudinal completa, profunda e rigorosamente estruturada conforme as seções solicitadas.`;
  }

  // Cascading execution: Configured section model & fallback chain
  const systemSettings = readStoreData("settings", {});
  const timelineSectionConfig = systemSettings.sectionsConfig?.timelineLongitudinal;
  const primaryModel = timelineSectionConfig?.primaryModelId || "openai:gpt-4o";
  const fallbackChain = Array.isArray(timelineSectionConfig?.fallbackChain)
    ? timelineSectionConfig.fallbackChain
    : ["gemini-3.7-flash", "openrouter:meta-llama/llama-3.3-70b-instruct", "openrouter:inclusionai/ling-3.0-flash-sante:free", "gemini-3.6-flash"];

  console.log(`[Longitudinal AI Cascade] Executando análise longitudinal com modelo primário: "${primaryModel}" e cascata: ${fallbackChain.join(" -> ")}`);

  const { text: markdownOutput, modelUsed } = await executeMultiProviderWithFallback({
    primaryModelId: primaryModel,
    fallbackChain,
    systemInstruction,
    userPrompt,
    temperature: timelineSectionConfig?.temperature ?? 0.25,
    geminiApiKey: userApiKey,
    openaiApiKey: customOpenAiKey,
  });

  // Parse structured output
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

// Longitudinal Clinical Evolution Endpoint (GET cached evolution by patientId)
app.get("/api/gemini/evolution/:patientId", async (req, res) => {
  try {
    const { patientId } = req.params;
    if (!patientId) {
      return res.status(400).json({ error: "ID do paciente não informado." });
    }

    const evolutions: any[] = readStoreData("clinical_evolutions", []);
    const found = evolutions.find((e) => e && (e.patientId === patientId || e.id === patientId));

    if (found) {
      return res.json({ success: true, data: found });
    }

    // Try Cloud Firestore
    try {
      const docSnap = await getServerDoc(serverDoc(serverDb, "clinical_evolutions", patientId));
      if (docSnap.exists()) {
        const firestoreData = { ...docSnap.data(), id: docSnap.id };
        return res.json({ success: true, data: firestoreData });
      }
    } catch (firestoreErr) {
      console.warn("[ServerFirestore] Erro ao buscar evolução no Firestore:", firestoreErr);
    }

    return res.status(404).json({ success: false, message: "Evolução clínica ainda não gerada para este paciente." });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || String(err) });
  }
});

// Longitudinal Clinical Evolution Endpoint (POST generate with AI Cascading)
// Com suporte a atualização incremental focada em atendimentos pendentes de análise para economia de tokens
app.post("/api/gemini/evolution", async (req, res) => {
  try {
    const { patient, consultations = [], userApiKey, openaiApiKey, forceRegenerate, forceFullReanalysis } = req.body;

    if (!patient || !consultations || consultations.length === 0) {
      return res.status(400).json({
        error: "Paciente ou lista de atendimentos não fornecidos para análise longitudinal.",
      });
    }

    // Check if we already have an evolution saved
    const evolutions: any[] = readStoreData("clinical_evolutions", []);
    const existing = evolutions.find((e) => e && (e.patientId === patient.id || e.id === patient.id));

    // If not forced to regenerate, check if there's an existing evolution and if it's already up-to-date
    if (!forceRegenerate && existing) {
      const analyzedIds = new Set<string>(Array.isArray(existing.analyzedConsultationIds) ? existing.analyzedConsultationIds : []);
      const lastTs = existing.lastAnalyzedTimestamp || existing.generatedAt || 0;
      const pending = consultations.filter((c: any) => {
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
          pendingConsultationsCount: 0,
        });
      }
    }

    // Generate or update evolution using AI Cascade (incremental delta on pending consultations)
    const { parsedEvolution, modelUsed, skippedAi } = await generateLongitudinalEvolutionWithCascade({
      patient,
      consultations,
      userApiKey,
      openaiApiKey,
      previousEvolution: existing,
      forceFullReanalysis: Boolean(forceFullReanalysis),
    });

    if (!skippedAi) {
      // Automatically persist to local datastore & Cloud Firestore
      const evolutionsList: any[] = readStoreData("clinical_evolutions", []);
      const existingIdx = evolutionsList.findIndex((e) => e && (e.patientId === patient.id || e.id === patient.id));
      if (existingIdx >= 0) {
        evolutionsList[existingIdx] = parsedEvolution;
      } else {
        evolutionsList.unshift(parsedEvolution);
      }
      writeStoreData("clinical_evolutions", evolutionsList);

      // Sync to Cloud Firestore
      serverSetDoc(serverDoc(serverDb, "clinical_evolutions", patient.id), parsedEvolution, { merge: true }).catch((err) => {
        console.warn("[ServerFirestore] Erro ao sincronizar clinical_evolution no Firestore:", err?.message || err);
      });
    }

    res.json({
      success: true,
      data: parsedEvolution,
      modelUsed,
      skippedAi: Boolean(skippedAi),
      isIncrementalUpdate: Boolean(parsedEvolution?.isIncrementalUpdate),
      pendingConsultationsAnalyzed: parsedEvolution?.pendingConsultationsAnalyzed || 0,
    });
  } catch (error: any) {
    console.error("Erro na geração de evolução longitudinal:", error);
    res.status(500).json({
      error: formatFriendlyAIError(error),
      rawError: error?.message || String(error),
    });
  }
});

// Medical Report (Laudo Médico) AI Generation Endpoint
app.post("/api/gemini/medical-report", async (req, res) => {
  try {
    const {
      patient,
      consultation,
      doctor,
      purpose,
      clinicalObservations,
      userApiKey,
    } = req.body;

    if (!patient || !patient.fullName) {
      return res.status(400).json({
        error: "Dados do paciente não fornecidos para geração do laudo médico.",
      });
    }

    const ai = getGeminiClient(userApiKey);

    const systemInstruction = `Você é um Médico Perito e Auditor Clínico do SUS no Brasil, com profunda expertise em redação de Laudos Médicos Oficiais conforme as resoluções do Conselho Federal de Medicina (CFM nº 1.658/2002 e 1.851/2008).
Sua missão é redigir a descrição de um Laudo Médico formal, técnico, objetivo e legalmente fundamentado, com base nos dados clínicos do atendimento.

DIRETRIZES DA DESCRIÇÃO DO LAUDO:
1. Comece com a declaração formal de acompanhamento: "Atesto, para os devidos fins a pedido do(a) interessado(a), que o(a) paciente ${patient.fullName}... encontra-se sob acompanhamento médico neste serviço..."
2. Descreva o histórico clínico relevante, queixas relatadas, sintomatologia atual e achados do exame físico/psíquico.
3. Descreva a terapêutica em curso (psicofármacos, intervenções clínicas/psicossociais) e o padrão de resposta/adesão ao tratamento.
4. Descreva a capacidade funcional, prognóstico, limitações psicomotoras/cognitivas/laborais ou justificativa pertinente à finalidade solicitada (${purpose || 'Acompanhamento e avaliação clínica'}).
5. Conclua com parecer médico fundamentado e recomendações de seguimento.
6. A redação deve ser estritamente profissional, culta e impessoal (não use gírias ou termos informais).
7. NÃO coloque cabeçalho ou assinatura na descrição (estes já são inseridos automaticamente no documento oficial).
8. Identifique e retorne a CID-10 mais adequada no campo próprio da resposta.

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON estrito):
{
  "description": "Texto completo da descrição do laudo médico...",
  "cid10": "Código e descrição por extenso da CID-10 principal (ex: F33.2 - Transtorno depressivo recorrente, episódio atual grave sem sintomas psicóticos)",
  "purpose": "Finalidade do laudo"
}`;

    const userPrompt = `DADOS DO PACIENTE:
Nome Completo: ${patient.fullName}
Idade: ${patient.ageFormatted || "--"}
CPF/CNS: ${patient.document || "--"}

DADOS DO ATENDIMENTO CLÍNICO:
Avaliação / Exame Clínico: ${consultation?.avaliacao || "Paciente em acompanhamento clínico regular."}
Plano / Condutas / Medicações: ${consultation?.plano || "Seguimento ambulatorial e ajuste farmacológico."}
Conduta Complementar: ${consultation?.conduta || "--"}
Anotações / Relato Original: ${consultation?.rawNotes || "--"}

DADOS DO MÉDICO ASSISTENTE:
Nome: ${doctor?.name || "Médico Assistente"}
Especialidade: ${doctor?.specialty || "Clínica Médica / Medicina de Família e Comunidade"}
Conselho / CRM: ${doctor?.councilRegister || ""}
Unidade: ${doctor?.workplace || "CENTRO DE ATENÇÃO PSICOSSOCIAL - CAPS I"}

FINALIDADE / SOLICITAÇÃO DO LAUDO:
${purpose || "Acompanhamento clínico especializado e comprovação diagnóstica"}

OBSERVAÇÕES ADICIONAIS DO MÉDICO:
${clinicalObservations || "Nenhuma observação adicional informada."}

Por favor, elabore o laudo médico profissional em JSON conforme a instrução.`;

    const systemSettings = readStoreData("settings", {});
    const reportSectionConfig = req.body.sectionConfig || systemSettings.sectionsConfig?.officialReports;
    const primaryCandidate = reportSectionConfig?.primaryModelId || "gemini-3.7-flash";
    const fallbackCandidates = Array.isArray(reportSectionConfig?.fallbackChain)
      ? reportSectionConfig.fallbackChain
      : ["openrouter:inclusionai/ling-3.0-flash-sante:free", "openai:gpt-4o-mini", "gemini-3.6-flash"];

    console.log(`[Medical Report Cascade] Gerando laudo com Primário: "${primaryCandidate}", Cascata: ${fallbackCandidates.join(" -> ")}`);

    const { text: responseText, modelUsed } = await executeMultiProviderWithFallback({
      primaryModelId: primaryCandidate,
      fallbackChain: fallbackCandidates,
      systemInstruction,
      userPrompt,
      temperature: reportSectionConfig?.temperature ?? 0.2,
      responseMimeType: "application/json",
      geminiApiKey: userApiKey,
    });
    let parsed: any;
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
          purpose: purpose || "Acompanhamento Clínico",
        };
      }
    }

    res.json({
      success: true,
      modelUsed,
      data: {
        description: parsed.description || responseText,
        cid10: parsed.cid10 || "F32.2 - Transtorno depressivo",
        purpose: parsed.purpose || purpose || "Acompanhamento Clínico",
      },
    });
  } catch (error: any) {
    console.error("Erro na geração de laudo médico com IA:", error);
    res.status(500).json({
      error: formatFriendlyAIError(error),
      rawError: error?.message || String(error),
    });
  }
});

// Medical Certificate AI Recommendations Endpoint
app.post("/api/gemini/certificate-recommendations", async (req, res) => {
  try {
    const {
      patient,
      consultation,
      doctor,
      daysOff,
      cid10,
      userApiKey,
    } = req.body;

    if (!patient || !patient.fullName) {
      return res.status(400).json({
        error: "Dados do paciente não fornecidos para geração de recomendações.",
      });
    }

    const ai = getGeminiClient(userApiKey);

    const systemInstruction = `Você é um Médico Especialista e Auditor Clínico do SUS no Brasil, atuando na Atenção Primária (APS) e Rede de Atenção Psicossocial (RAPS).
Sua tarefa é redigir recomendações clínicas e orientações terapêuticas personalizadas, claras e concisas para o campo "Recomendações Clínicas / Observações" de um Atestado Médico Oficial de Afastamento.

DIRETRIZES DE REDAÇÃO:
1. Seja claro, conciso e direto (entre 1 a 3 frases completas).
2. Baseie-se no quadro clínico real apresentado no último atendimento (sintomas, diagnóstico/CID-10, plano terapêutico, medicações).
3. Inclua recomendações apropriadas como repouso domiciliar, manutenção do tratamento farmacológico/psicossocial, orientações de autocuidado (hidratação, evitar esforço físico/estressores) e recomendação de retorno ao serviço em caso de piora ou para reavaliação clínica.
4. Linguagem médica formal, ética e acolhedora conforme as resoluções do CFM.
5. NÃO inclua cabeçalho, saudação ou assinatura.

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON estrito):
{
  "recommendations": "Texto das orientações e recomendações clínicas..."
}`;

    const userPrompt = `DADOS DO PACIENTE:
Nome: ${patient.fullName}
Idade: ${patient.ageFormatted || patient.birthDate || "--"}

DADOS DO ÚLTIMO ATENDIMENTO:
Avaliação / Exame do Estado Mental: ${consultation?.avaliacao || consultation?.motivo || "Quadro clínico avaliado em consulta."}
Plano / Condutas / Prescrição: ${consultation?.plano || consultation?.conduta || "Seguimento e repouso."}
Diagnóstico / Hipótese / CID-10: ${cid10 || consultation?.cid10 || consultation?.diagnosticHypothesis || "Não especificado"}
Anotações / Relato Original: ${consultation?.rawNotes || "--"}
Dias de afastamento determinados: ${daysOff || 1} dia(s)

DADOS DO MÉDICO:
Nome: ${doctor?.name || "Médico Assistente"}
Unidade: ${doctor?.workplace || "CENTRO DE ATENÇÃO PSICOSSOCIAL (CAPS I)"}

Por favor, gere as recomendações clínicas para o atestado médico em JSON.`;

    const systemSettings = readStoreData("settings", {});
    const certSectionConfig = req.body.sectionConfig || systemSettings.sectionsConfig?.medicalCertificates;
    const primaryCandidate = certSectionConfig?.primaryModelId || "gemini-3.7-flash";
    const fallbackCandidates = Array.isArray(certSectionConfig?.fallbackChain)
      ? certSectionConfig.fallbackChain
      : ["openrouter:inclusionai/ling-3.0-flash-sante:free", "gemini-3.1-flash-lite"];

    console.log(`[Certificate Recommendations Cascade] Gerando recomendações com Primário: "${primaryCandidate}", Cascata: ${fallbackCandidates.join(" -> ")}`);

    const { text: responseText, modelUsed } = await executeMultiProviderWithFallback({
      primaryModelId: primaryCandidate,
      fallbackChain: fallbackCandidates,
      systemInstruction,
      userPrompt,
      temperature: certSectionConfig?.temperature ?? 0.3,
      responseMimeType: "application/json",
      geminiApiKey: userApiKey,
    });
    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        parsed = {
          recommendations: responseText.trim(),
        };
      }
    }

    res.json({
      success: true,
      modelUsed,
      data: {
        recommendations: parsed.recommendations || responseText.trim(),
      },
    });
  } catch (error: any) {
    console.error("Erro na geração de recomendações do atestado com IA:", error);
    res.status(500).json({
      error: formatFriendlyAIError(error),
      rawError: error?.message || String(error),
    });
  }
});


function parseLongitudinalEvolution(
  markdown: string,
  patient: any,
  consultations: any[],
  patientAppointments: any[] = [],
  modelUsed: string = "gemini-3.7-flash",
  pendingConsultationsAnalyzed: number = 0,
  isIncrementalUpdate: boolean = false
) {
  const startDate = consultations[0]?.timestamp
    ? new Date(consultations[0].timestamp).toLocaleDateString("pt-BR")
    : "--";
  const endDate = consultations[consultations.length - 1]?.timestamp
    ? new Date(consultations[consultations.length - 1].timestamp).toLocaleDateString("pt-BR")
    : "--";

  // Helper to find evolution status
  const findStatus = (
    text?: string
  ): "positiva" | "negativa" | "estavel" | "mista" => {
    const lower = (text || "").toLowerCase();
    if (lower.includes("melhora") || lower.includes("positiv") || lower.includes("favorável") || lower.includes("evolução positiva")) {
      return "positiva";
    }
    if (lower.includes("piora") || lower.includes("negativ") || lower.includes("agravamento") || lower.includes("regressão")) {
      return "negativa";
    }
    if (lower.includes("mista") || lower.includes("oscila") || lower.includes("flutuante")) {
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

  const resumoLongitudinal = resumoMatch
    ? resumoMatch[1].trim()
    : "Análise cronológica consolidada de atendimentos multiprofissionais e acompanhamento longitudinal da Atenção Primária / RAPS.";

  // Parsing Condições de Saúde (Psicológicas e Não Psicológicas)
  const condicoesText = condicoesMatch ? condicoesMatch[1].trim() : markdown;
  const psicoCondMatch = condicoesText.match(/(?:CONDI[ÇC][ÕO]ES PSICOL[ÓO]GICAS:?|[-*•]\s*Psicol[óo]gicas:?)([\s\S]*?)(?=(?:CONDI[ÇC][ÕO]ES N[ÃA]O PSICOL[ÓO]GICAS|[-*•]\s*N[ãa]o Psicol[óo]gicas|FARMACOTERAPIA|$))/i);
  const naoPsicoCondMatch = condicoesText.match(/(?:CONDI[ÇC][ÕO]ES N[ÃA]O PSICOL[ÓO]GICAS:?|[-*•]\s*N[ãa]o Psicol[óo]gicas:?)([\s\S]*$)/i);

  const condicoesPsicologicas = psicoCondMatch ? psicoCondMatch[1].trim() : "Avaliação contínua de sintomas emocionais, afetivos e psicossociais.";
  const condicoesNaoPsicologicas = naoPsicoCondMatch ? naoPsicoCondMatch[1].trim() : "Condições clínicas gerais e saúde somática acompanhadas pela equipe.";

  // Parsing Farmacoterapia
  const farmacoText = farmacoterapiaMatch ? farmacoterapiaMatch[1].trim() : "";
  const usoContinuoLines: string[] = [];
  const mudancasLines: string[] = [];
  let adesaoRelatada = "Adesão regular observada nos registros de atendimento.";

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

  // Trajetória Clínica Geral
  const trajetoriaText = trajetoriaMatch ? trajetoriaMatch[1].trim() : markdown;
  const statusGeral = findStatus(trajetoriaText);

  // Sub-aspect extraction for Matrix
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

  const psicoDesc = psicoMatch ? psicoMatch[1].trim() : "Avaliação contínua de sintomas emocionais, crises e adesão ao tratamento terapêutico.";
  const fisicoDesc = fisicoMatch ? fisicoMatch[1].trim() : "Parâmetros físicos, sinais vitais e queixas somáticas em manejo clínico.";
  const socialDesc = socialMatch ? socialMatch[1].trim() : "Rede de apoio sociofamiliar e suporte territorial monitorados.";

  const psicoStatus = findStatus(psicoDesc);
  const fisicoStatus = findStatus(fisicoDesc);
  const socialStatus = findStatus(socialDesc);

  // Extract alert bullet points
  const alertasText = alertasMatch ? alertasMatch[1].trim() : "";
  const pontosAlertaRecomendacoes = alertasText
    .split(/\n\s*[-*•\d+.]\s*/)
    .map((item) => item.trim())
    .filter((item) => item.length > 5);

  // Extract condutas consolidada from consultations
  const allPrescricoes: string[] = [];
  const allExames: string[] = [];
  const allEncaminhamentos: string[] = [];
  const allLaudos: string[] = [];
  const allAtestados: string[] = [];

  consultations.forEach((c) => {
    const dateStr = c.timestamp ? new Date(c.timestamp).toLocaleDateString("pt-BR") : "--";
    if (c.prescription?.items && Array.isArray(c.prescription.items)) {
      c.prescription.items.forEach((it: any) => {
        if (it?.medicationName) {
          const str = `${it.medicationName} (${it.posology || 'Padrão'}${it.duration ? ` - ${it.duration}` : ''}) [${dateStr}]`;
          if (!allPrescricoes.includes(str)) allPrescricoes.push(str);
        }
      });
    }
    if (c.examRequest?.items && Array.isArray(c.examRequest.items)) {
      c.examRequest.items.forEach((it: any) => {
        if (it?.name) {
          const str = `${it.name} [${dateStr}]`;
          if (!allExames.includes(str)) allExames.push(str);
        }
      });
    }
    const referralDest = c.referral?.destination || c.referral?.specialtyDestination;
    const referralReason = c.referral?.clinicalIndication || c.referral?.reasonClinicalSummary;
    if (referralDest) {
      const str = `${referralDest} (${referralReason ? referralReason.slice(0, 60) : 'Regulação'}) [${dateStr}]`;
      if (!allEncaminhamentos.includes(str)) allEncaminhamentos.push(str);
    }
    if (c.medicalReport?.purpose || c.medicalReport?.cid10) {
      const str = `Laudo ${c.medicalReport.cid10 || ''} - ${c.medicalReport.purpose || 'Acompanhamento'} [${dateStr}]`;
      if (!allLaudos.includes(str)) allLaudos.push(str);
    }
    const combined = `${c.plano || ''} ${c.conduta || ''}`;
    if (combined.toLowerCase().includes('atestado')) {
      const str = `Atestado registrado no atendimento [${dateStr}]`;
      if (!allAtestados.includes(str)) allAtestados.push(str);
    }
  });

  // Faltas e abandonos from patientAppointments
  const faltasCancelamentos = patientAppointments.filter((a: any) =>
    a.status === 'cancelado' || a.status === 'falta' || a.status === 'nao_compareceu'
  );
  const abandonos = patientAppointments.filter((a: any) =>
    a.status === 'desistiu' || a.status === 'abandonou' || a.status === 'evadido'
  );

  const faltasDetalhes: string[] = [];
  faltasCancelamentos.forEach((f: any) => {
    faltasDetalhes.push(`Falta/Cancelamento em ${f.date || '--'} (${f.specialty || f.serviceName || 'Consulta'})`);
  });
  abandonos.forEach((ab: any) => {
    faltasDetalhes.push(`Desistência/Abandono de fila em ${ab.date || '--'} (${ab.specialty || ab.serviceName || 'Fila'})`);
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
      end: endDate,
    },
    resumoLongitudinal,
    condicoesSaude: {
      psicologicas: condicoesPsicologicas,
      naoPsicologicas: condicoesNaoPsicologicas,
    },
    farmacoterapia: {
      emUsoContinuo: usoContinuoLines.length > 0 ? usoContinuoLines : allPrescricoes.slice(0, 5),
      mudancasTratamento: mudancasLines.length > 0 ? mudancasLines : ["Ajustes conforme resposta clínica observada nos atendimentos."],
      adesaoRelatada,
    },
    trajetoriaClinica: {
      statusGeral,
      descricao: trajetoriaText.length > 30 ? trajetoriaText.slice(0, 400) : getStatusLabel(statusGeral),
    },
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
    condutasRealizadas: {
      prescricoes: allPrescricoes,
      examesSolicitados: allExames,
      encaminhamentos: allEncaminhamentos,
      laudosMedicos: allLaudos,
      atestados: allAtestados,
    },
    faltasEAbandonos: {
      totalFaltasOuCancelamentos: faltasCancelamentos.length,
      totalAbandonos: abandonos.length,
      detalhes: faltasDetalhes.length > 0 ? faltasDetalhes : ["Assiduidade regular. Nenhuma falta ou abandono registrado na fila de atendimento."],
    },
    pontosAlertaRecomendacoes:
      pontosAlertaRecomendacoes.length > 0
        ? pontosAlertaRecomendacoes
        : [
            "Manter acompanhamento intersetorial e discussões periódicas em reunião de equipe (PTS).",
            "Monitorar adesão às orientações, farmacoterapia e comparecimento aos retornos agendados.",
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

// ================= APPOINTMENTS & SCHEDULING API ROUTES =================

// Helper to parse busy time intervals from a Google Calendar iCal (.ics) string for a target date (YYYY-MM-DD)
function extractIcalBusyIntervals(
  icalText: string,
  targetDateStr: string
): Array<{ startMin: number; endMin: number; summary: string }> {
  const busyIntervals: Array<{ startMin: number; endMin: number; summary: string }> = [];
  try {
    const compactTargetDate = targetDateStr.replace(/-/g, ""); // "20260908"
    const events = icalText.split("BEGIN:VEVENT");

    for (let i = 1; i < events.length; i++) {
      const eventChunk = events[i].split("END:VEVENT")[0];

      // Extract DTSTART & DTEND
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

        let endMin = startMin + 30; // default 30 min
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

// 0. Query Available Professionals for External Systems (n8n, Chatbots, WhatsApp)
// STRICT DIRECTIVE: Only professionals with active Google Calendar linked and verified are exposed!
app.get("/api/appointments/professionals", (req, res) => {
  try {
    res.json({
      success: true,
      service: "e-SUS PEC Multiprofissional - Catálogo de Profissionais para Agendamento",
      rule: "Nenhum profissional pode ficar disponível sem agenda Google Calendar vinculada e validada.",
      note: "Integração bidirecional pronta para chamadas via n8n e webhooks externos.",
      supportedCalendarTypes: [
        {
          type: "primary_email",
          description: "Conta Google / Gmail / Workspace (ex: jerime.rego@gmail.com)",
          usage: "O n8n utiliza o e-mail Google como 'calendarId' no nó Google Calendar.",
        },
        {
          type: "secondary_group",
          description: "Agenda Secundária no Google Calendar (ex: xxx@group.calendar.google.com)",
          usage: "O n8n utiliza o ID da agenda secundária como 'calendarId' nativo da API do Google Calendar.",
        },
      ],
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao listar profissionais para agendamento." });
  }
});

// 1. Calculate Available Time Slots (Cross-referencing schedule & Google Calendar)
app.get("/api/appointments/available-slots", async (req, res) => {
  try {
    const { professionalId, date, duration = "30", calendarId } = req.query;

    if (!date) {
      return res.status(400).json({ error: "Parâmetro 'date' (YYYY-MM-DD) é obrigatório." });
    }

    const durationMin = parseInt(duration as string, 10) || 30;
    const targetDate = new Date(`${date}T00:00:00`);
    const dayOfWeek = targetDate.getDay(); // 0 = Domingo, 1 = Segunda, ...

    // Default working hours: Mon-Fri 08:00 to 17:00 with 12:00-13:00 lunch
    let isWorkingDay = dayOfWeek >= 1 && dayOfWeek <= 5;
    let startHour = 8;
    let endHour = 17;
    let breakStartHour = 12;
    let breakEndHour = 13;

    if (!isWorkingDay) {
      return res.json({
        date,
        slots: [],
        message: "O profissional não atende no dia da semana selecionado.",
      });
    }

    // Attempt to query real Google Calendar events if a public or shared iCal is available
    let googleBusyIntervals: Array<{ startMin: number; endMin: number; summary: string }> = [];
    if (calendarId && typeof calendarId === "string") {
      try {
        const cleanCalendarId = calendarId.trim();
        const icalUrl = `https://calendar.google.com/calendar/ical/${encodeURIComponent(cleanCalendarId)}/public/basic.ics`;
        const icalRes = await fetch(icalUrl, { signal: AbortSignal.timeout(3000) });
        if (icalRes.ok) {
          const icalContent = await icalRes.text();
          googleBusyIntervals = extractIcalBusyIntervals(icalContent, date as string);
        }
      } catch (icalErr) {
        // Fallback gracefully if iCal is private or network times out
      }
    }

    const slots = [];
    const totalMinutesStart = startHour * 60;
    const totalMinutesEnd = endHour * 60;
    const lunchStartMin = breakStartHour * 60;
    const lunchEndMin = breakEndHour * 60;

    const pad = (n: number) => String(n).padStart(2, "0");

    for (let currentMin = totalMinutesStart; currentMin + durationMin <= totalMinutesEnd; currentMin += durationMin) {
      const slotStartH = Math.floor(currentMin / 60);
      const slotStartM = currentMin % 60;
      const slotEndMin = currentMin + durationMin;
      const slotEndH = Math.floor(slotEndMin / 60);
      const slotEndM = slotEndMin % 60;

      const startTimeStr = `${pad(slotStartH)}:${pad(slotStartM)}`;
      const endTimeStr = `${pad(slotEndH)}:${pad(slotEndM)}`;

      let available = true;
      let reason: string | undefined = undefined;

      // Check lunch collision
      if (
        (currentMin >= lunchStartMin && currentMin < lunchEndMin) ||
        (slotEndMin > lunchStartMin && slotEndMin <= lunchEndMin)
      ) {
        available = false;
        reason = "Intervalo / Almoço";
      }

      // Check Google Calendar collision if events were fetched
      if (available && googleBusyIntervals.length > 0) {
        const collision = googleBusyIntervals.find(
          (busy) =>
            (currentMin >= busy.startMin && currentMin < busy.endMin) ||
            (slotEndMin > busy.startMin && slotEndMin <= busy.endMin) ||
            (currentMin <= busy.startMin && slotEndMin >= busy.endMin)
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
        reason,
      });
    }

    res.json({
      professionalId,
      date,
      duration: durationMin,
      calendarId: calendarId || null,
      googleCalendarSynced: googleBusyIntervals.length > 0,
      slots,
    });
  } catch (error) {
    console.error("Erro ao calcular slots disponíveis:", error);
    res.status(500).json({ error: "Erro interno ao calcular horários disponíveis." });
  }
});

// 2. Direct Booking / Checkout endpoint
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
      n8nPixWebhookUrl,
    } = req.body;

    if (!patientName || !patientPhone || !date || !startTime) {
      return res.status(400).json({ error: "Dados obrigatórios de agendamento ausentes." });
    }

    const appointmentId = `app-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    let pixData = null;

    // If charging is enabled and price > 0, generate PIX via n8n PagBank webhook
    if (isChargingEnabled && servicePrice > 0) {
      const settings = readStoreData("settings", {});
      const webhookUrl = (n8nPixWebhookUrl && typeof n8nPixWebhookUrl === "string" && n8nPixWebhookUrl.trim())
        ? n8nPixWebhookUrl.trim()
        : (settings.n8nPixWebhookUrl && typeof settings.n8nPixWebhookUrl === "string" ? settings.n8nPixWebhookUrl.trim() : "");
      
      if (webhookUrl) {
        try {
          const pixPayload = {
            agendamento_id: appointmentId,
            userName: patientName,
            Email: patientEmail || `${patientPhone.replace(/\D/g, "")}@paciente.esus.gov.br`,
            userCpf: patientCpf || "00000000000",
            "Nome-servico": `${serviceName} - ${professionalName}`,
            Valor: Math.round(servicePrice * 100), // PagBank centavos
            professionalId,
            date,
            time: startTime,
          };

          const pixResponse = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(pixPayload),
          });

          if (pixResponse.ok) {
            const resJson: any = await pixResponse.json();
            pixData = {
              pixCopiaECola: resJson["chave-pix-copia-cola"] || resJson.chavePix || resJson.copiaECola,
              pixQrCode: resJson["qr-code"] || resJson.qrCodeUrl || resJson.pixQrCode,
              pixId: resJson["id-pix"] || resJson.idPix || resJson.id,
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
      message: "Agendamento registrado com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao registrar agendamento:", error);
    res.status(500).json({ error: "Erro ao processar agendamento." });
  }
});

// 3. WhatsApp / n8n Multi-Action Webhook Bridge
app.post("/api/appointments/webhook-n8n", async (req, res) => {
  try {
    const { action, professionalId, date, calendarId, patientCpf, patientPhone, appointmentData } = req.body;

    switch (action) {
      case "get_professionals": {
        return res.json({
          success: true,
          message: "Apenas profissionais com Google Calendar vinculado e verificado podem ser agendados.",
          instruction: "Consulte GET /api/appointments/available-slots passando date e calendarId para verificar horários livres.",
        });
      }

      case "get_slots": {
        const targetDate = date || new Date().toISOString().split("T")[0];
        return res.json({
          success: true,
          date: targetDate,
          calendarId: calendarId || null,
          slots: [
            "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
            "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"
          ],
        });
      }

      case "book": {
        // Book from WhatsApp conversation
        const newId = `app-wpp-${Date.now()}`;
        return res.json({
          success: true,
          appointmentId: newId,
          status: "agendado",
          message: "Agendamento via WhatsApp confirmado no e-SUS PEC!",
        });
      }

      case "check_patient": {
        // Patient query via WhatsApp
        return res.json({
          success: true,
          patientPhone: patientPhone || "",
          patientCpf: patientCpf || "",
          message: "Consulta de agendamentos realizada.",
        });
      }

      default:
        return res.json({
          status: "ok",
          service: "e-SUS PEC Multiprofissional Scheduling Webhook",
          timestamp: Date.now(),
        });
    }
  } catch (error) {
    console.error("Erro no webhook n8n:", error);
    res.status(500).json({ error: "Erro ao processar webhook n8n." });
  }
});

// 3.1 Dispatch Appointment Notification Event to n8n / Evolution API (and receive confirmations from n8n)
app.post("/api/appointments/notify-event", async (req, res) => {
  try {
    const body = req.body || {};
    const event = body.event || body.eventType || body.type;
    const payload = body.payload || body;
    const apptId = body.appointmentId || payload?.appointmentId || payload?.appointment?.id;
    const webhookUrl = body.webhookUrl;
    const whatsappEnabled = body.whatsappEnabled !== false;

    if (!event) {
      return res.status(400).json({ error: "Parâmetro 'event' ou 'eventType' é obrigatório." });
    }

    console.log(`[Notification Engine] Processando evento "${event}" para agendamento ${apptId || "N/A"}`);

    // Update appointment notification metadata in server store if appointment exists
    if (apptId) {
      const appointments: any[] = readStoreData("appointments", []);
      const idx = appointments.findIndex((a) => a && a.id === apptId);
      if (idx >= 0) {
        const currentAppt = appointments[idx];
        const notif = currentAppt.notifications || {};
        const todayStr = new Date().toISOString().split("T")[0];

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

    // If this is an acknowledgment/confirmation from n8n (eventType ends in _sent), acknowledge immediately
    if (typeof event === "string" && (event.endsWith("_sent") || event.startsWith("ack_"))) {
      return res.json({
        success: true,
        acknowledged: true,
        event,
        appointmentId: apptId,
        timestamp: Date.now(),
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
            dispatchedAt: Date.now(),
          }),
          signal: AbortSignal.timeout(5000),
        });
        forwardedToN8n = n8nRes.ok;
        n8nResponseStatus = n8nRes.status;
      } catch (err: any) {
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
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error("Erro no dispatch de notificação:", error);
    res.status(500).json({ error: error?.message || "Erro ao despachar notificação." });
  }
});

// 3.2 Evolution API / n8n Button Action Callback Handler
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

    console.log(`[Button Action Callback] Ação: "${rawAction}", Agendamento: "${appointmentId}", Telefone: "${userPhone}"`);

    const appointments: any[] = readStoreData("appointments", []);
    const idx = appointments.findIndex((a) => a && (a.id === appointmentId || a.pixOrderReferenceId === appointmentId));

    if (idx === -1) {
      const fallbackMsg = `Recebemos sua resposta. Não localizamos o registro exato do agendamento "${appointmentId}". Entre em contato com a nossa recepção para assistência.`;
      return res.json({
        success: false,
        error: "AGENDAMENTO_NAO_ENCONTRADO",
        appointmentId,
        message: fallbackMsg,
        replyMessage: fallbackMsg,
      });
    }

    const appt = appointments[idx];
    const patientFirstName = (appt.patientName || "Paciente").split(" ")[0];
    const dateFormatted = appt.date?.includes("-")
      ? appt.date.split("-").reverse().join("/")
      : appt.date;

    if (rawAction.includes("cancel")) {
      appt.status = "cancelado";
      appt.cancelReason = "Cancelado pelo paciente via WhatsApp (Evolution API)";
      appt.updatedAt = Date.now();
      appointments[idx] = appt;
      writeStoreData("appointments", appointments);

      const cancelMsg = `Olá, *${patientFirstName}*! Seu agendamento para o dia *${dateFormatted} às ${appt.startTime}* com *${appt.professionalName}* foi cancelado com sucesso. O horário foi liberado. Caso precise marcar uma nova data no futuro, estamos à disposição!`;

      return res.json({
        success: true,
        action: "cancelled",
        appointmentId: appt.id,
        status: "cancelado",
        message: cancelMsg,
        replyMessage: cancelMsg,
      });
    }

    if (rawAction.includes("reagendar") || rawAction.includes("reschedule")) {
      const rescheduleMsg = `Olá, *${patientFirstName}*! Para reagendar seu atendimento com *${appt.professionalName}*, acesse nosso portal de agendamentos online ou informe o novo dia e período de sua preferência por aqui para verificarmos a disponibilidade.`;

      return res.json({
        success: true,
        action: "reschedule_requested",
        appointmentId: appt.id,
        status: appt.status,
        message: rescheduleMsg,
        replyMessage: rescheduleMsg,
        portalUrl: "/agendar",
      });
    }

    if (rawAction.includes("duvidas") || rawAction.includes("help") || rawAction.includes("duvida")) {
      const helpMsg = `Olá, *${patientFirstName}*! Como podemos ajudar com sua consulta de *${appt.serviceName}* com *${appt.professionalName}* agendada para *${dateFormatted} às ${appt.startTime}*? Digite sua dúvida abaixo e nossa equipe responderá em instantes.`;

      return res.json({
        success: true,
        action: "help_requested",
        appointmentId: appt.id,
        status: appt.status,
        message: helpMsg,
        replyMessage: helpMsg,
      });
    }

    const genericMsg = `Olá, *${patientFirstName}*! Sua solicitação referente ao agendamento de *${dateFormatted} às ${appt.startTime}* foi registrada pela equipe do PEC Saúde.`;

    res.json({
      success: true,
      action: rawAction,
      appointmentId: appt.id,
      status: appt.status,
      message: genericMsg,
      replyMessage: genericMsg,
    });
  } catch (error: any) {
    console.error("Erro no callback de ação de botão:", error);
    res.status(500).json({ error: "Erro ao processar retorno do botão." });
  }
});

// 3.3 Endpoint para Varredura de Lembretes Pendentes (Diário, 30m, 10m)
app.get("/api/appointments/pending-reminders", (req, res) => {
  try {
    const appointments: any[] = readStoreData("appointments", []);
    const settings = readStoreData("settings", {});
    const now = Date.now();
    const todayStr = new Date().toISOString().split("T")[0];
    const currentHour = new Date().getHours();
    const instance = settings.evolutionInstanceName || "Typebot_curso_tec";
    const defaultLocation = settings.defaultUnitName || "Unidade Básica de Saúde / PEC";

    const pendingDaily: any[] = [];
    const pending30m: any[] = [];
    const pending10m: any[] = [];
    const allPendingToProcess: any[] = [];

    appointments.forEach((appt) => {
      if (!appt || appt.status !== "agendado" || !appt.date || !appt.startTime) return;

      const notif = appt.notifications || {};
      const apptTimestamp = new Date(`${appt.date}T${appt.startTime}:00`).getTime();
      const diffMs = apptTimestamp - now;
      const diffMinutes = Math.floor(diffMs / (1000 * 60));

      // Normalização do telefone para WhatsApp
      const rawPhone = (appt.patientPhone || "").replace(/\D/g, "");
      const phoneWhatsApp = rawPhone.startsWith("55")
        ? rawPhone
        : rawPhone.length === 10
        ? `55${rawPhone.substring(0, 2)}9${rawPhone.substring(2)}`
        : `55${rawPhone}`;

      const dateFormatted = appt.date.includes("-")
        ? appt.date.split("-").reverse().join("/")
        : appt.date;

      const baseItem = {
        ...appt,
        appointmentId: appt.id,
        patient: {
          name: appt.patientName || "Paciente",
          phone: appt.patientPhone || "",
          phoneWhatsApp,
        },
        patientName: appt.patientName || "Paciente",
        phone: appt.patientPhone || "",
        phoneWhatsApp,
        dateFormatted,
        timeFormatted: appt.startTime,
        time: appt.startTime,
        serviceName: appt.serviceName || "Consulta PEC",
        professionalName: appt.professionalName || "Profissional da Saúde",
        location: appt.unitName || defaultLocation,
        scheduledAt: `${appt.date}T${appt.startTime}:00`,
        instance,
        lastDailyReminderDate: notif.lastDailyReminderDate,
        reminder30Sent: !!notif.reminder30Sent,
        reminder10Sent: !!notif.reminder10Sent,
      };

      // 1. Lembrete Diário (> 24h de antecedência na criação, dia diferente de hoje, ainda não enviado hoje, e hora comercial >= 8h)
      const isScheduledWithMoreThan24h = (apptTimestamp - (appt.createdAt || now)) > 24 * 60 * 60 * 1000;
      
      if (
        isScheduledWithMoreThan24h &&
        appt.date > todayStr &&
        notif.lastDailyReminderDate !== todayStr &&
        currentHour >= 8
      ) {
        const dailyItem = { ...baseItem, pendingDaily: true };
        pendingDaily.push(dailyItem);
        allPendingToProcess.push(dailyItem);
      }

      // 2. Lembrete 30 min (entre 20 e 40 min antes da consulta)
      if (diffMinutes >= 20 && diffMinutes <= 40 && !notif.reminder30Sent) {
        const item30m = { ...baseItem, pending30m: true };
        pending30m.push(item30m);
        allPendingToProcess.push(item30m);
      }

      // 3. Lembrete 10 min (entre 5 e 15 min antes da consulta)
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
        pending10m: pending10m.length,
      },
      // Array standard aliases that n8n Code node uses:
      appointments: allPendingToProcess,
      data: allPendingToProcess,
      pendingDaily,
      pending30m,
      pending10m,
    });
  } catch (error: any) {
    console.error("Erro ao verificar lembretes pendentes:", error);
    res.status(500).json({ error: "Erro ao consultar lembretes pendentes." });
  }
});

// 4. Test Google Calendar ID format, DNS MX & Server Connectivity
// RIGOROUS VALIDATION: Prohibits invented domains, non-Google servers, and malformed secondary IDs!
app.post("/api/appointments/google-calendar/test", async (req, res) => {
  try {
    const { calendarId } = req.body;
    if (!calendarId || typeof calendarId !== "string" || !calendarId.trim()) {
      return res.status(400).json({
        valid: false,
        error: "ID_AUSENTE",
        message: "ID ou e-mail da agenda do Google Calendar não informado.",
      });
    }

    const cleanId = calendarId.trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanId);
    const isGroupCalendar =
      cleanId.toLowerCase().endsWith("@group.calendar.google.com") ||
      cleanId.toLowerCase().endsWith("@import.calendar.google.com");

    if (!isEmail && !isGroupCalendar) {
      return res.status(400).json({
        valid: false,
        error: "FORMATO_INVALIDO",
        message: "Formato inválido. Informe um e-mail Google válido (ex: seu.email@gmail.com) ou o ID de uma agenda secundária (ex: xxx@group.calendar.google.com).",
      });
    }

    const parts = cleanId.split("@");
    const localPart = parts[0] || '';
    const domain = (parts[1] || '').toLowerCase();

    // 1. Real DNS MX resolution to verify domain existence
    let mxRecords: dns.MxRecord[] = [];
    try {
      mxRecords = await dns.promises.resolveMx(domain);
    } catch (dnsErr: any) {
      return res.status(400).json({
        valid: false,
        error: "DOMINIO_INEXISTENTE",
        domain,
        message: `O domínio "@${domain}" não foi localizado ou não possui registros de e-mail (DNS MX) ativos na internet. O Google Calendar não pôde ser vinculado a este endereço.`,
      });
    }

    if (!mxRecords || mxRecords.length === 0) {
      return res.status(400).json({
        valid: false,
        error: "DOMINIO_SEM_MX",
        domain,
        message: `O domínio "@${domain}" não possui servidores de e-mail configurados.`,
      });
    }

    const isGoogleMx = mxRecords.some(
      (r) =>
        Boolean(r.exchange && typeof r.exchange === 'string' && (
          r.exchange.toLowerCase().includes("google.com") ||
          r.exchange.toLowerCase().includes("googlemail.com") ||
          r.exchange.toLowerCase().includes("gmr-smtp-in.l.google.com")
        ))
    );

    // 2. Secondary Agenda validation (@group.calendar.google.com)
    if (isGroupCalendar) {
      // Google Calendar secondary agenda IDs have minimum 16 characters (e.g. c_... or 26-64 alphanumeric hash)
      if (localPart.length < 16) {
        return res.status(400).json({
          valid: false,
          error: "ID_SECUNDARIO_INVALIDO",
          message: `O identificador "${cleanId}" é muito curto para ser uma agenda do Google Calendar. O ID de agenda secundária do Google possui mais de 26 caracteres alfanuméricos (ex: c_... ou hash longo). No Google Calendar, acesse "Configurações da agenda" > "Integrar agenda" > copie o "ID da agenda" completo.`,
        });
      }

      // Direct probe to Google Calendar servers (iCal feed)
      const icalUrl = `https://calendar.google.com/calendar/ical/${encodeURIComponent(cleanId)}/public/basic.ics`;
      let isPublicIcalActive = false;
      try {
        const icalRes = await fetch(icalUrl, { method: "HEAD", signal: AbortSignal.timeout(3000) });
        if (icalRes.ok) {
          isPublicIcalActive = true;
        }
      } catch {
        // Network timeout / error
      }

      return res.json({
        valid: true,
        calendarId: cleanId,
        type: "secondary_group",
        isPublicIcalActive,
        mxProvider: "Google Calendar Group Service",
        message: isPublicIcalActive
          ? `Agenda secundária "${cleanId}" verificada e conectada com sucesso! O e-SUS PEC e o n8n sincronizarão horários ocupados diretamente via iCal.`
          : `ID de agenda secundária do Google Calendar com formato válido. Para que o n8n e o e-SUS PEC leiam os horários ocupados e bloqueiem horários automaticamente, certifique-se de marcar "Tornar disponível publicamente (Ver apenas livre/ocupado)" ou compartilhar com o serviço n8n.`,
      });
    }

    // 3. Regular Email: Verify it uses Google Mail / Google Workspace servers
    if (!isGoogleMx) {
      const primaryMx = mxRecords[0]?.exchange || "desconhecido";
      return res.status(400).json({
        valid: false,
        error: "PROVEDOR_NAO_GOOGLE",
        domain,
        primaryMx,
        message: `O domínio "@${domain}" utiliza servidores de e-mail da "${primaryMx}" e não do Google. Para sincronização com o Google Calendar, informe uma conta Google (Gmail ou Google Workspace) ou o ID de uma agenda secundária (@group.calendar.google.com).`,
      });
    }

    // DIRECTIVE: Professionals MUST strictly use a secondary calendar (@group.calendar.google.com)!
    // If they provided just their email, inform them that secondary agenda selection is required.
    return res.status(400).json({
      valid: false,
      error: "AGENDA_PRINCIPAL_PROIBIDA",
      isEmailAccount: true,
      calendarId: cleanId,
      domain,
      mxProvider: "Google Workspace / Gmail",
      message: `Atenção: Não é permitido utilizar a agenda pessoal/principal (${cleanId}) diretamente para agendamentos. Para preservar sua privacidade e garantir a sincronização com o n8n/e-SUS PEC, utilize uma agenda secundária (@group.calendar.google.com). Clique em "Buscar Agendas Secundárias" para autenticar e escolher sua agenda secundária no Google Calendar.`,
    });
  } catch (error: any) {
    console.error("Erro ao testar Google Calendar ID:", error);
    res.status(500).json({ valid: false, error: "ERRO_INTERNO", message: "Erro interno ao validar agenda Google." });
  }
});

// 5. Query user's secondary calendars using Google OAuth Access Token
app.post("/api/appointments/google-calendar/list-secondary", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const tokenFromBody = req.body?.accessToken;
    const accessToken = authHeader?.replace(/^Bearer\s+/i, "") || tokenFromBody;

    if (!accessToken) {
      return res.status(401).json({
        error: "TOKEN_AUSENTE",
        message: "Token de acesso do Google não fornecido.",
      });
    }

    const gcalRes = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!gcalRes.ok) {
      const errData = await gcalRes.json().catch(() => ({}));
      return res.status(gcalRes.status).json({
        error: "GOOGLE_API_ERROR",
        message: errData?.error?.message || "Erro ao consultar lista de agendas do Google Calendar.",
      });
    }

    const data = await gcalRes.json();
    const items = data.items || [];

    // Filter secondary calendars: NOT primary and has write/owner permissions
    const secondaryCalendars = items
      .filter((cal: any) => {
        const isPrimary = Boolean(cal.primary);
        return !isPrimary;
      })
      .map((cal: any) => ({
        id: cal.id,
        summary: cal.summary || "Agenda sem título",
        description: cal.description || "",
        primary: false,
        timeZone: cal.timeZone,
        backgroundColor: cal.backgroundColor,
        foregroundColor: cal.foregroundColor,
        accessRole: cal.accessRole,
        isGroupSecondary: Boolean(cal.id && typeof cal.id === 'string' && cal.id.toLowerCase().includes("@group.calendar.google.com")),
      }));

    const primaryCal = items.find((cal: any) => Boolean(cal.primary));

    res.json({
      success: true,
      totalCalendars: items.length,
      secondaryCalendars,
      primaryCalendarSummary: primaryCal?.summary || primaryCal?.id,
    });
  } catch (error: any) {
    console.error("Erro ao listar agendas secundárias:", error);
    res.status(500).json({ error: "ERRO_INTERNO", message: "Falha ao buscar agendas secundárias do Google." });
  }
});

// 6. Webhook / Retorno PagBank e n8n para confirmação de PIX
app.post(["/api/webhook/pagbank-retorno-pix", "/api/pix/confirm"], async (req, res) => {
  try {
    const body = req.body || {};
    const referenceId =
      body.reference_id ||
      body.referenceId ||
      body?.body?.reference_id ||
      body.agendamento_id ||
      body.orderId;

    const status =
      body.status ||
      body.status_pagamento ||
      body?.body?.status ||
      "pago";

    console.log(`[PIX Webhook] Recebida notificação para referência: ${referenceId}, status: ${status}`);

    res.json({
      success: true,
      received: true,
      referenceId,
      status,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error("Erro no webhook de PIX:", error);
    res.status(500).json({ success: false, error: error?.message || "Erro no webhook" });
  }
});

// 6.0. Endpoint Dinâmico de Geração de PIX via Webhook n8n (PagBank)
// Resolve a URL exclusivamente a partir das configurações salvas no banco/Firestore ou enviadas pelo cliente
app.post("/api/webhook/generate-pix", async (req, res) => {
  const startTime = Date.now();
  try {
    const { webhookUrl, appointment, customAmount, plan, payload: directPayload } = req.body;

    // Resolve URL exclusivamente da requisição ou das configurações persistidas no banco
    const settings = readStoreData("settings", {});
    const targetWebhook = (webhookUrl && typeof webhookUrl === "string" && webhookUrl.trim())
      ? webhookUrl.trim()
      : (settings.n8nPixWebhookUrl && typeof settings.n8nPixWebhookUrl === "string" && settings.n8nPixWebhookUrl.trim()
          ? settings.n8nPixWebhookUrl.trim()
          : "");

    if (!targetWebhook) {
      return res.status(400).json({
        success: false,
        error: "URL_NAO_CONFIGURADA",
        message: "Nenhuma URL de webhook n8n para geração de PIX está configurada. Cadastre a URL na aba 'Webhooks & n8n' das Configurações do Sistema.",
      });
    }

    let pixPayload = directPayload;
    if (!pixPayload) {
      if (appointment) {
        const cleanCpf = (appointment.patientCpf || "").replace(/\D/g, "") || "00000000000";
        const cleanPhone = (appointment.patientPhone || "").replace(/\D/g, "");
        const amountToCharge = customAmount !== undefined ? customAmount : (appointment.servicePrice || 0);

        pixPayload = {
          agendamento_id: appointment.id || `app-${Date.now()}`,
          userName: appointment.patientName || "Paciente",
          Email: appointment.patientEmail || `${cleanPhone}@paciente.esus.gov.br`,
          userCpf: cleanCpf,
          userPhone: cleanPhone,
          "Nome-servico": `${appointment.serviceName || "Consulta"} - ${appointment.professionalName || "Profissional"}`,
          Valor: Math.round(amountToCharge * 100), // PagBank centavos
          valorFormatado: amountToCharge.toFixed(2),
          professionalId: appointment.professionalId,
          date: appointment.date,
          time: appointment.startTime,
        };
      } else if (plan) {
        pixPayload = {
          userName: req.body.userName || "Usuário PEC",
          Email: req.body.email || req.body.Email || "usuario@pec.saude.gov.br",
          userCpf: (req.body.userCpf || "").replace(/\D/g, "") || "00000000000",
          userPhone: (req.body.userPhone || "").replace(/\D/g, ""),
          "Nome-servico": plan.name || "Assinatura de Plano",
          Valor: Math.round((plan.price || 0) * 100),
          valorFormatado: (plan.price || 0).toFixed(2),
          duracaoDias: plan.durationDays || 30,
          agendamento_id: req.body.userId || `sub_${Date.now()}`,
          subscription_id: req.body.orderId || `sub_${Date.now()}`,
        };
      }
    }

    if (!pixPayload) {
      return res.status(400).json({
        success: false,
        error: "PAYLOAD_INVALIDO",
        message: "Dados de agendamento ou plano insuficientes para gerar a cobrança PIX.",
      });
    }

    console.log(`[PIX Engine] Disparando para o webhook n8n cadastrado: ${targetWebhook}`);
    const n8nResponse = await fetch(targetWebhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(pixPayload),
      signal: AbortSignal.timeout(20000),
    });

    const durationMs = Date.now() - startTime;
    const contentType = n8nResponse.headers.get("content-type") || "";
    let data: any = null;

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
        data,
      });
    }

    const pixCopiaECola = data?.["chave-pix-copia-cola"] || data?.chavePix || data?.copiaECola || data?.pixCopiaECola || "";
    const pixQrCode = data?.["qr-code"] || data?.qrCode || data?.qrCodeUrl || data?.pixQrCode || "";
    const pixId = data?.["id-pix"] || data?.idPix || data?.id || "";
    const rawExpiration =
      data?.["expiration_date"] ||
      data?.expiration_date ||
      data?.expirationDate ||
      data?.expires_at ||
      data?.expiresAt ||
      data?.expiracao ||
      "";

    let expiresAt = 0;
    const now = Date.now();
    if (rawExpiration) {
      if (typeof rawExpiration === "number") {
        expiresAt = rawExpiration > 1e11 ? rawExpiration : rawExpiration * 1000;
      } else if (typeof rawExpiration === "string") {
        const cleanStr = rawExpiration.trim();
        const brRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:(?:\s+às\s+|\s+)(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/i;
        const match = cleanStr.match(brRegex);
        if (match) {
          const day = parseInt(match[1], 10);
          const month = parseInt(match[2], 10);
          const year = parseInt(match[3], 10);
          const hours = match[4] !== undefined ? parseInt(match[4], 10) : 23;
          const minutes = match[5] !== undefined ? parseInt(match[5], 10) : 59;
          const seconds = match[6] !== undefined ? parseInt(match[6], 10) : 59;
          const pad = (n: number) => String(n).padStart(2, '0');
          const isoWithBrTz = `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:${pad(seconds)}-03:00`;
          const dt = new Date(isoWithBrTz);
          if (!isNaN(dt.getTime())) {
            expiresAt = dt.getTime();
          }
        }
        if (!expiresAt && cleanStr.includes('T') && !cleanStr.endsWith('Z') && !cleanStr.match(/[+-]\d{2}:?\d{2}$/)) {
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
      expiresAt = now + 30 * 60 * 1000;
    }

    const expDate = new Date(expiresAt);
    const expirationDateFormatted = `${String(expDate.getDate()).padStart(2, '0')}/${String(expDate.getMonth() + 1).padStart(2, '0')}/${expDate.getFullYear()} às ${String(expDate.getHours()).padStart(2, '0')}:${String(expDate.getMinutes()).padStart(2, '0')}:${String(expDate.getSeconds()).padStart(2, '0')}`;

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
      message: "PIX gerado com sucesso pelo webhook n8n cadastrado.",
    });
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    console.error("[PIX Webhook Error]:", err);
    return res.status(500).json({
      success: false,
      durationMs,
      error: "DISPATCH_FAILED",
      message: `Erro ao conectar com webhook n8n: ${err?.message || "Falha de conexão"}`,
    });
  }
});

// 6.1. Endpoint de Teste do Webhook n8n para Geração de PIX (PagBank)
app.post("/api/webhook/test-pix", async (req, res) => {
  const startTime = Date.now();
  try {
    const { webhookUrl, customPayload } = req.body;
    if (!webhookUrl || typeof webhookUrl !== "string" || !webhookUrl.trim()) {
      return res.status(400).json({
        success: false,
        error: "URL_AUSENTE",
        message: "URL do webhook n8n para geração de PIX não informada.",
      });
    }

    const cleanUrl = webhookUrl.trim();
    const testPayload = customPayload || {
      userName: "Teste Conexão n8n",
      Email: "teste.n8n@saude.gov.br",
      userCpf: "11144477735",
      userPhone: "11999998888",
      "Nome-servico": "Teste de Comunicação Webhook n8n",
      Valor: 100, // R$ 1,00 em centavos
      valorFormatado: "1.00",
      duracaoDias: 1,
      agendamento_id: `test_${Date.now()}`,
      subscription_id: `test_sub_${Date.now()}`,
    };

    const response = await fetch(cleanUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(testPayload),
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    const durationMs = Date.now() - startTime;
    const contentType = response.headers.get("content-type") || "";
    let responseData: any = null;

    if (contentType.includes("application/json")) {
      responseData = await response.json().catch(() => null);
    } else {
      const text = await response.text().catch(() => "");
      responseData = { rawText: text.slice(0, 500) };
    }

    if (response.ok) {
      const hasPixKeys = responseData && (
        responseData["chave-pix-copia-cola"] ||
        responseData["qr-code"] ||
        responseData.copiaECola ||
        responseData.qrCode ||
        responseData["id-pix"] ||
        responseData.id
      );

      return res.json({
        success: true,
        status: response.status,
        durationMs,
        hasPixKeys: Boolean(hasPixKeys),
        qrCode: responseData?.["qr-code"] || responseData?.qrCode || null,
        copiaECola: responseData?.["chave-pix-copia-cola"] || responseData?.copiaECola || null,
        idPix: responseData?.["id-pix"] || responseData?.id || null,
        data: responseData,
        message: hasPixKeys
          ? `Webhook n8n respondeu com sucesso em ${durationMs}ms com dados de PIX válidos!`
          : `Webhook n8n respondeu com status HTTP ${response.status} em ${durationMs}ms.`,
      });
    } else {
      let explanation = `O servidor retornou erro HTTP ${response.status} (${response.statusText}).`;
      if (response.status === 404) {
        explanation = "Erro HTTP 404: O webhook n8n não foi encontrado ou o fluxo está desativado (Inactive). Ative o fluxo no n8n clicando em 'Active'.";
      } else if (response.status === 500) {
        explanation = "Erro HTTP 500: Ocorreu um erro interno no fluxo n8n durante a execução dos nós.";
      }

      return res.status(response.status).json({
        success: false,
        status: response.status,
        durationMs,
        error: "HTTP_ERROR",
        message: explanation,
        data: responseData,
      });
    }
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    let msg = `Erro ao conectar com webhook: ${err?.message || "Falha de rede"}`;
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
      msg = `Tempo limite esgotado (timeout após ${durationMs}ms). Verifique se o servidor do n8n está online e acessível.`;
    }
    return res.status(500).json({
      success: false,
      error: "CONNECTION_FAILED",
      durationMs,
      message: msg,
    });
  }
});

// 6.2. Endpoint de Teste Genérico para Webhooks n8n (Assinaturas, Prontuários, Eventos)
app.post("/api/webhook/test-generic", async (req, res) => {
  const startTime = Date.now();
  try {
    const { webhookUrl, serviceName, customPayload } = req.body;
    if (!webhookUrl || typeof webhookUrl !== "string" || !webhookUrl.trim()) {
      return res.status(400).json({
        success: false,
        error: "URL_AUSENTE",
        message: "URL do webhook não informada.",
      });
    }

    const cleanUrl = webhookUrl.trim();
    const payload = customPayload || {
      event: "test_event",
      service: serviceName || "e-SUS PEC AI",
      timestamp: Date.now(),
      dateFormatted: new Date().toLocaleDateString("pt-BR"),
      timeFormatted: new Date().toLocaleTimeString("pt-BR"),
      data: {
        message: `Disparo de teste para o serviço ${serviceName || "n8n"}`,
        system: "e-SUS PEC AI Multi-Profissional",
        status: "success",
      },
    };

    const response = await fetch(cleanUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    const durationMs = Date.now() - startTime;
    const contentType = response.headers.get("content-type") || "";
    let responseData: any = null;

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
        message: `Webhook ${serviceName || "n8n"} respondeu com sucesso (HTTP ${response.status}) em ${durationMs}ms.`,
      });
    } else {
      return res.status(response.status).json({
        success: false,
        status: response.status,
        durationMs,
        message: `O webhook respondeu com HTTP ${response.status} (${response.statusText}).`,
        data: responseData,
      });
    }
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    return res.status(500).json({
      success: false,
      error: "CONNECTION_FAILED",
      durationMs,
      message: `Falha na conexão com o webhook: ${err?.message || "Erro de rede"}`,
    });
  }
});

// 6.3. Endpoint de Teste de Conexão com Evolution API
app.post("/api/evolution/test", async (req, res) => {
  const startTime = Date.now();
  try {
    const { apiUrl, apiKey, instanceName } = req.body;
    if (!apiUrl || !apiKey || !instanceName) {
      return res.status(400).json({
        success: false,
        error: "PARAMETROS_INCOMPLETOS",
        message: "URL da Evolution API, API Key e Nome da Instância são obrigatórios.",
      });
    }

    const cleanUrl = apiUrl.trim().replace(/\/+$/, "");
    const cleanKey = apiKey.trim();
    const cleanInstance = instanceName.trim();

    // Try fetching instance connection state
    const targetUrl = `${cleanUrl}/instance/connectionState/${encodeURIComponent(cleanInstance)}`;
    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        apikey: cleanKey,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000),
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
        message: `Instância "${cleanInstance}" conectada na Evolution API (Estado: ${state.toUpperCase()}) em ${durationMs}ms.`,
      });
    } else {
      return res.status(response.status).json({
        success: false,
        status: response.status,
        durationMs,
        data,
        message: data?.response?.message || data?.message || `Erro HTTP ${response.status} ao consultar Evolution API.`,
      });
    }
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    return res.status(500).json({
      success: false,
      error: "EVOLUTION_CONNECT_ERROR",
      durationMs,
      message: `Erro ao contatar Evolution API: ${err?.message || "Falha de rede"}`,
    });
  }
});

// 7. Persistent Local & Server Database API (Full-Stack Data Synchronization Layer)
import fs from "fs";
import { initializeApp as initServerFirebase, getApps as getServerApps, getApp as getServerApp } from 'firebase/app';
import {
  getFirestore as getServerFirestore,
  collection as serverCollection,
  doc as serverDoc,
  getDocs as getServerDocs,
  getDoc as getServerDoc,
  setDoc as serverSetDoc,
  deleteDoc as serverDeleteDoc,
} from 'firebase/firestore';
import { createClient as createSupabaseServerClient } from '@supabase/supabase-js';
import firebaseConfig from './firebase-applet-config.json';

const serverFirebaseApp = !getServerApps().length
  ? initServerFirebase(firebaseConfig, 'server-backend')
  : (getServerApps().find(a => a.name === 'server-backend') || getServerApp('server-backend'));

const serverDb = (firebaseConfig as any).firestoreDatabaseId
  ? getServerFirestore(serverFirebaseApp, (firebaseConfig as any).firestoreDatabaseId)
  : getServerFirestore(serverFirebaseApp);

// ================= SUPABASE CLOUD POSTGRESQL CLIENT =================
const SUPABASE_URL = "https://ejsvpdecoxqqebipybiz.supabase.co";
const SUPABASE_SERVICE_ROLE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqc3ZwZGVjb3hxcWViaXB5Yml6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTA0NTY4OSwiZXhwIjoyMTA2NjIxNjg5fQ.g4lEjCA-9tmuvny1Gpsok4n9d5VdoStNNlqsKvosVg8";

export const supabaseServer = createSupabaseServerClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Non-blocking helper to mirror data updates to Supabase PostgreSQL
async function syncItemToSupabase(collectionName: string, item: any, isDelete = false, deleteId?: string) {
  try {
    const tableMap: Record<string, string> = {
      users: "users",
      patients: "patients",
      consultations: "consultations",
      clinical_evolutions: "clinical_evolutions",
      appointments: "appointments",
      reception_queue: "reception_queue",
      settings: "system_settings",
      system_settings: "system_settings",
      subscriptions: "subscriptions",
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
          updated_at: Date.now(),
        });
      }
      return;
    }

    // Prepare payload adapted for Supabase
    let payload: Record<string, any> = {
      id: String(item.id),
      raw_data: item,
      updated_at: Date.now(),
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
        created_at: item.createdAt || Date.now(),
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
        created_at: item.createdAt || item.timestamp || Date.now(),
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
        created_at: item.createdAt || Date.now(),
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
        created_at: item.createdAt || Date.now(),
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
        created_at: item.createdAt || Date.now(),
      };
    } else if (collectionName === "clinical_evolutions") {
      payload = {
        ...payload,
        patient_id: item.patientId || item.id,
        patient_name: item.patientName || null,
        generated_at: item.generatedAt || Date.now(),
        model_used: item.modelUsed || null,
        resumo_longitudinal: item.resumoLongitudinal || null,
        raw_markdown: item.rawMarkdown || null,
      };
    } else if (collectionName === "settings" || collectionName === "system_settings") {
      payload = {
        id: "global",
        data: item,
        updated_at: Date.now(),
      };
    }

    const { error } = await supabaseServer.from(targetTable).upsert(payload);
    if (error) {
      // If table doesn't exist yet, it's non-blocking (user can run setup script or we log status)
      console.debug(`[Supabase Sync Notice] (${targetTable}):`, error.message);
    }
  } catch (err: any) {
    console.debug(`[Supabase Sync Catch] (${collectionName}):`, err?.message || err);
  }
}

const DATA_STORE_DIR = path.join(process.cwd(), "data-store");
if (!fs.existsSync(DATA_STORE_DIR)) {
  fs.mkdirSync(DATA_STORE_DIR, { recursive: true });
}

function getStoreFilePath(collectionName: string): string {
  const safeName = collectionName.replace(/[^a-zA-Z0-9_-]/g, "");
  return path.join(DATA_STORE_DIR, `${safeName}.json`);
}

function readStoreData(collectionName: string, defaultVal: any = []): any {
  try {
    const filePath = getStoreFilePath(collectionName);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultVal, null, 2), "utf8");
      return defaultVal;
    }
    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content);
  } catch (err) {
    console.warn(`[DataStore] Erro ao ler ${collectionName}:`, err);
    return defaultVal;
  }
}

function writeStoreData(collectionName: string, data: any): void {
  try {
    const filePath = getStoreFilePath(collectionName);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error(`[DataStore] Erro ao escrever ${collectionName}:`, err);
  }
}

// Supabase Status & Full Sync Endpoints
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
      timestamp: Date.now(),
    });
  } catch (err: any) {
    res.json({
      success: false,
      connected: false,
      url: SUPABASE_URL,
      error: err?.message || String(err),
    });
  }
});

app.post("/api/supabase/sync-all", async (req, res) => {
  try {
    const results: Record<string, number> = {};
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
      timestamp: Date.now(),
    });
  } catch (err: any) {
    console.error("[Supabase Sync All Error]:", err);
    res.status(500).json({ success: false, error: err?.message || "Erro na sincronização" });
  }
});

// Database Connection Health Check Endpoint
app.get("/api/health/database", async (req, res) => {
  try {
    const snap = await getServerDocs(serverCollection(serverDb, "users"));
    res.json({
      status: "connected",
      databaseId: (firebaseConfig as any).firestoreDatabaseId,
      projectId: (firebaseConfig as any).projectId,
      usersCount: snap.size,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    res.status(500).json({
      status: "error",
      message: err?.message || String(err),
      databaseId: (firebaseConfig as any).firestoreDatabaseId,
      projectId: (firebaseConfig as any).projectId,
      timestamp: Date.now(),
    });
  }
});

// Full Database Sync / Clone Endpoint (Populates Cloud Firestore from data-store/*.json)
app.post("/api/admin/sync-full-database", async (req, res) => {
  try {
    const { newAdminEmail } = req.body || {};
    const cleanAdminEmail = typeof newAdminEmail === "string" ? newAdminEmail.trim().toLowerCase() : "";

    // 1. Settings
    const settings = readStoreData("settings", {});
    if (settings && Object.keys(settings).length > 0) {
      const payload = {
        ...settings,
        updatedAt: Date.now(),
        updatedBy: cleanAdminEmail || settings.updatedBy || "jerime.rego@gmail.com",
      };
      await serverSetDoc(serverDoc(serverDb, "system_settings", "global"), payload, { merge: true });
    }

    // 2. Users
    const users: any[] = readStoreData("users", []);
    let syncedUsers = 0;
    for (const u of users) {
      if (!u || !u.id) continue;
      const emailLower = (u.email || "").toLowerCase().trim();
      const isAdmin = emailLower === "jerime.rego@gmail.com" || (cleanAdminEmail && emailLower === cleanAdminEmail) || u.role === "admin";
      const uPayload = {
        ...u,
        role: isAdmin ? "admin" : (u.role || "user"),
        subscription_status: isAdmin ? "pago" : (u.subscription_status || "free"),
        free_used: isAdmin ? true : Boolean(u.free_used),
        ...(isAdmin ? { subscription_expires_at: 4102444799999, plan_name: "Administrador Vitalício" } : {}),
      };
      await serverSetDoc(serverDoc(serverDb, "users", u.id), uPayload, { merge: true });
      syncedUsers++;
    }

    if (cleanAdminEmail) {
      const exists = users.some((u) => (u.email || "").toLowerCase().trim() === cleanAdminEmail);
      if (!exists) {
        const newId = `user-admin-${cleanAdminEmail.split("@")[0].replace(/[^a-zA-Z0-9]/g, "")}`;
        await serverSetDoc(
          serverDoc(serverDb, "users", newId),
          {
            id: newId,
            name: cleanAdminEmail.split("@")[0],
            email: cleanAdminEmail,
            role: "admin",
            subscription_status: "pago",
            subscription_expires_at: 4102444799999,
            plan_name: "Administrador Vitalício",
            free_used: true,
            profession: "enfermeiro",
            workplace: "Atenção Primária à Saúde",
            createdAt: Date.now(),
          },
          { merge: true }
        );
        syncedUsers++;
      }
    }

    // 3. Patients
    const patients: any[] = readStoreData("patients", []);
    let syncedPatients = 0;
    for (const p of patients) {
      if (!p || !p.id) continue;
      await serverSetDoc(serverDoc(serverDb, "patients", p.id), p, { merge: true });
      syncedPatients++;
    }

    // 4. Consultations
    const consultations: any[] = readStoreData("consultations", []);
    let syncedConsultations = 0;
    for (const c of consultations) {
      if (!c || !c.id) continue;
      await serverSetDoc(serverDoc(serverDb, "consultations", c.id), c, { merge: true });
      syncedConsultations++;
    }

    // 5. Appointments
    const appointments: any[] = readStoreData("appointments", []);
    let syncedAppointments = 0;
    for (const a of appointments) {
      if (!a || !a.id) continue;
      await serverSetDoc(serverDoc(serverDb, "appointments", a.id), a, { merge: true });
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
      timestamp: Date.now(),
    });
  } catch (err: any) {
    console.error("[SyncDatabase] Erro ao sincronizar banco:", err);
    res.status(500).json({
      success: false,
      error: "SYNC_FAILED",
      message: err?.message || String(err),
    });
  }
});

function sanitizeForFirestoreServer(val: any): any {
  if (val === undefined) {
    return null;
  }
  if (val === null || typeof val !== 'object') {
    return val;
  }
  if (Array.isArray(val)) {
    return val
      .map((item) => sanitizeForFirestoreServer(item))
      .filter((item) => item !== undefined);
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(val)) {
    if (value !== undefined) {
      clean[key] = sanitizeForFirestoreServer(value);
    }
  }
  return clean;
}

// GET all items in collection (Supabase PostgreSQL primary source of truth merged with local store)
app.get("/api/db/:collection", async (req, res) => {
  const { collection } = req.params;
  const localData = readStoreData(collection, collection === "settings" ? {} : []);

  // 1. Check Supabase PostgreSQL first
  let supabaseItems: any[] = [];
  try {
    let sbTable = collection;
    if (collection === "settings" || collection === "system_settings") {
      sbTable = "system_settings";
    }
    const { data: sbData, error: sbErr } = await supabaseServer.from(sbTable).select("*");
    if (!sbErr && sbData && Array.isArray(sbData)) {
      if (sbTable === "system_settings") {
        const globalRow = sbData.find((r: any) => r.id === "global") || sbData[0];
        if (globalRow && globalRow.data) {
          const mergedSettings = { ...localData, ...globalRow.data };
          writeStoreData("settings", mergedSettings);
          return res.json({ success: true, collection, data: mergedSettings });
        }
      } else {
        supabaseItems = sbData.map((row: any) => {
          if (row.raw_data && typeof row.raw_data === "object") {
            return { ...row.raw_data, id: row.id };
          }
          return row;
        });
      }
    }
  } catch (err: any) {
    console.debug("[Supabase Server Fetch Notice]:", err?.message || err);
  }

  if (collection === "settings") {
    return res.json({ success: true, collection, data: localData });
  }

  // Seamless merge by item ID to guarantee no items are dropped across Supabase and local store
  const mergedMap = new Map<string, any>();

  // 1. Put Supabase items (primary source of truth)
  supabaseItems.forEach((it) => {
    if (it && it.id) mergedMap.set(it.id, it);
  });

  // 3. Put local store items, preserving any local items not yet synced
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

  // Limpeza automática de assinaturas pendentes/expiradas que já passaram da data de validade
  if (collection === "subscriptions" && Array.isArray(data)) {
    const now = Date.now();
    data = data.filter((sub: any) => {
      if (!sub) return false;
      const isPendingOrExpired = sub.status === "pendente" || sub.status === "expirado";
      if (isPendingOrExpired && sub.expiresAt && sub.expiresAt <= now) {
        return false; // Exclui do banco de dados e da interface
      }
      return true;
    });
  }

  // Sort consultations, reception_queue, and appointments by timestamp descending
  if (collection === "consultations" || collection === "reception_queue" || collection === "appointments") {
    data.sort((a: any, b: any) => (Number(b.timestamp || b.createdAt) || 0) - (Number(a.timestamp || a.createdAt) || 0));
  }

  const storeFilePath = getStoreFilePath(collection);
  if (!fs.existsSync(storeFilePath) || JSON.stringify(localData) !== JSON.stringify(data)) {
    writeStoreData(collection, data);
  }
  res.json({ success: true, collection, data });
});

// POST cleanup expired subscriptions endpoint
app.post("/api/subscriptions/cleanup-expired", async (req, res) => {
  try {
    const list: any[] = readStoreData("subscriptions", []);
    const now = Date.now();
    const initialCount = list.length;

    const filtered = list.filter((sub: any) => {
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
      timestamp: now,
    });
  } catch (error: any) {
    console.error("Erro ao limpar assinaturas expiradas:", error);
    res.status(500).json({ error: "Erro na rotina de limpeza de assinaturas expiradas." });
  }
});

// POST upsert item in collection (Writes simultaneously to local store & Cloud Firestore)
app.post("/api/db/:collection", async (req, res) => {
  const { collection } = req.params;
  const item = req.body;

  if (collection === "settings") {
    const current = readStoreData("settings", {});
    const updated = { ...current, ...item, updatedAt: Date.now() };
    writeStoreData("settings", updated);

    // Sync to Supabase PostgreSQL & Cloud Firestore
    syncItemToSupabase("settings", updated).catch(() => {});
    serverSetDoc(serverDoc(serverDb, "system_settings", "global"), updated, { merge: true }).catch((err) => {
      console.warn('[ServerFirestore] Erro ao sincronizar settings no Firestore:', err?.message || err);
    });

    return res.json({ success: true, data: updated });
  }

  const list: any[] = readStoreData(collection, []);
  const itemId = item.id || `doc-${Date.now()}`;
  const itemWithId = { ...item, id: itemId };

  const existingIdx = list.findIndex(
    (x) =>
      x &&
      (x.id === itemId ||
        (collection === "users" &&
          x.email &&
          itemWithId.email &&
          typeof x.email === "string" &&
          typeof itemWithId.email === "string" &&
          x.email.toLowerCase().trim() === itemWithId.email.toLowerCase().trim()))
  );
  if (existingIdx >= 0) {
    list[existingIdx] = { ...list[existingIdx], ...itemWithId };
  } else {
    list.unshift(itemWithId);
  }

  writeStoreData(collection, list);

  // Sync to Supabase PostgreSQL
  syncItemToSupabase(collection, itemWithId).catch(() => {});

  // Post-Atendimento Trigger: If saving a clinical consultation, automatically generate/update clinical evolution for the patient
  if (collection === "consultations" && itemWithId.patientId) {
    const authorProf = (itemWithId.authorProfession || "").toLowerCase();
    const isAdminOrReception = authorProf === "administrativo" || authorProf === "recepcao" || authorProf === "recepcionista";

    if (!isAdminOrReception) {
      // Trigger background update of clinical evolution without blocking HTTP response
      setTimeout(async () => {
        try {
          console.log(`[Auto-Evolution Trigger] Iniciando atualização de evolução longitudinal para paciente ${itemWithId.patientId} após atendimento clínico...`);
          const patientsList: any[] = readStoreData("patients", []);
          const allConsultations: any[] = readStoreData("consultations", []);
          const targetPatient = patientsList.find((p) => p && p.id === itemWithId.patientId);

          if (targetPatient) {
            const patientConsultations = allConsultations.filter((c) => c && c.patientId === targetPatient.id);
            if (patientConsultations.length > 0) {
              const { parsedEvolution, skippedAi } = await generateLongitudinalEvolutionWithCascade({
                patient: targetPatient,
                consultations: patientConsultations,
              });

              if (!skippedAi) {
                // Save to datastore & Supabase
                const evolutionsList: any[] = readStoreData("clinical_evolutions", []);
                const exIdx = evolutionsList.findIndex((e) => e && (e.patientId === targetPatient.id || e.id === targetPatient.id));
                if (exIdx >= 0) {
                  evolutionsList[exIdx] = parsedEvolution;
                } else {
                  evolutionsList.unshift(parsedEvolution);
                }
                writeStoreData("clinical_evolutions", evolutionsList);
                syncItemToSupabase("clinical_evolutions", parsedEvolution).catch(() => {});
                console.log(`[Auto-Evolution Trigger] Sucesso: Evolução longitudinal do paciente ${targetPatient.fullName} atualizada e persistida (incremental).`);
              } else {
                console.log(`[Auto-Evolution Trigger] Paciente ${targetPatient.fullName} já estava com prontuário em dia. IA economizada.`);
              }
            }
          }
        } catch (autoEvolErr: any) {
          console.warn(`[Auto-Evolution Trigger] Falha ao processar evolução automática do paciente ${itemWithId.patientId}:`, autoEvolErr?.message || autoEvolErr);
        }
      }, 500);
    }
  }

  res.json({ success: true, data: itemWithId, total: list.length });
});

// Nightly Batch Job: Mon-Fri at 23:00 to process/update clinical evolutions for active patients
function initNightlyEvolutionBatchJob() {
  let lastRunDateString = "";

  setInterval(async () => {
    try {
      const now = new Date();
      // Brasilia / Local Time evaluation
      const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 5 = Friday, 6 = Saturday
      const hour = now.getHours();
      const minute = now.getMinutes();
      const dateString = now.toISOString().split("T")[0];

      // Only run Monday to Friday (1 to 5) at 23:00 (between 23:00 and 23:05)
      const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
      const isNightlyTargetTime = hour === 23 && minute >= 0 && minute <= 5;

      if (isWeekday && isNightlyTargetTime && lastRunDateString !== dateString) {
        lastRunDateString = dateString;
        console.log(`[Nightly Evolution Batch] Iniciando rotina noturna (Seg-Sex 23h) - Data: ${dateString}...`);

        const patients: any[] = readStoreData("patients", []);
        const consultations: any[] = readStoreData("consultations", []);
        const appointments: any[] = readStoreData("appointments", []);

        if (patients.length === 0 || consultations.length === 0) {
          console.log("[Nightly Evolution Batch] Sem pacientes ou prontuários cadastrados para processamento.");
          return;
        }

        // Identify patients with clinical consultations (excluding purely administrative records)
        const activePatientsWithClinicalRecords = patients.filter((patient) => {
          if (!patient || !patient.id) return false;
          const patientCons = consultations.filter((c) => {
            if (!c || c.patientId !== patient.id) return false;
            const prof = (c.authorProfession || "").toLowerCase();
            return prof !== "administrativo" && prof !== "recepcao" && prof !== "recepcionista";
          });
          return patientCons.length > 0;
        });

        console.log(`[Nightly Evolution Batch] Identificados ${activePatientsWithClinicalRecords.length} pacientes com prontuários clínicos ativos.`);

        // Process with controlled concurrency to avoid rate limits
        for (const patient of activePatientsWithClinicalRecords) {
          try {
            const patientConsultations = consultations.filter((c) => c && c.patientId === patient.id);
            const { parsedEvolution, skippedAi } = await generateLongitudinalEvolutionWithCascade({
              patient,
              consultations: patientConsultations,
              appointments,
            });

            if (skippedAi) {
              console.log(`[Nightly Evolution Batch] Paciente ${patient.fullName} sem atendimentos pendentes de análise. IA economizada.`);
              continue;
            }

            // Upsert in clinical_evolutions
            const evolutionsList: any[] = readStoreData("clinical_evolutions", []);
            const exIdx = evolutionsList.findIndex((e) => e && (e.patientId === patient.id || e.id === patient.id));
            if (exIdx >= 0) {
              evolutionsList[exIdx] = parsedEvolution;
            } else {
              evolutionsList.unshift(parsedEvolution);
            }
            writeStoreData("clinical_evolutions", evolutionsList);
            syncItemToSupabase("clinical_evolutions", parsedEvolution).catch(() => {});
            console.log(`[Nightly Evolution Batch] Evolução incremental atualizada para paciente: ${patient.fullName}`);

            // 1.5 second pause between patients to prevent API throttling
            await new Promise((resolve) => setTimeout(resolve, 1500));
          } catch (patErr: any) {
            console.warn(`[Nightly Evolution Batch] Erro ao processar paciente ${patient.fullName}:`, patErr?.message || patErr);
          }
        }

        console.log(`[Nightly Evolution Batch] Rotina noturna finalizada com sucesso para ${activePatientsWithClinicalRecords.length} pacientes.`);
      }
    } catch (batchErr: any) {
      console.error("[Nightly Evolution Batch] Erro na execução da rotina noturna:", batchErr);
    }
  }, 60 * 1000); // Check every minute
}

// DELETE item from collection (Deletes from local store & Supabase)
app.delete("/api/db/:collection/:id", async (req, res) => {
  const { collection, id } = req.params;
  const list: any[] = readStoreData(collection, []);
  const filtered = list.filter((x) => x && x.id !== id);
  writeStoreData(collection, filtered);

  // Sync delete to Supabase PostgreSQL
  syncItemToSupabase(collection, null, true, id).catch(() => {});

  res.json({ success: true, id, remaining: filtered.length });
});

// ================= VIDEO EXAM UPLOAD, FIRESTORE SYNC & STREAMING ROUTE =================
// Dedicated directory for storing exam video attachments
const examVideosDir = path.join(process.cwd(), "data-store", "videos");
if (!fs.existsSync(examVideosDir)) {
  try {
    fs.mkdirSync(examVideosDir, { recursive: true });
  } catch (err) {
    console.warn("[ExamVideos] Erro ao criar diretório de vídeos:", err);
  }
}

// 500KB binary chunks (base64 ~666KB, securely within Firestore 1MB document limit)
const VIDEO_CHUNK_BINARY_SIZE = 500 * 1024;

// Helper: upload local video file in chunks to Firestore collection 'exam_video_chunks'
async function uploadVideoToFirestoreChunks(filename: string): Promise<void> {
  const filePath = path.join(examVideosDir, filename);
  if (!fs.existsSync(filePath)) return;

  try {
    const fileStat = fs.statSync(filePath);
    const fileBuffer = fs.readFileSync(filePath);
    const totalChunks = Math.ceil(fileBuffer.length / VIDEO_CHUNK_BINARY_SIZE);

    console.log(`[VideoSync] Sincronizando vídeo ${filename} (${(fileBuffer.length / (1024 * 1024)).toFixed(2)} MB, ${totalChunks} partes) para o Firestore...`);

    // Upload in concurrent batches of 4
    const BATCH_SIZE = 4;
    for (let i = 0; i < totalChunks; i += BATCH_SIZE) {
      const batchPromises = [];
      for (let j = i; j < Math.min(i + BATCH_SIZE, totalChunks); j++) {
        const start = j * VIDEO_CHUNK_BINARY_SIZE;
        const end = Math.min(start + VIDEO_CHUNK_BINARY_SIZE, fileBuffer.length);
        const chunkBase64 = fileBuffer.slice(start, end).toString("base64");
        const chunkDocRef = serverDoc(serverDb, "exam_video_chunks", `${filename}_part_${j}`);
        batchPromises.push(
          serverSetDoc(chunkDocRef, {
            filename,
            index: j,
            totalChunks,
            data: chunkBase64,
            size: end - start,
            updatedAt: Date.now(),
          })
        );
      }
      await Promise.all(batchPromises);
    }

    // Save metadata
    await serverSetDoc(serverDoc(serverDb, "exam_video_chunks", `${filename}_meta`), {
      filename,
      totalChunks,
      size: fileStat.size,
      mimeType: filename.endsWith(".webm") ? "video/webm" : "video/mp4",
      uploadedAt: Date.now(),
    });

    console.log(`[VideoSync] Sincronização concluída com sucesso para ${filename}!`);
  } catch (err) {
    console.error(`[VideoSync] Falha ao sincronizar ${filename} com Firestore:`, err);
  }
}

// In-progress downloads lock to prevent concurrent redundant chunk downloads
const pendingVideoDownloads = new Map<string, Promise<boolean>>();

// Helper: download video chunks from Firestore and reconstitute file on local disk
async function downloadVideoFromFirestoreChunks(filename: string): Promise<boolean> {
  const filePath = path.join(examVideosDir, filename);
  if (fs.existsSync(filePath)) return true;

  if (pendingVideoDownloads.has(filename)) {
    return pendingVideoDownloads.get(filename)!;
  }

  const downloadPromise = (async () => {
    try {
      console.log(`[VideoSync] Buscando ${filename} no Firestore...`);
      const metaDocRef = serverDoc(serverDb, "exam_video_chunks", `${filename}_meta`);
      const metaSnap = await getServerDoc(metaDocRef);

      if (!metaSnap.exists()) {
        console.warn(`[VideoSync] Metadados de ${filename} não encontrados no Firestore.`);
        return false;
      }

      const meta = metaSnap.data();
      const totalChunks = meta?.totalChunks || 0;
      if (totalChunks <= 0) return false;

      const chunkBuffers: Buffer[] = new Array(totalChunks);
      const BATCH_SIZE = 4;

      for (let i = 0; i < totalChunks; i += BATCH_SIZE) {
        const batchPromises = [];
        for (let j = i; j < Math.min(i + BATCH_SIZE, totalChunks); j++) {
          const chunkDocRef = serverDoc(serverDb, "exam_video_chunks", `${filename}_part_${j}`);
          batchPromises.push(
            getServerDoc(chunkDocRef).then((snap) => {
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

      // Verify all chunks received
      for (let i = 0; i < totalChunks; i++) {
        if (!chunkBuffers[i]) {
          console.error(`[VideoSync] Parte ${i} de ${filename} ausente.`);
          return false;
        }
      }

      const assembledBuffer = Buffer.concat(chunkBuffers);
      fs.writeFileSync(filePath, assembledBuffer);
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

// Background sync on startup for existing local files
function syncAllLocalVideosToFirestore() {
  try {
    if (!fs.existsSync(examVideosDir)) return;
    const files = fs.readdirSync(examVideosDir).filter((f) => f.endsWith(".mp4") || f.endsWith(".webm"));
    console.log(`[VideoSync] Verificando ${files.length} vídeos locais para sincronização com Firestore...`);
    for (const file of files) {
      // Check if metadata already in Firestore, if not sync
      const metaDocRef = serverDoc(serverDb, "exam_video_chunks", `${file}_meta`);
      getServerDoc(metaDocRef).then((snap) => {
        if (!snap.exists()) {
          console.log(`[VideoSync] Iniciando upload em segundo plano de ${file}...`);
          uploadVideoToFirestoreChunks(file).catch(() => {});
        }
      }).catch(() => {});
    }
  } catch (err) {
    console.warn("[VideoSync] Aviso no scanner de vídeos:", err);
  }
}

// Helper: Stream video with HTTP 206 Partial Content and Range headers
function streamVideoFile(req: express.Request, res: express.Response, filePath: string) {
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;
  const ext = path.extname(filePath).toLowerCase();
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
    const file = fs.createReadStream(filePath, { start, end });

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunksize,
      "Content-Type": mimeType,
    });
    file.pipe(res);
  } else {
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": mimeType,
      "Accept-Ranges": "bytes",
    });
    fs.createReadStream(filePath).pipe(res);
  }
}

// Dedicated GET route for video streaming: checks local disk then Firestore chunks
app.get("/api/videos/:filename", async (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(examVideosDir, filename);

  // Cross-origin headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

  // 1. Direct local file streaming
  if (fs.existsSync(filePath)) {
    return streamVideoFile(req, res, filePath);
  }

  // 2. Fetch from Firestore chunks if not on this container instance
  try {
    const downloaded = await downloadVideoFromFirestoreChunks(filename);
    if (downloaded && fs.existsSync(filePath)) {
      return streamVideoFile(req, res, filePath);
    }
  } catch (err) {
    console.error("[VideoRoute] Erro ao sincronizar vídeo do Firestore:", err);
  }

  // 3. Not found anywhere (explicit 404, never fallback to index.html)
  return res.status(404).json({ error: "Arquivo de vídeo não encontrado." });
});

// Multer storage for streaming video files directly to disk without memory bloat
const examVideoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, examVideosDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".mp4";
    const unique = `exame-vid-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, unique);
  },
});

const examVideoUpload = multer({
  storage: examVideoStorage,
  limits: { fileSize: 300 * 1024 * 1024 }, // Supports clinical videos up to 300MB
  fileFilter: (_req, file, cb) => {
    const isVideo = file.mimetype.startsWith("video/") || file.originalname.match(/\.(mp4|webm|ogg|mov|mkv|avi|m4v)$/i);
    if (isVideo) {
      cb(null, true);
    } else {
      cb(new Error("Formato não suportado. Por favor, selecione um arquivo de vídeo válido (.mp4, .webm, .mov)."));
    }
  },
});

app.post("/api/exam-media/upload-video", (req: any, res: any) => {
  examVideoUpload.single("video")(req, res, (err: any) => {
    if (err) {
      console.error("[UploadVideo] Erro durante o upload:", err);
      return res.status(400).json({ error: err.message || "Erro no upload do vídeo." });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo de vídeo foi recebido." });
    }

    const videoUrl = `/api/videos/${req.file.filename}`;
    console.log(`[UploadVideo] Concluído: ${req.file.filename} (${(req.file.size / (1024 * 1024)).toFixed(2)} MB)`);

    // Asynchronously sync to Firestore chunks in background for cross-instance and mobile access
    uploadVideoToFirestoreChunks(req.file.filename).catch((syncErr) => {
      console.warn("[UploadVideo] Aviso no sync em segundo plano:", syncErr);
    });

    res.json({
      success: true,
      filename: req.file.filename,
      videoUrl,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  });
});

// Endpoint to save exam media reports for instant public lookup by QR code
app.post("/api/exam-media/save", async (req, res) => {
  try {
    const report = req.body;
    if (!report || !report.id) {
      return res.status(400).json({ error: "Dados do relatório inválidos." });
    }
    const currentList: any[] = readStoreData("exam_media", []);
    const existingIndex = currentList.findIndex((r: any) => r.id === report.id);
    if (existingIndex >= 0) {
      currentList[existingIndex] = { ...currentList[existingIndex], ...report, updatedAt: Date.now() };
    } else {
      currentList.unshift({ ...report, createdAt: Date.now() });
    }
    writeStoreData("exam_media", currentList.slice(0, 500));

    // Also mirror into Firestore 'exam_media' collection for instant cross-instance resolution
    try {
      const docRef = serverDoc(serverDb, "exam_media", report.id);
      await serverSetDoc(docRef, { ...report, updatedAt: Date.now() }, { merge: true });
    } catch (fsErr) {
      console.warn("[ExamMediaSave] Aviso no sync Firestore:", fsErr);
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Erro ao salvar anexo de mídia." });
  }
});

// Helper to look up exam media report across local datastore and Firestore
async function resolveExamMediaReport(targetId: string): Promise<{ item: any; report: any } | null> {
  if (!targetId) return null;

  // 1. Check local datastore first
  const mediaReports: any[] = readStoreData("exam_media", []);
  for (const report of mediaReports) {
    if (report && Array.isArray(report.items)) {
      const match = report.items.find((item: any) => item && (item.id === targetId || String(item.order) === targetId));
      if (match) {
        return { item: match, report };
      }
    }
    if (report && report.id === targetId) {
      const firstVideo = report.items?.find((i: any) => i.type === "video") || report.items?.[0];
      return { item: firstVideo, report };
    }
  }

  // 2. Query Firestore 'exam_media' collection
  try {
    // Try direct document by ID
    const docRef = serverDoc(serverDb, "exam_media", targetId);
    const snap = await getServerDoc(docRef);
    if (snap.exists()) {
      const report = snap.data();
      const firstVideo = report.items?.find((i: any) => i.type === "video") || report.items?.[0];
      return { item: firstVideo, report };
    }

    // Try scanning all reports in Firestore
    const colRef = serverCollection(serverDb, "exam_media");
    const querySnap = await getServerDocs(colRef);
    for (const d of querySnap.docs) {
      const report = d.data();
      if (report && Array.isArray(report.items)) {
        const match = report.items.find((item: any) => item && (item.id === targetId || String(item.order) === targetId));
        if (match) {
          return { item: match, report };
        }
      }
    }
  } catch (err) {
    console.warn("[ExamMediaLookup] Aviso ao buscar no Firestore:", err);
  }

  // 3. Search in consultations if linked
  try {
    const consCol = serverCollection(serverDb, "consultations");
    const consSnap = await getServerDocs(consCol);
    for (const d of consSnap.docs) {
      const cons = d.data();
      if (cons?.examMedia && Array.isArray(cons.examMedia.items)) {
        const match = cons.examMedia.items.find((item: any) => item && (item.id === targetId || String(item.order) === targetId));
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

// Endpoint to retrieve exam media item by item ID or report ID
app.get("/api/exam-media/item/:id", async (req, res) => {
  const targetId = req.params.id;
  const result = await resolveExamMediaReport(targetId);
  if (result) {
    return res.json(result);
  }
  res.status(404).json({ error: "Item de exame não encontrado." });
});

// ================= VIDEO QR CODE EXAM VIEWER ROUTE =================
// Standalone mobile-friendly player for citizens scanning the printed A4 QR code
// Completely open without any login requirements
app.get(
  ["/watch-video", "/watch-video/:id", "/video", "/video/:id", "/assistir-video", "/assistir-video/:id"],
  async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Cache-Control", "no-cache");

    const id = req.params.id || "";
    const { videoUrl: qVideoUrl, v: qV, title: qTitle, t: qT, desc: qDesc, patient: qPatient, validUntil: qValidUntil } = req.query;

    let foundItem: any = null;
    let foundReport: any = null;

    if (id) {
      const resolved = await resolveExamMediaReport(id);
      if (resolved) {
        foundItem = resolved.item;
        foundReport = resolved.report;
      }
    }

    const fallbackUrl = (typeof qVideoUrl === "string" ? qVideoUrl : (typeof qV === "string" ? qV : ""));
    let videoSrc = foundItem?.videoUrl || fallbackUrl;
    // Safety: never attempt to stream massive data URLs in watch-video
    if (videoSrc.startsWith("data:")) {
      videoSrc = "";
    }

    const title = foundItem?.title || (typeof qTitle === "string" ? qTitle : (typeof qT === "string" ? qT : "Exame em Vídeo"));
    const description = foundItem?.description || (typeof qDesc === "string" ? qDesc : "Registro audiovisual e laudo iconográfico anexo ao prontuário médico do paciente.");
    const patientName = foundReport?.patientName || (typeof qPatient === "string" ? qPatient : "Cidadão Identificado");
    const validUntil = foundReport?.validUntilFormatted || (typeof qValidUntil === "string" ? qValidUntil : "Conforme legislação vigente (Art. 6º Lei 13.787/2018)");
    const workplace = foundReport?.workplace || "CENTRO DE ATENÇÃO PSICOSSOCIAL (CAPS I) • PREFEITURA DE ANAJÁS";
    const dateFormatted = foundReport?.dateFormatted || new Date().toLocaleDateString("pt-BR");
    const professionalName = foundReport?.professionalName || "Profissional de Saúde Autorizado";
    const professionalRole = foundReport?.professionalRole || "Equipe Multiprofissional SUS";
    const professionalRegister = foundReport?.professionalRegister || "";

    const escape = (s: string) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <meta name="theme-color" content="#0d9488" />
  <title>Vídeo do Exame - ${escape(patientName)} | SUS PEC</title>
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
        SUS • Sistema Único de Saúde
      </div>
      <div class="unit">${escape(workplace)}</div>
      <div class="title">${escape(title)}</div>
    </div>
    
    <div class="video-wrap">
      ${videoSrc ? `
      <video id="examVideo" controls playsinline preload="auto" src="${escape(videoSrc)}" poster="${escape(foundItem?.videoThumbnailDataUrl || '')}">
        <source src="${escape(videoSrc)}" type="video/mp4" />
        <source src="${escape(videoSrc)}" type="video/webm" />
        Seu dispositivo não suporta a reprodução deste formato de vídeo.
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
          <button type="button" class="speed-btn" onclick="togglePlay()">⏯ Play / Pausa</button>
          <button type="button" class="speed-btn" onclick="toggleFullscreen()">⛶ Tela Cheia</button>
        </div>
      </div>` : `
      <div style="padding: 48px 24px; text-align: center; color: #94a3b8;">
        <div style="font-size: 38px; margin-bottom: 12px;">🎥</div>
        <p style="font-weight: 800; font-size: 16px; color: #f1f5f9;">Arquivo de Vídeo em Processamento</p>
        <p style="font-size: 12.5px; margin-top: 6px; color: #94a3b8; max-width: 440px; margin-left: auto; margin-right: auto; line-height: 1.5;">
          O anexo iconográfico foi registrado pelo profissional de saúde. Caso o envio tenha ocorrido recentemente, o vídeo estará disponível em alguns instantes.
        </p>
      </div>`}
      <div id="loadingNotice" class="loading-notice">
        <div class="spinner"></div>
        <div>Carregando e sincronizando vídeo em alta definição...</div>
      </div>
    </div>

    <div class="body">
      <div class="patient-row">
        <div><strong style="color: #94a3b8; font-size: 11px; text-transform: uppercase; display: block; margin-bottom: 2px;">Paciente:</strong> <span class="patient-name">${escape(patientName)}</span></div>
        <div class="exam-date">📅 ${escape(dateFormatted)}</div>
      </div>

      <div class="prof-box">
        <div>
          <strong style="color: #f1f5f9;">${escape(professionalName)}</strong>
          <span style="display: block; font-size: 10.5px; color: #64748b;">${escape(professionalRole)} ${professionalRegister ? `• ${escape(professionalRegister)}` : ''}</span>
        </div>
        <div style="text-align: right; font-weight: 700; color: #2dd4bf; font-size: 11px;">
          ✓ Assinado Digitalmente
        </div>
      </div>

      <div class="btn-wrap">
        ${videoSrc ? `
        <a href="${escape(videoSrc)}" download="exame-video-${id || 'paciente'}.mp4" class="btn">
          ⬇️ Baixar Cópia MP4
        </a>` : ''}
        <button type="button" class="btn btn-secondary" onclick="shareVideoLink()">
          📤 Compartilhar Link
        </button>
      </div>
    </div>
  </div>

  <div class="footer-sus">
    Prefeitura Municipal de Anajás • Secretaria Municipal de Saúde • Rede de Atenção Psicossocial
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
          text: 'Acesse o vídeo do exame médico pelo prontuário SUS:',
          url: window.location.href
        }).catch(function() {});
      } else {
        navigator.clipboard.writeText(window.location.href);
        alert('Link do vídeo copiado para a área de transferência!');
      }
    }

    // Auto-recovery: if video fails to load because it is still syncing to this instance, retry after 2 seconds
    if (video) {
      var retryCount = 0;
      video.addEventListener('error', function(e) {
        console.warn('Vídeo ainda não disponível ou em sincronização:', e);
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
  const isProduction =
    process.env.NODE_ENV === "production" ||
    (typeof __filename !== "undefined" && __filename.includes("dist")) ||
    (typeof __dirname !== "undefined" && __dirname.includes("dist"));

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
            "**/*.log",
          ],
        },
      },
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

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`[e-SUS PEC AI Server] Rodando na porta ${PORT}`);
    console.log(`  ➜  Local:   http://localhost:${PORT}/`);
    console.log(`  ➜  Network: http://0.0.0.0:${PORT}/`);
    
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

  server.on("error", (err: any) => {
    if (err?.code === "EADDRINUSE") {
      console.error(`[e-SUS PEC AI Server] Erro: A porta ${PORT} já está em uso (EADDRINUSE).`);
    } else {
      console.error("[e-SUS PEC AI Server] Erro no servidor HTTP:", err);
    }
  });
}

startServer().catch((err) => {
  console.error("[e-SUS PEC AI Server] Falha crítica ao inicializar o servidor:", err);
});
