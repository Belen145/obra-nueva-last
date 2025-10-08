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

export default function ServiceDocumentsCategoryPage() {
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

  // Función para autoguardado de texto
  async function saveTextDocument(
    documentTypeId: number,
    value: string,
    documentId?: number | null
  ) {
    if (!serviceId) return;
    setSavingTextId(documentTypeId);
    let result;
    if (documentId) {
      // Update
      const { error } = await supabase
        .from('documents')
        .update({
          content_text: value,
          updated_at: new Date().toISOString(),
          document_status_id: 3,
        })
        .eq('id', documentId);
      result = !error;
    } else {
      // Insert
      const { error, data } = await supabase
        .from('documents')
        .insert({
          service_id: parseInt(serviceId!),
          document_type_id: documentTypeId,
          content_text: value,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          document_status_id: 3,
        })
        .select();
      result = !error;
      if (data && data[0] && data[0].id) {
        setTextDocumentIds((prev) => ({
          ...prev,
          [documentTypeId]: data[0].id,
        }));
      }
    }
    setSavingTextId(null);
    setSavedTextId(documentTypeId);
    fetchServiceData();
    return result;
  }
  // Sincronizar los valores del textarea con los documentos existentes cada vez que cambian
  useEffect(() => {
    if (requiredDocuments.length > 0) {
      const initial: Record<number, string> = {};
      const initialIds: Record<number, number | null> = {};
      requiredDocuments.forEach((doc) => {
        if (doc.documentation_type?.requires_file === false) {
          const existing = existingDocuments.find(
            (e) => e.document_type_id === doc.document_type_id
          );
          initial[doc.document_type_id] = existing?.content_text || '';
          initial[doc.document_type_id] = existing?.content_text || '';
          initialIds[doc.document_type_id] = existing?.id ?? null;
        }
      });
      setTextValues(initial);
      setTextDocumentIds(initialIds);
    }
  }, [existingDocuments, requiredDocuments]);

  // Mantener fetchServiceData solo para la primera carga
  useEffect(() => {
    if (serviceId && category) {
      fetchServiceData();
    }
    // eslint-disable-next-line
  }, [serviceId, category]);

  const fetchServiceData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Obtener servicio
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select(`*, service_type (id, name), construction (id, name, address)`)
        .eq('id', serviceId)
        .single();
      if (serviceError) throw serviceError;
      setService(serviceData);

      // Obtener documentos requeridos filtrados por categoría
      const { data: requiredDocsData, error: requiredDocsError } =
        await supabase
          .from('service_required_document')
          .select(
            `*, documentation_type (id, name, category, requires_file, url_template)`
          )
          .eq('service_type_id', serviceData.type_id);
      if (requiredDocsError) throw requiredDocsError;
      const filteredRequired = (requiredDocsData || []).filter(
        (doc) =>
          (doc.documentation_type?.category || 'Sin categoría') === category
      );
      setRequiredDocuments(filteredRequired);

      // Obtener documentos existentes
      const { data: existingDocsData, error: existingDocsError } =
        await supabase
          .from('documents')
          .select(
            `*, document_status (id, name, is_incidence), documentation_type (id, name, category, requires_file)`
          )
          .eq('service_id', serviceId);
      if (existingDocsError) throw existingDocsError;
      setExistingDocuments(existingDocsData || []);
    } catch (err) {
      setError((err as Error).message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const getExistingDocument = (documentTypeId: number) => {
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
  const handleSubmit = async (documentTypeId: number, fileArg?: File) => {
    const file = fileArg || fileUploadStates[documentTypeId]?.selectedFile;
    console.log('[handleSubmit] called for docType:', documentTypeId, file);
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
      const filePath = `documents/${serviceId}/${fileName}`;
      console.log('[handleSubmit] uploading file to storage:', filePath, file);
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });
      if (uploadError)
        throw new Error(`Error al subir archivo: ${uploadError.message}`);
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);
      fileUrl = urlData.publicUrl;
      console.log('[handleSubmit] file uploaded, url:', fileUrl);
      // Guardar en tabla documents
      const docPayload = {
        service_id: parseInt(serviceId!),
        document_type_id: documentTypeId,
        link: fileUrl,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        document_status_id: 3,
      };
      console.log('[handleSubmit] inserting into documents:', docPayload);
      const { error: docError } = await supabase
        .from('documents')
        .insert(docPayload);
      if (docError) {
        console.error('Error al guardar documento:', docError);
        throw new Error(
          `Error al guardar documento: ${
            docError.message || JSON.stringify(docError)
          }`
        );
      }
      setFileUploadStates((prev) => ({
        ...prev,
        [documentTypeId]: {
          ...prev[documentTypeId],
          submitting: false,
          selectedFile: null,
          successMessage: 'Documento subido exitosamente.',
        },
      }));
      fetchServiceData();
    } catch (err) {
      setFileUploadStates((prev) => ({
        ...prev,
        [documentTypeId]: {
          ...prev[documentTypeId],
          submitting: false,
          error: err instanceof Error ? err.message : 'Error desconocido',
        },
      }));
    }
  };

  const handleDownload = async (fileUrl: string, fileName: string) => {
    console.log('[handleDownload] fileUrl:', fileUrl, 'fileName:', fileName);
    
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
    if (!documentId) return;
    try {
      // Eliminar de la base de datos
      await supabase.from('documents').delete().eq('id', documentId);
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
            {/* Ordenar: primero los de texto, luego los de archivo */}
            {(() => {
              const textDocs = requiredDocuments.filter(
                (doc) => doc.documentation_type?.requires_file !== true
              );
              const fileDocs = requiredDocuments.filter(
                (doc) => doc.documentation_type?.requires_file === true
              );
              const orderedDocs = [...textDocs, ...fileDocs];
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
                      // Input de texto
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
                      ) : (
                        // Input de archivo
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
                                    fileUploadStates[
                                      requiredDoc.document_type_id
                                    ]?.submitting ||
                                    (existingFileName &&
                                      !fileUploadStates[
                                        requiredDoc.document_type_id
                                      ]?.selectedFile)
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
                            {existingFileName && (
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
                                    onClick={() => handleDeleteDocument(existingDoc.id, existingDoc.link)}
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
                onClick={() => navigate(`/servicios/${serviceId}/documentos`)}
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
