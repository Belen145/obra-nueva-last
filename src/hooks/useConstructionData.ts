import { useState, useEffect } from 'react';
import { supabase, ConstructionStatus, Company } from '../lib/supabase';

export function useConstructionData() {
  const [statuses, setStatuses] = useState<ConstructionStatus[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  // Placeholder: Hook eliminado. Sin lógica ni dependencias externas.

  // Siempre retorna un objeto aunque no haya datos
  return {
    statuses,
    companies,
    loading,
  };
}
