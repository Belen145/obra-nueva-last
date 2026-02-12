import React, { useState, useRef, useEffect } from 'react';
import { FileText, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNotification } from '../contexts/NotificationContext';
import { trackEvent } from '../lib/amplitude';

// ---------------------------------------------
// ServiceIncidenceModal - Figma Design
// Two-column modal for resolving service incidences
// ---------------------------------------------

interface ServiceTypeStatus {
  id: number;
  orden: number;
  services_status: {
    id: number;
    name: string;
  };
}

interface ServiceIncidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  service: any;
  construction?: {
    id: number;
    name: string;
  };
}

export const ServiceIncidenceModal: React.FC<ServiceIncidenceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  service,
  construction: constructionProp,
}) => {
  const { showNotification } = useNotification();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCommentExpanded, setIsCommentExpanded] = useState(false);
  const [showLeerMas, setShowLeerMas] = useState(false);
  const [serviceTypeStatuses, setServiceTypeStatuses] = useState<ServiceTypeStatus[]>([]);
  const [construction, setConstruction] = useState<{ id: number; name: string } | null>(constructionProp || null);
  const [isProgressExpanded, setIsProgressExpanded] = useState(false);

  const commentRef = useRef<HTMLDivElement>(null);

  // Fetch construction and service type statuses if not passed
  useEffect(() => {
    if (!isOpen || !service) return;

    const fetchData = async () => {
      try {
        // Fetch construction if not provided
        if (!constructionProp && service.construction_id) {
          const { data: constructionData } = await supabase
            .from('construction')
            .select('id, name')
            .eq('id', service.construction_id)
            .single();
          
          if (constructionData) {
            setConstruction(constructionData);
          }
        }

        // Fetch service type statuses for progress tracker
        if (service.type_id) {
          const { data: statusesData } = await supabase
            .from('service_type_status')
            .select(`*, services_status (id, name)`)
            .eq('service_type_id', service.type_id)
            .order('orden');
          
          if (statusesData) {
            setServiceTypeStatuses(statusesData);
          }
        }
      } catch (err) {
        console.error('Error fetching modal data:', err);
      }
    };

    fetchData();
  }, [isOpen, service, constructionProp]);

  // Check if comment text needs "Leer más" button
  useEffect(() => {
    if (commentRef.current && service?.comment) {
      const lineHeight = 24;
      const maxHeight = lineHeight * 3;
      const actualHeight = commentRef.current.scrollHeight;
      setShowLeerMas(actualHeight > maxHeight);
    }
  }, [service?.comment]);

  // Get current status index for progress tracker
  const getCurrentStatusIndex = () => {
    if (!service || !serviceTypeStatuses.length) return -1;
    
    const isIncidence = service.services_status?.is_incidence;
    const trackerStatusId = isIncidence && service.previous_status_id 
      ? service.previous_status_id 
      : service.status_id;
    
    return serviceTypeStatuses.findIndex(
      (sts) => sts.services_status.id === trackerStatusId
    );
  };

  // Get service icon based on type
  const getServiceIcon = (serviceName: string | undefined): string => {
    const name = serviceName?.toLowerCase() || '';
    if (name.includes('luz') && name.includes('obra')) return 'luz-obra';
    if (name.includes('luz') && name.includes('definitiva')) return 'luz-definitiva';
    if (name.includes('agua') && name.includes('obra')) return 'agua-obra';
    if (name.includes('agua') && name.includes('pci')) return 'shield';
    if (name.includes('agua') && name.includes('definitiva')) return 'agua-definitiva';
    if (name.includes('gas')) return 'gas';
    if (name.includes('teleco')) return 'telephone';
    return 'lightning';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile && !textContent.trim()) {
      setError('Debes subir un archivo o escribir un texto para continuar');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      let fileUrl: string | null = null;

      // 1. Upload file if exists
      if (selectedFile) {
        const timestamp = Date.now();
        const fileExtension = selectedFile.name.split('.').pop();
        const cleanFileName = selectedFile.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `incidence_${timestamp}_${cleanFileName}.${fileExtension}`;
        const filePath = `incidences/${service.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, selectedFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Error al subir archivo: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);

        fileUrl = urlData.publicUrl;
      }

      // 2. Save in incidence_documents
      const { error: incidenceError } = await supabase
        .from('incidence_documents')
        .insert({
          service_id: service.id,
          service_status_id: service.status_id,
          link: fileUrl,
          content_text: textContent.trim() || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (incidenceError) {
        if (fileUrl && selectedFile) {
          await supabase.storage
            .from('documents')
            .remove([`incidences/${service.id}/${selectedFile.name}`]);
        }
        throw new Error(`Error al guardar documento de incidencia: ${incidenceError.message}`);
      }

      // 3. Update service status to 19
      const { error: updateError } = await supabase
        .from('services')
        .update({
          status_id: 19,
          updated_at: new Date().toISOString(),
        })
        .eq('id', service.id);

      if (updateError) {
        throw new Error(`Error al actualizar estado del servicio: ${updateError.message}`);
      }

      showNotification({
        type: 'success',
        title: 'Incidencia resuelta correctamente',
        body: 'Nuestro equipo revisará los datos aportados y seguiremos adelante con el trámite o volveremos a levantar incidencia.'
      });

      onSuccess();
      handleClose();
      trackEvent('Incidence Solved', {
        page_title: 'Modal de incidencia del servicio',
        new_construction_id: service.construction_id,
        service_type: service.id,
        new_construction_state: service.services_status?.name || ''
      });

    } catch (err) {
      console.error('Error procesando incidencia:', err);
      const errorMessage = err instanceof Error ? err.message : 'Inténtalo de nuevo en unos minutos.';
      setError(errorMessage);
      showNotification({
        type: 'error',
        title: 'Error al resolver la incidencia',
        body: errorMessage
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setSelectedFile(null);
      setTextContent('');
      setError(null);
      setIsCommentExpanded(false);
      setIsProgressExpanded(false);
      onClose();
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const canSubmit = (selectedFile || textContent.trim()) && !submitting;
  const currentStatusIndex = getCurrentStatusIndex();
  const serviceTypeName = service?.service_type?.name || 'Servicio';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-[900px] max-h-[90vh] overflow-hidden relative">
        {/* Gradient Background */}
        <div className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden">
          <div
            className="absolute"
            style={{
              width: '500px',
              height: '250px',
              right: '-100px',
              top: '100px',
              transform: 'rotate(90deg)',
              background: 'radial-gradient(50% 50% at 50% 50%, rgba(133, 163, 255, 0.25) 0%, rgba(133, 163, 255, 0) 100%)',
              filter: 'blur(80px)',
            }}
          />
          <div
            className="absolute"
            style={{
              width: '200px',
              height: '100px',
              right: '50px',
              bottom: '50px',
              background: 'radial-gradient(50% 50% at 50% 50%, rgba(10, 71, 255, 0.2) 0%, rgba(10, 71, 255, 0) 100%)',
              filter: 'blur(50px)',
            }}
          />
        </div>

        {/* Close Button */}
        <div className="absolute top-2 right-2 z-20">
          <button
            onClick={handleClose}
            disabled={submitting}
            className="p-3 rounded-full hover:bg-zen-grey-100 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4 text-zen-grey-700" viewBox="0 0 16 16" fill="none">
              <use href="/icons.svg#x-close" />
            </svg>
          </button>
        </div>

        {/* Main Content - Two Columns */}
        <div className="flex gap-6 p-8 pt-12 relative z-10 max-h-[90vh] overflow-y-auto">
          {/* Left Column - Form */}
          <div className="flex-1 flex flex-col gap-6">
            {/* Service Tag + Incidencia Badge */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <div className="bg-zen-green-100 flex items-center gap-1 px-1 py-1 rounded">
                  <svg className="w-4 h-4 text-zen-grey-700" viewBox="0 0 20 20" fill="currentColor">
                    <use href={`/icons.svg#${getServiceIcon(serviceTypeName)}`} />
                  </svg>
                </div>
                <span className="text-base font-medium text-zen-grey-700">
                  {serviceTypeName}
                </span>
              </div>
              <div className="bg-zen-grey-100 border border-zen-grey-300 rounded px-4 py-2">
                <span className="text-base font-semibold text-zen-grey-700">
                  Incidencia
                </span>
              </div>
            </div>

            {/* Comentario de incidencia */}
            {service?.comment && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-zen-grey-600" viewBox="0 0 16 16" fill="currentColor">
                    <use href="/icons.svg#chat-dots" />
                  </svg>
                  <span className="text-sm font-semibold text-zen-grey-600">
                    Comentario de incidencia
                  </span>
                </div>
                <div
                  ref={commentRef}
                  className="text-base text-zen-grey-600 font-normal overflow-hidden"
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: isCommentExpanded ? 'unset' : 3,
                    WebkitBoxOrient: 'vertical',
                    lineHeight: '1.47',
                  }}
                >
                  {service.comment}
                </div>
                {showLeerMas && (
                  <button
                    onClick={() => setIsCommentExpanded(!isCommentExpanded)}
                    className="flex items-center gap-1 self-end text-zen-blue-500 hover:text-zen-blue-600 transition-colors"
                  >
                    <span className="text-xs font-semibold">
                      {isCommentExpanded ? 'Leer menos' : 'Leer más'}
                    </span>
                    <svg
                      className={`w-4 h-4 transition-transform ${isCommentExpanded ? 'rotate-180' : ''}`}
                      viewBox="0 0 16 16"
                      fill="currentColor"
                    >
                      <use href="/icons.svg#caret-down" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Tu respuesta */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-zen-grey-700">
                Tu respuesta
              </label>
              <div className="border border-zen-grey-300 rounded overflow-hidden bg-white">
                <div className="p-4">
                  <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    disabled={submitting}
                    placeholder="Escribe tu respuesta aquí"
                    className="w-full text-base text-zen-grey-600 font-normal placeholder:text-zen-grey-400 resize-none focus:outline-none disabled:opacity-50 min-h-[60px]"
                    rows={3}
                    style={{ lineHeight: '1.47' }}
                  />

                  {/* Uploaded file display */}
                  {selectedFile && (
                    <div className="flex flex-wrap gap-2 mt-3 mb-3">
                      <div className="bg-white border border-zen-grey-300 rounded p-2 flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <FileText className="w-4 h-4 text-zen-grey-600" />
                          <span className="text-sm font-medium text-zen-grey-600 truncate max-w-[200px]">
                            {selectedFile.name}
                          </span>
                        </div>
                        <button
                          onClick={() => setSelectedFile(null)}
                          disabled={submitting}
                          className="shrink-0 hover:text-red-600 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4 text-zen-grey-600" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Adjuntar archivo button */}
                  <div className="mt-2">
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      disabled={submitting}
                      className="hidden"
                      id="incidence-file-upload"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                    />
                    <label
                      htmlFor="incidence-file-upload"
                      className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-zen-grey-950 rounded cursor-pointer hover:bg-zen-grey-50 transition-colors"
                    >
                      <span className="text-xs font-semibold text-zen-grey-950">
                        Adjuntar archivo
                      </span>
                      <svg className="w-4 h-4 text-zen-grey-950" viewBox="0 0 16 16" fill="currentColor">
                        <use href="/icons.svg#paperclip" />
                      </svg>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center mt-2">
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-zen-error-200 text-zen-error-900 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zen-error-300"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-base font-semibold">Procesando...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <use href="/icons.svg#wrench" />
                    </svg>
                    <span className="text-base font-semibold">Resolver incidencia</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column - ID Card */}
          <div className="w-[280px] shrink-0">
            <div className="bg-zen-grey-50 border-2 border-white rounded-xl shadow-sm overflow-hidden">
              {/* Construction Info Header */}
              <div className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-zen-grey-500">ID de obra</span>
                  <span className="font-semibold text-zen-grey-950">
                    {construction?.id || service?.construction_id || '-'}
                  </span>
                </div>
                <div className="bg-zen-green-100 flex items-center gap-1 px-2 py-1 rounded w-fit">
                  <svg className="w-4 h-4 text-zen-grey-700" viewBox="0 0 20 18" fill="currentColor">
                    <use href="/icons.svg#obras" />
                  </svg>
                  <span className="text-sm font-normal text-zen-grey-950 truncate max-w-[200px]">
                    {construction?.name || 'Obra'}
                  </span>
                </div>
              </div>

              {/* Progress Card */}
              <div className="bg-white rounded-xl mx-2 mb-2 p-4 flex flex-col gap-4">
                {/* Progress Title */}
                <div className="bg-zen-grey-50 flex items-center gap-1 px-2 py-1 rounded w-fit">
                  <svg className="w-4 h-4 text-zen-grey-700" viewBox="0 0 20 20" fill="currentColor">
                    <use href={`/icons.svg#${getServiceIcon(serviceTypeName)}`} />
                  </svg>
                  <span className="text-sm font-normal text-zen-grey-950">
                    Progreso {serviceTypeName.split(' ')[0]} - Obra
                  </span>
                </div>

                {/* Fecha inicio */}
                <div className="flex flex-col">
                  <span className="text-sm text-zen-grey-600">
                    Fecha inicio gestión del suministro:
                  </span>
                  <span className="text-base text-zen-grey-600">
                    {formatDate(service?.created_at)}
                  </span>
                </div>

                {/* Vertical Progress Tracker */}
                <div className="flex flex-col gap-0">
                  {serviceTypeStatuses.slice(0, isProgressExpanded ? undefined : 3).map((sts, index) => {
                    const isCompleted = index < currentStatusIndex;
                    const isCurrent = index === currentStatusIndex;
                    const isLast = index === (isProgressExpanded ? serviceTypeStatuses.length - 1 : Math.min(2, serviceTypeStatuses.length - 1));

                    return (
                      <div key={sts.id} className="flex items-start gap-3">
                        {/* Step indicator */}
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-3 h-3 rounded-full shrink-0 ${
                              isCompleted
                                ? 'bg-zen-green-500'
                                : isCurrent
                                ? 'bg-zen-warning-500'
                                : 'bg-zen-grey-200'
                            }`}
                          />
                          {!isLast && (
                            <div
                              className={`w-0.5 h-6 ${
                                isCompleted ? 'bg-zen-green-500' : 'bg-zen-grey-200'
                              }`}
                            />
                          )}
                        </div>
                        {/* Step label */}
                        <span
                          className={`text-sm leading-none ${
                            isCurrent
                              ? 'font-semibold text-zen-grey-950'
                              : 'font-normal text-zen-grey-600'
                          }`}
                        >
                          {sts.services_status.name}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Ampliar progreso button */}
                {serviceTypeStatuses.length > 3 && (
                  <button
                    onClick={() => setIsProgressExpanded(!isProgressExpanded)}
                    className="flex items-center gap-1 self-end text-zen-blue-500 hover:text-zen-blue-600 transition-colors"
                  >
                    <span className="text-xs font-semibold">
                      {isProgressExpanded ? 'Ver menos' : 'Ampliar progreso'}
                    </span>
                    <svg
                      className={`w-4 h-4 transition-transform ${isProgressExpanded ? 'rotate-180' : ''}`}
                      viewBox="0 0 16 16"
                      fill="currentColor"
                    >
                      <use href="/icons.svg#caret-down" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
