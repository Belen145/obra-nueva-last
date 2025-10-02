import React, { useEffect, useState } from 'react';
import {
  ServiceProgressTracker,
  ServiceObservations,
} from './ServiceProgressTracker';
import { supabase } from '../lib/supabase';

export function ServiceIncidenceInfo({ service }: { service: any }) {
  const [serviceTypeStatuses, setServiceTypeStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchStatuses() {
      setLoading(true);
      const { data, error } = await supabase
        .from('service_type_status')
        .select(`*, services_status ( id, name, is_final, is_incidence )`)
        .order('orden');
      if (!error && data) {
        setServiceTypeStatuses(
          data.filter(
            (sts: any) =>
              sts.service_type_id === null ||
              sts.service_type_id === service.type_id
          )
        );
      }
      setLoading(false);
    }
    if (service?.type_id) fetchStatuses();
  }, [service?.type_id]);

  if (loading || !serviceTypeStatuses.length) return null;

  return (
    <div className="mb-4">
      <ServiceProgressTracker
        service={service}
        serviceTypeStatuses={serviceTypeStatuses}
        isIncidence={service.services_status?.is_incidence}
      />
      <ServiceObservations service={service} />
    </div>
  );
}
