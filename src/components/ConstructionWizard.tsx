import { useState, useEffect } from 'react';
import {
  ChevronRight,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useConstructionData } from '../hooks/useConstructionData';
import { useServiceCreation } from '../hooks/useServiceCreation';
import { useNotification } from '../contexts/NotificationContext';
import { trackEvent } from '../lib/amplitude';

interface ConstructionWizardProps {
  onClose: () => void;
  onSuccess: (constructionId: number) => void;
}

interface Step1Data {
  name: string;
  housing_count: string;
  street: string;
  number: string;
  province: string;
  municipality: string;
  postal_code: string;
}

interface Step2Data {
  society_name: string;
  society_cif: string;
  fiscal_street: string;
  fiscal_number: string;
  fiscal_block: string;
  fiscal_staircase: string;
  fiscal_floor: string;
  fiscal_letter: string;
  fiscal_province: string;
  fiscal_municipality: string;
  fiscal_postal_code: string;
  responsible_first_name: string;
  responsible_last_name: string;
  responsible_phone: string;
  responsible_email: string;
}

interface Step3Data {
  selectedServices: {
    [key: string]: {
      selected: boolean;
      name: string;
    };
  };
}

/**
 * Wizard para crear una nueva obra de construcción y sus servicios asociados.
 * Incluye validaciones, pasos y manejo de estado local.
 */
