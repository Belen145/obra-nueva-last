import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface ServiceTypeStatus {
  id: string;
  service_type_id: number;
  services_status_id: number;
  is_common: boolean;
  requires_user_action: boolean;
  is_final: boolean;
  order_position: number;
  service_type?: {
    id: number;
    name: string;
    category: string | null;
  };
  services_status?: {
    id: number;
    name: string;
    is_incidence: boolean;
  };
}

export interface ServiceWithStatuses {
  id: number;
  type_id: number;
  status_id: number;
  construction_id: number;
  comment: string | null;
  service_type?: {
    id: number;
    name: string;
    category: string | null;
  };
  services_status?: {
    id: number;
    name: string;
    is_incidence: boolean;
  };
  available_statuses: ServiceTypeStatus[];
  current_status_config?: ServiceTypeStatus;
}

// Placeholder: Hook eliminado. Sin lógica ni dependencias externas.
export function useServiceStatusManagement() {}
