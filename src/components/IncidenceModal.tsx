// React and dependencies
import React from 'react';
import { X, AlertTriangle, Upload, FileText } from 'lucide-react';
import { useDocumentUpload } from '../hooks/useDocumentUpload';

// --- Types ---
interface ExistingDocument {
  id: number;
  service_id: number;
  document_type_id: number;
  link: string | null;
  content_text: string | null;
  document_status_id: number;
  observations: string | null;
  created_at: string;
  updated_at: string;
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
}

/**
 * Props for IncidenceModal component
 */
interface IncidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: ExistingDocument;
  documentTypeName: string;
  onSuccess: () => void;
}

// --- Component ---
const IncidenceModal: React.FC<IncidenceModalProps> = ({
  isOpen,
  onClose,
  document,
  documentTypeName,
  onSuccess,
}) => {
  // --- State ---
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [observations, setObservations] = React.useState<string>('');
  const [dragOver, setDragOver] = React.useState<boolean>(false);

  // --- Hooks ---
  const { uploadDocument, uploading, error, clearError } = useDocumentUpload();

  // --- Handlers ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      clearError();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      clearError();
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;
    const result = await uploadDocument({
      file: selectedFile,
      documentTypeId: document.document_type_id,
      serviceId: document.service_id,
      observations: observations.trim() || null,
      isIncidenceResolution: true,
      existingDocumentId: document.id,
    });
    if (result.success) {
      onSuccess();
      onClose();
      setSelectedFile(null);
      setObservations('');
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setObservations('');
    clearError();
    onClose();
  };

  // --- Render ---
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Resolver Incidencia
              </h2>
              <p className="text-sm text-gray-600">{documentTypeName}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Incidence info */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-500 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-red-800">
                  Documento en Incidencia
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  Estado actual: {document.document_status?.name}
                </p>
                {document.observations && (
                  <p className="text-sm text-red-600 mt-2">
                    <strong>Observaciones:</strong> {document.observations}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <X className="w-5 h-5 text-red-500 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* File upload section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nuevo Archivo *
            </label>
            <div
              className={`border-2 border-dotted rounded-lg p-6 text-center transition-all duration-300 ${
                dragOver
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {selectedFile ? (
                <div className="space-y-3">
                  <FileText className="w-12 h-12 text-green-500 mx-auto" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-sm text-red-600 hover:text-red-800 transition-colors"
                  >
                    Cambiar archivo
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload
                    className={`w-12 h-12 mx-auto ${
                      dragOver ? 'text-blue-500' : 'text-gray-400'
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
                    onChange={handleFileSelect}
                    className="hidden"
                    id="incidence-file-upload"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                  <label
                    htmlFor="incidence-file-upload"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors duration-200 cursor-pointer"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Seleccionar Archivo
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Observations textarea */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comentario sobre la resolución
            </label>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Describe los cambios realizados para resolver la incidencia..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={4}
            />
          </div>
        </div>

        {/* Footer: action buttons */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedFile || uploading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {uploading ? 'Subiendo...' : 'Resolver Incidencia'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncidenceModal;
