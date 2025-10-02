import React, { useState } from 'react';
import { Search, Filter, Calendar, User, Tag, FileText, X } from 'lucide-react';

/**
 * Vista de búsqueda avanzada de documentos con filtros y resultados destacados.
 */
export default function SearchView() {
  // Tipos para filtros y resultados
  type SearchResult = {
    id: number;
    name: string;
    type: string;
    path: string;
    author: string;
    modified: string;
    size: string;
    tags: string[];
    snippet: string;
  };
  type Filters = {
    type: string;
    dateRange: string;
    author: string;
    tags: string[];
  };

  // Estado local para búsqueda y filtros
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilters, setActiveFilters] = useState<Filters>({
    type: '',
    dateRange: '',
    author: '',
    tags: [],
  });

  // Datos de ejemplo para resultados de búsqueda
  const searchResults: SearchResult[] = [
    {
      id: 1,
      name: 'Contrato_Servicio_2024.pdf',
      type: 'PDF',
      path: '/Documentos/Contratos/',
      author: 'Juan Pérez',
      modified: '2024-01-15',
      size: '2.5 MB',
      tags: ['Contratos', 'Legal'],
      snippet:
        'Este contrato establece los términos y condiciones para la prestación de servicios...',
    },
    {
      id: 2,
      name: 'Informe_Financiero_Q4.xlsx',
      type: 'Excel',
      path: '/Documentos/Finanzas/',
      author: 'Ana García',
      modified: '2024-01-14',
      size: '1.8 MB',
      tags: ['Finanzas', 'Reportes'],
      snippet:
        'Análisis financiero correspondiente al cuarto trimestre del año fiscal...',
    },
    {
      id: 3,
      name: 'Manual_Usuario_Sistema.docx',
      type: 'Word',
      path: '/Documentos/Manuales/',
      author: 'Carlos López',
      modified: '2024-01-13',
      size: '3.1 MB',
      tags: ['Documentación', 'Manuales'],
      snippet: 'Guía completa para el uso del sistema de gestión documental...',
    },
  ];

  /**
   * Elimina un filtro activo (por tipo, fecha, autor o etiqueta).
   */
  const removeFilter = (filterType: keyof Filters, value?: string) => {
    if (filterType === 'tags' && value) {
      setActiveFilters({
        ...activeFilters,
        tags: activeFilters.tags.filter((tag) => tag !== value),
      });
    } else {
      setActiveFilters({
        ...activeFilters,
        [filterType]: '',
      });
    }
  };

  /**
   * Indica si hay algún filtro activo.
   */
  const hasActiveFilters = Object.values(activeFilters).some((filter) =>
    Array.isArray(filter) ? filter.length > 0 : filter !== ''
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Búsqueda Avanzada
        </h2>
        <p className="text-gray-600">
          Encuentra documentos usando búsqueda inteligente y filtros
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar en documentos, contenido, nombres de archivo..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtros</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Tipo de Archivo
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={activeFilters.type}
              onChange={(e) =>
                setActiveFilters({ ...activeFilters, type: e.target.value })
              }
            >
              <option value="">Todos los tipos</option>
              <option value="pdf">PDF</option>
              <option value="word">Word</option>
              <option value="excel">Excel</option>
              <option value="powerpoint">PowerPoint</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Fecha de Modificación
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={activeFilters.dateRange}
              onChange={(e) =>
                setActiveFilters({
                  ...activeFilters,
                  dateRange: e.target.value,
                })
              }
            >
              <option value="">Cualquier fecha</option>
              <option value="today">Hoy</option>
              <option value="week">Última semana</option>
              <option value="month">Último mes</option>
              <option value="quarter">Último trimestre</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Autor
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={activeFilters.author}
              onChange={(e) =>
                setActiveFilters({ ...activeFilters, author: e.target.value })
              }
            >
              <option value="">Cualquier autor</option>
              <option value="juan">Juan Pérez</option>
              <option value="ana">Ana García</option>
              <option value="carlos">Carlos López</option>
              <option value="maria">María Rodríguez</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Tag className="w-4 h-4 inline mr-1" />
              Etiquetas
            </label>
            <input
              type="text"
              placeholder="Añadir etiquetas..."
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  const newTag = e.currentTarget.value.trim();
                  if (!activeFilters.tags.includes(newTag)) {
                    setActiveFilters({
                      ...activeFilters,
                      tags: [...activeFilters.tags, newTag],
                    });
                  }
                  e.currentTarget.value = '';
                }
              }}
            />
          </div>
        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Filtros activos:
            </p>
            <div className="flex flex-wrap gap-2">
              {activeFilters.type && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                  Tipo: {activeFilters.type}
                  <button
                    onClick={() => removeFilter('type')}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {activeFilters.dateRange && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                  Fecha: {activeFilters.dateRange}
                  <button
                    onClick={() => removeFilter('dateRange')}
                    className="ml-2 text-green-600 hover:text-green-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {activeFilters.author && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                  Autor: {activeFilters.author}
                  <button
                    onClick={() => removeFilter('author')}
                    className="ml-2 text-purple-600 hover:text-purple-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {activeFilters.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800"
                >
                  {tag}
                  <button
                    onClick={() => removeFilter('tags', tag)}
                    className="ml-2 text-orange-600 hover:text-orange-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Search Results */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Resultados de Búsqueda ({searchResults.length})
          </h3>
        </div>

        <div className="divide-y divide-gray-200">
          {searchResults.map((result) => (
            <div
              key={result.id}
              className="p-6 hover:bg-gray-50 transition-colors duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <FileText className="w-5 h-5 text-blue-500" />
                    <h4 className="text-lg font-medium text-gray-900 hover:text-blue-600 cursor-pointer">
                      {result.name}
                    </h4>
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                      {result.type}
                    </span>
                  </div>

                  <p className="text-gray-600 mb-2">{result.snippet}</p>

                  <div className="flex items-center text-sm text-gray-500 space-x-4 mb-2">
                    <span>{result.path}</span>
                    <span>•</span>
                    <span>{result.author}</span>
                    <span>•</span>
                    <span>{result.modified}</span>
                    <span>•</span>
                    <span>{result.size}</span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {result.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-2 ml-4">
                  <button className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors duration-200">
                    <FileText className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
