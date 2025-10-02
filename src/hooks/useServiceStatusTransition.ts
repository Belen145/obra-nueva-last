// Placeholder: Hook eliminado. Sin lógica ni dependencias externas.
import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface TransitionResult {
  success: boolean;
  transitioned: boolean;
  newStatusId?: number;
  newStatusName?: string;
  message?: string;
  error?: string;
}

export function useServiceStatusTransition() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Verifica si un servicio debe transicionar automáticamente al siguiente estado
   * cuando todos sus documentos están aprobados
   */
  const checkAndTransitionService = async (
    serviceId: number
  ): Promise<TransitionResult> => {
    try {
      setLoading(true);
      setError(null);

      console.log('🚀 === INICIANDO VERIFICACIÓN DE TRANSICIÓN AUTOMÁTICA ===');
      console.log('🎯 Service ID:', serviceId);

      console.log(
        '🔄 Iniciando verificación de transición automática para servicio:',
        serviceId
      );

      // 1. Obtener información del servicio
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .select(
          `
          id,
          status_id,
          type_id,
          services_status (
            id,
            name
          )
        `
        )
        .eq('id', serviceId)
        .single();

      if (serviceError) {
        console.error('❌ ERROR CRÍTICO obteniendo servicio:', serviceError);
        console.error('❌ Error obteniendo servicio:', serviceError);
        throw new Error(`Error obteniendo servicio: ${serviceError.message}`);
      }

      console.log('✅ SERVICIO OBTENIDO EXITOSAMENTE:');
      console.log('📋 Servicio obtenido:', {
        id: service.id,
        status_id: service.status_id,
        type_id: service.type_id,
        current_status: service.services_status?.name,
      });

      // 2. Verificar que el servicio esté en estado "Recopilación de documentación" (ID = 1)
      console.log('🔍 VERIFICANDO ESTADO DEL SERVICIO:');
      console.log('📊 Estado actual:', service.status_id);
      console.log('📊 ¿Es estado 1 (Recopilación)?', service.status_id === 1);

      if (service.status_id !== 1) {
        console.log('❌ TRANSICIÓN CANCELADA: Servicio no está en estado 1');
        console.log('📊 Estado actual:', service.status_id, 'vs esperado: 1');
        console.log(
          '📊 Nombre del estado actual:',
          service.services_status?.name
        );
        return {
          success: true,
          transitioned: false,
          message:
            'Servicio no está en estado de recopilación de documentación',
        };
      }

      console.log('✅ Servicio está en estado correcto (1), continuando...');

      // 3. Obtener todos los documentos requeridos para este tipo de servicio
      console.log('🔍 OBTENIENDO DOCUMENTOS REQUERIDOS:');
      console.log('📊 Service Type ID:', service.type_id);

      const { data: requiredDocs, error: requiredDocsError } = await supabase
        .from('service_required_document')
        .select('document_type_id')
        .eq('service_type_id', service.type_id)
        .or('only_self_managed.is.null,only_self_managed.eq.false');

      if (requiredDocsError) {
        console.error(
          '❌ ERROR obteniendo documentos requeridos:',
          requiredDocsError
        );
        console.error(
          '❌ Error obteniendo documentos requeridos:',
          requiredDocsError
        );
        throw new Error(
          `Error obteniendo documentos requeridos: ${requiredDocsError.message}`
        );
      }

      console.log('✅ DOCUMENTOS REQUERIDOS OBTENIDOS:');
      console.log(
        '📄 Documentos requeridos encontrados:',
        requiredDocs?.length || 0
      );
      console.log('📋 Lista completa de documentos requeridos:', requiredDocs);
      if (requiredDocs && requiredDocs.length > 0) {
        requiredDocs.forEach((doc, index) => {
          console.log(
            `📄 Documento requerido ${index + 1}: document_type_id = ${
              doc.document_type_id
            }`
          );
        });
      }

      if (!requiredDocs || requiredDocs.length === 0) {
        console.log(
          '⚠️ NO HAY DOCUMENTOS REQUERIDOS - Transicionando automáticamente'
        );
        // Si no hay documentos requeridos, transicionar directamente
      } else {
        // 4. Obtener todos los documentos existentes del servicio
        console.log('🔍 OBTENIENDO DOCUMENTOS EXISTENTES DEL SERVICIO:');

        const { data: existingDocs, error: existingDocsError } = await supabase
          .from('documents')
          .select(
            `
            id,
            document_type_id,
            document_status_id,
            document_status (
              id,
              name
            )
          `
          )
          .eq('service_id', serviceId);

        if (existingDocsError) {
          console.error(
            '❌ ERROR obteniendo documentos existentes:',
            existingDocsError
          );
          console.error(
            '❌ Error obteniendo documentos existentes:',
            existingDocsError
          );
          throw new Error(
            `Error obteniendo documentos existentes: ${existingDocsError.message}`
          );
        }

        console.log('✅ DOCUMENTOS EXISTENTES OBTENIDOS:');
        console.log(
          '📄 Documentos existentes del servicio:',
          existingDocs?.length || 0
        );
        console.log(
          '📋 Lista completa de documentos existentes:',
          existingDocs
        );
        if (existingDocs && existingDocs.length > 0) {
          existingDocs.forEach((doc, index) => {
            console.log(`📄 Documento existente ${index + 1}:`, {
              id: doc.id,
              document_type_id: doc.document_type_id,
              document_status_id: doc.document_status_id,
              status_name: doc.document_status?.name,
            });
          });
        }

        // 5. Verificar que todos los documentos requeridos existan y estén aprobados
        console.log('🔍 ANALIZANDO ESTADO DE APROBACIÓN:');

        const requiredDocTypeIds = requiredDocs.map(
          (doc) => doc.document_type_id
        );
        const approvedDocs =
          existingDocs?.filter((doc) => doc.document_status_id === 3) || [];
        const approvedDocTypeIds = approvedDocs.map(
          (doc) => doc.document_type_id
        );

        console.log('📊 ANÁLISIS DETALLADO:');
        console.log('📋 IDs de documentos requeridos:', requiredDocTypeIds);
        console.log('📋 IDs de documentos aprobados:', approvedDocTypeIds);
        console.log('📊 Total requeridos:', requiredDocTypeIds.length);
        console.log('📊 Total aprobados:', approvedDocTypeIds.length);

        console.log('🔍 Análisis de documentos:', {
          requeridos: requiredDocTypeIds,
          status_name: service.services_status?.name,
          aprobados: approvedDocTypeIds,
        });

        // Verificar que todos los documentos requeridos estén aprobados
        const missingApprovedDocs = requiredDocTypeIds.filter(
          (typeId) => !approvedDocTypeIds.includes(typeId)
        );

        console.log(
          '📊 DOCUMENTOS FALTANTES POR APROBAR:',
          missingApprovedDocs
        );
        console.log(
          '📊 ¿Todos los documentos están aprobados?',
          missingApprovedDocs.length === 0
        );

        if (missingApprovedDocs.length > 0) {
          console.log(
            '❌ TRANSICIÓN CANCELADA: Documentos pendientes de aprobación'
          );
          console.log(
            '📋 Documentos faltantes (document_type_id):',
            missingApprovedDocs
          );
          missingApprovedDocs.forEach((typeId, index) => {
            const existingDoc = existingDocs?.find(
              (doc) => doc.document_type_id === typeId
            );
            console.log(`📄 Documento faltante ${index + 1}:`, {
              document_type_id: typeId,
              exists: !!existingDoc,
              current_status_id: existingDoc?.document_status_id,
              current_status_name: existingDoc?.document_status?.name,
            });
          });
          return {
            success: true,
            transitioned: false,
            message: `Faltan ${missingApprovedDocs.length} documento(s) por aprobar`,
          };
        }

        console.log(
          '✅ TODOS LOS DOCUMENTOS ESTÁN APROBADOS - Continuando con transición...'
        );
        console.log('✅ Todos los documentos requeridos están aprobados');
      }

      // 6. Buscar el siguiente estado directamente desde services_status
      // Primero intentar con service_type_status, si no hay datos usar fallback
      // Para el servicio ID 47, sabemos que debe ir de estado 1 a estado 8 (Activado)
      console.log('🔍 BUSCANDO SIGUIENTE ESTADO:');
      console.log(
        '🔍 Buscando siguiente estado para service_type_id:',
        service.type_id
      );

      // Consultar la tabla service_type_status con las columnas correctas
      console.log(
        '🔍 Consultando service_type_status con columnas: id, service_type_id, status_id, orden'
      );

      const { data: allStatusConfigs, error: allStatusError } = await supabase
        .from('service_type_status')
        .select(
          `
          id,
          service_type_id,
          status_id,
          orden,
          services_status (
            id,
            name
          )
        `
        )
        .or(`service_type_id.eq.${service.type_id},service_type_id.is.null`)
        .order('orden', { ascending: true });

      if (allStatusError) {
        console.error(
          '❌ ERROR obteniendo configuraciones de estado:',
          allStatusError
        );
        console.error(
          '❌ Error obteniendo configuraciones de estado:',
          allStatusError
        );

        // Si falla, intentar con una consulta más simple para diagnosticar
        console.log('🔍 Intentando consulta de diagnóstico...');
        const { data: debugData, error: debugError } = await supabase
          .from('service_type_status')
          .select('*')
          .limit(1);

        if (debugError) {
          console.error('❌ ERROR en consulta de diagnóstico:', debugError);
          console.error('❌ Error en consulta de diagnóstico:', debugError);
          throw new Error(
            `Error obteniendo configuraciones de estado: ${allStatusError.message}`
          );
        }

        console.log(
          '🔍 Estructura de tabla service_type_status:',
          debugData?.[0] || 'No hay datos'
        );
        throw new Error(
          `Error obteniendo configuraciones de estado: ${allStatusError.message}`
        );
      }

      console.log('✅ CONFIGURACIONES DE ESTADO OBTENIDAS:');
      console.log('📊 Configuraciones de estado encontradas:', {
        total: allStatusConfigs?.length || 0,
        specific:
          allStatusConfigs?.filter((c) => c.service_type_id === service.type_id)
            .length || 0,
        common:
          allStatusConfigs?.filter((c) => c.service_type_id === null).length ||
          0,
        configs: allStatusConfigs,
      });

      if (allStatusConfigs && allStatusConfigs.length > 0) {
        console.log('📋 LISTA DETALLADA DE CONFIGURACIONES:');
        allStatusConfigs.forEach((config, index) => {
          console.log(`📊 Config ${index + 1}:`, {
            id: config.id,
            service_type_id: config.service_type_id,
            status_id: config.status_id,
            orden: config.orden,
            status_name: config.services_status?.name,
            is_common: config.service_type_id === null,
          });
        });
      }

      // Encontrar el estado actual y el siguiente
      if (!allStatusConfigs || allStatusConfigs.length === 0) {
        console.warn('⚠️ NO HAY CONFIGURACIONES - Usando fallback');
        console.warn(
          '⚠️ No hay configuraciones en service_type_status para service_type_id:',
          service.type_id,
          'ni estados comunes'
        );
        console.log(
          '🔄 Usando fallback: transición directa de estado 1 a estado 8 (Activado)'
        );

        // Fallback: Si no hay configuraciones específicas, usar transición conocida
        if (service.status_id === 1) {
          console.log('🎯 APLICANDO FALLBACK: 1 → 8');
          // Verificar que el estado 8 (Activado) existe
          const { data: targetStatus, error: targetError } = await supabase
            .from('services_status')
            .select('id, name')
            .eq('id', 8)
            .single();

          if (targetError) {
            console.error(
              '❌ ERROR obteniendo estado objetivo (8):',
              targetError
            );
            console.error(
              '❌ Error obteniendo estado objetivo (8):',
              targetError
            );
            throw new Error(
              `Error obteniendo estado objetivo: ${targetError.message}`
            );
          }

          console.log('✅ Estado objetivo encontrado:', targetStatus);
          console.log('🎯 Estado objetivo encontrado:', targetStatus);

          // Actualizar el estado del servicio
          console.log('🔄 ACTUALIZANDO ESTADO DEL SERVICIO (FALLBACK)...');
          const { error: updateError } = await supabase
            .from('services')
            .update({
              status_id: 8,
            })
            .eq('id', serviceId);

          if (updateError) {
            console.error(
              '❌ ERROR CRÍTICO actualizando estado del servicio:',
              updateError
            );
            console.error(
              '❌ Error actualizando estado del servicio:',
              updateError
            );
            throw new Error(
              `Error actualizando estado del servicio: ${updateError.message}`
            );
          }

          console.log('🎉 ¡TRANSICIÓN EXITOSA! (FALLBACK)');
          console.log('✅ Servicio transicionado exitosamente (fallback):', {
            serviceId,
            fromStatus: service.services_status?.name,
            toStatus: targetStatus.name,
            fromStatusId: service.status_id,
            toStatusId: 8,
          });

          return {
            success: true,
            transitioned: true,
            newStatusId: 8,
            newStatusName: targetStatus.name,
            message: `Servicio transicionado de "${service.services_status?.name}" a "${targetStatus.name}" (usando fallback)`,
          };
        } else {
          console.log('❌ FALLBACK NO APLICABLE: Estado actual no es 1');
          console.log(
            'ℹ️ Servicio no está en estado 1, no se puede aplicar fallback. Estado actual:',
            service.status_id
          );
          return {
            success: true,
            transitioned: false,
            message:
              'No hay configuraciones de estado disponibles y el servicio no está en estado 1',
          };
        }
      }

      // Buscar el estado actual en las configuraciones
      console.log('🔍 BUSCANDO ESTADO ACTUAL EN CONFIGURACIONES:');
      console.log('📊 Buscando status_id:', service.status_id);

      const currentIndex = allStatusConfigs.findIndex(
        (config) => config.status_id === service.status_id
      );
      console.log('📊 Índice encontrado:', currentIndex);

      if (currentIndex === -1) {
        console.error(
          '❌ ERROR: Estado actual no encontrado en configuraciones'
        );
        console.error(
          '❌ No se encontró configuración para el estado actual:',
          service.status_id
        );

        // Mostrar información de debug
        console.log(
          '🔍 Estados disponibles:',
          allStatusConfigs?.map((c) => ({
            status_id: c.status_id,
            name: c.services_status?.name,
            service_type_id: c.service_type_id,
            is_common: c.service_type_id === null,
          }))
        );
        console.log('🔍 Estado actual buscado:', service.status_id);

        throw new Error(
          `No se encontró configuración para el estado actual: ${service.status_id}`
        );
      }

      console.log('✅ Estado actual encontrado en índice:', currentIndex);
      const nextStatusConfig = allStatusConfigs?.[currentIndex + 1];
      console.log('📊 Siguiente configuración:', nextStatusConfig);

      if (!nextStatusConfig) {
        console.log('ℹ️ NO HAY SIGUIENTE ESTADO - Servicio en estado final');
        console.log(
          'ℹ️ No hay siguiente estado disponible, el servicio está en el estado final'
        );
        return {
          success: true,
          transitioned: false,
          message: 'El servicio ya está en el estado final',
        };
      }

      console.log('✅ SIGUIENTE ESTADO IDENTIFICADO:');
      console.log('➡️ Siguiente estado identificado:', {
        currentIndex,
        nextConfig: nextStatusConfig,
        status_name: nextStatusConfig?.services_status?.name,
        is_common: nextStatusConfig?.service_type_id === null,
      });

      // 7. Actualizar el estado del servicio
      console.log('🔄 ACTUALIZANDO ESTADO DEL SERVICIO...');
      console.log(
        '📊 De estado:',
        service.status_id,
        '→',
        nextStatusConfig.status_id
      );

      const { error: updateError } = await supabase
        .from('services')
        .update({
          status_id: nextStatusConfig.status_id,
        })
        .eq('id', serviceId);

      if (updateError) {
        console.error(
          '❌ ERROR CRÍTICO actualizando estado del servicio:',
          updateError
        );
        console.error(
          '❌ Error actualizando estado del servicio:',
          updateError
        );
        throw new Error(
          `Error actualizando estado del servicio: ${updateError.message}`
        );
      }

      console.log('🎉 ¡TRANSICIÓN EXITOSA!');
      console.log('✅ Servicio transicionado exitosamente:', {
        serviceId,
        fromStatus: service.services_status?.name,
        toStatus: nextStatusConfig.services_status?.name,
        fromStatusId: service.status_id,
        toStatusId: nextStatusConfig.status_id,
      });
      console.log(
        '🚀 === VERIFICACIÓN DE TRANSICIÓN COMPLETADA EXITOSAMENTE ==='
      );

      return {
        success: true,
        transitioned: true,
        newStatusId: nextStatusConfig.status_id,
        newStatusName: nextStatusConfig.services_status?.name,
        message: `Servicio transicionado de "${service.services_status?.name}" a "${nextStatusConfig.services_status?.name}"`,
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error desconocido';
      console.error(
        '❌ ERROR CRÍTICO en checkAndTransitionService:',
        errorMessage
      );
      console.error('🚨 STACK TRACE:', err);
      console.error('❌ Error en checkAndTransitionService:', errorMessage);
      setError(errorMessage);
      return {
        success: false,
        transitioned: false,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Se ejecuta cuando se actualiza el estado de un documento
   * Verifica automáticamente si el servicio debe transicionar
   */
  const onDocumentStatusUpdate = async (
    documentId: number,
    newStatusId: number
  ): Promise<TransitionResult> => {
    try {
      console.log('🔔 === DOCUMENT STATUS UPDATE TRIGGERED ===');
      console.log('📄 Document ID:', documentId);
      console.log('🔄 New Status ID:', newStatusId);
      console.log(
        '📊 Status check: newStatusId === 3 (aprobado)?',
        newStatusId === 3
      );

      console.log(
        '🔄 Documento actualizado, verificando transición automática:',
        {
          documentId,
          newStatusId,
        }
      );

      // Solo verificar transición si el documento fue aprobado (status_id = 3)
      if (newStatusId !== 3) {
        console.log(
          '❌ TRANSICIÓN CANCELADA: Documento no fue aprobado (status_id !== 3)'
        );
        console.log('📊 Status recibido:', newStatusId, 'vs esperado: 3');
        return {
          success: true,
          transitioned: false,
          message: 'Documento no fue aprobado',
        };
      }

      console.log(
        '✅ Documento aprobado, continuando con verificación de transición...'
      );

      // Obtener el service_id del documento
      const { data: document, error: docError } = await supabase
        .from('documents')
        .select('service_id')
        .eq('id', documentId)
        .single();

      if (docError) {
        console.error(
          '❌ ERROR obteniendo service_id del documento:',
          docError
        );
        console.error('❌ Error obteniendo documento:', docError);
        throw new Error(`Error obteniendo documento: ${docError.message}`);
      }

      console.log(
        '✅ Documento pertenece al servicio ID:',
        document.service_id
      );
      console.log(
        '🔄 Iniciando verificación de transición para servicio:',
        document.service_id
      );

      // Verificar transición del servicio
      const result = await checkAndTransitionService(document.service_id);

      console.log('📊 RESULTADO FINAL de transición:', {
        success: result.success,
        transitioned: result.transitioned,
        newStatusId: result.newStatusId,
        newStatusName: result.newStatusName,
        message: result.message,
        error: result.error,
      });
      console.log('🔔 === DOCUMENT STATUS UPDATE COMPLETED ===');

      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error desconocido';
      console.error(
        '❌ ERROR CRÍTICO en onDocumentStatusUpdate:',
        errorMessage
      );
      console.error('❌ Error en onDocumentStatusUpdate:', errorMessage);
      return {
        success: false,
        transitioned: false,
        error: errorMessage,
      };
    }
  };

  /**
   * Verifica múltiples servicios para transición automática
   */
  const checkMultipleServices = async (
    serviceIds: number[]
  ): Promise<TransitionResult[]> => {
    console.log(
      '🔄 Verificando transición para múltiples servicios:',
      serviceIds
    );

    const results: TransitionResult[] = [];

    for (const serviceId of serviceIds) {
      const result = await checkAndTransitionService(serviceId);
      results.push(result);
    }

    return results;
  };

  return {
    checkAndTransitionService,
    onDocumentStatusUpdate,
    checkMultipleServices,
    loading,
    error,
    clearError: () => setError(null),
  };
}
