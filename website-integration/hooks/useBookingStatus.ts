'use client';

import { useState, useEffect } from 'react';
import supabase from '../lib/supabase';

// ✅ Hook to check if a time slot is already booked
export function useAvailableSlots(date: string) {
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!date) return;

    const fetchBookedSlots = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('appointments')
        .select('appointment_time')
        .eq('appointment_date', date)
        .not('status', 'eq', 'cancelled');

      if (data) {
        setBookedSlots(data.map((d) => d.appointment_time.substring(0, 5)));
      }
      setLoading(false);
    };

    fetchBookedSlots();
  }, [date]);

  return { bookedSlots, loading };
}
