import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { setServiceStatus } from '../lib/setServiceStatus';
import { supabase } from '../lib/supabase';
import { trackEvent } from '../lib/amplitude';

export default function ServiceDocumentsPage(): JSX.Element {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryDocs, setCategoryDocs] = useState<any[]>([]);
  const navigate = useNavigate();
  const { serviceId: serviceIdParam } = useParams();
  const serviceId = serviceIdParam ? Number(serviceIdParam) : undefined;
  const [service, setService] = useState<any>(null);
  const [categories, setCategories] = useState<
    { name: string; count: number; aportados: number; porEntregar: number }[]
  >([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [radioSelection, setRadioSelection] = useState<'si' | 'no' | null>(null);
  const [hasSelectedRadio, setHasSelectedRadio] = useState<boolean>(false);
  const [isCreatingService, setIsCreatingService] = useState<boolean>(false);

  // Función para verificar si ya existe un servicio con service_type.id = 5
  const checkExistingRelatedService = async () => {
    if (!service?.construction) return false;
    
    try {
      // Obtener construction_id correctamente
      let constructionId;
      if (Array.isArray(service.construction)) {
        constructionId = service.construction[0]?.id;
      } else {
        constructionId = (service.construction as any).id;
      }
      
      if (!constructionId) return false;
      
      const { data: existingServices, error } = await supabase
        .from('services')
        .select('id, type_id')
        .eq('construction_id', constructionId)
        .eq('type_id', 5);
        
      if (error) throw error;
      return existingServices && existingServices.length > 0;
    } catch (error) {
      console.error('Error verificando servicios existentes:', error);
      return false;
    }
  };

  // Función para crear un nuevo servicio con service_type_id = 5
  const createNewService = async () => {
    try {
      if (!service?.construction) {
        throw new Error('No se pudo obtener el ID de la construcción');
      }

      // Obtener construction_id correctamente
      let constructionId;
      if (Array.isArray(service.construction)) {
        constructionId = service.construction[0]?.id;
      } else {
        constructionId = (service.construction as any).id;
      }
      
      if (!constructionId) {
        throw new Error('No se pudo obtener el ID de la construcción');
      }

      // Verificar primero si ya existe un servicio con type_id = 5
      const hasExistingService = await checkExistingRelatedService();
      if (hasExistingService) {
        throw new Error('Ya existe un servicio relacionado para esta obra');
      }

      setIsCreatingService(true);

      const { data: newService, error: createError } = await supabase
        .from('services')
        .insert({
          construction_id: constructionId,
          type_id: 5, // service_type.id = 5
          status_id: 1, // Estado inicial
          comment: `Servicio creado automáticamente desde ${service.service_type?.name}`
        })
        .select()
        .single();

      if (createError) throw createError;

      
      // Mostrar notificación de éxito si tienes un sistema de notificaciones
      // showNotification({ type: 'success', title: 'Servicio creado exitosamente' });
      
      return newService;
    } catch (error) {
      console.error('Error al crear nuevo servicio:', error);
      throw error;
    } finally {
      setIsCreatingService(false);
    }
  };

  // Función para verificar si todas las categorías están completas y transicionar al estado 19
  const checkAllCategoriesCompleteAndUpdateStatus = async () => {
    if (!service || categories.length === 0) {
      console.log('⏸️ No se puede verificar - service:', !!service, 'categories:', categories.length);
      return;
    }

    // Verificar si todas las categorías están completas
    const allCategoriesComplete = categories.every(cat => cat.porEntregar === 0);
    
    console.log('🔍 Verificando completitud de categorías para transición a estado 19:', {
      totalCategories: categories.length,
      allComplete: allCategoriesComplete,
      currentStatusId: service.status_id,
      serviceId: serviceId,
      categories: categories.map(cat => ({
        name: cat.name,
        count: cat.count,
        aportados: cat.aportados,
        porEntregar: cat.porEntregar,
        complete: cat.porEntregar === 0
      }))
    });

    // Verificar condiciones específicas
    if (!allCategoriesComplete) {
      console.log('❌ No todas las categorías están completas');
      const pendingCategories = categories.filter(cat => cat.porEntregar > 0);
      console.log('📋 Categorías pendientes:', pendingCategories);
      return;
    }

    if (service.status_id === 19) {
      console.log('✅ El servicio ya está en estado 19, no necesita transición');
      return;
    }

    try {
      console.log('🚀 Iniciando transición automática a estado 19...');
      
      // Actualizar el estado del servicio al ID 19
      const { error: updateError } = await supabase
        .from('services')
        .update({ 
          status_id: 19,
          updated_at: new Date().toISOString()
        })
        .eq('id', serviceId);

      if (updateError) {
        console.error('❌ Error actualizando estado a 19:', updateError);
        return;
      }

      console.log('✅ Servicio transicionado automáticamente al estado 19');
      
      // Refrescar datos para mostrar el nuevo estado
      await fetchData();
      
    } catch (error) {
      console.error('❌ Error en transición automática al estado 19:', error);
    }
  };

  // Manejar selección del radio button
  const handleRadioSelection = async (selection: 'si' | 'no') => {
    if (hasSelectedRadio || isCreatingService) return; // No permitir cambios una vez seleccionado o mientras se crea
    
    setRadioSelection(selection);
    setHasSelectedRadio(true);
    
    if (selection === 'si') {
      try {
        await createNewService();
        // Si llegamos aquí, el servicio se creó exitosamente y la selección debe quedar bloqueada
      } catch (error) {
        // Solo en caso de error real, permitir selección nuevamente
        setHasSelectedRadio(false);
        setRadioSelection(null);
        console.error('Error al crear el servicio:', error);
        // Aquí podrías mostrar una notificación de error al usuario
      }
    }
    // Si selecciona "no", la selección queda bloqueada inmediatamente
  };

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      // 1. Obtener datos del servicio
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select(
          'id, status_id, type_id, service_type(id, name), construction(id, name, distributor_id)'
        )
        .eq('id', serviceId)
        .single();
      if (serviceError) throw serviceError;
      setService(serviceData);
      
      // 2. Si es un servicio tipo 3, verificar si ya existe un servicio relacionado tipo 5
      if (serviceData?.type_id === 3) {
        // Obtener construction_id correctamente
        let constructionId;
        if (serviceData.construction) {
          if (Array.isArray(serviceData.construction)) {
            constructionId = serviceData.construction[0]?.id;
          } else {
            constructionId = (serviceData.construction as any).id;
          }
        }
        
        if (constructionId) {
          // Verificar si ya existe un servicio tipo 5 para esta construcción
          const { data: existingServices, error: existingError } = await supabase
            .from('services')
            .select('id, type_id')
            .eq('construction_id', constructionId)
            .eq('type_id', 5);
            
          if (!existingError && existingServices && existingServices.length > 0) {
            // Si ya existe, marcar como seleccionado "sí" y bloquear
            setRadioSelection('si');
            setHasSelectedRadio(true);
          }
        }
      }

      // 3. Obtener documentos requeridos por categoría con filtro de distribuidora
      const { data: allRequiredDocs, error: reqError } = await supabase
        .from('service_required_document')
        .select('id, document_type_id, documentation_type(id, category, distributor_id)')
        .eq('service_type_id', serviceData.type_id);
      if (reqError) throw reqError;

      // Filtrar documentos requeridos aplicando la lógica de distribuidora
      const requiredDocs = (allRequiredDocs || []).filter((doc: any) => {
        const docType = Array.isArray(doc.documentation_type) ? doc.documentation_type[0] : doc.documentation_type;
        // Incluir documentos sin distribuidor (generales) o documentos específicos del distribuidor de la obra
        const isGeneralDocument = !docType?.distributor_id;
        let constructionData: any;
        if (Array.isArray(serviceData.construction)) {
          constructionData = serviceData.construction[0];
        } else {
          constructionData = serviceData.construction;
        }
        const isDistributorSpecificDocument = docType?.distributor_id === constructionData?.distributor_id;
        return isGeneralDocument || isDistributorSpecificDocument;
      });
      
      console.log('📄 Documentos requeridos filtrados:', requiredDocs.length, 'documentos');

      // 3. Obtener TODOS los documentos existentes para la obra (por todos los servicios de la obra)
      let constructionId = undefined;
      if (serviceData.construction) {
        if (Array.isArray(serviceData.construction)) {
          constructionId = (serviceData.construction[0] as any)?.id;
        } else {
          constructionId = (serviceData.construction as any).id;
        }
      }
      let allDocs: any[] = [];
      if (constructionId) {
        // Obtener todos los servicios de la obra
        const { data: allServices, error: allServicesError } = await supabase
          .from('services')
          .select('id')
          .eq('construction_id', constructionId);
        if (allServicesError) throw allServicesError;
        const serviceIds = (allServices || []).map((s: any) => s.id);
        // Obtener todos los documentos de esos servicios (sin name)
        const { data: docsData, error: allDocsError } = await supabase
          .from('documents')
          .select(
            'id, document_type_id, document_status_id, documentation_type(category), service_id'
          )
          .in('service_id', serviceIds.length ? serviceIds : [-1]);
        if (allDocsError) throw allDocsError;
        allDocs = docsData || [];
        console.log('📋 Documentos obtenidos para la obra:', allDocs);
        console.log('🔍 Documentos con status 3 (aportados):', allDocs.filter(doc => doc.document_status_id === 3));
      }

      // 4. Agrupar por categoría y calcular aportados/porEntregar considerando toda la obra
      const cats: Record<
        string,
        { name: string; count: number; aportados: number; porEntregar: number }
      > = {};
      // Agrupar requeridos por categoría
      (requiredDocs || []).forEach((doc: any) => {
        const docType = Array.isArray(doc.documentation_type) ? doc.documentation_type[0] : doc.documentation_type;
        const cat = docType?.category || 'Sin categoría';
        if (!cats[cat])
          cats[cat] = { name: cat, count: 0, aportados: 0, porEntregar: 0 };
        cats[cat].count++;
      });
      // Contar como aportado si existe un documento aprobado con ese document_type_id para la obra
      (requiredDocs || []).forEach((reqDoc: any) => {
        const docType = Array.isArray(reqDoc.documentation_type) ? reqDoc.documentation_type[0] : reqDoc.documentation_type;
        const cat = docType?.category || 'Sin categoría';
        const aportado = (allDocs || []).some(
          (doc: any) =>
            doc.document_type_id === reqDoc.document_type_id &&
            doc.document_status_id === 3
        );
        console.log(`🔍 Verificando documento tipo ${reqDoc.document_type_id} (${docType?.name || 'sin nombre'}):`, {
          category: cat,
          aportado,
          matchingDocs: allDocs.filter(doc => doc.document_type_id === reqDoc.document_type_id)
        });
        if (cats[cat] && aportado) cats[cat].aportados++;
      });
      Object.values(cats).forEach((cat: any) => {
        cat.porEntregar = cat.count - cat.aportados;
      });
      setCategories(Object.values(cats));
      // Solo mostrar los documentos subidos para la obra actual
      setCategoryDocs(allDocs || []);
    } catch (err: any) {
      setError(err.message || 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (serviceId) {
      fetchData().then(() => {
        // Verificar completitud después de cargar los datos
        setTimeout(() => {
          checkAllCategoriesCompleteAndUpdateStatus();
        }, 500); // Delay para asegurar que categories esté actualizado
      });
    }
    
    // Suscripción a cambios en tiempo real en la tabla documents
    const subscription = supabase
      .channel('documents_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'documents',
        }, 
        (payload) => {
          console.log('📡 Cambio detectado en documents:', payload);
          // Refrescar los datos cuando haya cambios
          if (serviceId) {
            fetchData().then(() => {
              // Verificar completitud después de cada cambio
              setTimeout(() => {
                checkAllCategoriesCompleteAndUpdateStatus();
              }, 500);
            });
          }
        }
      )
      .subscribe();

    // Limpiar la suscripción al desmontar
    return () => {
      subscription.unsubscribe();
    };
  }, [serviceId]); // Quitar categories de las dependencias

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="bg-[#fcfcfc] min-h-screen relative overflow-hidden">
      {/* Gradiente de fondo - Dimensiones y blur exactos de Figma */}
      <div className="absolute top-[-104px] right-[160px] w-[1177px] h-[387px] pointer-events-none z-0 overflow-visible">
        <div
          className="absolute top-1/2 left-1/2 w-[491px] h-[1177px]"
          style={{
            background: 'radial-gradient(ellipse, rgba(147, 197, 253, 0.6) 0%, rgba(196, 181, 253, 0.4) 50%, transparent 100%)',
            filter: 'blur(140px)',
            transform: 'translate(-50%, -50%) rotate(90deg)',
            borderRadius: '50%'
          }}
        ></div>
      </div>

      {/* Header con Breadcrumbs */}
      <div className="flex items-center justify-between pl-[132px] pr-[164px] py-4 relative z-10">
        <div className="flex gap-6 items-center px-8 py-6">
          {/* Botón Volver */}
          <button
            onClick={() => {
                navigate('/constructions')
                trackEvent('Breadcrumb Pressed', {
                  page_title: 'Documentos del servicio',
                  new_construction_id: service.construction?.name || '',
                  service_type: service.service_type?.name || '',
                })
              }
            }
            className="bg-zen-grey-200 flex gap-2 items-center justify-center px-2 py-1 rounded-[1000px] hover:bg-zen-grey-300 transition-colors"
          >
            <svg className="w-4 h-4 shrink-0 text-zen-grey-500 rotate-90" viewBox="0 0 16 16" fill="currentColor">
                  <use href="/icons.svg#caret-down" />
            </svg>
            <span className="font-figtree font-semibold text-xs text-[#0f1422] whitespace-pre">
              Volver
            </span>
          </button>

          {/* Breadcrumbs */}
          <div className="flex gap-1 items-center">
            <span className="font-figtree font-semibold text-sm text-[#0f1422] whitespace-pre">
              Obra nueva
            </span>
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
              <path d="M7.5 15L12.5 10L7.5 5" stroke="#666e85" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="font-figtree font-semibold text-sm text-zen-grey-600 whitespace-pre">
              Documentación {service.service_type?.name}
            </span>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="pl-[164px] pr-[164px] pt-0 pb-10 relative z-10">
        <div className="flex flex-col gap-10 w-full">
          <div className="flex flex-col gap-4 w-full max-w-[1112px]">
            {/* Título Principal */}
            <div className="flex flex-col gap-2 w-full max-w-[735px] ">
                <div className="flex gap-2 items-center">
                  <div className="bg-zen-grey-200 flex items-center p-2 rounded w-[fit-content]">
                  <img src="/construction-icon.svg" alt="" className="w-4 h-4" />
                </div>
                <h3 className="font-figtree text-[21px] leading-[1.5] text-[#000a29]">
                  Nombre de la obra: {service.construction?.name}
                </h3>
              </div>
              <h3 className="font-figtree text-[18px] leading-[1.5] text-[#000a29] mt-5">
                Documentación <span className="font-semibold">{service.service_type?.name}</span> 
              </h3>
              <p className="font-figtree font-normal text-base leading-[1.47] text-[#0a110f]">
                Sube la documentación necesaria para gestionar este suministro.
              </p>
            </div>

            {/* Radio Button para service_type.id = 3 */}
            {(() => {
              return service?.type_id === 3;
            })() && (
              <div className="flex flex-col gap-4 w-full max-w-[735px] bg-white border border-zen-grey-300 rounded-lg p-6">
                <div className="flex flex-col gap-2">
                  <h4 className="font-figtree font-semibold text-base leading-[1.47] text-zen-grey-950">
                    ¿Necesitas acometida PCI en tu obra?
                  </h4>
                  <p className="font-figtree font-normal text-sm leading-[1.25] text-zen-grey-700">
                    Indica si tu obra requiere una acometida de agua exclusiva para el sistema contra incendios.
                  </p>
                </div>
                
                <div className="flex gap-4">
                  {/* Opción Sí */}
                  <label 
                    className={`flex items-center gap-3 p-4 border rounded-lg transition-all ${
                      radioSelection === 'si' 
                        ? 'border-zen-blue-500 bg-zen-blue-15' 
                        : hasSelectedRadio || isCreatingService
                          ? 'border-zen-grey-300 bg-zen-grey-100 cursor-not-allowed opacity-50'
                          : 'border-zen-grey-300 bg-white hover:border-zen-blue-300 cursor-pointer'
                    }`}
                  >
                    <input
                      type="radio"
                      name="serviceOption"
                      value="si"
                      checked={radioSelection === 'si'}
                      onChange={() => handleRadioSelection('si')}
                      disabled={hasSelectedRadio || isCreatingService}
                      className="w-4 h-4 text-zen-blue-500 focus:ring-zen-blue-500"
                    />
                    <span className={`font-figtree font-medium text-sm ${
                      radioSelection === 'si' ? 'text-zen-grey-950' : 'text-zen-grey-700'
                    }`}>
                      Sí
                    </span>
                    {isCreatingService && radioSelection === 'si' && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-zen-blue-500"></div>
                    )}
                  </label>

                  {/* Opción No */}
                  <label 
                    className={`flex items-center gap-3 p-4 border rounded-lg transition-all ${
                      radioSelection === 'no' 
                        ? 'border-zen-blue-500 bg-zen-blue-15' 
                        : hasSelectedRadio || isCreatingService
                          ? 'border-zen-grey-300 bg-zen-grey-100 cursor-not-allowed opacity-50'
                          : 'border-zen-grey-300 bg-white hover:border-zen-blue-300 cursor-pointer'
                    }`}
                  >
                    <input
                      type="radio"
                      name="serviceOption"
                      value="no"
                      checked={radioSelection === 'no'}
                      onChange={() => handleRadioSelection('no')}
                      disabled={hasSelectedRadio || isCreatingService}
                      className="w-4 h-4 text-zen-blue-500 focus:ring-zen-blue-500"
                    />
                    <span className={`font-figtree font-medium text-sm ${
                      radioSelection === 'no' ? 'text-zen-grey-950' : 'text-zen-grey-700'
                    }`}>
                      No
                    </span>
                  </label>
                </div>

                {/* Mensaje de confirmación */}
                {hasSelectedRadio && (
                  <div className={`flex items-center gap-2 p-3 rounded-lg ${
                    radioSelection === 'si' 
                      ? 'bg-zen-green-100 border border-zen-green-300' 
                      : 'bg-zen-grey-100 border border-zen-grey-300'
                  }`}>
                    <img 
                      src={radioSelection === 'si' ? "/check-circle-icon.svg" : "/info-icon.svg"} 
                      alt="" 
                      className="w-4 h-4" 
                    />
                    <span className="font-figtree font-normal text-sm text-zen-grey-700">
                      {radioSelection === 'si' 
                        ? 'Acometida de Agua PCI añadida a tu obra'
                        : ''
                      }
                    </span>
                  </div>
                )}

                {/* Mensaje durante la creación del servicio */}
                {isCreatingService && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-zen-blue-50 border border-zen-blue-300">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-zen-blue-500"></div>
                    <span className="font-figtree font-normal text-sm text-zen-grey-700">
                      Creando servicio adicional...
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Tarjetas de Categorías */}
            <div className="flex flex-col gap-4 w-full max-w-[735px]">
              {categories.map((cat) => (
                <div
                  key={cat.name}
                  className="bg-white border border-[#d0d3dd] rounded-lg p-6 flex items-center justify-between cursor-pointer transition-colors hover:bg-zen-grey-50 hover:border-zen-grey-300 hover:border-zen-grey-400"
                  onClick={() => {
                    if (serviceId) {
                      navigate(
                        `/servicios/${serviceId}/documentos/categoria/${encodeURIComponent(
                          cat.name
                        )}`
                      );
                      trackEvent('Document Upload Card Pressed', {
                        page_title: 'Documentos del servicio',
                        documentType: cat.name,
                        service_type: service.service_type?.name || '',
                        document_number: cat.count,
                        new_construction_id: service.construction?.name || ''
                      })
                    }
                    

                  }}
                >
                  {/* Contenido de la tarjeta */}
                  <div className="flex flex-col gap-6 w-[578px]">
                    {/* Icono y Badge "Entregado" */}
                    <div className="flex gap-6 items-start justify-between w-full">
                      <div className="bg-zen-grey-200 flex gap-2 items-center p-2 rounded">
                        <img src="/file-text-icon.svg" alt="" className="w-4 h-4" />
                      </div>

                      {/* Badge "Entregado" */}
                      {cat.porEntregar === 0 && (
                        <div className="bg-zen-green-100 border border-zen-green-500 flex gap-2 items-center justify-center px-2 py-1 rounded">
                          <img src="/check-completado-icon.svg" alt="" className="w-4 h-4" />
                          <span className="font-figtree font-normal text-sm text-zen-green-950 whitespace-pre">
                            Entregado
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Título y Stats */}
                    <div className="flex items-start justify-between w-full">
                      {/* Título */}
                      <div className="flex flex-col gap-1">
                        <p className="font-figtree font-medium text-base leading-[1.47] text-[#0f1422]">
                          {cat.name}
                        </p>
                        <p className="font-figtree font-normal text-sm leading-[1.25] text-zen-grey-700">
                          {cat.porEntregar === 0
                            ? 'Ya has subido toda la documentación de este apartado.'
                            : 'Sube la documentación necesaria para este apartado.'}
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="flex flex-col items-start justify-center gap-[2px]">
                        {/* Documentos aportados */}
                        <div className="flex gap-1 items-center pl-2 pr-0 py-1 h-6 rounded">
                          <img src="/procedures-icon.svg" alt="" className="w-3 h-3" />
                          <span className="font-figtree font-normal text-xs leading-[1.35] text-[#0f1422] whitespace-pre">
                            {cat.aportados} documentos aportados
                          </span>
                        </div>

                        {/* Por entregar */}
                        <div className="flex gap-1 items-center px-2 py-0">
                          <img src="/upload-simple-icon.svg" alt="" className="w-3 h-3" />
                          <span className="font-figtree font-normal text-xs leading-[1.35] text-zen-grey-700 whitespace-pre">
                            {cat.porEntregar} por entregar
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Icono flecha derecha */}
                  <img src="/caret-right-icon.svg" alt="" className="w-8 h-8" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
