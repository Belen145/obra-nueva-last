import React, { useState } from 'react';
import {
  FileText,
  Download,
  Eye,
  Edit,
  Trash2,
  Star,
  Share2,
  MoreHorizontal,
  Search,
  Filter,
} from 'lucide-react';

/**
 * Vista de documentos con búsqueda, filtros y visualización en grid/lista.
 */
export default function DocumentView() {
  // Tipos para documentos
  type Document = {
    id: number;
    name: string;
    type: string;
    size: string;
    modified: string;
    author: string;
    tags: string[];
    starred: boolean;
  };

  // Estado local para búsqueda y vista
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedView, setSelectedView] = useState<'grid' | 'list'>('grid');

  // Datos de ejemplo para documentos
  const documents: Document[] = [
    {
      id: 1,
      name: 'Contrato_Servicio_2024.pdf',
      type: 'PDF',
      size: '2.5 MB',
      modified: '2024-01-15',
      author: 'Juan Pérez',
      tags: ['Contratos', 'Legal'],
      starred: true,
    },
    {
      id: 2,
      name: 'Informe_Financiero_Q4.xlsx',
      type: 'Excel',
      size: '1.8 MB',
      modified: '2024-01-14',
      author: 'Ana García',
      tags: ['Finanzas', 'Reportes'],
      starred: false,
    },
    {
      id: 3,
      name: 'Presentacion_Proyecto.pptx',
      type: 'PowerPoint',
      size: '5.2 MB',
      modified: '2024-01-13',
      author: 'Carlos López',
      tags: ['Proyectos', 'Presentaciones'],
      starred: true,
    },
    {
      id: 4,
      name: 'Manual_Usuario.docx',
      type: 'Word',
      size: '3.1 MB',
      modified: '2024-01-12',
      author: 'María Rodríguez',
      tags: ['Documentación', 'Manuales'],
      starred: false,
    },
    {
      id: 5,
      name: 'Factura_001_2024.pdf',
      type: 'PDF',
      size: '856 KB',
      modified: '2024-01-11',
      author: 'Luis Martínez',
      tags: ['Facturas', 'Contabilidad'],
      starred: false,
    },
    {
      id: 6,
      name: 'Propuesta_Comercial.pdf',
      type: 'PDF',
      size: '4.2 MB',
      modified: '2024-01-10',
      author: 'Sandra Torres',
      tags: ['Ventas', 'Propuestas'],
      starred: true,
    },
  ];

  /**
   * Devuelve la clase de color para el icono según el tipo de archivo.
   */
  const getFileIcon = (type: string): string => {
    switch (type) {
      case 'PDF':
        return 'bg-red-100 text-red-600';
      case 'Excel':
        return 'bg-green-100 text-green-600';
      case 'Word':
        return 'bg-blue-100 text-blue-600';
      case 'PowerPoint':
        return 'bg-orange-100 text-orange-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Documentos</h2>
        <div className="flex space-x-3">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200">
            Subir Documento
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar documentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200">
          <Filter className="w-4 h-4 mr-2" />
          Filtros
        </button>
      </div>

      {/* View Toggle */}
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-600">
          {documents.length} documentos encontrados
        </p>
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedView('grid')}
            className={`p-2 rounded ${
              selectedView === 'grid'
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className="grid grid-cols-2 gap-0.5 w-4 h-4">
              <div className="bg-current rounded-sm"></div>
              <div className="bg-current rounded-sm"></div>
              <div className="bg-current rounded-sm"></div>
              <div className="bg-current rounded-sm"></div>
            </div>
          </button>
          <button
            onClick={() => setSelectedView('list')}
            className={`p-2 rounded ${
              selectedView === 'list'
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className="space-y-1">
              <div className="w-4 h-0.5 bg-current rounded"></div>
              <div className="w-4 h-0.5 bg-current rounded"></div>
              <div className="w-4 h-0.5 bg-current rounded"></div>
            </div>
          </button>
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-lg ${getFileIcon(doc.type)}`}>
                <FileText className="w-6 h-6" />
              </div>
              <div className="flex items-center space-x-2">
                {doc.starred && (
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                )}
                <button className="p-1 hover:bg-gray-100 rounded">
                  <MoreHorizontal className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            <h3
              className="font-semibold text-gray-900 mb-2 truncate"
              title={doc.name}
            >
              {doc.name}
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              {doc.size} • {doc.modified}
            </p>

            <div className="flex flex-wrap gap-1 mb-4">
              {doc.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <span className="text-xs text-gray-500">por {doc.author}</span>
              <div className="flex space-x-2">
                <button className="p-1 hover:bg-gray-100 rounded transition-colors duration-200">
                  <Eye className="w-4 h-4 text-gray-400" />
                </button>
                <button className="p-1 hover:bg-gray-100 rounded transition-colors duration-200">
                  <Download className="w-4 h-4 text-gray-400" />
                </button>
                <button className="p-1 hover:bg-gray-100 rounded transition-colors duration-200">
                  <Share2 className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
