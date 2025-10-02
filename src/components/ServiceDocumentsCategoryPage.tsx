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
  // const [service, setService] = useState<any>(null); // No se usa
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
        .select(`*, service_type (id, name), construction (id, name, address)`) // simplificado
        .eq('id', serviceId)
        .single();
      if (serviceError) throw serviceError;
      // setService(serviceData); // Eliminado porque no se usa

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

  const handleDownload = (fileUrl: string, fileName: string) => {
    // Descarga directa usando un enlace temporal
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        <span className="ml-4 text-gray-600">Cargando documentos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="p-6">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200 mb-6"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Volver
            </button>
            <div className="text-red-700 font-semibold">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200 mb-6"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Volver
      </button>
      <div className="flex items-center mb-6">
        <FileText className="w-6 h-6 text-blue-600 mr-3" />
        <h1 className="text-2xl font-bold text-gray-900">
          Documentos de la categoría: {category}
        </h1>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {requiredDocuments.length === 0 ? (
          <p className="text-gray-600">
            No hay documentos requeridos para esta categoría.
          </p>
        ) : (
          <div className="space-y-6">
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
                    className="p-4 bg-gray-50 border rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      {getStatusIcon(existingDoc)}
                      <div className="ml-4">
                        <h4 className="text-md font-medium text-gray-900">
                          {requiredDoc.documentation_type?.name ||
                            `Documento ${requiredDoc.document_type_id}`}
                        </h4>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {requiresFile === false ? (
                        // ...existing code for text documents...
                        <div className="flex flex-col gap-1 min-w-[250px]">
                          <textarea
                            className="border border-gray-300 rounded px-2 py-1 text-sm resize-none min-h-[40px]"
                            placeholder="Introduce el texto..."
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
                          <span className="text-xs text-gray-400 h-4">
                            {savingTextId === requiredDoc.document_type_id
                              ? 'Guardando...'
                              : savedTextId === requiredDoc.document_type_id
                              ? 'Guardado'
                              : ''}
                          </span>
                          {(
                            textValues[requiredDoc.document_type_id] ?? ''
                          ).trim() && (
                            <div className="mt-2">
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Vista previa del texto aportado:
                              </label>
                              <div className="whitespace-pre-line bg-gray-50 border border-gray-200 rounded p-2 text-gray-800 text-xs">
                                {textValues[requiredDoc.document_type_id]}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          {/* Mostrar nombre del archivo subido si existe y no hay uno nuevo en proceso */}
                          {existingFileName &&
                            !fileUploadStates[requiredDoc.document_type_id]
                              ?.selectedFile && (
                              <div className="flex items-center bg-blue-50 border border-blue-200 rounded px-3 py-2 mb-2">
                                <FileText className="w-5 h-5 text-blue-500 mr-2" />
                                <span
                                  className="text-sm text-blue-900 font-medium mr-4 truncate max-w-[180px]"
                                  title={existingFileName}
                                >
                                  {existingFileName}
                                </span>
                                <button
                                  onClick={() =>
                                    handleDownload(
                                      existingDoc.link ?? '',
                                      existingFileName
                                    )
                                  }
                                  className="p-1 text-gray-400 hover:text-green-500 hover:bg-green-100 rounded transition-colors duration-200"
                                  title="Descargar documento"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeleteDocument(
                                      existingDoc.id,
                                      existingDoc.link
                                    )
                                  }
                                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-100 rounded transition-colors duration-200"
                                  title="Eliminar documento"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          <div className="w-full">
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                              Subir Archivo
                            </label>
                            <div
                              className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300 ${
                                fileUploadStates[requiredDoc.document_type_id]
                                  ?.dragOver
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                              }`}
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
                              {fileUploadStates[requiredDoc.document_type_id]
                                ?.selectedFile ? (
                                <div className="space-y-3">
                                  <FileText className="w-12 h-12 text-green-500 mx-auto" />
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      {
                                        fileUploadStates[
                                          requiredDoc.document_type_id
                                        ]?.selectedFile?.name
                                      }
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {fileUploadStates[
                                        requiredDoc.document_type_id
                                      ]?.selectedFile &&
                                      typeof fileUploadStates[
                                        requiredDoc.document_type_id
                                      ]?.selectedFile.size === 'number'
                                        ? `${(
                                            fileUploadStates[
                                              requiredDoc.document_type_id
                                            ]!.selectedFile!.size / 1024
                                          ).toFixed(2)} KB`
                                        : ''}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() =>
                                      setFileUploadStates((prev) => ({
                                        ...prev,
                                        [requiredDoc.document_type_id]: {
                                          ...prev[requiredDoc.document_type_id],
                                          selectedFile: null,
                                          error: null,
                                          successMessage: null,
                                        },
                                      }))
                                    }
                                    disabled={
                                      fileUploadStates[
                                        requiredDoc.document_type_id
                                      ]?.submitting
                                    }
                                    className="text-sm text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
                                  >
                                    Quitar archivo
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <Upload
                                    className={`w-12 h-12 mx-auto ${
                                      fileUploadStates[
                                        requiredDoc.document_type_id
                                      ]?.dragOver
                                        ? 'text-blue-500'
                                        : 'text-gray-400'
                                    }`}
                                  />
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      Arrastra un archivo aquí
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      o haz clic para seleccionar
                                    </p>
                                  </div>
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
                                  <label
                                    htmlFor={`document-file-upload-${requiredDoc.document_type_id}`}
                                    className={`inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors duration-200 cursor-pointer disabled:opacity-50 ${
                                      existingFileName &&
                                      !fileUploadStates[
                                        requiredDoc.document_type_id
                                      ]?.selectedFile
                                        ? 'opacity-50 pointer-events-none'
                                        : ''
                                    }`}
                                  >
                                    <Upload className="w-4 h-4 mr-2" />
                                    Seleccionar Archivo
                                  </label>
                                </div>
                              )}
                            </div>
                            {fileUploadStates[requiredDoc.document_type_id]
                              ?.error && (
                              <div className="bg-red-50 border border-red-200 rounded-lg p-2 mt-2 text-sm text-red-700">
                                {
                                  fileUploadStates[requiredDoc.document_type_id]
                                    ?.error
                                }
                              </div>
                            )}
                            {fileUploadStates[requiredDoc.document_type_id]
                              ?.successMessage && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-2 mt-2 text-sm text-green-700">
                                {
                                  fileUploadStates[requiredDoc.document_type_id]
                                    ?.successMessage
                                }
                              </div>
                            )}
                            <div className="flex justify-end mt-4">
                              {fileUploadStates[requiredDoc.document_type_id]
                                ?.submitting && (
                                <span className="flex items-center text-blue-600 text-sm">
                                  <Upload className="w-4 h-4 mr-2 animate-spin" />
                                  Subiendo...
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-2 text-center">
                              Formatos soportados: PDF, DOC, DOCX, JPG, JPEG,
                              PNG, TXT
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>
      {/* No modal, solo área inline de subida */}
    </div>
  );
}
