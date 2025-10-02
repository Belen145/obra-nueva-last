import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { setServiceStatus } from '../lib/setServiceStatus';
import { ArrowLeft, FileText, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ServiceDocumentsPage(): JSX.Element {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryDocs, setCategoryDocs] = useState<any[]>([]);
  const navigate = useNavigate();
  const { serviceId: serviceIdParam } = useParams();
  const serviceId = serviceIdParam ? Number(serviceIdParam) : undefined;
  const [service, setService] = useState<any>(null);
  const [categories, setCategories] = useState<
    { name: string; count: number; aportados: number; porEntregar: number }[]
  >([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      // 1. Obtener datos del servicio
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select(
          'id, status_id, type_id, service_type(name), construction(id, name)'
        )
        .eq('id', serviceId)
        .single();
      if (serviceError) throw serviceError;
      setService(serviceData);

      // 2. Obtener documentos requeridos por categoría
      const { data: requiredDocs, error: reqError } = await supabase
        .from('service_required_document')
        .select('id, document_type_id, documentation_type(category)')
        .eq('service_type_id', serviceData.type_id);
      if (reqError) throw reqError;

      // 3. Obtener TODOS los documentos existentes para la obra (por todos los servicios de la obra)
      let constructionId = undefined;
      if (serviceData.construction) {
        if (Array.isArray(serviceData.construction)) {
          constructionId = (serviceData.construction[0] as any)?.id;
        } else {
          constructionId = (serviceData.construction as any).id;
        }
      }
      let allDocs: any[] = [];
      if (constructionId) {
        // Obtener todos los servicios de la obra
        const { data: allServices, error: allServicesError } = await supabase
          .from('services')
          .select('id')
          .eq('construction_id', constructionId);
        if (allServicesError) throw allServicesError;
        const serviceIds = (allServices || []).map((s: any) => s.id);
        // Obtener todos los documentos de esos servicios (sin name)
        const { data: docsData, error: allDocsError } = await supabase
          .from('documents')
          .select(
            'id, document_type_id, document_status_id, documentation_type(category), service_id'
          )
          .in('service_id', serviceIds.length ? serviceIds : [-1]);
        if (allDocsError) throw allDocsError;
        allDocs = docsData || [];
      }

      // 4. Agrupar por categoría y calcular aportados/porEntregar considerando toda la obra
      const cats: Record<
        string,
        { name: string; count: number; aportados: number; porEntregar: number }
      > = {};
      // Agrupar requeridos por categoría
      (requiredDocs || []).forEach((doc: any) => {
        const cat = doc.documentation_type?.category || 'Sin categoría';
        if (!cats[cat])
          cats[cat] = { name: cat, count: 0, aportados: 0, porEntregar: 0 };
        cats[cat].count++;
      });
      // Contar como aportado si existe un documento aprobado con ese document_type_id para la obra
      (requiredDocs || []).forEach((reqDoc: any) => {
        const cat = reqDoc.documentation_type?.category || 'Sin categoría';
        const aportado = (allDocs || []).some(
          (doc: any) =>
            doc.document_type_id === reqDoc.document_type_id &&
            doc.document_status_id === 3
        );
        if (cats[cat] && aportado) cats[cat].aportados++;
      });
      Object.values(cats).forEach((cat: any) => {
        cat.porEntregar = cat.count - cat.aportados;
      });
      setCategories(Object.values(cats));
      // Solo mostrar los documentos subidos para la obra actual
      setCategoryDocs(allDocs || []);
    } catch (err: any) {
      setError(err.message || 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (serviceId) fetchData();
  }, [serviceId]);
  if (loading) return <div className="p-6">Cargando...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/constructions')}
          className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200 mr-4"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Volver a Obras
        </button>
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <Building2 className="w-6 h-6 text-blue-600 mr-3" />
            <h1 className="text-2xl font-bold text-gray-900">
              {service.service_type.name}
            </h1>
          </div>
          <div className="flex items-center text-gray-600">
            <span>Obra: {service.construction.name}</span>
          </div>
        </div>
      </div>

      {/* Documentos por Categoría */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <FileText className="w-5 h-5 mr-3 text-blue-500" />
            Documentos Requeridos
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Gestiona los documentos necesarios para este servicio
          </p>
        </div>
        <div className="p-6">
          <div className="space-y-6">
            {categories.map((cat) => (
              <div
                key={cat.name}
                className={`bg-gray-50 rounded-lg p-4 border border-blue-200 mb-4 cursor-pointer hover:bg-blue-50 transition-colors${
                  selectedCategory === cat.name ? ' ring-2 ring-blue-400' : ''
                }`}
                onClick={() => {
                  if (serviceId) {
                    navigate(
                      `/servicios/${serviceId}/documentos/categoria/${encodeURIComponent(
                        cat.name
                      )}`
                    );
                  }
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg mr-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {cat.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {cat.count} documento(s)
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-green-700 font-semibold">
                      Documentos aportados: {cat.aportados}
                    </p>
                    <p className="text-xs text-red-700 font-semibold">
                      Nº de documentos por entregar: {cat.porEntregar}
                    </p>
                  </div>
                </div>
                {/* Listado de documentos de la categoría seleccionada */}
                {selectedCategory === cat.name && (
                  <div className="mt-4 ml-8">
                    <h4 className="font-semibold text-blue-700 mb-2 text-sm">
                      Documentos de la categoría:
                    </h4>
                    {categoryDocs.filter(
                      (doc) =>
                        (doc.documentation_type?.category ||
                          'Sin categoría') === cat.name
                    ).length === 0 ? (
                      <p className="text-gray-500 text-xs">
                        No hay documentos subidos para esta categoría.
                      </p>
                    ) : (
                      <ul className="list-disc ml-4">
                        {categoryDocs
                          .filter(
                            (doc) =>
                              (doc.documentation_type?.category ||
                                'Sin categoría') === cat.name
                          )
                          .map((doc) => (
                            <li key={doc.id} className="text-xs text-gray-700">
                              Documento
                              <span className="ml-2 text-gray-400">
                                (Estado: {doc.document_status_id})
                              </span>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
