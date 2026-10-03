import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ChevronDown,
  Search,
  Check,
  Pill,
  Heart,
  Sparkles,
  Utensils,
  ShieldAlert,
  Brain,
  Wind,
  Activity,
  Droplet,
  Layers,
  Bug,
  Flame,
  Eye,
  Shield,
  Package,
  Leaf,
  Building2,
  Smile,
  FileText,
  Filter,
} from 'lucide-react';
import { OFFICIAL_RENAME_ATC_CLASSES, RENAMEClassDefinition } from '../data/renameClasses';
import { SUSMedication } from '../types';

interface RenameClassDropdownProps {
  selectedClassId: string;
  onSelectClass: (classId: string) => void;
  medications: SUSMedication[];
  className?: string;
  showQuickPills?: boolean;
}

export const RenameClassDropdown: React.FC<RenameClassDropdownProps> = ({
  selectedClassId,
  onSelectClass,
  medications,
  className = '',
  showQuickPills = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Compute medication counts per class
  const classCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: medications.length,
      'comp-cbaf': medications.filter((m) => m.component === 'Farmácia Básica (CBAF)').length,
      'comp-raps': medications.filter((m) => m.component === 'Saúde Mental / RAPS').length,
      'comp-antimicrobianos': medications.filter(
        (m) => m.controlCategory === 'Antimicrobiano (2 Vias)' || m.awareCategory
      ).length,
    };

    OFFICIAL_RENAME_ATC_CLASSES.forEach((cls) => {
      if (cls.id === 'all' || cls.id.startsWith('comp-')) return;

      const codeLetter = cls.code.replace('Classe ', '').trim(); // e.g. "C", "G", "A"
      counts[cls.id] = medications.filter((m) => {
        // Multi-class match
        if (m.atcClasses && m.atcClasses.some((c) => c.startsWith(`${codeLetter}:`))) {
          return true;
        }
        if (m.atcCategory && m.atcCategory.startsWith(`${codeLetter}:`)) {
          return true;
        }
        if (cls.id === 'class-fitoterapicos' && (m.atcCategory?.includes('Fitoter') || m.atcClasses?.some(c => c.includes('Fitoter')))) {
          return true;
        }
        return false;
      }).length;
    });

    return counts;
  }, [medications]);

  const selectedClass = useMemo(() => {
    return (
      OFFICIAL_RENAME_ATC_CLASSES.find((c) => c.id === selectedClassId) ||
      OFFICIAL_RENAME_ATC_CLASSES[0]
    );
  }, [selectedClassId]);

  // Filter classes in dropdown search
  const filteredClasses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return OFFICIAL_RENAME_ATC_CLASSES;
    return OFFICIAL_RENAME_ATC_CLASSES.filter((c) => {
      return (
        c.name.toLowerCase().includes(q) ||
        c.shortName.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
      );
    });
  }, [searchQuery]);

  // Render icon helper
  const renderClassIcon = (iconName: string, colorClass = 'w-4 h-4') => {
    switch (iconName) {
      case 'Heart':
        return <Heart className={colorClass} />;
      case 'Sparkles':
        return <Sparkles className={colorClass} />;
      case 'Utensils':
        return <Utensils className={colorClass} />;
      case 'ShieldAlert':
        return <ShieldAlert className={colorClass} />;
      case 'Brain':
        return <Brain className={colorClass} />;
      case 'Wind':
        return <Wind className={colorClass} />;
      case 'Activity':
        return <Activity className={colorClass} />;
      case 'Droplet':
        return <Droplet className={colorClass} />;
      case 'Layers':
        return <Layers className={colorClass} />;
      case 'Bug':
        return <Bug className={colorClass} />;
      case 'Flame':
        return <Flame className={colorClass} />;
      case 'Eye':
        return <Eye className={colorClass} />;
      case 'Shield':
        return <Shield className={colorClass} />;
      case 'Package':
        return <Package className={colorClass} />;
      case 'Leaf':
        return <Leaf className={colorClass} />;
      case 'Building2':
        return <Building2 className={colorClass} />;
      case 'Smile':
        return <Smile className={colorClass} />;
      case 'FileText':
        return <FileText className={colorClass} />;
      default:
        return <Pill className={colorClass} />;
    }
  };

  // Badge color helper
  const getClassColorBadge = (color: string) => {
    switch (color) {
      case 'rose':
        return 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800';
      case 'pink':
        return 'bg-pink-100 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 border-pink-300 dark:border-pink-800';
      case 'amber':
        return 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      case 'emerald':
        return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      case 'purple':
        return 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800';
      case 'cyan':
        return 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800';
      case 'orange':
        return 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-800';
      case 'red':
        return 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800';
      case 'yellow':
        return 'bg-yellow-100 dark:bg-yellow-950/60 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-800';
      case 'lime':
        return 'bg-lime-100 dark:bg-lime-950/60 text-lime-800 dark:text-lime-300 border-lime-300 dark:border-lime-800';
      case 'indigo':
        return 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800';
      case 'teal':
        return 'bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-800';
      case 'violet':
        return 'bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-800';
      default:
        return 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800';
    }
  };

  // Quick primary pills list (including requested Classe C and Classe G!)
  const quickPillIds = [
    'all',
    'class-c',
    'class-g',
    'class-a',
    'class-j',
    'class-n',
    'comp-cbaf',
    'comp-raps',
  ];

  return (
    <div className={`space-y-2 ${className}`} ref={dropdownRef}>
      {/* Top Filter Bar: Dropdown Trigger + Quick Filter Pills */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {/* Main Smart Dropdown Trigger */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`w-full sm:w-auto flex items-center justify-between gap-2.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all shadow-xs ${
              selectedClassId !== 'all'
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-700 ring-2 ring-blue-500/20'
                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-blue-400'
            }`}
          >
            <div className="flex items-center gap-2 text-left">
              <span className={`p-1 rounded-lg border ${getClassColorBadge(selectedClass.color)}`}>
                {renderClassIcon(selectedClass.iconName, 'w-3.5 h-3.5')}
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold">
                    Classificação RENAME:
                  </span>
                  <span className="text-xs font-extrabold text-blue-700 dark:text-blue-300">
                    {selectedClass.shortName}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 pl-2">
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                {classCounts[selectedClass.id] ?? 0}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  isOpen ? 'rotate-180 text-blue-600' : ''
                }`}
              />
            </div>
          </button>

          {/* Smart Floating Dropdown Menu */}
          {isOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-80 sm:w-96 max-w-[92vw] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Search Inside Dropdown */}
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-blue-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar classe (ex: cardio, geniturinário, nifedipino, neuro)..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-hidden focus:ring-1 focus:ring-blue-500"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500 font-semibold px-1">
                  <span>Classificação Anatômica e Terapêutica (ATC / RENAME 2022)</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold">
                    {filteredClasses.length} categorias
                  </span>
                </div>
              </div>

              {/* Class Options List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 p-1">
                {filteredClasses.map((cls) => {
                  const isSelected = selectedClassId === cls.id;
                  const count = classCounts[cls.id] ?? 0;

                  return (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => {
                        onSelectClass(cls.id);
                        setIsOpen(false);
                        setSearchQuery('');
                      }}
                      className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start justify-between gap-2.5 group ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 font-bold'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <span
                          className={`p-1.5 rounded-lg border mt-0.5 shrink-0 ${getClassColorBadge(
                            cls.color
                          )}`}
                        >
                          {renderClassIcon(cls.iconName, 'w-3.5 h-3.5')}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                              {cls.shortName}
                            </span>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold uppercase ${getClassColorBadge(
                                cls.color
                              )}`}
                            >
                              {cls.code}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-tight">
                            {cls.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {count}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Quick Filter Horizontal Scrollable Pills */}
        {showQuickPills && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar flex-1">
            {quickPillIds.map((pid) => {
              const cls = OFFICIAL_RENAME_ATC_CLASSES.find((c) => c.id === pid);
              if (!cls) return null;
              const isSelected = selectedClassId === cls.id;
              const count = classCounts[cls.id] ?? 0;

              return (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => onSelectClass(cls.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 shadow-2xs ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                  }`}
                >
                  <span className={isSelected ? 'text-white' : 'text-slate-500'}>
                    {renderClassIcon(cls.iconName, 'w-3 h-3')}
                  </span>
                  <span>{cls.shortName}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
