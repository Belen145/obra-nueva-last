// React and dependencies
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  Users,
  Search,
  Settings,
  Upload,
  Tag,
  Building2,
} from 'lucide-react';

// ---------------------------------------------
// SidebarProps: Props for Sidebar component
// ---------------------------------------------
interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

/**
 * Sidebar
 * Main navigation sidebar for the app. Displays menu items and handles navigation.
 */
export default function Sidebar({ activeView, onViewChange }: SidebarProps) {
  // --- Hooks ---
  const navigate = useNavigate();

  // --- Menu items ---
  const menuItems = [{ id: 'constructions', label: 'Obras', icon: Building2 }];

  // --- Handlers ---
  /**
   * Handles menu item click: updates view and navigates.
   */
  const handleMenuClick = (itemId: string) => {
    onViewChange(itemId);
    // Navigate to the corresponding route
    switch (itemId) {
      case 'constructions':
        navigate('/constructions');
        break;
      default:
        navigate('/constructions');
        break;
    }
  };

  // --- Render ---
  return (
    <div className="w-64 bg-white shadow-lg h-full border-r border-gray-200">
      {/* Sidebar header */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">DocManager</h1>
        <p className="text-sm text-gray-500 mt-1">Gestión Documental</p>
      </div>
      {/* Menu navigation */}
      <nav className="mt-6">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => handleMenuClick(item.id)}
              className={`w-full flex items-center px-6 py-3 text-left transition-all duration-200 hover:bg-blue-50 ${
                activeView === item.id
                  ? 'bg-blue-50 border-r-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              <Icon className="w-5 h-5 mr-3" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
