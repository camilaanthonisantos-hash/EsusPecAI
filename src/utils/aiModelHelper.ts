/**
 * Helper para nomes amigáveis e badges das LLMs no sistema
 */
export function getFriendlyModelName(modelId?: string): string {
  if (!modelId) return 'Gemini 3.7 Flash';

  const clean = modelId.trim().toLowerCase();

  // Saúde / Médico
  if (clean.includes('ling-3.0-flash-sante') || clean.includes('sante')) {
    return 'Ling 3.0 Flash Santé (Free)';
  }
  if (clean.includes('ling-3.0-flash') || clean.includes('ling-3.0')) {
    return 'Ling 3.0 Flash (Free)';
  }

  // Voz / Groq
  if (clean.includes('whisper-large-v3-turbo') || clean.includes('v3-turbo')) {
    return 'Groq Whisper Large v3 Turbo';
  }
  if (clean.includes('whisper-large-v3') || clean.includes('whisper')) {
    return 'Groq Whisper Large v3';
  }

  // Gemini Nativo
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

  // OpenAI
  if (clean.includes('gpt-4o-mini')) return clean.includes('openrouter') ? 'GPT-4o Mini (OpenRouter)' : 'OpenAI GPT-4o Mini';
  if (clean.includes('gpt-4o')) return 'OpenAI GPT-4o';
  if (clean.includes('o3-mini')) return clean.includes('openrouter') ? 'OpenAI o3-mini (OpenRouter)' : 'OpenAI o3-mini';
  if (clean.includes('o1-preview')) return 'OpenAI o1 Preview';
  if (clean.includes('o1-mini')) return 'OpenAI o1 Mini';
  if (clean === 'openai:o1' || clean.endsWith(':o1') || clean === 'o1') return 'OpenAI o1';

  // OpenRouter Free & Open Source
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

  // Formata fallback
  return modelId
    .replace(/^(openai:|openrouter:|groq:|google\/|meta-llama\/|anthropic\/|inclusionai\/|deepseek\/|qwen\/|mistralai\/|microsoft\/)/i, '')
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Retorna o provedor associado ao ID do modelo
 */
export function getModelProvider(modelId?: string): 'gemini' | 'openai' | 'openrouter' | 'groq' {
  if (!modelId) return 'gemini';
  const clean = modelId.trim().toLowerCase();
  if (
    clean.startsWith('openrouter:') ||
    clean.includes('inclusionai') ||
    clean.includes('anthropic/') ||
    clean.includes('meta-llama/') ||
    clean.includes('mistralai/') ||
    clean.includes('deepseek/') ||
    clean.includes('qwen/') ||
    clean.includes('microsoft/')
  ) {
    return 'openrouter';
  }
  if (clean.startsWith('openai:') || clean.startsWith('gpt-') || clean.startsWith('o1') || clean.startsWith('o3')) {
    return 'openai';
  }
  if (clean.startsWith('groq:') || clean.includes('whisper')) {
    return 'groq';
  }
  return 'gemini';
}

/**
 * Retorna badge visual do provedor
 */
export function getModelProviderBadge(modelId?: string): { label: string; colorClass: string } {
  const provider = getModelProvider(modelId);
  switch (provider) {
    case 'openrouter':
      return {
        label: 'OpenRouter',
        colorClass: 'bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300 dark:border-purple-800',
      };
    case 'openai':
      return {
        label: 'OpenAI',
        colorClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
      };
    case 'groq':
      return {
        label: 'Groq',
        colorClass: 'bg-orange-100 text-orange-700 dark:bg-orange-950/70 dark:text-orange-300 border-orange-300 dark:border-orange-800',
      };
    case 'gemini':
    default:
      return {
        label: 'Google Gemini',
        colorClass: 'bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border-blue-300 dark:border-blue-800',
      };
  }
}

/**
 * Extrai o slug real a ser enviado para a API específica,
 * removendo prefixos como "openrouter:", "openai:", "groq:".
 * IMPORTANTE: OpenRouter rejeita com 400 se o prefixo "openrouter:" for mantido.
 */
export function extractRealModelSlug(modelId?: string): string {
  if (!modelId) return 'gemini-3.7-flash';
  return modelId
    .replace(/^openrouter:\s*/i, '')
    .replace(/^openai:\s*/i, '')
    .replace(/^groq:\s*/i, '')
    .trim();
}

