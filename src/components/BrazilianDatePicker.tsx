import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Check } from 'lucide-react';

interface BrazilianDatePickerProps {
  id?: string;
  value: string; // ISO 'YYYY-MM-DD'
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  minDate?: string; // ISO 'YYYY-MM-DD'
  maxDate?: string; // ISO 'YYYY-MM-DD'
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/**
 * Converts ISO 'YYYY-MM-DD' to Brazilian format 'DD/MM/YYYY'
 */
function isoToBr(iso: string): string {
  if (!iso || typeof iso !== 'string') return '';
  const clean = iso.trim().split('T')[0];
  const parts = clean.split('-');
  if (parts.length !== 3) return '';
  const [y, m, d] = parts;
  if (!y || !m || !d) return '';
  return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
}

/**
 * Validates and converts Brazilian format 'DD/MM/YYYY' to ISO 'YYYY-MM-DD'
 */
function brToIso(br: string): string | null {
  if (!br || typeof br !== 'string') return null;
  const digits = br.replace(/\D/g, '');
  if (digits.length !== 8) return null;

  const day = parseInt(digits.substring(0, 2), 10);
  const month = parseInt(digits.substring(2, 4), 10);
  const year = parseInt(digits.substring(4, 8), 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  if (year < 1900 || year > 2100) return null;
  if (month < 1 || month > 12) return null;

  const maxDays = new Date(year, month, 0).getDate();
  if (day < 1 || day > maxDays) return null;

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Applies DD/MM/YYYY mask dynamically as the user types
 */
function formatAsBrDate(val: string): string {
  if (!val) return '';
  const trimmed = val.trim();
  // If user pasted ISO date YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-');
    return `${d}/${m}/${y}`;
  }
  const digits = val.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export const BrazilianDatePicker: React.FC<BrazilianDatePickerProps> = ({
  id,
  value,
  onChange,
  required,
  minDate,
  maxDate,
  className = '',
  disabled = false,
  placeholder = 'DD/MM/AAAA',
}) => {
  const [displayValue, setDisplayValue] = useState<string>(() => isoToBr(value));
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nativeDateRef = useRef<HTMLInputElement>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});

  // Detect mobile screen width
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate and update popover position so it stays on-screen and anchors to input
  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const popoverWidth = 320;
    const estimatedHeight = 360;
    const margin = 8;
    const padding = 12;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let top: number;
    // If not enough room below, but more space above, open above
    if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
      top = Math.max(padding, rect.top - estimatedHeight - margin);
    } else {
      top = rect.bottom + margin;
      // Clamp to viewport bottom if needed
      if (top + estimatedHeight > window.innerHeight - padding) {
        top = Math.max(padding, window.innerHeight - estimatedHeight - padding);
      }
    }

    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - padding) {
      left = Math.max(padding, window.innerWidth - popoverWidth - padding);
    }
    if (left < padding) {
      left = padding;
    }

    setPopoverStyle({
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${popoverWidth}px`,
      zIndex: 9999,
    });
  };

  // Keep popover attached on scroll or window resize
  useEffect(() => {
    if (isOpen && !isMobile) {
      updatePosition();
      const handleScrollOrResize = () => {
        updatePosition();
      };
      window.addEventListener('resize', handleScrollOrResize);
      window.addEventListener('scroll', handleScrollOrResize, true);
      return () => {
        window.removeEventListener('resize', handleScrollOrResize);
        window.removeEventListener('scroll', handleScrollOrResize, true);
      };
    }
  }, [isOpen, isMobile]);

  // Parse current selected date or fallback to today
  const selectedDateObj = useMemo(() => {
    if (!value) return null;
    const parts = value.split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    return null;
  }, [value]);

  // Viewed month/year in the calendar dropdown
  const [viewDate, setViewDate] = useState<Date>(() => {
    if (selectedDateObj) return new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), 1);
    return new Date();
  });

  // Sync display value when incoming value prop changes
  useEffect(() => {
    const formatted = isoToBr(value);
    setDisplayValue(formatted);
    if (value) {
      const parts = value.split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0])) {
        setViewDate(new Date(parts[0], parts[1] - 1, 1));
      }
    }
  }, [value]);

  // Close calendar on click outside or escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      const clickedContainer = containerRef.current && containerRef.current.contains(target);
      const clickedPopover = popoverRef.current && popoverRef.current.contains(target);
      if (!clickedContainer && !clickedPopover) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
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

  // Handle direct typing in the text input (mobile & desktop)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const formatted = formatAsBrDate(rawVal);
    setDisplayValue(formatted);

    // If a complete 8-digit date was typed, validate and emit onChange
    if (formatted.length === 10) {
      const iso = brToIso(formatted);
      if (iso) {
        onChange(iso);
        const parts = iso.split('-').map(Number);
        setViewDate(new Date(parts[0], parts[1] - 1, 1));
      }
    }
  };

  // On blur, if valid, ensure synced; if invalid or empty and required, revert to valid value
  const handleInputBlur = () => {
    if (!displayValue.trim()) {
      if (!required) {
        onChange('');
      } else if (value) {
        setDisplayValue(isoToBr(value));
      }
      return;
    }

    const iso = brToIso(displayValue);
    if (iso) {
      onChange(iso);
      setDisplayValue(isoToBr(iso));
    } else if (value) {
      // Revert to last valid value if invalid
      setDisplayValue(isoToBr(value));
    }
  };

  // Calendar day selection
  const handleSelectDay = (year: number, month: number, day: number) => {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(iso);
    setDisplayValue(isoToBr(iso));
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Fast navigation to today / tomorrow
  const setRelativeDay = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const year = d.getFullYear();
    const month = d.getMonth();
    const day = d.getDate();
    handleSelectDay(year, month, day);
    setViewDate(new Date(year, month, 1));
  };

  // Toggle calendar or invoke native picker on touch devices if preferred
  const handleCalendarButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setIsOpen((prev) => {
      if (!prev) {
        setTimeout(updatePosition, 0);
      }
      return !prev;
    });
  };

  // Calendar grid computation
  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sun
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      day: number;
      month: number;
      year: number;
      isCurrentMonth: boolean;
      isSelected: boolean;
      isToday: boolean;
      isDisabled: boolean;
    }> = [];

    const today = new Date();
    const todayY = today.getFullYear();
    const todayM = today.getMonth();
    const todayD = today.getDate();

    // Leading days from previous month
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevM = month === 0 ? 11 : month - 1;
      const prevY = month === 0 ? year - 1 : year;
      days.push({
        day: d,
        month: prevM,
        year: prevY,
        isCurrentMonth: false,
        isSelected: false,
        isToday: prevY === todayY && prevM === todayM && d === todayD,
        isDisabled: false,
      });
    }

    // Days in current month
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const isSelected = !!selectedDateObj &&
        selectedDateObj.getFullYear() === year &&
        selectedDateObj.getMonth() === month &&
        selectedDateObj.getDate() === d;

      const isToday = year === todayY && month === todayM && d === todayD;

      days.push({
        day: d,
        month,
        year,
        isCurrentMonth: true,
        isSelected,
        isToday,
        isDisabled: false,
      });
    }

    // Trailing days to fill 5 or 6 rows (multiple of 7)
    const totalSlots = days.length <= 35 ? 35 : 42;
    const remaining = totalSlots - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextM = month === 11 ? 0 : month + 1;
      const nextY = month === 11 ? year + 1 : year;
      days.push({
        day: d,
        month: nextM,
        year: nextY,
        isCurrentMonth: false,
        isSelected: false,
        isToday: nextY === todayY && nextM === todayM && d === todayD,
        isDisabled: false,
      });
    }

    return days;
  }, [viewDate, selectedDateObj]);

  const prevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Year options for quick selection in calendar
  const currentYear = viewDate.getFullYear();
  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = currentYear - 5; y <= currentYear + 10; y++) {
      years.push(y);
    }
    return years;
  }, [currentYear]);

  // Calendar UI markup (reused for both desktop popover and mobile centered modal)
  const renderCalendarContent = () => (
    <div className="w-full max-w-xs sm:max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-150">
      {/* Calendar Header with Month/Year Navigation */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900 dark:text-slate-100">
          <span>{MONTH_NAMES[viewDate.getMonth()]}</span>
          <select
            value={viewDate.getFullYear()}
            onChange={(e) => {
              const newYear = parseInt(e.target.value, 10);
              setViewDate(new Date(newYear, viewDate.getMonth(), 1));
            }}
            className="bg-transparent border-none text-teal-600 dark:text-teal-400 font-extrabold outline-none cursor-pointer text-sm"
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
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Mês anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Próximo mês"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {WEEKDAY_NAMES.map((name, idx) => (
          <span
            key={name}
            className={`text-[10px] font-bold uppercase tracking-wider py-1 ${
              idx === 0 || idx === 6
                ? 'text-teal-600/80 dark:text-teal-400/80'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            {name}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((item, idx) => {
          const key = `${item.year}-${item.month}-${item.day}-${idx}`;

          let btnClasses =
            'h-8 text-xs font-semibold rounded-xl flex items-center justify-center transition-all cursor-pointer ';

          if (item.isSelected) {
            btnClasses += 'bg-teal-600 text-white font-black shadow-xs scale-105';
          } else if (item.isToday) {
            btnClasses +=
              'border-2 border-teal-500 text-teal-700 dark:text-teal-300 font-bold bg-teal-50/50 dark:bg-teal-950/30 hover:bg-teal-100 dark:hover:bg-teal-900/50';
          } else if (!item.isCurrentMonth) {
            btnClasses +=
              'text-slate-300 dark:text-slate-600 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40';
          } else {
            btnClasses +=
              'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-teal-600 dark:hover:text-teal-300';
          }

          return (
            <button
              key={key}
              type="button"
              onClick={() => handleSelectDay(item.year, item.month, item.day)}
              className={btnClasses}
            >
              {item.day}
            </button>
          );
        })}
      </div>

      {/* Quick Shortcuts: Hoje, Amanhã, Fechar */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setRelativeDay(0)}
            className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 font-bold hover:bg-teal-100 dark:hover:bg-teal-900/60 transition-colors cursor-pointer"
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => setRelativeDay(1)}
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Amanhã
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-bold px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          Fechar
        </button>
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input container with typing and calendar button */}
      <div className={`relative flex items-center ${className}`}>
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="numeric"
          pattern="[0-9/]*"
          maxLength={10}
          value={displayValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full pl-4 pr-12 py-2.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none shadow-xs transition-all tracking-wider"
          title="Digite a data no formato DD/MM/AAAA ou clique no botão de calendário"
        />

        {/* Visible, clickable Calendar Button with bright SUS/Teal styling */}
        <button
          type="button"
          onClick={handleCalendarButtonClick}
          disabled={disabled}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-xl text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/60 active:scale-95 transition-all cursor-pointer flex items-center justify-center border border-teal-200/80 dark:border-teal-800/60"
          title="Abrir calendário para selecionar a data"
          aria-label="Abrir calendário"
        >
          <CalendarIcon className="w-4 h-4" />
        </button>

        {/* Hidden native date input for OS-level sync */}
        <input
          ref={nativeDateRef}
          type="date"
          tabIndex={-1}
          value={value}
          min={minDate}
          max={maxDate}
          onChange={(e) => {
            if (e.target.value) {
              onChange(e.target.value);
              setDisplayValue(isoToBr(e.target.value));
            }
          }}
          className="sr-only pointer-events-none opacity-0 absolute"
          aria-hidden="true"
        />
      </div>

      {/* Floating Interactive Calendar: Centered Modal on Mobile, Portaled Popover on Desktop */}
      {isOpen && !disabled && typeof document !== 'undefined' && createPortal(
        isMobile ? (
          <div
            className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150"
            onClick={() => setIsOpen(false)}
          >
            <div ref={popoverRef} onClick={(e) => e.stopPropagation()} className="w-full max-w-xs">
              {renderCalendarContent()}
            </div>
          </div>
        ) : (
          <div
            ref={popoverRef}
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
