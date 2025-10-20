// React and dependencies
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
// ---------------------------------------------
// SidebarProps: Props for Sidebar component
// ---------------------------------------------
interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}
/**
 * Sidebar
 * Main navigation sidebar for the app. Displays menu items and handles navigation.
 */
export default function Sidebar({ activeView, onViewChange }: SidebarProps) {
  // --- Hooks ---
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState<string>('Inmobiliaria');

  // --- Effects ---
  useEffect(() => {
    const fetchCompanyName = async () => {
      try {
        
        // Obtener información del usuario autenticado
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          console.error('Usuario no autenticado:', userError);
          return;
        }

        // Intentar obtener company_id de los metadatos del usuario
        let userCompanyId = user.user_metadata?.company_id || user.app_metadata?.company_id;
        
        // Si no está en metadatos, buscar en una posible tabla de perfiles
        if (!userCompanyId) {
          
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('company_id')
            .eq('id', user.id)
            .single();
            
          if (!profileError && profile) {
            userCompanyId = profile.company_id;
            
          } 
        }
        
        // Si aún no tenemos company_id, usar fallback temporal
        if (!userCompanyId) {
          
          // Obtener la primera compañía disponible como fallback
          const { data: allCompanies, error: allCompaniesError } = await supabase
            .from('company')
            .select('id, name')
            .limit(1);
            
          if (!allCompaniesError && allCompanies && allCompanies.length > 0) {
            userCompanyId = allCompanies[0].id;
            setCompanyName(allCompanies[0].name);
            
            return;
          } else {

            return;
          }
        }

        
        
        // Obtener nombre de la compañía específica del usuario
        const { data: company, error: companyError } = await supabase
          .from('company')
          .select('name')
          .eq('id', userCompanyId)
          .single();

        

        if (companyError) {
          console.error('Error obteniendo compañía:', companyError);
          return;
        }

        if (company) {
          
          setCompanyName(company.name);
        }
      } catch (error) {
        console.error('Error en fetchCompanyName:', error);
      }
    };

    fetchCompanyName();
  }, []);

  // --- Menu items ---
  const menuItems = [{ id: 'constructions', label: 'Obras', iconId: 'obras' }];
  const footerItems = [
    { id: 'logout', label: 'Cerrar sesión', iconId: 'logout' },
    { id: 'real-estate', label: companyName, iconId: 'user' },
  ];
  
  // Debug: Log del estado actual
  
  // --- Handlers ---
  /**
   * Handles menu item click: updates view and navigates.
   */
  const handleMenuClick = (itemId: string) => {
    onViewChange(itemId);
    // Navigate to the corresponding route
    switch (itemId) {
      case 'constructions':
        navigate('/constructions');
        break;
      default:
        navigate('/constructions');
        break;
    }
  };
  const handleFooterItemClick = async (itemId: string) => {
    // Handle footer actions
    if (itemId === 'logout') {
      try {
        await supabase.auth.signOut();
        navigate('/login');
      } catch (error) {
        console.error('Error during logout:', error);
      }
    } else if (itemId === 'real-estate') {
      // TODO: Navigate to real estate view
      
    }
  };
  // --- Render ---
  return (
    <div className="w-[199px] bg-zen-grey-25 h-full border-r border-zen-grey-200 flex flex-col relative">
      {/* Gradient background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute left-[-132px] top-[554px] w-[526px] h-[526px]">
          {/* Círculo azul principal */}
          <div className="absolute top-[185.871px] left-[61.875px] w-[148.401px] h-[148.401px] rounded-full bg-zen-blue-500 opacity-60 blur-[70px]" />
          {/* Círculo verde */}
          <div className="absolute top-[295.43px] left-[97.5997px] w-[148.401px] h-[148.401px] rounded-full bg-zen-green-500 opacity-60 blur-[70px]" />
          {/* Círculo azul secundario */}
          <div className="absolute top-[183.125px] left-[123.013px] w-[148.401px] h-[148.401px] rounded-full bg-zen-blue-500 opacity-60 blur-[70px]" />
          {/* Círculo blanco con blur */}
          <div className="absolute top-0 left-0 w-[526px] h-[526px] rounded-full bg-white/60 blur-[140px]" />
        </div>
      </div>
      {/* Content */}
      <div className="relative flex flex-col h-full px-3 py-6 gap-6">
        {/* Logo */}
        <div className="h-[39px] w-[172.638px]">
          <svg className="h-full w-full">
            <use href="/icons.svg#zenova-logo" />
          </svg>
        </div>
        {/* Menu */}
        <div className="flex flex-col justify-between flex-1">
          {/* Main navigation */}
          <nav className="flex flex-col gap-3">
            {menuItems.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleMenuClick(item.id)}
                  className={`flex items-center gap-2 p-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-zen-blue-15 text-zen-blue-500'
                      : 'text-zen-grey-950 hover:bg-zen-grey-100'
                  }`}
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <use href={`/icons.svg#${item.iconId}`} />
                  </svg>
                  <span className="text-sm font-medium leading-[1.25]">{item.label}</span>
                </button>
              );
            })}
          </nav>
          {/* Footer navigation */}
          <nav className="flex flex-col gap-3">
            {footerItems.map((item) => {
              return (
                <button
                  key={item.id}
                  onClick={() => handleFooterItemClick(item.id)}
                  className="flex items-center gap-2 p-3 rounded-lg text-zen-grey-950 hover:bg-zen-grey-100 transition-colors"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <use href={`/icons.svg#${item.iconId}`} />
                  </svg>
                  <span className="text-sm font-normal leading-[1.25]">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}