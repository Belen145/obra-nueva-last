import React from 'react';
import {
  FileText,
  FolderOpen,
  Users,
  TrendingUp,
  Upload,
  Eye,
  Download,
} from 'lucide-react';

/**
 * Dashboard principal con tarjetas de estadísticas, acciones rápidas y actividad reciente.
 */
export default function Dashboard() {
  // Tipos para datos de estadísticas y actividad
  type Stat = {
    title: string;
    value: string;
    change: string;
    icon: React.ElementType;
    color: string;
  };
  type Activity = {
    action: string;
    file: string;
    user: string;
    time: string;
  };

  // Datos de ejemplo para las tarjetas de estadísticas
  const stats: Stat[] = [
    {
      title: 'Total Documentos',
      value: '1,247',
      change: '+12%',
      icon: FileText,
      color: 'bg-blue-500',
    },
    {
      title: 'Carpetas Activas',
      value: '89',
      change: '+5%',
      icon: FolderOpen,
      color: 'bg-green-500',
    },
    {
      title: 'Usuarios',
      value: '23',
      change: '+8%',
      icon: Users,
      color: 'bg-purple-500',
    },
    {
      title: 'Almacenamiento',
      value: '45.2 GB',
      change: '+15%',
      icon: TrendingUp,
      color: 'bg-orange-500',
    },
  ];

  // Datos de ejemplo para la actividad reciente
  const recentActivity: Activity[] = [
    {
      action: 'Documento subido',
      file: 'Contrato_2024.pdf',
      user: 'Juan Pérez',
      time: '2 min',
    },
    {
      action: 'Carpeta creada',
      file: 'Proyectos Q1',
      user: 'Ana García',
      time: '15 min',
    },
    {
      action: 'Documento descargado',
      file: 'Informe_Mensual.docx',
      user: 'Carlos López',
      time: '32 min',
    },
    {
      action: 'Etiqueta añadida',
      file: 'Presentación.pptx',
      user: 'María Rodríguez',
      time: '1 h',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <div className="text-sm text-gray-500">
          Última actualización: {new Date().toLocaleString()}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                  <p className="text-sm text-green-600 mt-1">{stat.change}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Acciones Rápidas
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="flex flex-col items-center p-4 rounded-lg border-2 border-dotted border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200">
            <Upload className="w-8 h-8 text-blue-500 mb-2" />
            <span className="text-sm font-medium text-gray-700">
              Subir Archivo
            </span>
          </button>
          <button className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-all duration-200">
            <FolderOpen className="w-8 h-8 text-gray-500 mb-2" />
            <span className="text-sm font-medium text-gray-700">
              Nueva Carpeta
            </span>
          </button>
          <button className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-all duration-200">
            <Eye className="w-8 h-8 text-gray-500 mb-2" />
            <span className="text-sm font-medium text-gray-700">
              Vista Previa
            </span>
          </button>
          <button className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-all duration-200">
            <Download className="w-8 h-8 text-gray-500 mb-2" />
            <span className="text-sm font-medium text-gray-700">Exportar</span>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Actividad Reciente
        </h3>
        <div className="space-y-3">
          {recentActivity.map((activity, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {activity.action}:{' '}
                    <span className="text-blue-600">{activity.file}</span>
                  </p>
                  <p className="text-xs text-gray-500">por {activity.user}</p>
                </div>
              </div>
              <span className="text-xs text-gray-500">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
