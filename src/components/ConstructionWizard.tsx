import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  Save,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Users,
  Building,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useConstructionData } from '../hooks/useConstructionData';
import { useServiceCreation } from '../hooks/useServiceCreation';

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
  selectedServices: {
    [key: string]: {
      selected: boolean;
      name: string;
    };
  };
}

interface Step3Data {
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
  responsible_dni: string;
  responsible_phone: string;
  responsible_email: string;
}

/**
 * Wizard para crear una nueva obra de construcción y sus servicios asociados.
 * Incluye validaciones, pasos y manejo de estado local.
 */
export default function ConstructionWizard({
  onClose,
  onSuccess,
}: ConstructionWizardProps) {
  // Estado del paso actual y carga
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const { statuses, companies } = useConstructionData();
  const { createMultipleServices } = useServiceCreation();

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

  // Estado para datos del paso 2 (servicios)
  const [step2Data, setStep2Data] = useState<Step2Data>({
    selectedServices: {},
  });

  // Estado para datos del paso 3 (sociedad y responsable)
  const [step3Data, setStep3Data] = useState<Step3Data>({
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
    responsible_dni: '',
    responsible_phone: '',
    responsible_email: '',
  });

  // Estados para los tipos de servicio
  const [serviceTypes, setServiceTypes] = useState<Array<{id: number, name: string}>>([]);
  const [loadingServiceTypes, setLoadingServiceTypes] = useState(true);

  // Cargar tipos de servicio al montar el componente
  useEffect(() => {
    const fetchServiceTypes = async () => {
      console.log('Fetching service types...');
      try {
        const { data, error } = await supabase
          .from('service_type')
          .select('id, name')
          .order('name');

        console.log('Service types response:', { data, error });

        if (error) throw error;
        setServiceTypes(data || []);

        // Initialize selectedServices state with the fetched services
        console.log('Setting up initial services...');
        const initialServices = data?.reduce((acc, service) => {
          console.log('Processing service:', service);
          acc[service.id] = {
            selected: false,
            name: service.name
          };
          return acc;
        }, {} as Step2Data['selectedServices']);
        
        console.log('Initial services created:', initialServices);

        setStep2Data(prev => ({
          ...prev,
          selectedServices: initialServices || {}
        }));
      } catch (err) {
        console.error('Error al cargar tipos de servicio:', err);
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
  };

  /**
   * Actualiza el estado de selección y tipo de servicio en el paso 2.
   */
  const handleServiceChange = (
    serviceId: string,
    field: 'selected',
    value: boolean
  ) => {
    setStep2Data((prev: Step2Data) => ({
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
   * Actualiza el estado del paso 3.
   */
  const handleStep3Change = (field: keyof Step3Data, value: string) => {
    setStep3Data((prev: Step3Data) => ({ ...prev, [field]: value }));
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
   * Valida que haya al menos un servicio seleccionado y con tipo.
   */
  const validateStep2 = (): boolean => {
    const selectedServices = Object.entries(step2Data.selectedServices).filter(
      ([_k, service]) => service.selected
    );
    return selectedServices.length > 0;
  };

  /**
   * Valida los campos obligatorios del paso 3.
   */
  const validateStep3 = (): boolean => {
    return Boolean(
      step3Data.society_name &&
        step3Data.society_cif &&
        step3Data.fiscal_street &&
        step3Data.fiscal_province &&
        step3Data.fiscal_municipality &&
        step3Data.fiscal_postal_code &&
        step3Data.responsible_first_name &&
        step3Data.responsible_last_name &&
        step3Data.responsible_dni
    );
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Construir dirección completa
      const addressParts = [
        step1Data.street,
        step1Data.number,
        step1Data.municipality,
        step1Data.province,
        step1Data.postal_code,
      ].filter(Boolean);
      const fullAddress = addressParts.join(', ');

      // Construir nombre completo del responsable
      const responsibleName =
        `${step3Data.responsible_first_name} ${step3Data.responsible_last_name}`.trim();

      // 1. Crear obra
      const defaultStatus =
        statuses.find((s) => s.name.toLowerCase().includes('planificado')) ||
        statuses[0];
      const defaultCompany = companies[0];

      const { data: construction, error: constructionError } = await supabase
        .from('construction')
        .insert({
          name: step1Data.name,
          construction_status_id: defaultStatus?.id || 1,
          company_id: defaultCompany?.id || 1,
          address: fullAddress,
          responsible: responsibleName,
        })
        .select()
        .single();

      if (constructionError) throw constructionError;

      // 2. Crear servicios seleccionados usando el hook
      const servicesToCreate = Object.entries(step2Data.selectedServices)
        .filter(([_, service]) => service.selected)
        .map(([serviceId, service]) => {
          return {
            typeIds: [Number(serviceId)],
            comment: `Servicio de ${service.name} para ${step1Data.name}`
          };
        })
        .filter(service => service.typeIds.length > 0);

      if (servicesToCreate.length > 0) {
        console.log('🔄 Creando servicios para la obra:', servicesToCreate);
        const services = await createMultipleServices(
          construction.id,
          servicesToCreate
        );
        console.log('✅ Servicios creados exitosamente:', services);
      }

      onSuccess(construction.id);
    } catch (error) {
      console.error('Error creating construction:', error);
      alert('Error al crear la obra: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <MapPin className="w-6 h-6 text-blue-600 mr-3" />
        <h3 className="text-lg font-semibold text-gray-900">
          Información de la Obra
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre de la Obra *
          </label>
          <input
            type="text"
            value={step1Data.name}
            onChange={(e) => handleStep1Change('name', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ej: Residencial Los Pinos"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Número de Viviendas *
          </label>
          <input
            type="number"
            value={step1Data.housing_count}
            onChange={(e) => handleStep1Change('housing_count', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ej: 24"
            min="1"
          />
        </div>

        <div></div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Calle *
          </label>
          <input
            type="text"
            value={step1Data.street}
            onChange={(e) => handleStep1Change('street', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ej: 123"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Provincia *
          </label>
          <input
            type="text"
            value={step1Data.province}
            onChange={(e) => handleStep1Change('province', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ej: Madrid"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Municipio *
          </label>
          <input
            type="text"
            value={step1Data.municipality}
            onChange={(e) => handleStep1Change('municipality', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ej: Madrid"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Código Postal *
          </label>
          <input
            type="text"
            value={step1Data.postal_code}
            onChange={(e) => handleStep1Change('postal_code', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ej: 28001"
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <Building className="w-6 h-6 text-blue-600 mr-3" />
        <h3 className="text-lg font-semibold text-gray-900">
          Servicios de la Obra
        </h3>
      </div>

      <div className="space-y-4">
        {loadingServiceTypes ? (
          <div className="text-center py-4">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-2 text-gray-600">Cargando servicios disponibles...</p>
          </div>
        ) : Object.keys(step2Data.selectedServices).length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-600">No hay servicios disponibles</p>
          </div>
        ) : (
          Object.entries(step2Data.selectedServices).map(([serviceId, service]) => (
            <div key={serviceId} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={service.selected}
                    onChange={(e) =>
                      handleServiceChange(
                        serviceId,
                        'selected',
                        e.target.checked
                      )
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                  />
                  <span className="text-lg font-medium text-gray-900">
                    {service.name}
                  </span>
                </label>
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <Users className="w-6 h-6 text-blue-600 mr-3" />
        <h3 className="text-lg font-semibold text-gray-900">
          Información de la Sociedad y Responsable
        </h3>
      </div>

      {/* Información de la Sociedad */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-4">Datos de la Sociedad</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de la Sociedad *
            </label>
            <input
              type="text"
              value={step3Data.society_name}
              onChange={(e) =>
                handleStep3Change('society_name', e.target.value)
              }
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ej: Constructora ABC S.L."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CIF *
            </label>
            <input
              type="text"
              value={step3Data.society_cif}
              onChange={(e) => handleStep3Change('society_cif', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ej: B12345678"
            />
          </div>
        </div>

        <h5 className="font-medium text-gray-900 mt-6 mb-4">
          Dirección Fiscal
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Calle *
            </label>
            <input
              type="text"
              value={step3Data.fiscal_street}
              onChange={(e) =>
                handleStep3Change('fiscal_street', e.target.value)
              }
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Número
            </label>
            <input
              type="text"
              value={step3Data.fiscal_number}
              onChange={(e) =>
                handleStep3Change('fiscal_number', e.target.value)
              }
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bloque
            </label>
            <input
              type="text"
              value={step3Data.fiscal_block}
              onChange={(e) =>
                handleStep3Change('fiscal_block', e.target.value)
              }
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Escalera
            </label>
            <input
              type="text"
              value={step3Data.fiscal_staircase}
              onChange={(e) =>
                handleStep3Change('fiscal_staircase', e.target.value)
              }
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Piso
            </label>
            <input
              type="text"
              value={step3Data.fiscal_floor}
              onChange={(e) =>
                handleStep3Change('fiscal_floor', e.target.value)
              }
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Letra
            </label>
            <input
              type="text"
              value={step3Data.fiscal_letter}
              onChange={(e) =>
                handleStep3Change('fiscal_letter', e.target.value)
              }
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Provincia *
            </label>
            <input
              type="text"
              value={step3Data.fiscal_province}
              onChange={(e) =>
                handleStep3Change('fiscal_province', e.target.value)
              }
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Municipio *
            </label>
            <input
              type="text"
              value={step3Data.fiscal_municipality}
              onChange={(e) =>
                handleStep3Change('fiscal_municipality', e.target.value)
              }
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Código Postal *
            </label>
            <input
              type="text"
              value={step3Data.fiscal_postal_code}
              onChange={(e) =>
                handleStep3Change('fiscal_postal_code', e.target.value)
              }
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Información del Responsable */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-4">
          Datos del Responsable
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre *
            </label>
            <input
              type="text"
              value={step3Data.responsible_first_name}
              onChange={(e) =>
                handleStep3Change('responsible_first_name', e.target.value)
              }
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Apellidos *
            </label>
            <input
              type="text"
              value={step3Data.responsible_last_name}
              onChange={(e) =>
                handleStep3Change('responsible_last_name', e.target.value)
              }
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              DNI *
            </label>
            <input
              type="text"
              value={step3Data.responsible_dni}
              onChange={(e) =>
                handleStep3Change('responsible_dni', e.target.value)
              }
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ej: 12345678A"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Teléfono
            </label>
            <input
              type="tel"
              value={step3Data.responsible_phone}
              onChange={(e) =>
                handleStep3Change('responsible_phone', e.target.value)
              }
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ej: 600123456"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={step3Data.responsible_email}
              onChange={(e) =>
                handleStep3Change('responsible_email', e.target.value)
              }
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ej: responsable@empresa.com"
            />
          </div>
        </div>
      </div>
    </div>
  );

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <Building2 className="w-6 h-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-bold text-gray-900">
              Nueva Obra de Construcción
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === currentStep
                      ? 'bg-blue-600 text-white'
                      : step < currentStep
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step}
                </div>
                <div className="ml-2 text-sm font-medium text-gray-900">
                  {step === 1 && 'Información Básica'}
                  {step === 2 && 'Servicios'}
                  {step === 3 && 'Sociedad y Responsable'}
                </div>
                {step < 3 && (
                  <ChevronRight className="w-4 h-4 text-gray-400 mx-4" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Anterior
          </button>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
            >
              Cancelar
            </button>

            {currentStep < 3 ? (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Siguiente
                <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canProceed() || loading}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {loading ? 'Creando...' : 'Crear Obra'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
