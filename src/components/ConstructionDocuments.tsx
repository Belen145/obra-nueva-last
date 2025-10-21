import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  FileText, 
  Upload, 
  Check, 
  X, 
  Clock, 
  AlertCircle,
  Download,
  Eye
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Construction } from '../lib/supabase';

interface ConstructionDocumentsProps {
  construction: Construction;
  onBack: () => void;
}

interface RequiredDocument {
  id: number;
  service_type_id: number;
  document_type_id: number;
  service_type?: {
    id: number;
    name: string;
  };
  documentation_type?: {
    id: number;
    name: string;
    category: string | null;
  };
}

interface Document {
  id: number;
  service_id: number;
  document_type_id: number;
  link: string | null;
  document_status_id: number;
  document_status?: {
    id: number;
    name: string;
    is_incidence: boolean;
  };
  documentation_type?: {
    id: number;
    name: string;
    category: string | null;
  };
}

interface Service {
  id: number;
  type_id: number;
  status_id: number;
  construction_id: number;
  comment: string | null;
  service_type?: {
    id: number;
    name: string;
  };
}

export default function ConstructionDocuments({ construction, onBack }: ConstructionDocumentsProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [requiredDocuments, setRequiredDocuments] = useState<RequiredDocument[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConstructionData();
  }, [construction.id]);

  const fetchConstructionData = async () => {
    try {
      setLoading(true);

      // 1. Obtener servicios de la obra pruebaeeee
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select(`
          *,
          service_type (
            id,
            name
          )
        `)
        .eq('construction_id', construction.id);

      if (servicesError) throw servicesError;
      setServices(servicesData || []);

      // 2. Obtener documentos requeridos para los tipos de servicio
      const serviceTypeIds = servicesData?.map(s => s.type_id) || [];
      
      if (serviceTypeIds.length > 0) {
        const { data: requiredDocsData, error: requiredDocsError } = await supabase
          .from('service_required_document')
          .select(`
            *,
            service_type (
              id,
              name
            ),
            documentation_type (
              id,
              name,
              category
            )
          `)
          .in('service_type_id', serviceTypeIds);

        if (requiredDocsError) throw requiredDocsError;
        setRequiredDocuments(requiredDocsData || []);

        // 3. Obtener documentos existentes
        const serviceIds = servicesData?.map(s => s.id) || [];
        
        if (serviceIds.length > 0) {
          const { data: documentsData, error: documentsError } = await supabase
            .from('documents')
            .select(`
              *,
              document_status (
                id,
                name,
                is_incidence
              ),
              documentation_type (
                id,
                name,
                category
              )
            `)
            .in('service_id', serviceIds);

          if (documentsError) throw documentsError;
          setDocuments(documentsData || []);
        }
      }
    } catch (error) {
      console.error('Error fetching construction documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDocumentStatus = (serviceId: number, documentTypeId: number) => {
    const document = documents.find(
      d => d.service_id === serviceId && d.document_type_id === documentTypeId
    );
    return document;
  };

  const getStatusIcon = (document: Document | undefined) => {
    if (!document) {
      return <Clock className="w-5 h-5 text-yellow-500" />;
    }

    if (document.document_status?.is_incidence) {
      return <X className="w-5 h-5 text-red-500" />;
    }

    switch (document.document_status?.name?.toLowerCase()) {
      case 'aprobado':
      case 'completado':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'rechazado':
        return <X className="w-5 h-5 text-red-500" />;
      case 'pendiente':
      case 'en revisión':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (document: Document | undefined) => {
    if (!document) {
      return 'bg-yellow-100 text-yellow-800';
    }

    if (document.document_status?.is_incidence) {
      return 'bg-red-100 text-red-800';
    }

    switch (document.document_status?.name?.toLowerCase()) {
      case 'aprobado':
      case 'completado':
        return 'bg-green-100 text-green-800';
      case 'rechazado':
        return 'bg-red-100 text-red-800';
      case 'pendiente':
      case 'en revisión':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (document: Document | undefined) => {
    if (!document) {
      return 'Pendiente';
    }
    return document.document_status?.name || 'Sin estado';
  };

  // Agrupar documentos requeridos por servicio
  const documentsByService = services.map(service => {
    const serviceRequiredDocs = requiredDocuments.filter(
      rd => rd.service_type_id === service.type_id
    );
    
    return {
      service,
      requiredDocuments: serviceRequiredDocs
    };
  });

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          onClick={onBack}
          className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200 mr-4"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Volver
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{construction.name}</h2>
          <p className="text-gray-600">Documentos requeridos por servicio</p>
        </div>
      </div>

      {/* Servicios y Documentos */}
      <div className="space-y-6">
        {documentsByService.map(({ service, requiredDocuments: serviceRequiredDocs }) => (
          <div key={service.id} className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <FileText className="w-5 h-5 mr-3 text-blue-500" />
                {service.service_type?.name || `Servicio ${service.type_id}`}
                {service.comment && (
                  <span className="ml-2 text-sm text-gray-500">({service.comment})</span>
                )}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {serviceRequiredDocs.length} documento(s) requerido(s)
              </p>
            </div>

            <div className="p-6">
              {serviceRequiredDocs.length > 0 ? (
                <div className="space-y-4">
                  {serviceRequiredDocs.map((requiredDoc) => {
                    const document = getDocumentStatus(service.id, requiredDoc.document_type_id);
                    
                    return (
                      <div
                        key={`${service.id}-${requiredDoc.document_type_id}`}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                      >
                        <div className="flex items-center flex-1">
                          {getStatusIcon(document)}
                          <div className="ml-4">
                            <h4 className="text-sm font-medium text-gray-900">
                              {requiredDoc.documentation_type?.name || `Documento ${requiredDoc.document_type_id}`}
                            </h4>
                            {requiredDoc.documentation_type?.category && (
                              <p className="text-xs text-gray-500">
                                Categoría: {requiredDoc.documentation_type.category}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(document)}`}>
                            {getStatusText(document)}
                          </span>
                          
                          {document ? (
                            <div className="flex space-x-2">
                              {document.link && (
                                <button className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors duration-200">
                                  <Eye className="w-4 h-4" />
                                </button>
                              )}
                              {document.link && (
                                <button className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded transition-colors duration-200">
                                  <Download className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <button className="flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors duration-200">
                              <Upload className="w-4 h-4 mr-2" />
                              Subir
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No hay documentos requeridos para este servicio</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {documentsByService.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay servicios registrados</h3>
          <p className="text-gray-500">
            Esta obra no tiene servicios asociados, por lo que no hay documentos requeridos.
          </p>
        </div>
      )}
    </div>
  );
}