export default function ConstructionWizard({
  onClose,
  onSuccess,
}: ConstructionWizardProps) {
  // Función para crear Deal en HubSpot directamente (sin dependencias problemáticas)
  const createHubSpotDeal = async (constructionData: {
    name: string;
    address: string;
    postal_code: string;
    municipality: string;
    responsible_name: string;
    responsible_lastname: string;
    responsible_phone: string;
    responsible_email: string;
    company_name?: string;
    company_cif?: string;
    fiscal_address?: string;
    housing_count?: number;
    acometida?: string;
    servicios_obra?: string[];
  }) => {
    try {
      console.log('🚀 Función HubSpot local - iniciando...');
      
      // Detectar si estamos en desarrollo o producción
      const isDev = import.meta.env.DEV;
      console.log('🌍 Entorno:', isDev ? 'DEV' : 'PROD');
      
      if (isDev) {
        // Desarrollo: llamada directa a HubSpot API
        const token = import.meta.env.VITE_HUBSPOT_ACCESS_TOKEN;
        const ownerId = import.meta.env.VITE_HUBSPOT_OWNER_ID || '123456789';
        
        if (!token) {
          throw new Error('Token de HubSpot no configurado en desarrollo');
        }
        
        const dealProperties = {
          properties: {
            dealname: constructionData.name,
            dealstage: '205747816',
            hubspot_owner_id: ownerId,
            enviar_presupuesto: true,
            direccion_obra: constructionData.address || '',
            codigo_postal_obra: constructionData.postal_code || '',
            municipio_obra: constructionData.municipality || '',
            razon_social_peticionario: constructionData.company_name || '',
            cif_peticionario: constructionData.company_cif || '',
            domicilio_fiscal_peticionario: constructionData.fiscal_address || '',
            numero_viviendas: constructionData.housing_count || 0,
            acometida: constructionData.acometida || '',
            servicios_obra: constructionData.servicios_obra ? constructionData.servicios_obra.join(';') : '',
          }
        };
        
        const response = await fetch('/api/hubspot/crm/v3/objects/deals', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dealProperties),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HubSpot API Error: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('✅ Deal creado (DEV):', result.id);
        return { id: result.id };
        
      } else {
        // Producción: llamada a función Netlify
        const response = await fetch('/.netlify/functions/hubspot-deals', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ constructionData }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Netlify Function Error: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('✅ Deal creado (PROD):', result.dealId);
        return { dealId: result.dealId };
      }
      
    } catch (error) {
      console.error('❌ Error en createHubSpotDeal:', error);
      throw error;
    }
  };

  // Estado para el modal de cancelación
  const [showCancelModal, setShowCancelModal] = useState(false);
  // Estado del paso actual y carga
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const { statuses, companies } = useConstructionData();
  const { createMultipleServices } = useServiceCreation();
  const { showNotification } = useNotification();

  // Estado para datos del paso 1 (obra)
  const [step1Data, setStep1Data] = useState<Step1Data>({
    name: '',
    housing_count: '',
    street: '',
    number: '',
    province: '',
    municipality: '',
    postal_code: '',
  });

  // Estado para datos del paso 2 (sociedad y responsable)
  const [step2Data, setStep2Data] = useState<Step2Data>({
    society_name: '',
    society_cif: '',
    fiscal_street: '',
    fiscal_number: '',
    fiscal_block: '',
    fiscal_staircase: '',
    fiscal_floor: '',
    fiscal_letter: '',
    fiscal_province: '',
    fiscal_municipality: '',
    fiscal_postal_code: '',
    responsible_first_name: '',
    responsible_last_name: '',
    responsible_phone: '',
    responsible_email: '',
  });

  // Estado para datos del paso 3 (servicios)
  const [step3Data, setStep3Data] = useState<Step3Data>({
    selectedServices: {},
  });

  // Estados para los tipos de servicio
  const [serviceTypes, setServiceTypes] = useState<Array<{id: number, name: string, servicio: string, acometida: string}>>([]);
  const [loadingServiceTypes, setLoadingServiceTypes] = useState(true);

  // Cargar tipos de servicio al montar el componente
  useEffect(() => {
    const fetchServiceTypes = async () => {
      try {
        console.log('🔍 Cargando tipos de servicio...');
        
        // Obtener name (para mostrar), Servicio y Acometida (para HubSpot)
        const { data, error } = await supabase
          .from('service_type')
          .select('id, name, Servicio, Acometida')
          .order('name');

        console.log('📥 Resultado consulta:', { data, error });

        if (error) throw error;
        
        // Normalizar los datos: usar 'name' para mostrar, mantener Servicio y Acometida para HubSpot
        const normalizedData = data?.map(item => ({
          id: item.id,
          name: item.name || 'Servicio sin nombre', // Para mostrar en cards
          servicio: item.Servicio || '', // Para servicios_obra en HubSpot
          acometida: item.Acometida || '' // Para acometida en HubSpot
        })) || [];

        console.log('✅ Datos normalizados:', normalizedData);
        setServiceTypes(normalizedData);

        // Initialize selectedServices state with the fetched services
        const initialServices = normalizedData.reduce((acc, service) => {
          acc[service.id] = {
            selected: false,
            name: service.name // Usar name para mostrar
          };
          return acc;
        }, {} as Step3Data['selectedServices']);

        console.log('📝 InitialServices generados:', initialServices);

        setStep3Data(prev => ({
          ...prev,
          selectedServices: initialServices
        }));
        
        console.log('✅ Carga completada exitosamente');
      } catch (err) {
        console.error('❌ Error al cargar tipos de servicio:', err);
      } finally {
        setLoadingServiceTypes(false);
      }
    };

    fetchServiceTypes();
  }, []);

  // Service labels are now dynamic from the database

  /**
   * Actualiza el estado del paso 1.
   */
  const handleStep1Change = (field: keyof Step1Data, value: string) => {
    setStep1Data((prev: Step1Data) => ({ ...prev, [field]: value }));
    // Si el paso 1 fue completado y ahora se modifica, invalidar pasos posteriores
    if (completedSteps.has(1)) {
      setCompletedSteps(new Set([1]));
    }
  };

  /**
   * Actualiza el estado del paso 2.
   */
  const handleStep2Change = (field: keyof Step2Data, value: string) => {
    setStep2Data((prev: Step2Data) => ({ ...prev, [field]: value }));
    // Si el paso 2 fue completado y ahora se modifica, invalidar pasos posteriores
    if (completedSteps.has(2)) {
      setCompletedSteps(prev => {
        const newSet = new Set(prev);
        newSet.delete(3);
        return newSet;
      });
    }
  };

  /**
   * Actualiza el estado de selección y tipo de servicio en el paso 3.
   */
  const handleServiceChange = (
    serviceId: string,
    field: 'selected',
    value: boolean
  ) => {
    setStep3Data((prev: Step3Data) => ({
      ...prev,
      selectedServices: {
        ...prev.selectedServices,
        [serviceId]: {
          ...prev.selectedServices[serviceId],
          [field]: value,
        },
      },
    }));
  };

  /**
   * Valida los campos obligatorios del paso 1.
   */
  const validateStep1 = (): boolean => {
    return Boolean(
      step1Data.name &&
        step1Data.housing_count &&
        step1Data.street &&
        step1Data.province &&
        step1Data.municipality &&
        step1Data.postal_code
    );
  };

  /**
   * Valida los campos obligatorios del paso 2.
   */
  const validateStep2 = (): boolean => {
    return Boolean(
      step2Data.society_name &&
        step2Data.society_cif &&
        step2Data.fiscal_street &&
        step2Data.fiscal_province &&
        step2Data.fiscal_municipality &&
        step2Data.fiscal_postal_code &&
        step2Data.responsible_first_name &&
        step2Data.responsible_last_name
    );
  };

  /**
   * Valida que haya al menos un servicio seleccionado y con tipo.
   */
  const validateStep3 = (): boolean => {
    const selectedServices = Object.entries(step3Data.selectedServices).filter(
      ([_k, service]) => service.selected
    );
    return selectedServices.length > 0;
  };

  const handleNext = () => {
    if (currentStep < 3 && canProceed()) {
      setCompletedSteps(prev => new Set(prev).add(currentStep));
      setCurrentStep(currentStep + 1);
    }

    trackEvent('Next Form Button Pressed', {page_tittle: 'Modal Crear Nueva Obra', flow_creation_step: currentStep});
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (step: number) => {
    // Solo permitir navegar a pasos anteriores o al paso actual
    if (step <= currentStep) {
      setCurrentStep(step);
    }
    // Permitir navegar a pasos futuros solo si han sido completados y el paso actual es válido
    else if (completedSteps.has(step - 1) && canProceed()) {
      setCurrentStep(step);
    }

    trackEvent('Back Form Button Pressed', {page_tittle: 'Modal Crear Nueva Obra', flow_creation_step: currentStep});
  };

  
    const getIconByServiceName = (serviceName: string): string => {
      const icons: Record<string, string> = {
        'Luz - Obra': '/icons.svg#luz-obra',
        'Luz - Definitiva': '/icons.svg#luz-definitiva',
        'Agua - Obra': '/icons.svg#agua-obra',
        'Agua - Definitiva': '/icons.svg#agua-definitiva',
      };
      return icons[serviceName] || '/icons.svg#building'; 
    };

              
  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Obtener información del usuario autenticado
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Usuario no autenticado');
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
      
      // Si aún no tenemos company_id, lanzar error
      if (!userCompanyId) {
        throw new Error('No se pudo determinar la compañía del usuario');
      }

      
      // Construir dirección completa
      const addressParts = [
        step1Data.street,
        step1Data.number,
        step1Data.municipality,
        step1Data.province,
        step1Data.postal_code,
      ].filter(Boolean);
      const fullAddress = addressParts.join(', ');

      // Construir dirección fiscal
      const fiscalAddressParts = [
        step2Data.fiscal_street,
        step2Data.fiscal_number,
        step2Data.fiscal_block ? `Bloque ${step2Data.fiscal_block}` : '',
        step2Data.fiscal_staircase ? `Escalera ${step2Data.fiscal_staircase}` : '',
        step2Data.fiscal_floor ? `Piso ${step2Data.fiscal_floor}` : '',
        step2Data.fiscal_letter ? `Puerta ${step2Data.fiscal_letter}` : '',
        step2Data.fiscal_municipality,
        step2Data.fiscal_province,
        step2Data.fiscal_postal_code,
      ].filter(Boolean);
      const fullFiscalAddress = fiscalAddressParts.join(', ');

      // Construir nombre completo del responsable
      const responsibleName =
        `${step2Data.responsible_first_name} ${step2Data.responsible_last_name}`.trim();

      // 1. Crear obra EN BASE DE DATOS con hubspot_deal_id
      const defaultStatus =
        statuses.find((s) => s.name.toLowerCase().includes('planificado')) ||
        statuses[0];

      console.log('💾 Insertando en BD con Deal ID:', hubspotDealId);
      
      const { data: construction, error: constructionError } = await supabase
        .from('construction')
        .insert({
          name: step1Data.name,
          construction_status_id: defaultStatus?.id || 1,
          company_id: userCompanyId,
          address: fullAddress,
          responsible: responsibleName,
          number_homes: parseInt(step1Data.housing_count) || null,
          distributor_id: 1, // Distribuidor por defecto
          hubspot_deal_id: hubspotDealId, // ✅ INCLUIR EL DEAL ID
        })
        .select()
        .single();

      if (constructionError) {
        console.error('❌ Error al insertar en BD:', constructionError);
        throw constructionError;
      }

      console.log('✅ Construcción creada con Deal ID:', construction?.hubspot_deal_id);

      // Calcular valor de acometida basado en servicios seleccionados
      const selectedServiceIds = Object.entries(step3Data.selectedServices)
        .filter(([_, service]) => service.selected)
        .map(([serviceId]) => Number(serviceId));

      const selectedServiceData = serviceTypes.filter(st => 
        selectedServiceIds.includes(st.id)
      );

      const acometidaTypes = [...new Set(selectedServiceData.map(s => s.acometida))];
      
      let acometidaValue = '';
      if (acometidaTypes.length === 1) {
        // Solo un tipo de acometida
        acometidaValue = acometidaTypes[0] === 'Obra' ? 'Obra' : 'Definitivo';
      } else if (acometidaTypes.length === 2) {
        // Ambos tipos
        acometidaValue = 'Obra + Definitivo';
      }

      // Calcular servicios_obra: valores únicos de la columna Servicio
      const serviciosObra = [...new Set(selectedServiceData.map(s => s.servicio))].filter(Boolean);
      
      console.log('📋 Servicios para HubSpot:', { acometidaValue, serviciosObra });

      // **INTEGRACIÓN HUBSPOT: Crear Deal ANTES de insertar en BD**
      let hubspotDealId = null;
      try {
        console.log('🚀 CONSTRUCTIONWIZARD V1.3 - Creando Deal directamente...');
        
        // Crear el Deal directamente sin importaciones problemáticas
        const hubspotResponse = await createHubSpotDeal({
          name: step1Data.name,
          address: fullAddress,
          postal_code: step1Data.postal_code,
          municipality: step1Data.municipality,
          responsible_name: step2Data.responsible_first_name,
          responsible_lastname: step2Data.responsible_last_name,
          responsible_phone: step2Data.responsible_phone,
          responsible_email: step2Data.responsible_email,
          company_name: step2Data.society_name,
          company_cif: step2Data.society_cif,
          fiscal_address: fullFiscalAddress,
          housing_count: parseInt(step1Data.housing_count) || 0,
          acometida: acometidaValue,
          servicios_obra: serviciosObra,
        });

        // Extraer ID del Deal
        if (hubspotResponse) {
          hubspotDealId = hubspotResponse.id || hubspotResponse.dealId || null;
          if (hubspotDealId) {
            hubspotDealId = String(hubspotDealId);
            console.log('✅ Deal creado en HubSpot - ID:', hubspotDealId);
          } else {
            console.warn('⚠️ Respuesta de HubSpot no contiene ID válido:', hubspotResponse);
          }
        } else {
          console.warn('⚠️ Respuesta de HubSpot vacía');
        }
      } catch (hubspotError) {
        // No fallar la creación local si HubSpot falla
        console.error('❌ Error al sincronizar con HubSpot:', hubspotError);
        
        // Mostrar notificación de advertencia
        showNotification({
          type: 'warning',
          title: 'Advertencia',
          body: 'La obra se creará, pero hubo un problema al sincronizar con HubSpot.'
        });
      }

      // 2. Crear servicios seleccionados usando el hook
      const servicesToCreate = Object.entries(step3Data.selectedServices)
        .filter(([_, service]) => service.selected)
        .map(([serviceId, service]) => {
          return {
            typeIds: [Number(serviceId)],
            comment: `Servicio de ${service.name} para ${step1Data.name}`
          };
        })
        .filter(service => service.typeIds.length > 0);

      if (servicesToCreate.length > 0) {
        const services = await createMultipleServices(
          construction.id,
          servicesToCreate
        );
      }

      onSuccess(construction.id);

      trackEvent('New Construction Created', {page_tittle: 'Modal Crear Nueva Obra', new_construction_id: construction.id, services: servicesToCreate});

      showNotification({
        type: 'success',
        title: 'Obra creada correctamente',
        body: 'Ya está disponible en la parte superior de la tabla.'
      });

    } catch (error) {
      console.error('Error creating construction:', error);
      showNotification({
        type: 'error',
        title: 'Error al crear la obra',
        body: 'Inténtalo de nuevo en unos minutos o escríbenos a atencion.cliente@zenovapro.com si el problema continúa.'
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      {/* <div className="flex items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Información de la Obra
        </h3>
      </div> */}

      <h4 className="font-semibold text-gray-900 mt-4">Nombre de la obra</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre de la Obra <span className="text-zen-blue-500">*</span>
          </label>
          <input
            type="text"
            value={step1Data.name}
            onChange={(e) => handleStep1Change('name', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-sm focus:ring-2 focus:ring-zen-blue-500 focus:border-transparent focus:outline-none"
            placeholder="Ej: Residencial Los Pinos"
          />
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 my-4">Número de viviendas</h4>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Número de Viviendas <span className="text-zen-blue-500">*</span>
          </label>
          <input
            type="number"
            value={step1Data.housing_count}
            onChange={(e) => handleStep1Change('housing_count', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-sm focus:ring-2 focus:ring-zen-blue-500 focus:border-transparent focus:outline-none"
            placeholder="Ej: 24"
            min="1"
          />
          <h4 className="font-semibold text-gray-900 mt-10">Dirección de la obra</h4>

        </div>

        <div></div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Calle <span className="text-zen-blue-500">*</span>
          </label>
          <input
            type="text"
            value={step1Data.street}
            onChange={(e) => handleStep1Change('street', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-sm focus:ring-2 focus:ring-zen-blue-500 focus:border-transparent focus:outline-none"
            placeholder="Ej: Calle Mayor"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Número
          </label>
          <input
            type="text"
            value={step1Data.number}
            onChange={(e) => handleStep1Change('number', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-sm focus:ring-2 focus:ring-zen-blue-500 focus:border-transparent focus:outline-none"
            placeholder="Ej: 123"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Provincia <span className="text-zen-blue-500">*</span>
          </label>
          <input
            type="text"
            value={step1Data.province}
            onChange={(e) => handleStep1Change('province', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-sm focus:ring-2 focus:ring-zen-blue-500 focus:border-transparent focus:outline-none"
            placeholder="Ej: Madrid"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Municipio <span className="text-zen-blue-500">*</span>
          </label>
          <input
            type="text"
            value={step1Data.municipality}
            onChange={(e) => handleStep1Change('municipality', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-sm focus:ring-2 focus:ring-zen-blue-500 focus:border-transparent focus:outline-none"
            placeholder="Ej: Madrid"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Código Postal <span className="text-zen-blue-500">*</span>
          </label>
          <input
            type="text"
            value={step1Data.postal_code}
            onChange={(e) => handleStep1Change('postal_code', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-sm focus:ring-2 focus:ring-zen-blue-500 focus:border-transparent focus:outline-none"
            placeholder="Ej: 28001"
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      {/* <div className="flex items-center mb-6">
        <Users className="w-6 h-6 text-blue-600 mr-3" />
        <h3 className="text-lg font-semibold text-gray-900">
          Información de la Sociedad y Responsable
        </h3>
      </div> */}

      {/* Información de la Sociedad */}
      <div>
        <h4 className="font-semibold text-gray-900 my-4">Datos de la sociedad</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de la sociedad <span className="text-zen-blue-500">*</span>
            </label>
            <input
              type="text"
              value={step2Data.society_name}
              onChange={(e) =>
                handleStep2Change('society_name', e.target.value)
              }
              className="w-full p-3 border border-gray-300 rounded-sm focus:ring-2 focus:ring-zen-blue-500 focus:border-transparent focus:outline-none"
              placeholder="Ej: Constructora ABC S.L."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CIF de la sociedad <span className="text-zen-blue-500">*</span>
            </label>
            <input
              type="text"
              value={step2Data.society_cif}
              onChange={(e) => handleStep2Change('society_cif', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-sm focus:ring-2 focus:ring-zen-blue-500 focus:border-transparent focus:outline-none"
              placeholder="Ej: B12345678"
            />
          </div>
        </div>

        <h4 className="font-semibold text-gray-900 mb-4 mt-10">
          Dirección fiscal
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Calle <span className="text-zen-blue-500">*</span>
            </label>
            <input
              type="text"
              value={step2Data.fiscal_street}
              onChange={(e) =>
                handleStep2Change('fiscal_street', e.target.value)
              }
              className="w-full p-3 border border-gray-300 rounded-sm focus:ring-2 focus:ring-zen-blue-500 focus:border-transparent focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Número
            </label>
            <input
              type="text"
              value={step2Data.fiscal_number}
              onChange={(e) =>
                handleStep2Change('fiscal_number', e.target.value)
              }
              className="w-full p-3 border border-gray-300 rounded-sm focus:ring-2 focus:ring-zen-blue-500 focus:border-transparent focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bloque
            </label>
            <input
              type="text"
              value={step2Data.fiscal_block}
              onChange={(e) =>
                handleStep2Change('fiscal_block', e.target.value)
              }
              className="w-full p-3 border border-gray-300 rounded-sm focus:ring-2 focus:ring-zen-blue-500 focus:border-transparent focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Escalera
            </label>
            <input
              type="text"
              value={step2Data.fiscal_staircase}
              onChange={(e) =>
                handleStep2Change('fiscal_staircase', e.target.value)
              }
              className="w-full p-3 border border-gray-300 rounded-sm focus:ring-2 focus:ring-zen-blue-500 focus:border-transparent focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Piso
            </label>
            <input
              type="text"
              value={step2Data.fiscal_floor}
              onChange={(e) =>
                handleStep2Change('fiscal_floor', e.target.value)
              }
              className="w-full p-3 border border-gray-300 rounded-sm focus:ring-2 focus:ring-zen-blue-500 focus:border-transparent focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Letra
            </label>
            <input
              type="text"
              value={step2Data.fiscal_letter}
              onChange={(e) =>
                handleStep2Change('fiscal_letter', e.target.value)
              }
              className="w-full p-3 border border-gray-300 rounded-sm focus:ring-2 focus:ring-zen-blue-500 focus:border-transparent focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Provincia <span className="text-zen-blue-500">*</span>
            </label>
            <input
              type="text"
              value={step2Data.fiscal_province}
              onChange={(e) =>
                handleStep2Change('fiscal_province', e.target.value)
              }
              className="w-full p-3 border border-gray-300 rounded-sm focus:ring-2 focus:ring-zen-blue-500 focus:border-transparent focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Municipio <span className="text-zen-blue-500">*</span>
            </label>
            <input
              type="text"
              value={step2Data.fiscal_municipality}
              onChange={(e) =>
                handleStep2Change('fiscal_municipality', e.target.value)
              }
              className="w-full p-3 border border-gray-300 rounded-sm focus:ring-2 focus:ring-zen-blue-500 focus:border-transparent focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Código Postal <span className="text-zen-blue-500">*</span>
            </label>
            <input
              type="text"
              value={step2Data.fiscal_postal_code}
              onChange={(e) =>
                handleStep2Change('fiscal_postal_code', e.target.value)
              }
              className="w-full p-3 border border-gray-300 rounded-sm focus:ring-2 focus:ring-zen-blue-500 focus:border-transparent focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Información del Responsable */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-4 mt-10">
          Datos personales del responsable
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre <span className="text-zen-blue-500">*</span>
            </label>
            <input
              type="text"
              value={step2Data.responsible_first_name}
              onChange={(e) =>
                handleStep2Change('responsible_first_name', e.target.value)
              }
              className="w-full p-3 border border-gray-300 rounded-sm focus:ring-2 focus:ring-zen-blue-500 focus:border-transparent focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Apellidos <span className="text-zen-blue-500">*</span>
            </label>
            <input
              type="text"
              value={step2Data.responsible_last_name}
              onChange={(e) =>
                handleStep2Change('responsible_last_name', e.target.value)
              }
              className="w-full p-3 border border-gray-300 rounded-sm focus:ring-2 focus:ring-zen-blue-500 focus:border-transparent focus:outline-none"
            />
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mt-10">
              Datos de contacto del responsable
            </h4>
          </div>

          <div></div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Teléfono
            </label>
            <input
              type="tel"
              value={step2Data.responsible_phone}
              onChange={(e) =>
                handleStep2Change('responsible_phone', e.target.value)
              }
              className="w-full p-3 border border-gray-300 rounded-sm focus:ring-2 focus:ring-zen-blue-500 focus:border-transparent focus:outline-none"
              placeholder="Ej: 600123456"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={step2Data.responsible_email}
              onChange={(e) =>
                handleStep2Change('responsible_email', e.target.value)
              }
              className="w-full p-3 border border-gray-300 rounded-sm focus:ring-2 focus:ring-zen-blue-500 focus:border-transparent focus:outline-none"
              placeholder="Ej: responsable@empresa.com"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="flex flex-col gap-4 w-full">
      {/* Label */}
      <div className="font-['Figtree',sans-serif] font-semibold text-[16px] leading-[1.47] text-zen-grey-950">
        Escoge los suministros<span className="text-zen-blue-500">*</span>
      </div>

      {loadingServiceTypes ? (
        <div className="text-center py-4">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando servicios disponibles...</p>
        </div>
      ) : Object.keys(step3Data.selectedServices).length === 0 ? (
        <div className="text-center py-4">
          <p className="text-gray-600">No hay servicios disponibles</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4 w-full">
          {Object.entries(step3Data.selectedServices).map(([serviceId, service]) => (
            <button
              key={serviceId}
              onClick={() => {
                handleServiceChange(serviceId, 'selected', !service.selected)
                trackEvent('Service Pressed', {page_tittle: 'Modal Crear Nueva Obra', service_type: service.name, flow_creation_step: 3});
              }}
              className={`w-[218.5px] flex flex-col gap-3 p-6 rounded-lg border transition-all ${
                service.selected
                  ? 'bg-zen-blue-15 border-2 border-zen-blue-500'
                  : 'bg-white border border-zen-grey-400 hover:border-zen-blue-300'
              }`}
            >
              {/* Icon */}
              <div className={`w-fit p-2 rounded ${
                service.selected ? 'bg-zen-blue-500' : 'bg-zen-grey-200'
              }`}>
                <svg className={`w-4 h-4 ${
                  service.selected ? 'text-white' : 'text-zen-grey-600'
                }`} viewBox="0 0 16 16" fill="currentColor">
                  <use href={getIconByServiceName(service.name)} />
                </svg>
                {/* <Building className={`w-4 h-4 ${
                  service.selected ? 'text-white' : 'text-zen-grey-600'
                }`} /> */}
              </div>

              {/* Content */}
              <div className="flex flex-col gap-1 items-start text-left">
                <p className={`font-['Figtree',sans-serif] text-[16px] leading-[1.47] ${
                  service.selected ? 'font-semibold text-zen-grey-950' : 'font-medium text-zen-grey-700'
                }`}>
                  {service.name}
                </p>
                <p className="font-['Figtree',sans-serif] font-normal text-[14px] leading-[1.25] text-zen-grey-700">
                  {getServiceDescription(service.name)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // Helper function para obtener descripciones de servicios
  const getServiceDescription = (serviceName: string): string => {
  
    const descriptions: Record<string, string> = {
      'Luz - Obra': 'Suministro temporal de electricidad para los trabajos de construcción.',
      'Luz - Definitiva': 'Conexión eléctrica final para el uso normal del inmueble.',
      'Agua - Obra': 'Suministro provisional de agua para la fase de construcción.',
      'Agua - Definitiva': 'Conexión permanente de agua lista para el uso habitual de la edificación.',
      'Telecomunicaciones': 'Servicio de telecomunicaciones (fibra, internet, telefonía)'
    };
    return descriptions[serviceName] || 'Servicio disponible para tu obra.';
  };

  // Validación de todos los pasos
  const areAllStepsValid = (): boolean => {
    return validateStep1() && validateStep2() && validateStep3();
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return validateStep1();
      case 2:
        return validateStep2();
      case 3:
        return validateStep3();
      default:
        return false;
    }
  };

  // Renderiza el modal de confirmación de cancelación
  const renderCancelModal = () => {
    if (!showCancelModal) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="relative bg-zen-grey-25 rounded-xl w-[333px] mx-4 overflow-hidden shadow-[0px_4px_8px_-2px_rgba(16,24,40,0.1),0px_2px_4px_-2px_rgba(16,24,40,0.06)]">
          {/* Gradient Background */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div
              className="absolute"
              style={{
                width: '556.125px',
                height: '232px',
                left: '-133.14px',
                top: '240px',
              }}
            >
              <div
                className="rotate-90"
                style={{
                  width: '232px',
                  height: '556.138px',
                  background:
                    'radial-gradient(50% 50% at 50% 50%, rgba(133, 163, 255, 0.25) 0%, rgba(133, 163, 255, 0) 100%)',
                  filter: 'blur(80px)',
                }}
              />
            </div>
            <div
              className="absolute"
              style={{
                width: '808px',
                height: '209.578px',
                left: '243px',
                top: '372px',
              }}
            >
              <div
                className="rotate-90"
                style={{
                  width: '209.6px',
                  height: '808px',
                  background:
                    'radial-gradient(50% 50% at 50% 50%, rgba(133, 163, 255, 0.15) 0%, rgba(133, 163, 255, 0) 100%)',
                  filter: 'blur(60px)',
                }}
              />
            </div>
          </div>

          {/* Close button */}
          <div className="relative flex justify-end px-4 py-[10px]">
            <button
              onClick={() => setShowCancelModal(false)}
              className="flex items-center justify-center gap-2 px-4 py-[10px] rounded-lg"
            >
              <img src="/close-icon.svg" alt="" className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="relative px-8 pb-6">
            <div className="flex flex-col gap-3 items-center">
              {/* Service and info */}
              <div className="flex flex-col gap-4 items-center p-3 rounded-xl w-full">
                {/* Icon */}
                <div className="flex flex-col gap-1 items-center w-full">
                  <div className="bg-zen-warning-100 flex gap-2 items-center p-1 rounded">
                    <div className="rounded-lg overflow-hidden w-8 h-8">
                      <img src="/warning-figma.svg" alt="" className="w-full h-full" />
                    </div>
                  </div>
                </div>

                {/* TEXT */}
                <div className="flex flex-col gap-2 items-start w-full">
                  {/* Title */}
                  <div className="flex gap-1 items-center justify-center w-full">
                    <p
                      className="text-base font-semibold text-zen-grey-950 text-center flex-1"
                      style={{ lineHeight: '1.47' }}
                    >
                      Vas a cancelar la obra
                    </p>
                  </div>
                  {/* Info */}
                  <div className="flex flex-col gap-1 items-center w-full">
                    <p
                      className="text-sm font-normal text-zen-grey-700 text-center w-full"
                      style={{ lineHeight: '1.25' }}
                    >
                      Si cancelas la obra no te gestionaremos ninguna acometida
                    </p>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-3 w-full">
                <button
                  onClick={() => setShowCancelModal(false)}
                 className="flex gap-2 items-center justify-center px-4 py-3 transition-colors"
                >
                  <span
                    className="text-base font-semibold text-zen-blue-500 whitespace-pre"
                    style={{ lineHeight: '1.47' }}
                  >
                     Continuar la creación de la obra
                  </span>
                 
                </button>
                <button
                  onClick={onClose}
                  className="bg-zen-blue-500 flex gap-2 items-center justify-center px-4 py-3 rounded w-full hover:bg-zen-blue-600 transition-colors"
                >
                  <img src="/x-white-icon.svg" alt="" className="w-4 h-4" />
                  <span
                    className="text-base font-semibold text-zen-grey-25 whitespace-pre"
                    style={{ lineHeight: '1.47' }}
                  >
                    Cancelar obra
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-zen-grey-25 flex items-center justify-center z-50">
      <div className="bg-zen-grey-25 w-full h-full overflow-y-auto relative">
        {/* Gradient Background */}
        {/* <div className="absolute inset-0 pointer-events-none" style={{ overflow: 'hidden' }}>
          <div
            className="absolute"
            style={{
              width: '1338px',
              height: '462px',
              left: '240px',
              top: '-378px',
              transform: 'rotate(90deg)',
              background: 'radial-gradient(50% 50% at 50% 50%, rgba(133, 163, 255, 0.25) 0%, rgba(133, 163, 255, 0) 100%)',
              filter: 'blur(80px)',
            }}
          />
        </div> */}

        {/* Header */}
        <div className="relative z-10 flex flex-col gap-6 px-0 pt-4">
          <div className="flex items-center justify-between w-[924px] mx-auto border-b border-zen-grey-300 pb-6">
            <div className="flex items-center gap-4">
              <div className="bg-zen-grey-200 flex items-center p-2 rounded">
                <img src="/construction-icon.svg" alt="" className="w-5 h-5" />
              </div>
              <h2 className="text-[26px] font-semibold text-zen-grey-950" style={{ lineHeight: '1.24' }}>
                Nueva obra
              </h2>
            </div>
            <div className="flex items-center gap-8">
              <button
                onClick={() => {
                  setShowCancelModal(true)
                  trackEvent('New Construction Cancelled', {page_tittle: 'Modal Crear Nueva Obra',  flow_creation_step: currentStep});
                }}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-zen-grey-950 rounded hover:bg-zen-grey-100 transition-colors"
              >
                <span className="text-base font-semibold text-zen-grey-950" style={{ lineHeight: '1.47' }}>
                  Cancelar
                </span>
              </button>
              <button
                onClick={handleSubmit}
                disabled={!areAllStepsValid() || loading}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-zen-blue-500 text-zen-grey-25 rounded hover:bg-zen-blue-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              >
                <span className="text-base font-semibold" style={{ lineHeight: '1.47' }}>
                  {loading ? 'Creando...' : 'Crear obra'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Container */}
        <div className="relative z-10 w-[924px] mx-auto pt-10">
          {/* Stepper */}
          <div className="flex flex-col gap-6 mb-10">
            <div className="flex items-center gap-0">
              {/* Step 1 */}
              <button
                onClick={() => handleStepClick(1)}
                className={`flex items-center justify-center gap-1 px-3 py-2 rounded h-8 transition-all ${
                  currentStep === 1
                    ? 'bg-zen-blue-300'
                    : completedSteps.has(1)
                    ? 'bg-[#acfcbf] border border-[#56c472] hover:bg-[#9ef0b0]'
                    : 'bg-zen-blue-15 hover:bg-zen-blue-50 cursor-pointer'
                }`}
              >
                {completedSteps.has(1) && currentStep !== 1 ? (
                  <>
                    <svg className="w-4 h-4 text-zen-green-900" viewBox="0 0 16 16" fill="currrentColor">
                      <use href="/icons.svg#check-circle" />
                    </svg>
                    <span className="text-sm font-semibold text-[#245231]" style={{ lineHeight: '1.25' }}>
                      1
                    </span>
                  </>
                ) : (
                  <>
                    <img
                      src="/construction-white-icon.svg"
                      alt=""
                      className="w-4 h-4"
                    />
                    <span
                      className={`text-sm font-semibold ${
                        currentStep === 1 ? 'text-zen-grey-25' : 'text-zen-blue-500'
                      }`}
                      style={{ lineHeight: '1.25' }}
                    >
                      {currentStep === 1 ? '1. Datos de la obra' : '1'}
                    </span>
                  </>
                )}
              </button>

              <ChevronRight className="w-4 h-4 text-zen-grey-400" />

              {/* Step 2 */}
              <button
                onClick={() => handleStepClick(2)}
                disabled={!completedSteps.has(1) && currentStep < 2}
                className={`flex items-center justify-center gap-1 px-3 py-2 rounded h-8 transition-all ${
                  currentStep === 2
                    ? 'bg-zen-blue-300'
                    : completedSteps.has(2)
                    ? 'bg-[#acfcbf] border border-[#56c472] hover:bg-[#9ef0b0]'
                    : completedSteps.has(1) || currentStep >= 2
                    ? 'bg-zen-blue-15 hover:bg-zen-blue-50 cursor-pointer'
                    : 'bg-zen-blue-15 cursor-not-allowed'
                }`}
              >
                {completedSteps.has(2) && currentStep !== 2 ? (
                  <>
                    <svg className="w-4 h-4 text-zen-green-900" viewBox="0 0 16 16" fill="currrentColor">
                      <use href="/icons.svg#check-circle" />
                    </svg>
                    <span className="text-sm font-semibold text-[#245231]" style={{ lineHeight: '1.25' }}>
                      2
                    </span>
                  </>
                ) : (
                  <>
                    <svg className={`w-4 h-4 ${
                        currentStep === 2 ? 'text-zen-grey-25' : 'text-zen-blue-500'
                      }`}  viewBox="0 0 16 16" fill="currentColor">
                      <use href="/icons.svg#briefcase" />
                    </svg>
                    <span
                      className={`text-sm font-semibold ${
                        currentStep === 2 ? 'text-zen-grey-25' : 'text-zen-blue-500'
                      }`}
                      style={{ lineHeight: '1.25' }}
                    >
                      {currentStep === 2 ? '2. Datos de la sociedad y responsable' : '2'}
                    </span>
                  </>
                )}
              </button>

              <ChevronRight className="w-4 h-4 text-zen-grey-400" />

              {/* Step 3 */}
              <button
                onClick={() => handleStepClick(3)}
                disabled={!completedSteps.has(2) && currentStep < 3}
                className={`flex items-center justify-center gap-1 px-3 py-2 rounded h-8 transition-all ${
                  currentStep === 3
                    ? 'bg-zen-blue-300'
                    : completedSteps.has(3)
                    ? 'bg-[#acfcbf] border border-[#56c472] hover:bg-[#9ef0b0]'
                    : completedSteps.has(2) || currentStep >= 3
                    ? 'bg-zen-blue-15 hover:bg-zen-blue-50 cursor-pointer'
                    : 'bg-zen-blue-15 cursor-not-allowed'
                }`}
              >
                {completedSteps.has(3) && currentStep !== 3 ? (
                  <>
                    <svg className="w-4 h-4 text-zen-green-900" viewBox="0 0 16 16" fill="currrentColor">
                      <use href="/icons.svg#check-circle" />
                    </svg>
                    <span className="text-sm font-semibold text-[#245231]" style={{ lineHeight: '1.25' }}>
                      3
                    </span>
                  </>
                ) : (
                  <>
                    <svg className={`w-4 h-4 ${
                        currentStep === 3 ? 'text-zen-grey-25' : 'text-zen-blue-500'
                      }`}  viewBox="0 0 16 16" fill="currentColor">
                      <use href="/icons.svg#lightning" />
                    </svg>
                    <span
                      className={`text-sm font-semibold ${
                        currentStep === 3 ? 'text-zen-grey-25' : 'text-zen-blue-500'
                      }`}
                      style={{ lineHeight: '1.25' }}
                    >
                      {currentStep === 3 ? '3. Suministros' : '3'}
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Title and Description */}
            <div className="flex flex-col gap-2 text-zen-grey-950">
              <h3 className="text-[21px] font-semibold" style={{ lineHeight: '1.5' }}>
                {currentStep === 1 && 'Información de la obra'}
                {currentStep === 2 && 'Información de la sociedad y responsable'}
                {currentStep === 3 && 'Selecciona los suministros para tu obra'}
              </h3>
              <p className="text-base font-normal" style={{ lineHeight: '1.47' }}>
                {currentStep === 1 && 'Datos de la obra'}
                {currentStep === 2 && 'Datos de la sociedad y responsable'}
                {currentStep === 3 && 'Selecciona los servicios de obra y definitivos que necesites en tu proyecto.'}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="mb-10">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
          </div>

          {/* Footer with Back and Next Buttons */}
          <div className="flex items-center justify-between bg-zen-grey-25 py-10 px-4">
            <div>
              {currentStep > 1 && (
                <button
                  onClick={() => handleStepClick(currentStep - 1)}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-zen-blue-500 rounded hover:bg-zen-blue-15 transition-colors"
                >
                  <svg className="w-6 h-6 text-zen-blue-500 rotate-90" viewBox="0 0 16 16" fill="currrentColor">
                      <use href="/icons.svg#caret-down" />
                    </svg>

                  <span className="text-base font-semibold text-zen-blue-500" style={{ lineHeight: '1.47' }}>
                    Volver
                  </span>
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-6">
              {currentStep === 1 && !validateStep1() && (
                <p
                  className="text-xs font-normal text-zen-grey-500 text-right w-60"
                  style={{ lineHeight: 'normal', letterSpacing: '0.048px' }}
                >
                  Para poder seguir adelante tienes que rellenar todos los datos obligatorios
                </p>
              )}
              {currentStep !== 3 && (
                <button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-zen-blue-500 text-zen-grey-25 rounded hover:bg-zen-blue-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="text-base font-semibold" style={{ lineHeight: '1.47' }}>
                    Siguiente
                  </span>
                  <img src="/arrow-right-blue.svg" alt="" className="w-6 h-6 brightness-0 invert" />
                </button>
              )}
            </div>
          </div>
        </div>

      </div>
      {renderCancelModal()}
    </div>
  );
}
