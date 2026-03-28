import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hqntzhmamugzukwuobmz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxbnR6aG1hbXVnenVrd3VvYm16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2OTU1NjAsImV4cCI6MjA5MDI3MTU2MH0.FaULF93yn0gKdtVDNx0z7BQSZaignnTvlUa4B4fd0Is';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

export default supabase;
