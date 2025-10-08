import React, { useEffect, useState } from 'react';

export interface NotificationProps {
  id: string;
  type: 'success' | 'error';
  title: string;
  body: string;
  onClose: (id: string) => void;
}

export function Notification({ id, type, title, body, onClose }: NotificationProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Auto-close después de 3 segundos
    const timer = setTimeout(() => {
      handleClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [id]);

  const handleClose = () => {
    setIsExiting(true);
    // Esperar la animación antes de cerrar
    setTimeout(() => {
      onClose(id);
    }, 300);
  };

  const colors = {
    success: {
      bg: 'bg-[#e3fcf0]',
      border: 'border-[#56c472]',
      iconBg: 'bg-[#47a25e]',
      icon: '/icons.svg#check-circle',
      text: 'text-[#142e1c]',
    },
    error: {
      bg: 'bg-[#fee4e2]',
      border: 'border-[#d92d20]',
      iconBg: 'bg-[#d92d20]',
      icon: '/icons.svg#x-circle',
      text: 'text-[#912018]',
    },
  };

  const config = colors[type];

  return (
    <div
      className={`${config.bg} border ${config.border} border-solid rounded flex items-center transition-all duration-300 ${
        isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'
      }`}
    >
      {/* Icono lateral */}
      <div className={`${config.iconBg} flex items-center justify-center p-3 h-[-webkit-fill-available]`}>
        <svg className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="currentColor">
          <use href={config.icon} />
        </svg>
      </div>

      {/* Contenido */}
      <div className="flex gap-6 items-start px-2 py-3 flex-1">
        <div className={`flex flex-col gap-1 items-start justify-center ${config.text}`}>
          <p className="font-figtree font-semibold text-base leading-[1.47]">{title}</p>
          <p className="font-figtree font-normal text-base leading-[1.47]">{body}</p>
        </div>

        {/* Botón cerrar */}
        <button
          onClick={handleClose}
          className="rounded w-6 h-6 flex items-center justify-center transition-colors shrink-0"
        >
          <svg className="w-4 h-4 text-zen-grey-700" viewBox="0 0 16 16" fill="currentColor">
            <use href="/icons.svg#x-close" />
          </svg>
        </button>
      </div>
    </div>
  );
}
