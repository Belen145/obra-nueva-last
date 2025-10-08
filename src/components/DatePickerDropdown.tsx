import React, { useState, useRef, useEffect } from 'react';

interface DatePickerDropdownProps {
  value: string | null; // formato YYYY-MM-DD
  onChange: (date: string) => void;
  constructionId: number;
}

export function DatePickerDropdown({ value, onChange, constructionId }: DatePickerDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) {
      // Parsear la fecha YYYY-MM-DD sin conversión de zona horaria
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, 1);
    }
    return new Date();
  });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [openUpwards, setOpenUpwards] = useState(false);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Detectar si debe abrirse hacia arriba o hacia abajo
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const calendarHeight = 400; // Altura aproximada del calendario

      // Si no hay espacio suficiente abajo, abrir hacia arriba
      setOpenUpwards(spaceBelow < calendarHeight);
    }
  }, [isOpen]);

  const daysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const firstDayOfMonth = (date: Date) => {
    const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    // Convertir domingo (0) a 7 para que lunes sea 1
    return day === 0 ? 7 : day;
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDayClick = (day: number) => {
    // Formatear manualmente para evitar problemas de zona horaria
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(formattedDate);
    setIsOpen(false);
  };

  const renderCalendar = () => {
    const days = daysInMonth(currentMonth);
    const firstDay = firstDayOfMonth(currentMonth);
    const calendarDays = [];

    // Obtener fecha actual para marcarla si no hay valor seleccionado
    const today = new Date();
    const todayFormatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Días vacíos al inicio
    for (let i = 1; i < firstDay; i++) {
      calendarDays.push(<div key={`empty-${i}`} className="h-8 w-8"></div>);
    }

    // Días del mes
    for (let day = 1; day <= days; day++) {
      // Comparar usando el formato YYYY-MM-DD directamente
      const dayFormatted = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isSelected = value === dayFormatted;
      // Si no hay valor, marcar el día actual
      const isToday = !value && dayFormatted === todayFormatted;

      calendarDays.push(
        <button
          key={day}
          onClick={() => handleDayClick(day)}
          className={`h-8 w-8 rounded hover:bg-zen-blue-100 flex items-center justify-center text-sm transition-colors ${
            isSelected || isToday ? 'bg-zen-blue-500 text-white hover:bg-zen-blue-600' : 'text-zen-grey-700'
          }`}
        >
          {day}
        </button>
      );
    }

    return calendarDays;
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const displayValue = value
    ? (() => {
        const [year, month, day] = value.split('-').map(Number);
        return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
      })()
    : 'Sin datos';

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex gap-1 items-center">
        <div className="bg-white rounded px-2 py-2 min-w-[108px] flex items-center justify-center">
          <span className="text-sm text-zen-grey-700">{displayValue}</span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-zen-blue-50 rounded-full p-1 shrink-0 w-6 h-6 flex items-center justify-center"
        >
          <svg className="w-4 h-4 text-zen-blue-500" viewBox="0 0 16 16" fill="currentColor">
            <use href="/icons.svg#pencil" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className={`absolute left-0 bg-white rounded-lg shadow-lg border border-zen-grey-200 p-4 z-50 min-w-[280px] ${
          openUpwards ? 'bottom-full mb-2' : 'top-full mt-2'
        }`}>
          {/* Header con mes y año */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handlePrevMonth}
              className="p-1 hover:bg-zen-grey-100 rounded transition-colors"
            >
              <svg className="w-5 h-5 text-zen-grey-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            <span className="font-figtree font-semibold text-sm text-zen-grey-700">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1 hover:bg-zen-grey-100 rounded transition-colors"
            >
              <svg className="w-5 h-5 text-zen-grey-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => (
              <div key={day} className="h-8 w-8 flex items-center justify-center">
                <span className="text-xs font-semibold text-zen-grey-500">{day}</span>
              </div>
            ))}
          </div>

          {/* Días del mes */}
          <div className="grid grid-cols-7 gap-1">
            {renderCalendar()}
          </div>

          {/* Botones de acción */}
          <div className="mt-4 pt-3 border-t border-zen-grey-200 flex gap-2">
            <button
              onClick={() => {
                const today = new Date();
                const todayFormatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                onChange(todayFormatted);
                setIsOpen(false);
              }}
              className="flex-1 px-3 py-1.5 text-sm font-figtree font-semibold text-zen-blue-500 hover:bg-zen-blue-50 rounded transition-colors"
            >
              Hoy
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="flex-1 px-3 py-1.5 text-sm font-figtree font-semibold text-zen-grey-600 hover:bg-zen-grey-100 rounded transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
