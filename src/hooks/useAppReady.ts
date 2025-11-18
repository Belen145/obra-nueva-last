import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

export const useAppReady = () => {
  const [isReady, setIsReady] = useState(false);
  const { user, loading: authLoading, companyId } = useAuth();

  useEffect(() => {
    const checkReady = async () => {
      console.log('🚀 useAppReady: Checking readiness ->', { 
        authLoading, 
        hasUser: !!user,
        companyId 
      });

      // Si auth está cargando, no estamos listos
      if (authLoading) {
        console.log('⏳ useAppReady: Auth still loading...');
        setIsReady(false);
        return;
      }

      // Si no hay usuario, estamos listos para mostrar login
      if (!user) {
        console.log('✅ useAppReady: No user - ready for login');
        setIsReady(true);
        return;
      }

      // Si hay usuario pero aún no tenemos companyId (para usuarios no admin), esperar
      if (user && companyId === undefined) {
        console.log('⏳ useAppReady: User exists but companyId loading...');
        setIsReady(false);
        return;
      }

      // Todo listo
      console.log('✅ useAppReady: All conditions met - app ready');
      
      // Agregar un pequeño delay para evitar flash
      setTimeout(() => {
        setIsReady(true);
      }, 300);
    };

    checkReady();
  }, [authLoading, user, companyId]);

  return {
    isReady,
    authState: { user, loading: authLoading, companyId }
  };
};