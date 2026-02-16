import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const missing: string[] = [];
if (!supabaseUrl) missing.push('VITE_SUPABASE_URL');
if (!supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY');
if (missing.length) {
  throw new Error(
    `Missing Supabase environment variables: ${missing.join(', ')}. ` +
    `Make sure these are set for the build (Netlify: Site → Settings → Build & deploy → Environment).`
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types based on your database schema
export interface Construction {
  id: number;
  name: string;
  construction_status_id: number;
  responsible: string | null;
  builder_id: number | null;
  property_id: number | null;
  address: string | null;
  finish_date: string | null;
  company_id: number;
  hubspot_deal_id: string | null; // Campo para guardar el ID del deal de HubSpot
  construction_status?: {
    id: number;
    name: string;
  };
  company?: {
    id: number;
    name: string;
    company_type: string | null;
  };
}

export interface ConstructionStatus {
  id: number;
  name: string;
}

export interface Company {
  id: number;
  name: string;
  company_type: string | null;
}
export interface DocumentationType {
  id: number;
  name: string;
  category: string | null;
  requires_file: boolean | null;
}