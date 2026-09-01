import React from 'react';
import { parsePecText } from '../utils/pecFormatter';

interface PecContentRendererProps {
  text: string;
  className?: string;
}

export const PecContentRenderer: React.FC<PecContentRendererProps> = ({ text, className = '' }) => {
  const blocks = parsePecText(text);
  if (blocks.length === 0) {
    return <span className="text-slate-400 italic text-xs">Nenhum conteúdo informado.</span>;
  }

  return (
    <div className={`space-y-2.5 ${className}`}>
      {blocks.map((block, idx) => {
        if (block.type === 'banner') {
          return (
            <div
              key={idx}
              className="font-bold text-xs uppercase tracking-wider text-teal-700 dark:text-teal-300 py-1 border-b border-teal-500/20"
            >
              {block.text}
            </div>
          );
        }

        if (block.type === 'header') {
          return (
            <div
              key={idx}
              className="font-bold uppercase tracking-wide text-slate-900 dark:text-slate-100 text-xs sm:text-sm mt-3 mb-0.5 flex items-center gap-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block shadow-xs shrink-0" />
              <span>{block.title}</span>
            </div>
          );
        }

        if (block.type === 'quote') {
          return (
            <blockquote
              key={idx}
              className="my-1 pl-3.5 py-1.5 border-l-4 border-teal-500 bg-teal-500/5 dark:bg-teal-950/20 rounded-r-xl italic text-slate-700 dark:text-slate-200 text-xs sm:text-sm leading-relaxed"
            >
              {block.lines?.map((line, lIdx) => (
                <div key={lIdx} className={lIdx > 0 ? 'mt-1' : ''}>
                  {line}
                </div>
              ))}
            </blockquote>
          );
        }

        return (
          <div key={idx} className="my-1 text-slate-800 dark:text-slate-200 text-xs sm:text-sm leading-relaxed">
            {block.text}
          </div>
        );
      })}
    </div>
  );
};
