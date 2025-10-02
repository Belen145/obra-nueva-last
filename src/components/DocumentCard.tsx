import React from 'react';
import {
  Eye,
  Download,
  Trash2,
  AlertCircle,
  FileText,
  Loader2,
} from 'lucide-react';

// ---------------------------------------------
// DocumentCard
// Card UI for displaying a required or uploaded document with actions
// ---------------------------------------------

interface DocumentCardProps {
  service: any;
  requiredDoc: any;
  existingDoc: any;
  isIncidence: boolean;
  requiresFile: boolean;
  uploading: boolean;
  onOpenIncidenceModal: (doc: any) => void;
  onDocumentAction: (doc: any) => void;
  onUploadDocument: (doc: any) => void;
  onDownload: (doc: any) => void;
  onDeleteDocument: (doc: any) => void;
  getStatusIcon: (doc: any) => React.ReactNode;
  getStatusColor: (doc: any) => string;
  getStatusText: (doc: any) => string;
}

// Main card component

const DocumentCard: React.FC<DocumentCardProps> = ({
  service,
  requiredDoc,
  existingDoc,
  isIncidence,
  requiresFile,
  uploading,
  onOpenIncidenceModal,
  onDocumentAction,
  onUploadDocument,
  onDownload,
  onDeleteDocument,
  getStatusIcon,
  getStatusColor,
  getStatusText,
}) => {
  // --------------------
  // Render Logic
  // --------------------
  return (
    <div
      className={`flex items-center justify-between p-4 border rounded-lg bg-white shadow-sm mb-2 ${getStatusColor(
        existingDoc
      )}`}
    >
      <div className="flex items-center flex-1">
        {getStatusIcon(existingDoc)}
        <div className="ml-4">
          <h4 className="text-sm font-medium text-gray-900">
            {requiredDoc.documentation_type?.name ||
              `Documento ${requiredDoc.document_type_id}`}
          </h4>
          {requiredDoc.documentation_type?.category && (
            <p className="text-xs text-gray-500">
              Categoría: {requiredDoc.documentation_type.category}
            </p>
          )}
          <span className="block text-xs mt-1">
            {getStatusText(existingDoc)}
          </span>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {existingDoc && existingDoc.link && (
          <button
            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors duration-200"
            onClick={() => onDownload(existingDoc)}
            title="Descargar documento"
          >
            <Download className="w-4 h-4" />
          </button>
        )}
        {existingDoc && (
          <button
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors duration-200"
            onClick={() => onDeleteDocument(existingDoc)}
            title="Eliminar documento"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        {!existingDoc && requiresFile && (
          <button
            className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded transition-colors duration-200"
            onClick={() => onUploadDocument(requiredDoc)}
            title="Subir documento"
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
          </button>
        )}
        {isIncidence && (
          <button
            className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded transition-colors duration-200"
            onClick={() => onOpenIncidenceModal(existingDoc)}
            title="Resolver incidencia"
          >
            <AlertCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

// Export main card

export default DocumentCard;
