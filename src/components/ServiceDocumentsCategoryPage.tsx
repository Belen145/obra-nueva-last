import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Eye,
  Download,
  Trash2,
  AlertTriangle,
  Check,
  X,
  Clock,
  ArrowLeft,
  FileText,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useDocumentUpload } from '../hooks/useDocumentUpload';
import { useParams, useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import { trackEvent } from '../lib/amplitude';
import { notifyDocumentUploaded } from '../services/slackService.simple';
import { hubSpotDocumentService } from '../services/hubspotDocumentService';

export default function ServiceDocumentsCategoryPage() {
  const { showNotification } = useNotification();
  // Estado para autoguardado de texto
  const [textDocumentIds, setTextDocumentIds] = useState<
    Record<number, number | null>
  >({});
  const [textValues, setTextValues] = useState<Record<number, string>>({});
  const [savingTextId, setSavingTextId] = useState<number | null>(null);
  const [savedTextId, setSavedTextId] = useState<number | null>(null);
  const debounceTimeouts = useRef<Record<number, NodeJS.Timeout>>({});
  const { serviceId, category } = useParams();
  const navigate = useNavigate();

  const getIconByServiceName = (serviceName: string): string => {
    const icons: Record<string, string> = {
      'Luz - Obra': '/icons.svg#luz-obra',
      'Luz - Definitiva': '/icons.svg#luz-definitiva',
      'Agua - Obra': '/icons.svg#agua-obra',
      'Agua - Definitiva': '/icons.svg#agua-definitiva',
    };
    return icons[serviceName] || '/icons.svg#building';
  };
  const [service, setService] = useState<any>(null);
  type RequiredDocument = {
    id: number;
    service_required_document_id: number;
    document_type_id: number;
    documentation_type?: {
      id: number;
      name: string;
      category: string | null;
      requires_file: boolean | null;
      url_template?: string | null;
      distributor_id?: number | null;
    };
  };
  type ExistingDocument = {
    id: number;
    service_id: number;
    document_type_id: number;
    link?: string | null;
    content_text?: string | null;
    document_status?: {
      id: number;
      name: string;
      is_incidence: boolean;
    };
    documentation_type?: {
      id: number;
      name: string;
      category: string | null;
      requires_file: boolean | null;
    };
  };
  const [requiredDocuments, setRequiredDocuments] = useState<
    RequiredDocument[]
  >([]);
  const [existingDocuments, setExistingDocuments] = useState<
    ExistingDocument[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const [textModal, setTextModal] = useState<any>(null); // Modal ya no se usa
  const { uploadDocument, uploading } = useDocumentUpload();
  // Estado para subida inline de archivos
  const [fileUploadStates, setFileUploadStates] = useState<
    Record<
      number,
      {
        selectedFile: File | null;
        dragOver: boolean;
        submitting: boolean;
        error: string | null;
        successMessage: string | null;
      }
    >
  >({});

  // Función para autoguardado de texto - ahora actualiza TODOS los servicios de la obra
  async function saveTextDocument(
    documentTypeId: number,
    value: string,
    documentId?: number | null
  ) {
    if (!serviceId || !service) return;
    setSavingTextId(documentTypeId);
    let result = false;

    try {
      // Obtener todos los servicios de la misma obra
      const { data: allServicesData, error: servicesError } = await supabase
        .from('services')
        .select('id')
        .eq('construction_id', service.construction.id);
      
      if (servicesError) throw servicesError;
      const allServiceIds = allServicesData?.map(s => s.id) || [];

      if (documentId) {
        // Update - actualizar el documento existente
        const { error } = await supabase
          .from('documents')
          .update({
            content_text: value,
            updated_at: new Date().toISOString(),
            document_status_id: 3,
          })
          .eq('id', documentId);
        result = !error;

        // También actualizar o crear en todos los demás servicios de la obra
        for (const otherServiceId of allServiceIds) {
          if (otherServiceId !== parseInt(serviceId!)) {
            // Buscar si existe documento para este servicio
            const { data: existingDocs } = await supabase
              .from('documents')
              .select('id')
              .eq('service_id', otherServiceId)
              .eq('document_type_id', documentTypeId)
              .limit(1);

            if (existingDocs && existingDocs.length > 0) {
              // Actualizar documento existente
              await supabase
                .from('documents')
                .update({
                  content_text: value,
                  updated_at: new Date().toISOString(),
                  document_status_id: 3,
                })
                .eq('id', existingDocs[0].id);
            } else {
              // Crear nuevo documento
              await supabase
                .from('documents')
                .insert({
                  service_id: otherServiceId,
                  document_type_id: documentTypeId,
                  content_text: value,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  document_status_id: 3,
                });
            }
          }
        }
      } else {
        // Insert - crear documento en TODOS los servicios de la obra
        const documentsToInsert = allServiceIds.map(serviceId => ({
          service_id: serviceId,
          document_type_id: documentTypeId,
          content_text: value,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          document_status_id: 3,
        }));

        const { error, data: insertedDocuments } = await supabase
          .from('documents')
          .insert(documentsToInsert)
          .select();
        
        result = !error;
        
        // Actualizar el ID del documento actual
        if (insertedDocuments && insertedDocuments.length > 0) {
          const currentServiceDoc = insertedDocuments.find(doc => doc.service_id === parseInt(serviceId!));
          if (currentServiceDoc) {
            setTextDocumentIds((prev) => ({
              ...prev,
              [documentTypeId]: currentServiceDoc.id,
            }));
          }
        }
      }

      // Si el guardado fue exitoso, enviar notificación a Slack y sincronizar con HubSpot
      if (result) {
        // 🚀 NUEVA FUNCIONALIDAD: Sincronizar con HubSpot
        try {
          // Para insert: usar el primer documento insertado
          // Para update: usar el documento existente
          let docToSync = null;
          let serviceIdToSync = null;
          
          if (insertedDocuments && insertedDocuments.length > 0) {
            // Caso INSERT: usar el primer documento creado
            docToSync = insertedDocuments[0];
            serviceIdToSync = docToSync.service_id;
          } else if (documentId) {
            // Caso UPDATE: usar el documento existente
            serviceIdToSync = parseInt(serviceId!);
            docToSync = { id: documentId };
          }
          
          if (docToSync && serviceIdToSync) {
            console.log('🔄 Sincronizando documento de texto con HubSpot...', {
              documentId: docToSync.id,
              serviceId: serviceIdToSync,
              documentTypeId,
              contentLength: value.length
            });
            
            const syncSuccess = await hubSpotDocumentService.syncDocumentToHubSpot({
              documentId: docToSync.id,
              serviceId: serviceIdToSync,
              documentTypeId: documentTypeId,
              link: null,
              contentText: value
            });
            
            if (syncSuccess) {
              console.log('✅ Documento de texto sincronizado con HubSpot exitosamente');
            } else {
              console.warn('⚠️ No se pudo sincronizar documento de texto con HubSpot (no es crítico)');
            }
          }
        } catch (hubspotError) {
          console.error('❌ Error sincronizando documento de texto con HubSpot:', hubspotError);
          // No bloquear el proceso si HubSpot falla
        }

        // Slack notification
        try {
          const docType = requiredDocuments.find(doc => doc.document_type_id === documentTypeId);
          await notifyDocumentUploaded(
            service?.construction?.name || 'Obra desconocida',
            docType?.documentation_type?.name || 'Documento de texto',
            category || 'Categoría desconocida',
            'Documento de texto actualizado'
          );
          console.log('✅ Notificación de Slack enviada para documento de texto');
        } catch (slackError) {
          console.error('❌ Error enviando notificación de Slack para documento de texto:', slackError);
          // No bloqueamos la operación si Slack falla
        }
      }
    } catch (error) {
      console.error('Error saving text document:', error);
      result = false;
    }

    setSavingTextId(null);
    setSavedTextId(documentTypeId);
    fetchServiceData();
    return result;
  }
  // Sincronizar los valores del textarea con los documentos existentes cada vez que cambian
  useEffect(() => {
    if (requiredDocuments.length > 0 && serviceId) {
      const initial: Record<number, string> = {};
      const initialIds: Record<number, number | null> = {};
      requiredDocuments.forEach((doc) => {
        if (doc.documentation_type?.requires_file === false || doc.documentation_type?.requires_file === null) {
          // Buscar el documento por tipo sin filtrar por service_id
          // ya que los documentos se comparten entre servicios de la misma obra
          const existing = existingDocuments.find(
            (e) => e.document_type_id === doc.document_type_id
          );
          initial[doc.document_type_id] = existing?.content_text || '';
          initialIds[doc.document_type_id] = existing?.id ?? null;
        }
      });
      setTextValues(initial);
      setTextDocumentIds(initialIds);
    }
  }, [existingDocuments, requiredDocuments, serviceId]);

  // Mantener fetchServiceData solo para la primera carga
  useEffect(() => {
    if (serviceId && category) {
      fetchServiceData();
    }
    
    // Suscripción a cambios en tiempo real en la tabla documents
    const subscription = supabase
      .channel('documents_changes_category')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'documents',
        }, 
        (payload) => {
          console.log('📡 Cambio detectado en documents (category page):', payload);
          // Refrescar los datos cuando haya cambios
          if (serviceId && category) {
            fetchServiceData();
          }
        }
      )
      .subscribe();

    // Limpiar la suscripción al desmontar
    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line
  }, [serviceId, category]);

  const fetchServiceData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Obtener servicio
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select(`*, service_type (id, name), construction (id, name, address, distributor_id)`)
        .eq('id', serviceId)
        .single();
      if (serviceError) throw serviceError;
      setService(serviceData);

      // Obtener documentos requeridos filtrados por categoría
      // Incluye documentos generales (sin distribuidor) y documentos específicos del distribuidor
      const { data: requiredDocsData, error: requiredDocsError } =
        await supabase
          .from('service_required_document')
          .select(
            `*, documentation_type (id, name, category, requires_file, url_template, distributor_id)`
          )
          .eq('service_type_id', serviceData.type_id);
      if (requiredDocsError) throw requiredDocsError;
      
      const filteredRequired = (requiredDocsData || []).filter(
        (doc) => {
          // Filtrar por categoría
          const categoryMatch = (doc.documentation_type?.category || 'Sin categoría') === category;
          
          // Incluir documentos sin distribuidor (generales) o documentos del distribuidor específico de la obra
          const isGeneralDocument = !doc.documentation_type?.distributor_id;
          const isDistributorSpecificDocument = doc.documentation_type?.distributor_id === serviceData.construction?.distributor_id;
          const distributorMatch = isGeneralDocument || isDistributorSpecificDocument;
          
          return categoryMatch && distributorMatch;
        }
      );
      setRequiredDocuments(filteredRequired);

      // Obtener documentos existentes de TODOS los servicios de la misma obra
      // para que los documentos se compartan entre servicios
      const { data: allServicesData, error: allServicesError } = await supabase
        .from('services')
        .select('id')
        .eq('construction_id', serviceData.construction.id);
      if (allServicesError) throw allServicesError;
      
      const allServiceIds = allServicesData?.map(s => s.id) || [];
      
      const { data: existingDocsData, error: existingDocsError } =
        await supabase
          .from('documents')
          .select(
            `*, document_status (id, name, is_incidence), documentation_type (id, name, category, requires_file)`
          )
          .in('service_id', allServiceIds);
      if (existingDocsError) throw existingDocsError;
      setExistingDocuments(existingDocsData || []);
    } catch (err) {
      setError((err as Error).message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const getExistingDocument = (documentTypeId: number) => {
    // Buscar el documento por tipo, sin filtrar por service_id 
    // ya que ahora los documentos se comparten entre servicios de la misma obra
    return existingDocuments.find(
      (doc) => doc.document_type_id === documentTypeId
    );
  };

  const getStatusIcon = (document: any) => {
    if (!document) return <Clock className="w-5 h-5 text-yellow-500" />;
    if (document.document_status?.is_incidence)
      return <AlertTriangle className="w-5 h-5 text-red-500" />;
    switch (document.document_status?.name?.toLowerCase()) {
      case 'aprobado':
      case 'validado':
      case 'completado':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'rechazado':
        return <X className="w-5 h-5 text-red-500" />;
      case 'subido':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'pendiente':
      case 'en revisión':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (document: any) => {
    if (!document) return 'bg-yellow-100 text-yellow-800';
    if (document.document_status?.is_incidence)
      return 'bg-red-100 text-red-800';
    switch (document.document_status?.name?.toLowerCase()) {
      case 'aprobado':
      case 'validado':
      case 'completado':
        return 'bg-green-100 text-green-800';
      case 'rechazado':
        return 'bg-red-100 text-red-800';
      case 'subido':
        return 'bg-blue-100 text-blue-800';
      case 'pendiente':
      case 'en revisión':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (document: any) => {
    if (!document) return 'Pendiente';
    return document.document_status?.name || 'Sin estado';
  };

  // Handlers para subida inline
  const handleFileSelect = (
    documentTypeId: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    setFileUploadStates((prev) => ({
      ...prev,
      [documentTypeId]: {
        selectedFile: file || null,
        dragOver: false,
        submitting: false,
        error: null,
        successMessage: null,
      },
    }));
    if (file) {
      handleSubmit(documentTypeId, file);
    }
  };
  const handleDragOver = (documentTypeId: number, e: React.DragEvent) => {
    e.preventDefault();
    setFileUploadStates((prev) => ({
      ...prev,
      [documentTypeId]: {
        ...prev[documentTypeId],
        dragOver: true,
      },
    }));
  };
  const handleDragLeave = (documentTypeId: number) => {
    setFileUploadStates((prev) => ({
      ...prev,
      [documentTypeId]: {
        ...prev[documentTypeId],
        dragOver: false,
      },
    }));
  };
  const handleDrop = (documentTypeId: number, e: React.DragEvent) => {
    e.preventDefault();
    // Bloquear si ya hay archivo subido y no hay uno nuevo en proceso
    const existingDoc = getExistingDocument(documentTypeId);
    let existingFileName = '';
    if (existingDoc && existingDoc.link) {
      try {
        const urlParts = existingDoc.link.split('/');
        existingFileName = decodeURIComponent(urlParts[urlParts.length - 1]);
      } catch {}
    }
    if (existingFileName && !fileUploadStates[documentTypeId]?.selectedFile) {
      // No permitir drop
      setFileUploadStates((prev) => ({
        ...prev,
        [documentTypeId]: {
          ...prev[documentTypeId],
          dragOver: false,
          error: 'Ya existe un archivo subido. Elimínalo para subir otro.',
        },
      }));
      return;
    }
    const file = e.dataTransfer.files[0];
    setFileUploadStates((prev) => ({
      ...prev,
      [documentTypeId]: {
        selectedFile: file || null,
        dragOver: false,
        submitting: false,
        error: null,
        successMessage: null,
      },
    }));
    if (file) {
      handleSubmit(documentTypeId, file);
    }
  };
  const clearFileSelection = (documentTypeId: number) => {
    setFileUploadStates((prev) => ({
      ...prev,
      [documentTypeId]: {
        ...prev[documentTypeId],
        selectedFile: null,
        error: null,
        successMessage: null,
      },
    }));
  };

  const handleUploadFile = (documentTypeId: number) => {
    handleSubmit(documentTypeId);
  };

  const handleSubmit = async (documentTypeId: number, fileArg?: File) => {
    const file = fileArg || fileUploadStates[documentTypeId]?.selectedFile;
    if (!file) {
      setFileUploadStates((prev) => ({
        ...prev,
        [documentTypeId]: {
          ...prev[documentTypeId],
          error: 'Debes seleccionar un archivo para subir',
        },
      }));
      return;
    }
    setFileUploadStates((prev) => ({
      ...prev,
      [documentTypeId]: {
        ...prev[documentTypeId],
        submitting: true,
        error: null,
        successMessage: null,
      },
    }));
    try {
      let fileUrl: string | null = null;
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const cleanFileName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `document_${timestamp}_${cleanFileName}.${fileExtension}`;
      // Usar la carpeta de la obra en lugar de la del servicio específico
      const filePath = `documents/construction_${service.construction.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });
      if (uploadError)
        throw new Error(`Error al subir archivo: ${uploadError.message}`);
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);
      fileUrl = urlData.publicUrl;
      
      // Obtener todos los servicios de la misma obra
      const { data: allServicesData, error: servicesError } = await supabase
        .from('services')
        .select('id')
        .eq('construction_id', service.construction.id);
      
      if (servicesError) throw servicesError;
      const allServiceIds = allServicesData?.map(s => s.id) || [];

      // Guardar en tabla documents para TODOS los servicios de la obra
      const documentsToInsert = allServiceIds.map(serviceId => ({
        service_id: serviceId,
        document_type_id: documentTypeId,
        link: fileUrl,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        document_status_id: 3,
      }));

      const { error: docError, data: insertedDocs } = await supabase
        .from('documents')
        .insert(documentsToInsert)
        .select('id, service_id, document_type_id, link');
      
      if (docError) {
        console.error('Error al guardar documento:', docError);
        throw new Error(
          `Error al guardar documento: ${
            docError.message || JSON.stringify(docError)
          }`
        );
      }

      // 🚀 NUEVA FUNCIONALIDAD: Sincronizar con HubSpot
      try {
        if (insertedDocs && insertedDocs.length > 0) {
          // Sincronizar solo el primer documento (todos tienen los mismos datos)
          const firstDoc = insertedDocs[0];
          console.log('🔄 Sincronizando documento con HubSpot...', {
            documentId: firstDoc.id,
            serviceId: firstDoc.service_id,
            documentTypeId: firstDoc.document_type_id
          });
          
          const syncSuccess = await hubSpotDocumentService.syncDocumentToHubSpot({
            documentId: firstDoc.id,
            serviceId: firstDoc.service_id,
            documentTypeId: firstDoc.document_type_id,
            link: fileUrl,
            contentText: null
          });
          
          if (syncSuccess) {
            console.log('✅ Documento sincronizado con HubSpot exitosamente');
          } else {
            console.warn('⚠️ No se pudo sincronizar con HubSpot (no es crítico)');
          }
        }
      } catch (hubspotError) {
        console.error('❌ Error sincronizando con HubSpot:', hubspotError);
        // No bloquear el proceso si HubSpot falla
      }
      showNotification({
        type: 'success',
        title: 'Documentación',
        body: 'El documento se ha guardado exitosamente.'
      });

      // Notificación a Slack
      try {
        const docType = requiredDocuments.find(doc => doc.document_type_id === documentTypeId);
        await notifyDocumentUploaded(
          service?.construction?.name || 'Obra desconocida',
          docType?.documentation_type?.name || 'Documento',
          category || 'Categoría desconocida',
          fileName,
          fileUrl || undefined // Pasar la URL del documento
        );
        console.log('✅ Notificación de Slack enviada exitosamente');
      } catch (slackError) {
        console.error('❌ Error enviando notificación de Slack:', slackError);
        // No bloqueamos la operación si Slack falla
      }

      setFileUploadStates((prev) => ({
        ...prev,
        [documentTypeId]: {
          ...prev[documentTypeId],
          submitting: false,
          selectedFile: null,
        },
      }));
      fetchServiceData();
      trackEvent('Document Uploaded', {
        page_title: 'Documentos de la categoría',
        new_construction_id: service?.construction?.name || '',
        service_type: service?.service_type?.name || '',
        document_type: category,
        document_name: fileName
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';

      showNotification({
        type: 'error',
        title: 'Error al subir el documento',
        body: errorMessage
      });

      setFileUploadStates((prev) => ({
        ...prev,
        [documentTypeId]: {
          ...prev[documentTypeId],
          submitting: false,
          error: errorMessage,
        },
      }));
    }
  };

  const handleDownload = async (fileUrl: string, fileName: string) => {
    
    try {
      // Fetch el archivo
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      
      // Crear un objeto URL para el blob
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Crear y hacer click en un enlace temporal
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      
      // Limpiar
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error al descargar el archivo:', error);
    }
  };

  const handleDeleteDocument = async (documentId: number, fileUrl?: string) => {
    if (!documentId || !service) return;
    try {
      // Primero obtener el document_type_id del documento que se va a eliminar
      const { data: docData, error: docError } = await supabase
        .from('documents')
        .select('document_type_id')
        .eq('id', documentId)
        .single();
      
      if (docError) throw docError;
      const documentTypeId = docData.document_type_id;
      
      // Obtener todos los servicios de la misma obra
      const { data: allServicesData, error: servicesError } = await supabase
        .from('services')
        .select('id')
        .eq('construction_id', service.construction.id);
      
      if (servicesError) throw servicesError;
      const allServiceIds = allServicesData?.map(s => s.id) || [];

      // Eliminar TODOS los documentos del mismo tipo en todos los servicios de la obra
      await supabase
        .from('documents')
        .delete()
        .in('service_id', allServiceIds)
        .eq('document_type_id', documentTypeId);
      
      // Eliminar del storage si hay link
      if (fileUrl) {
        try {
          // Extraer la ruta relativa del archivo en storage
          const url = new URL(fileUrl);
          const pathParts = url.pathname.split('/');
          // Buscar el índice de la carpeta 'documents' y tomar el resto
          const docIdx = pathParts.findIndex((p) => p === 'documents');
          const storagePath =
            docIdx !== -1 ? pathParts.slice(docIdx).join('/') : '';
          if (storagePath) {
            await supabase.storage.from('documents').remove([storagePath]);
          }
        } catch {}
      }
      fetchServiceData();
    } catch (err) {
      alert('Error al eliminar el documento.');
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#fcfcfc] min-h-screen p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-700 font-semibold">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#fcfcfc] min-h-screen relative overflow-hidden">
      {/* Gradiente de fondo */}
      <div className="absolute top-[-150px] left-1/2 transform -translate-x-1/2 translate-x-[200px] w-[1000px] h-[1000px] pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-[800px] h-[800px] rounded-full bg-blue-300 opacity-40 blur-[120px]"></div>
        <div className="absolute top-[100px] left-[100px] w-[700px] h-[700px] rounded-full bg-purple-300 opacity-30 blur-[100px]"></div>
        <div className="absolute top-[150px] left-[150px] w-[600px] h-[600px] rounded-full bg-blue-200 opacity-25 blur-[80px]"></div>
      </div>

      {/* Header con Breadcrumbs */}
      <div className="flex items-center justify-between px-[164px] py-4 relative z-10">
        <div className="flex gap-8 items-center py-6">
          {/* Botón Volver */}
          <button
            onClick={() => navigate(-1)}
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
              {service?.construction?.name || 'Obra nueva'}
            </span>
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
              <path d="M7.5 15L12.5 10L7.5 5" stroke="#666e85" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="font-figtree font-semibold text-sm text-zen-grey-600 whitespace-pre">
              Documentación {service?.service_type?.name}
            </span>
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
              <path d="M7.5 15L12.5 10L7.5 5" stroke="#666e85" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="font-figtree font-semibold text-sm text-zen-grey-600 whitespace-pre">
              {category}
            </span>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="px-[164px] pt-0 pb-10 relative z-10">
        <div className="flex flex-col gap-10 w-full max-w-[1112px]">
          {/* Badge + Título */}
          <div className="flex flex-col gap-4 w-full max-w-[735px]">
            {/* Badge del servicio */}
            <div className="bg-zen-blue-50 flex gap-1 items-center px-2 py-1 rounded w-fit">
              <svg className="w-4 h-4 text-zen-grey-600">
                <use href={getIconByServiceName(service?.service_type?.name || '')} />
              </svg>
              <span className="font-figtree font-semibold text-sm text-zen-grey-600">
                {service?.service_type?.name}
              </span>
            </div>

            {/* Título y descripción */}
            <div className="flex flex-col gap-2">
              <h1 className="font-figtree font-semibold text-[21px] leading-[1.5] text-[#000a29]">
                {category}
              </h1>
              <p className="font-figtree font-normal text-base leading-[1.47] text-[#0a110f]">
                {category}
              </p>
            </div>
          </div>

          {/* Lista de documentos requeridos */}
          <div className="flex flex-col gap-10 w-full max-w-[735px]">
            {requiredDocuments.length === 0 ? (
              <p className="text-gray-600">
                No hay documentos requeridos para esta categoría.
              </p>
            ) : (
              <>
            {/* Ordenar: primero los de texto, luego los de archivo, luego los mixtos (null) */}
            {(() => {
              const textOnlyDocs = requiredDocuments.filter(
                (doc) => doc.documentation_type?.requires_file === false
              );
              const fileOnlyDocs = requiredDocuments.filter(
                (doc) => doc.documentation_type?.requires_file === true
              );
              const mixedDocs = requiredDocuments.filter(
                (doc) => doc.documentation_type?.requires_file === null
              );
              const orderedDocs = [...textOnlyDocs, ...fileOnlyDocs, ...mixedDocs];
              return orderedDocs.map((requiredDoc) => {
                const existingDoc = getExistingDocument(
                  requiredDoc.document_type_id
                );
                const requiresFile =
                  requiredDoc.documentation_type?.requires_file;
                // Extraer nombre de archivo del link
                let existingFileName = '';
                if (existingDoc && existingDoc.link) {
                  try {
                    const urlParts = existingDoc.link.split('/');
                    existingFileName = decodeURIComponent(
                      urlParts[urlParts.length - 1]
                    );
                  } catch {}
                }
                return (
                  <div
                    key={requiredDoc.document_type_id}
                    className="flex flex-col gap-4 w-full"
                  >
                    {requiresFile === false ? (
                      // Solo input de texto
                      <div className="flex flex-col gap-4 w-full">
                        <p className="font-figtree font-semibold text-base leading-[1.47] text-black">
                          {requiredDoc.documentation_type?.name ||
                            `Documento ${requiredDoc.document_type_id}`}
                          <span className="font-normal text-zen-blue-500">*</span>
                        </p>
                        <div className="flex flex-col gap-1 w-[348px]">
                          <input
                            type="text"
                            className="bg-white border border-zen-grey-300 rounded px-4 py-3 text-base font-figtree text-zen-blue-950 focus:outline-none focus:border-zen-blue-500"
                            placeholder="XXXXXXXXXXXXXXXXXXXX"
                            value={
                              textValues[requiredDoc.document_type_id] ?? ''
                            }
                            onChange={(e) => {
                              const value = e.target.value;
                              setTextValues((prev) => ({
                                ...prev,
                                [requiredDoc.document_type_id]: value,
                              }));
                              setSavingTextId(requiredDoc.document_type_id);
                              setSavedTextId(null);
                              if (
                                debounceTimeouts.current[
                                  requiredDoc.document_type_id
                                ]
                              ) {
                                clearTimeout(
                                  debounceTimeouts.current[
                                    requiredDoc.document_type_id
                                  ]
                                );
                              }
                              debounceTimeouts.current[
                                requiredDoc.document_type_id
                              ] = setTimeout(async () => {
                                await saveTextDocument(
                                  requiredDoc.document_type_id,
                                  value,
                                  textDocumentIds[requiredDoc.document_type_id]
                                );
                              }, 1000);
                            }}
                          />
                          <span className="text-xs text-zen-grey-400 h-4 font-figtree">
                            {savingTextId === requiredDoc.document_type_id
                              ? 'Guardando...'
                              : savedTextId === requiredDoc.document_type_id
                              ? 'Guardado'
                              : ''}
                          </span>
                        </div>
                      </div>
                      ) : requiresFile === true ? (
                        // Solo input de archivo
                        <div className="flex flex-col gap-4 w-full">
                          <p className="font-figtree font-semibold text-base leading-[1.47] text-black">
                            {requiredDoc.documentation_type?.name ||
                              `Documento ${requiredDoc.document_type_id}`}
                            <span className="font-normal text-zen-blue-500">*</span>
                          </p>
                          <div className="flex flex-col gap-4 w-full">
                            {/* Área de subida de archivos */}
                            <div
                              className={`border-2 border-dotted rounded-md p-4 text-center transition-all ${
                                existingFileName && !fileUploadStates[requiredDoc.document_type_id]?.selectedFile
                                  ? 'bg-zen-grey-100 border-zen-grey-300 cursor-not-allowed'
                                  : fileUploadStates[requiredDoc.document_type_id]?.dragOver
                                  ? 'border-zen-blue-500 bg-zen-blue-50 cursor-pointer'
                                  : 'bg-white border-zen-blue-500 hover:bg-zen-blue-50 cursor-pointer'
                              }`}
                              onClick={() => {
                                const isDisabled = existingFileName && !fileUploadStates[requiredDoc.document_type_id]?.selectedFile;
                                if (!isDisabled) {
                                  document.getElementById(`document-file-upload-${requiredDoc.document_type_id}`)?.click();
                                }
                              }}
                              onDragOver={(e) =>
                                handleDragOver(requiredDoc.document_type_id, e)
                              }
                              onDragLeave={() =>
                                handleDragLeave(requiredDoc.document_type_id)
                              }
                              onDrop={(e) =>
                                handleDrop(requiredDoc.document_type_id, e)
                              }
                            >
                              <div className="flex flex-col gap-3 items-center">
                                {/* Icono de upload */}
                                <div className={`bg-zen-grey-100 rounded-full p-[9px] w-[44px] h-[44px] flex items-center justify-center ${
                                  existingFileName && !fileUploadStates[requiredDoc.document_type_id]?.selectedFile ? 'opacity-50' : ''
                                }`}>
                                  <img
                                    src={existingFileName && !fileUploadStates[requiredDoc.document_type_id]?.selectedFile
                                      ? "/upload-simple-grey-icon.svg"
                                      : "/upload-simple-icon.svg"}
                                    alt=""
                                    className="w-6 h-6"
                                  />
                                </div>

                                {/* Texto */}
                                <div className="flex flex-col gap-1 items-center text-center">
                                  <p className={`font-figtree font-semibold text-sm leading-[1.25] ${
                                    existingFileName && !fileUploadStates[requiredDoc.document_type_id]?.selectedFile
                                      ? 'text-zen-grey-600'
                                      : ''
                                  }`}>
                                    <span className={existingFileName && !fileUploadStates[requiredDoc.document_type_id]?.selectedFile ? '' : 'text-zen-blue-500'}>
                                      Arrastra aquí tus archivos
                                    </span>
                                    {' '}
                                    <span className="font-normal text-zen-grey-700">
                                      o haz clic para subir
                                    </span>
                                  </p>
                                  <p className="font-figtree font-normal text-xs leading-[1.35] text-zen-grey-500">
                                    PDF, JPEG o PNG (max. 30 MB)
                                  </p>
                                </div>

                                {/* Input file oculto */}
                                <input
                                  type="file"
                                  onChange={(e) =>
                                    handleFileSelect(
                                      requiredDoc.document_type_id,
                                      e
                                    )
                                  }
                                  disabled={
                                    !!(fileUploadStates[
                                      requiredDoc.document_type_id
                                    ]?.submitting ||
                                    (existingFileName &&
                                      !fileUploadStates[
                                        requiredDoc.document_type_id
                                      ]?.selectedFile))
                                  }
                                  className="hidden"
                                  id={`document-file-upload-${requiredDoc.document_type_id}`}
                                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                                />
                              </div>
                            </div>

                            {/* Mensajes de estado */}
                            {fileUploadStates[requiredDoc.document_type_id]?.submitting && (
                              <div className="flex items-center text-zen-blue-500 text-sm font-figtree">
                                <Upload className="w-4 h-4 mr-2 animate-spin" />
                                Subiendo...
                              </div>
                            )}
                            {fileUploadStates[requiredDoc.document_type_id]?.error && (
                              <div className="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-700 font-figtree">
                                {fileUploadStates[requiredDoc.document_type_id]?.error}
                              </div>
                            )}
                            {fileUploadStates[requiredDoc.document_type_id]?.successMessage && (
                              <div className="bg-green-50 border border-green-200 rounded p-2 text-sm text-green-700 font-figtree">
                                {fileUploadStates[requiredDoc.document_type_id]?.successMessage}
                              </div>
                            )}

                            {/* Documento subido - mostrar debajo del input */}
                            {existingFileName && existingDoc && (
                              <div className="bg-[#fcfcfc] border border-[#d0d3dd] rounded-lg flex items-center justify-between p-4 gap-4">
                                {/* Nombre del archivo con check */}
                                <div className="flex gap-1 items-start min-w-0 flex-1 overflow-hidden">
                                  <svg className="w-6 h-6 shrink-0 text-zen-green-500">
                                    <use href="/icons.svg#check-circle" />
                                  </svg>
                                  <p title={existingFileName} className="font-figtree font-medium text-base leading-[1.47] text-[#0f1422] truncate overflow-hidden text-ellipsis whitespace-nowrap">
                                    {existingFileName}
                                  </p>
                                </div>

                                {/* Botones de descarga y eliminar */}
                                <div className="flex gap-6 items-start shrink-0">
                                  <button
                                    onClick={() => handleDownload(existingDoc.link ?? '', existingFileName)}
                                    className="bg-[#f2f3f7] flex items-center justify-center  rounded-[1000px] w-10 h-10 hover:bg-zen-grey-300 transition-colors"
                                    title="Descargar documento"
                                  >
                                    <svg className="w-4 h-4 text-zen-blue-500">
                                      <use href="/icons.svg#download" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDocument(existingDoc.id, existingDoc.link || undefined)}
                                    className="bg-[#f2f3f7] flex items-center justify-center  rounded-[1000px] w-10 h-10 hover:bg-zen-error-100 transition-colors"
                                    title="Eliminar documento"
                                  >
                                    <svg className="w-4 h-4 text-zen-blue-500">
                                      <use href="/icons.svg#trash" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Documento de template disponible para descarga - mostrar debajo del input si no hay documento subido */}
                            {!existingFileName && requiredDoc.documentation_type?.url_template && (
                              <div className="bg-zen-blue-50 border border-zen-blue-200 rounded-lg flex items-center justify-between p-4 gap-4">
                                {/* Nombre del template con icono */}
                                <div className="flex gap-1 items-start min-w-0 flex-1 overflow-hidden">
                                  <svg className="w-6 h-6 shrink-0 text-zen-blue-500">
                                    <use href="/icons.svg#document-text" />
                                  </svg>
                                  <div className="flex flex-col gap-1">
                                    <p className="font-figtree font-medium text-base leading-[1.47] text-[#0f1422] truncate overflow-hidden text-ellipsis whitespace-nowrap">
                                      {requiredDoc.documentation_type?.name} (Plantilla)
                                    </p>
                                    <p className="font-figtree font-normal text-sm text-zen-grey-600">
                                     Plantilla de {requiredDoc.documentation_type?.name}
                                    </p>
                                  </div>
                                </div>

                                {/* Botón de descarga */}
                                <div className="flex gap-6 items-start shrink-0">
                                  <button
                                    onClick={() => {
                                      const templateUrl = requiredDoc.documentation_type?.url_template;
                                      if (templateUrl) {
                                        // Extraer la extensión real del archivo desde la URL
                                        const urlParts = templateUrl.split('/');
                                        const fileNameWithExtension = urlParts[urlParts.length - 1];
                                        const extension = fileNameWithExtension.includes('.') 
                                          ? fileNameWithExtension.split('.').pop() 
                                          : 'pdf';
                                        
                                        const fileName = `${requiredDoc.documentation_type?.name || 'Documento'}_Template.${extension}`;
                                        handleDownload(templateUrl, fileName);
                                      }
                                    }}
                                    className="bg-zen-blue-500 text-white flex items-center justify-center rounded-[1000px] w-10 h-10 hover:bg-zen-blue-600 transition-colors"
                                    title="Descargar plantilla"
                                  >
                                    <svg className="w-4 h-4 text-white">
                                      <use href="/icons.svg#download" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        // Ambos tipos: requires_file === null
                        <div className="flex flex-col gap-6 w-full">
                          {/* Título del documento */}
                          <p className="font-figtree font-semibold text-base leading-[1.47] text-black">
                            {requiredDoc.documentation_type?.name ||
                              `Documento ${requiredDoc.document_type_id}`}
                            <span className="font-normal text-zen-blue-500">*</span>
                          </p>
                          
                          {/* Sección de texto */}
                          <div className="flex flex-col gap-4 w-full">
                            <h4 className="font-figtree font-medium text-sm leading-[1.25] text-zen-grey-700">
                              Información de texto
                            </h4>
                            <div className="flex flex-col gap-1 w-[348px]">
                              <input
                                type="text"
                                className="bg-white border border-zen-grey-300 rounded px-4 py-3 text-base font-figtree text-zen-blue-950 focus:outline-none focus:border-zen-blue-500"
                                placeholder="Ingrese la información del documento"
                                value={
                                  textValues[requiredDoc.document_type_id] ?? ''
                                }
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setTextValues((prev) => ({
                                    ...prev,
                                    [requiredDoc.document_type_id]: value,
                                  }));
                                  setSavingTextId(requiredDoc.document_type_id);
                                  setSavedTextId(null);
                                  if (
                                    debounceTimeouts.current[
                                      requiredDoc.document_type_id
                                    ]
                                  ) {
                                    clearTimeout(
                                      debounceTimeouts.current[
                                        requiredDoc.document_type_id
                                      ]
                                    );
                                  }
                                  debounceTimeouts.current[
                                    requiredDoc.document_type_id
                                  ] = setTimeout(async () => {
                                    await saveTextDocument(
                                      requiredDoc.document_type_id,
                                      value,
                                      textDocumentIds[requiredDoc.document_type_id]
                                    );
                                  }, 1000);
                                }}
                              />
                              <span className="text-xs text-zen-grey-400 h-4 font-figtree">
                                {savingTextId === requiredDoc.document_type_id
                                  ? 'Guardando...'
                                  : savedTextId === requiredDoc.document_type_id
                                  ? 'Guardado'
                                  : ''}
                              </span>
                            </div>
                          </div>

                          {/* Separador */}
                          <div className="border-t border-zen-grey-200 w-full"></div>

                          {/* Sección de archivo */}
                          <div className="flex flex-col gap-4 w-full">
                            <h4 className="font-figtree font-medium text-sm leading-[1.25] text-zen-grey-700">
                              Archivo adjunto
                            </h4>
                            {/* Área de subida de archivos */}
                            <div
                              className={`border-2 border-dotted rounded-md p-4 text-center transition-all ${
                                existingFileName && !fileUploadStates[requiredDoc.document_type_id]?.selectedFile
                                  ? 'bg-zen-grey-100 border-zen-grey-300 cursor-not-allowed'
                                  : fileUploadStates[requiredDoc.document_type_id]?.dragOver
                                  ? 'border-zen-blue-500 bg-zen-blue-50 cursor-pointer'
                                  : 'bg-white border-zen-blue-500 hover:bg-zen-blue-50 cursor-pointer'
                              }`}
                              onClick={() => {
                                const isDisabled = existingFileName && !fileUploadStates[requiredDoc.document_type_id]?.selectedFile;
                                if (!isDisabled) {
                                  document.getElementById(`document-file-upload-${requiredDoc.document_type_id}`)?.click();
                                }
                              }}
                              onDragOver={(e) =>
                                handleDragOver(requiredDoc.document_type_id, e)
                              }
                              onDragLeave={() =>
                                handleDragLeave(requiredDoc.document_type_id)
                              }
                              onDrop={(e) =>
                                handleDrop(requiredDoc.document_type_id, e)
                              }
                            >
                              <div className="flex flex-col gap-3 items-center">
                                {/* Icono de upload */}
                                <div className={`bg-zen-grey-100 rounded-full p-[9px] w-[44px] h-[44px] flex items-center justify-center ${
                                  existingFileName && !fileUploadStates[requiredDoc.document_type_id]?.selectedFile ? 'opacity-50' : ''
                                }`}>
                                  <img
                                    src={existingFileName && !fileUploadStates[requiredDoc.document_type_id]?.selectedFile
                                      ? "/upload-simple-grey-icon.svg"
                                      : "/upload-simple-icon.svg"}
                                    alt=""
                                    className="w-6 h-6"
                                  />
                                </div>

                                {/* Texto */}
                                <div className="flex flex-col gap-1 items-center text-center">
                                  <p className={`font-figtree font-semibold text-sm leading-[1.25] ${
                                    existingFileName && !fileUploadStates[requiredDoc.document_type_id]?.selectedFile
                                      ? 'text-zen-grey-600'
                                      : ''
                                  }`}>
                                    <span className={existingFileName && !fileUploadStates[requiredDoc.document_type_id]?.selectedFile ? '' : 'text-zen-blue-500'}>
                                      Arrastra aquí tus archivos
                                    </span>
                                    {' '}
                                    <span className="font-normal text-zen-grey-700">
                                      o haz clic para subir
                                    </span>
                                  </p>
                                  <p className="font-figtree font-normal text-xs leading-[1.35] text-zen-grey-500">
                                    PDF, JPEG o PNG (max. 30 MB)
                                  </p>
                                </div>

                                {/* Input file oculto */}
                                <input
                                  type="file"
                                  id={`document-file-upload-${requiredDoc.document_type_id}`}
                                  className="hidden"
                                  onChange={(e) =>
                                    handleFileSelect(
                                      requiredDoc.document_type_id,
                                      e
                                    )
                                  }
                                  accept=".pdf,.jpg,.jpeg,.png"
                                />
                              </div>

                              {/* Archivo seleccionado o existente */}
                              {(fileUploadStates[requiredDoc.document_type_id]?.selectedFile || existingFileName) && (
                                <div className="mt-3 p-3 bg-zen-grey-100 rounded border border-zen-grey-200">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <FileText className="w-4 h-4 text-zen-grey-600" />
                                      <span className="text-sm font-medium text-zen-grey-700">
                                        {fileUploadStates[requiredDoc.document_type_id]?.selectedFile?.name || existingFileName}
                                      </span>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (fileUploadStates[requiredDoc.document_type_id]?.selectedFile) {
                                          clearFileSelection(requiredDoc.document_type_id);
                                        }
                                      }}
                                      className="text-zen-grey-500 hover:text-red-500 transition-colors"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Mensajes de estado del archivo */}
                            {fileUploadStates[requiredDoc.document_type_id]?.error && (
                              <p className="text-red-600 text-sm">
                                {fileUploadStates[requiredDoc.document_type_id]?.error}
                              </p>
                            )}
                            {fileUploadStates[requiredDoc.document_type_id]?.successMessage && (
                              <p className="text-green-600 text-sm">
                                {fileUploadStates[requiredDoc.document_type_id]?.successMessage}
                              </p>
                            )}

                            {/* Botón de subida para archivos */}
                            {fileUploadStates[requiredDoc.document_type_id]?.selectedFile && (
                              <button
                                onClick={() => handleUploadFile(requiredDoc.document_type_id)}
                                disabled={fileUploadStates[requiredDoc.document_type_id]?.submitting}
                                className="bg-zen-blue-500 text-white px-4 py-2 rounded hover:bg-zen-blue-600 disabled:opacity-50 transition-colors"
                              >
                                {fileUploadStates[requiredDoc.document_type_id]?.submitting 
                                  ? 'Subiendo...' 
                                  : 'Subir archivo'
                                }
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                );
              });
            })()}

            {/* Botón Footer - Volver a la documentación */}
            <div className="flex justify-end w-full mt-6">
              <button
                onClick={() => {
                    navigate(`/servicios/${serviceId}/documentos`)
                    trackEvent('Back Button Pressed', {
                      page_title: 'Documentos de la categoría',
                      new_construction_id: service?.construction?.name || '',
                      service_type: service?.service_type?.name || '',
                      document_type: category,
                      document_number: requiredDocuments.length
                    })
                  }
                }
                className="flex gap-[3px] items-center justify-center px-0 py-3 rounded transition-colors hover:opacity-80"
              >
                <svg className="w-5 h-5 shrink-0 text-zen-blue-500 rotate-90 mt-[1px]" viewBox="0 0 16 16" fill="currentColor">
                  <use href="/icons.svg#caret-down" />
                </svg>
                <span className="font-figtree font-semibold text-base text-zen-blue-500 whitespace-pre">
                  Volver a la documentación
                </span>
              </button>
            </div>
            </>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
