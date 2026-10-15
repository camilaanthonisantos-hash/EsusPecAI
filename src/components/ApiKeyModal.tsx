import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Key, X, Shield, ExternalLink, Check, Eye, EyeOff, Info } from 'lucide-react';
import { SpecularButton } from './SpecularButton';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  userApiKey: string;
  onSaveApiKey: (key: string) => void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  userApiKey,
  onSaveApiKey,
  onShowToast,
}) => {
  const [keyInput, setKeyInput] = useState(userApiKey);
  const [showKey, setShowKey] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveApiKey(keyInput.trim());
    onShowToast(
      'success',
      keyInput.trim()
        ? 'Chave de API salva com sucesso no armazenamento local do navegador!'
        : 'Chave customizada removida. O sistema utilizará a chave padrão do servidor.',
      'Configuração Salva'
    );
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          id="api-key-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
          onClick={onClose}
        >
          <motion.div
            id="api-key-modal"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-teal-600 text-white shadow-xs">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Chave de API do Google AI Studio
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Gemini 2.5 Flash / Pro (Opcional)
                  </p>
                </div>
              </div>

              <SpecularButton
                type="button"
                id="close-api-key-modal-btn"
                onClick={onClose}
                size="icon"
                radius={12}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-transparent"
              >
                <X className="w-5 h-5" />
              </SpecularButton>
            </div>

            {/* Info notice */}
            <div className="p-3.5 rounded-2xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-900/40 text-xs text-teal-950 dark:text-teal-200 mb-4 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-teal-900 dark:text-teal-300">
                <Shield className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Privacidade & Armazenamento Seguro</span>
              </div>
              <p className="leading-relaxed text-[11px]">
                O aplicativo já possui integração com a chave do ambiente de hospedagem. Caso deseje
                utilizar sua própria cota pessoal do Google AI Studio, informe sua chave abaixo. Ela
                ficará salva exclusivamente no LocalStorage do seu navegador.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Chave de API (Google AI Studio API Key)
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    id="api-key-input"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Obtenha sua chave gratuita:</span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-600 dark:text-teal-400 font-semibold hover:underline flex items-center gap-1"
                >
                  Google AI Studio <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <SpecularButton
                  type="button"
                  onClick={onClose}
                  size="sm"
                  radius={12}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-transparent"
                >
                  Cancelar
                </SpecularButton>
                <SpecularButton
                  type="submit"
                  id="save-api-key-btn"
                  size="sm"
                  radius={12}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-600/20 border-teal-500/40"
                >
                  Salvar Configuração
                </SpecularButton>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

