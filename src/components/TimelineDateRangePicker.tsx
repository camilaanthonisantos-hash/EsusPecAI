import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar as CalendarIcon,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  RotateCcw,
  Clock,
} from 'lucide-react';
import { SpecularButton } from './SpecularButton';

interface TimelineDateRangePickerProps {
  startDate: string | null; // ISO 'YYYY-MM-DD'
  endDate: string | null;   // ISO 'YYYY-MM-DD'
  onChange: (start: string | null, end: string | null) => void;
  onClear: () => void;
  className?: string;
  totalFilteredCount?: number;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/**
 * Converts ISO 'YYYY-MM-DD' to Brazilian format 'DD/MM/YYYY'
 */
function isoToBr(iso: string | null): string {
  if (!iso) return '';
  const clean = iso.trim().split('T')[0];
  const parts = clean.split('-');
  if (parts.length !== 3) return '';
  const [y, m, d] = parts;
  return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
}

/**
 * Returns formatted YYYY-MM-DD for a given Date
 */
function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const TimelineDateRangePicker: React.FC<TimelineDateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
  onClear,
  className = '',
  totalFilteredCount,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [isRangeSelectionPending, setIsRangeSelectionPending] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});

  // Reference date for calendar navigation (current month/year being viewed)
  const [viewDate, setViewDate] = useState<Date>(() => {
    if (startDate) {
      const parts = startDate.split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0])) {
        return new Date(parts[0], parts[1] - 1, 1);
      }
    }
    return new Date();
  });

  // Check mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync viewed month when startDate changes and dialog opens
  useEffect(() => {
    if (startDate && isOpen) {
      const parts = startDate.split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0])) {
        setViewDate(new Date(parts[0], parts[1] - 1, 1));
      }
    }
  }, [startDate, isOpen]);

  // Position calculation for desktop popover
  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const popoverWidth = 340;
    const estimatedHeight = 440;
    const margin = 8;
    const padding = 12;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let top: number;
    if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
      top = Math.max(padding, rect.top - estimatedHeight - margin);
    } else {
      top = rect.bottom + margin;
      if (top + estimatedHeight > window.innerHeight - padding) {
        top = Math.max(padding, window.innerHeight - estimatedHeight - padding);
      }
    }

    let left = rect.right - popoverWidth;
    if (left < padding) {
      left = padding;
    }
    if (left + popoverWidth > window.innerWidth - padding) {
      left = Math.max(padding, window.innerWidth - popoverWidth - padding);
    }

    setPopoverStyle({
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${popoverWidth}px`,
      zIndex: 9999,
    });
  };

  useEffect(() => {
    if (isOpen && !isMobile) {
      updatePosition();
      const handleScrollOrResize = () => updatePosition();
      window.addEventListener('resize', handleScrollOrResize);
      window.addEventListener('scroll', handleScrollOrResize, true);
      return () => {
        window.removeEventListener('resize', handleScrollOrResize);
        window.removeEventListener('scroll', handleScrollOrResize, true);
      };
    }
  }, [isOpen, isMobile]);

  // Close calendar on click outside or escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      const clickedContainer = containerRef.current && containerRef.current.contains(target);
      const clickedPopover = popoverRef.current && popoverRef.current.contains(target);
      if (!clickedContainer && !clickedPopover) {
        setIsOpen(false);
        setIsRangeSelectionPending(false);
        setHoverDate(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setIsRangeSelectionPending(false);
        setHoverDate(null);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Calendar days generation
  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Dom
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      day: number;
      month: number;
      year: number;
      isoString: string;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    const today = new Date();
    const todayIso = toIsoDate(today);

    // Prev month days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevM = month === 0 ? 11 : month - 1;
      const prevY = month === 0 ? year - 1 : year;
      const dObj = new Date(prevY, prevM, d);
      const iso = toIsoDate(dObj);
      days.push({
        day: d,
        month: prevM,
        year: prevY,
        isoString: iso,
        isCurrentMonth: false,
        isToday: iso === todayIso,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dObj = new Date(year, month, d);
      const iso = toIsoDate(dObj);
      days.push({
        day: d,
        month,
        year,
        isoString: iso,
        isCurrentMonth: true,
        isToday: iso === todayIso,
      });
    }

    // Next month days to complete grid
    const totalSlots = days.length <= 35 ? 35 : 42;
    const remaining = totalSlots - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextM = month === 11 ? 0 : month + 1;
      const nextY = month === 11 ? year + 1 : year;
      const dObj = new Date(nextY, nextM, d);
      const iso = toIsoDate(dObj);
      days.push({
        day: d,
        month: nextM,
        year: nextY,
        isoString: iso,
        isCurrentMonth: false,
        isToday: iso === todayIso,
      });
    }

    return days;
  }, [viewDate]);

  // Handle clicking a day in the calendar
  const handleDayClick = (isoString: string) => {
    // If not pending a range, start a new selection: sets single date first
    if (!isRangeSelectionPending || !startDate) {
      onChange(isoString, isoString);
      setIsRangeSelectionPending(true);
      setHoverDate(null);
    } else {
      // Second click completes the range
      if (isoString === startDate) {
        // Clicked the same day again -> single day confirmed
        onChange(isoString, isoString);
      } else if (isoString < startDate) {
        // Clicked earlier day -> becomes new start date, old start becomes end
        onChange(isoString, startDate);
      } else {
        // Clicked later day -> start remains, new day becomes end
        onChange(startDate, isoString);
      }
      setIsRangeSelectionPending(false);
      setHoverDate(null);
    }
  };

  // Quick preset shortcuts
  const applyPreset = (preset: 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth') => {
    const now = new Date();
    const todayStr = toIsoDate(now);

    if (preset === 'today') {
      onChange(todayStr, todayStr);
      setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = toIsoDate(y);
      onChange(yStr, yStr);
      setViewDate(new Date(y.getFullYear(), y.getMonth(), 1));
    } else if (preset === 'last7') {
      const past = new Date();
      past.setDate(past.getDate() - 6);
      onChange(toIsoDate(past), todayStr);
      setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
    } else if (preset === 'last30') {
      const past = new Date();
      past.setDate(past.getDate() - 29);
      onChange(toIsoDate(past), todayStr);
      setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
    } else if (preset === 'thisMonth') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      onChange(toIsoDate(first), toIsoDate(last));
      setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
    }
    setIsRangeSelectionPending(false);
    setHoverDate(null);
  };

  const handleClearFilter = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onClear();
    setIsRangeSelectionPending(false);
    setHoverDate(null);
  };

  // Navigation
  const prevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Year select options
  const currentYear = viewDate.getFullYear();
  const yearOptions = useMemo(() => {
    const list: number[] = [];
    for (let y = currentYear - 5; y <= currentYear + 5; y++) {
      list.push(y);
    }
    return list;
  }, [currentYear]);

  // Compute active range bounds for styling
  const effectiveStart = startDate;
  const effectiveEnd = isRangeSelectionPending && hoverDate
    ? (hoverDate < (startDate || '') ? hoverDate : hoverDate)
    : endDate;

  const actualMin = effectiveStart && effectiveEnd ? (effectiveStart <= effectiveEnd ? effectiveStart : effectiveEnd) : effectiveStart;
  const actualMax = effectiveStart && effectiveEnd ? (effectiveStart <= effectiveEnd ? effectiveEnd : effectiveStart) : effectiveEnd;

  const isSingleDate = Boolean(startDate && endDate && startDate === endDate && !isRangeSelectionPending);
  const isRange = Boolean(startDate && endDate && startDate !== endDate && !isRangeSelectionPending);
  const hasFilter = Boolean(startDate || endDate);

  // Label for trigger button
  const getTriggerLabel = () => {
    if (!startDate) {
      return 'Filtrar por Data';
    }
    if (isSingleDate) {
      return isoToBr(startDate);
    }
    if (isRange) {
      return `${isoToBr(startDate)} — ${isoToBr(endDate)}`;
    }
    if (isRangeSelectionPending) {
      return `${isoToBr(startDate)} (Selecione o fim)`;
    }
    return isoToBr(startDate);
  };

  // Render Calendar Content
  const renderCalendarContent = () => (
    <div
      ref={popoverRef}
      className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4 text-slate-900 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header Info */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
            <CalendarRange className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Filtro por Data
            </h4>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              {isRangeSelectionPending
                ? 'Clique em outro dia para definir o intervalo'
                : 'Clique em 1 dia (único) ou 2 dias (intervalo)'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setIsRangeSelectionPending(false);
          }}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Presets */}
      <div className="flex flex-wrap items-center gap-1.5 py-3 border-b border-slate-100 dark:border-slate-800 text-[11px]">
        <button
          type="button"
          onClick={() => applyPreset('today')}
          className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-bold hover:bg-teal-100 dark:hover:bg-teal-900/60 transition-colors"
        >
          Hoje
        </button>
        <button
          type="button"
          onClick={() => applyPreset('yesterday')}
          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          Ontem
        </button>
        <button
          type="button"
          onClick={() => applyPreset('last7')}
          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          Últimos 7 dias
        </button>
        <button
          type="button"
          onClick={() => applyPreset('last30')}
          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          Últimos 30 dias
        </button>
        <button
          type="button"
          onClick={() => applyPreset('thisMonth')}
          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          Este Mês
        </button>
      </div>

      {/* Month & Year Navigation */}
      <div className="flex items-center justify-between my-3 px-1">
        <div className="flex items-center gap-1.5 font-bold text-sm">
          <span>{MONTH_NAMES[viewDate.getMonth()]}</span>
          <select
            value={viewDate.getFullYear()}
            onChange={(e) => {
              const y = parseInt(e.target.value, 10);
              setViewDate(new Date(y, viewDate.getMonth(), 1));
            }}
            className="bg-transparent text-teal-600 dark:text-teal-400 font-extrabold outline-none cursor-pointer"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Mês anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Próximo mês"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {WEEKDAY_NAMES.map((w, idx) => (
          <span
            key={w}
            className={`text-[10px] font-bold uppercase tracking-wider py-1 ${
              idx === 0 || idx === 6 ? 'text-teal-600/80 dark:text-teal-400/80' : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            {w}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-y-1 gap-x-0.5">
        {calendarDays.map((item) => {
          const isStart = Boolean(actualMin && item.isoString === actualMin);
          const isEnd = Boolean(actualMax && item.isoString === actualMax);
          const isBetween = Boolean(
            actualMin && actualMax && actualMin !== actualMax && item.isoString > actualMin && item.isoString < actualMax
          );
          const isSingle = Boolean(actualMin && actualMax && actualMin === actualMax && item.isoString === actualMin);

          let dayClasses = 'h-8 text-xs font-semibold flex items-center justify-center transition-all cursor-pointer relative ';

          if (isSingle) {
            dayClasses += 'bg-teal-600 text-white font-extrabold rounded-xl shadow-xs scale-105 z-10';
          } else if (isStart) {
            dayClasses += 'bg-teal-600 text-white font-extrabold rounded-l-xl rounded-r-none shadow-xs z-10';
          } else if (isEnd) {
            dayClasses += 'bg-teal-600 text-white font-extrabold rounded-r-xl rounded-l-none shadow-xs z-10';
          } else if (isBetween) {
            dayClasses += 'bg-teal-100/80 dark:bg-teal-950/70 text-teal-900 dark:text-teal-200 rounded-none font-bold';
          } else if (item.isToday) {
            dayClasses += 'border-2 border-teal-500 text-teal-700 dark:text-teal-300 font-bold rounded-xl hover:bg-teal-50 dark:hover:bg-teal-950/30';
          } else if (!item.isCurrentMonth) {
            dayClasses += 'text-slate-300 dark:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:text-slate-700 dark:hover:text-slate-300';
          } else {
            dayClasses += 'text-slate-800 dark:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-teal-600 dark:hover:text-teal-300';
          }

          return (
            <button
              key={item.isoString}
              type="button"
              onClick={() => handleDayClick(item.isoString)}
              onMouseEnter={() => {
                if (isRangeSelectionPending) {
                  setHoverDate(item.isoString);
                }
              }}
              className={dayClasses}
            >
              {item.day}
            </button>
          );
        })}
      </div>

      {/* Footer Summary & Actions */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[190px]">
          {hasFilter ? (
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {isSingleDate ? `Data: ${isoToBr(startDate)}` : `${isoToBr(startDate)} até ${isoToBr(endDate)}`}
            </span>
          ) : (
            'Nenhuma data filtrada'
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {hasFilter && (
            <button
              type="button"
              onClick={handleClearFilter}
              className="px-2.5 py-1.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold transition-colors text-[11px]"
            >
              Limpar
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setIsRangeSelectionPending(false);
              setHoverDate(null);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-xs transition-colors text-[11px]"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className={`relative shrink-0 ${className}`}>
      {/* Trigger Button Field (Lado a lado com a busca) */}
      <div
        id="timeline-date-filter-trigger"
        onClick={() => {
          setIsOpen((prev) => {
            if (!prev) {
              setTimeout(updatePosition, 0);
            }
            return !prev;
          });
        }}
        className={`flex items-center gap-2 px-3.5 py-3 rounded-2xl border transition-all cursor-pointer select-none text-xs sm:text-sm font-semibold shadow-xs ${
          hasFilter
            ? 'bg-teal-50/90 dark:bg-teal-950/50 border-teal-500/60 text-teal-900 dark:text-teal-200 ring-1 ring-teal-500/40'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
        }`}
        title="Filtrar pacientes por data ou intervalo de atendimento na Linha do Tempo"
      >
        <CalendarIcon
          className={`w-4 h-4 shrink-0 ${
            hasFilter ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'
          }`}
        />

        <span className="truncate max-w-[210px] sm:max-w-[240px]">
          {getTriggerLabel()}
        </span>

        {hasFilter ? (
          <button
            type="button"
            onClick={handleClearFilter}
            className="p-1 -mr-1 rounded-lg text-teal-600 dark:text-teal-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            title="Remover filtro de data"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0 rotate-90" />
        )}
      </div>

      {/* Interactive Calendar Modal / Popover */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        isMobile ? (
          <div
            className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150"
            onClick={() => {
              setIsOpen(false);
              setIsRangeSelectionPending(false);
            }}
          >
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm">
              {renderCalendarContent()}
            </div>
          </div>
        ) : (
          <div
            style={popoverStyle}
            onClick={(e) => e.stopPropagation()}
            className="animate-in fade-in zoom-in-95 duration-150"
          >
            {renderCalendarContent()}
          </div>
        ),
        document.body
      )}
    </div>
  );
};
