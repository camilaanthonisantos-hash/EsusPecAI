import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { ToastInfo } from '../types';
import { SpecularButton } from './SpecularButton';

interface ToastProps {
  toasts: ToastInfo[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div
      id="toast-container"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-md w-full px-4"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            id={`toast-${toast.id}`}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 dark:bg-emerald-900/90 text-emerald-100 border-emerald-500/40'
                : toast.type === 'error'
                ? 'bg-rose-950/90 dark:bg-rose-900/90 text-rose-100 border-rose-500/40'
                : 'bg-slate-900/90 text-slate-100 border-slate-700'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {toast.type === 'success' && (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              )}
              {toast.type === 'error' && (
                <AlertCircle className="w-5 h-5 text-rose-400" />
              )}
              {toast.type === 'info' && (
                <Info className="w-5 h-5 text-teal-400" />
              )}
            </div>
            <div className="flex-1 text-sm font-medium">
              {toast.title && (
                <p className="font-bold text-xs uppercase tracking-wider mb-0.5 opacity-90">
                  {toast.title}
                </p>
              )}
              <p className="leading-snug">{toast.message}</p>
            </div>
            <SpecularButton
              id={`dismiss-toast-${toast.id}`}
              onClick={() => onDismiss(toast.id)}
              className="shrink-0 p-1 text-slate-400 hover:text-white rounded-lg transition-colors border-transparent"
              aria-label="Fechar notificação"
            >
              <X className="w-4 h-4" />
            </SpecularButton>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

