import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface AuthUser extends User {
  company_id?: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [companyId, setCompanyId] = useState<string | null>(null); // Cambiar undefined por null inicialmente

  useEffect(() => {
    console.log('🚀 useAuth: Iniciando...');
    let isActive = true; // Flag para evitar actualizaciones después de unmount
    
    // Timeout de emergencia para evitar loading infinito
    const emergencyTimeout = setTimeout(() => {
      if (isActive && loading) {
        console.log('⏰ useAuth: TIMEOUT DE EMERGENCIA - Forzando fin de loading');
        setLoading(false);
      }
    }, 5000); // 5 segundos máximo
    
    const initializeAuth = async () => {
      if (!isActive) return;
      try {
        console.log('🔐 useAuth: Verificando sesión inicial...');
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          if (!isActive) return;
          console.error('❌ useAuth: Error inicial:', error.message);
          setUser(null);
          setIsAdmin(false);
          setCompanyId(null);
        } else if (user) {
          if (!isActive) return;
          console.log('👤 useAuth: Usuario inicial encontrado:', user.email);
          await processUser(user);
        } else {
          if (!isActive) return;
          console.log('❌ useAuth: No hay sesión inicial');
          setUser(null);
          setIsAdmin(false);
          setCompanyId(null);
        }
      } catch (error) {
        if (!isActive) return;
        console.error('💥 useAuth: Error en inicialización:', error);
        setUser(null);
        setIsAdmin(false);
        setCompanyId(null);
      } finally {
        if (isActive) {
          setLoading(false);
          clearTimeout(emergencyTimeout);
        }
      }
    };

    const processUser = async (user: any) => {
      if (!isActive) return;
      
      console.log('👤 useAuth: Procesando usuario:', user.email);
      setUser(user as AuthUser);
      
      // Verificar si es administrador
      const isAdminUser = user.user_metadata?.role === 'admin' || (user as any).role === 'admin';
      setIsAdmin(isAdminUser);
      console.log('🔑 useAuth: Es admin:', isAdminUser);
      
      // Obtener company_id del usuario (solo si no es admin)
      if (!isAdminUser) {
        console.log('🔍 useAuth: Obteniendo company_id...');
        try {
          let userCompanyId = user.user_metadata?.company_id;
          
          // Si no está en metadatos, buscar en tabla users
          if (!userCompanyId) {
            console.log('📋 useAuth: Consultando tabla users...');
            
            // Intentar la consulta con timeout
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), 3000)
            );
            
            const queryPromise = supabase
              .from('users')
              .select('company_id')
              .eq('id', user.id)
              .single();
            
            try {
              const { data: profile, error: profileError } = await Promise.race([
                queryPromise,
                timeoutPromise
              ]) as any;
              
              if (!profileError && profile) {
                userCompanyId = profile.company_id;
                console.log('✅ useAuth: Company ID encontrado en BD:', userCompanyId);
              } else {
                console.log('⚠️ useAuth: No se encontró company_id en BD o error:', profileError?.message || 'No encontrado');
              }
            } catch (queryError: any) {
              if (queryError.message === 'Timeout') {
                console.log('⏰ useAuth: Timeout en consulta de users - usando null');
              } else {
                console.log('❌ useAuth: Error en consulta de users:', queryError.message);
              }
            }
          } else {
            console.log('✅ useAuth: Company ID en metadatos:', userCompanyId);
          }
          
          setCompanyId(userCompanyId || null);
          console.log('🏢 useAuth: Company ID final establecido:', userCompanyId || 'null');
        } catch (error) {
          console.error('❌ useAuth: Error obteniendo company_id:', error);
          setCompanyId(null);
        }
      } else {
        console.log('👑 useAuth: Usuario admin - sin company_id');
        setCompanyId(null);
      }
      
      console.log('✅ useAuth: processUser completado');
      // Establecer loading a false AQUÍ, después de completar el proceso
      setLoading(false);
      clearTimeout(emergencyTimeout);
    };

    initializeAuth();

    // Listener para cambios de autenticación
    console.log('🔔 useAuth: Configurando listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isActive) return;
        
        console.log('🔄 useAuth: Cambio de auth ->', event);
        if (session?.user) {
          await processUser(session.user);
        } else {
          console.log('❌ useAuth: Sesión cerrada');
          setUser(null);
          setIsAdmin(false);
          setCompanyId(null);
          setLoading(false);
        }
      }
    );
    
    return () => {
      console.log('🧹 useAuth: Limpiando...');
      isActive = false; // Marcar como inactivo
      clearTimeout(emergencyTimeout);
      subscription.unsubscribe();
    };
  }, []); // Solo al montar el componente

  // Efecto adicional para forzar loading=false cuando tengamos usuario
  useEffect(() => {
    if (user && loading) {
      console.log('🔧 useAuth: Usuario detectado, forzando loading=false');
      setLoading(false);
    }
  }, [user, loading]);

  return { 
    user, 
    isAdmin, 
    loading,
    companyId // Ya es string | null directamente
  };
};