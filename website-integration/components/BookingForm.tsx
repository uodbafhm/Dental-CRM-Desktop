'use client';

import { useState } from 'react';
import supabase from '../lib/supabase';
import { useAvailableSlots } from '../hooks/useBookingStatus';

// ✅ Types
interface FormData {
  full_name: string;
  phone: string;
  email: string;
  gender: 'male' | 'female' | '';
  date: string;
  time: string;
  treatment: string;
  notes: string;
}

// ✅ Available treatments — عدل حسب كابينيتك
const TREATMENTS = [
  'Dental Cleaning / détartrage / تنظيف الأسنان',
  'Filling / Plombage / حشو',
  'Extraction / Extraction / خلع',
  'Whitening / Blanchiment / تبييض',
  'Root Canal / Dévitalisation / علاج العصب',
  'Crown / Couronne / تاج',
  'Braces / Appareil / تقويم',
  'Implant / Implant / زرع',
  'Consultation / Consultation / استشارة',
  'X-Ray / Radiographie / أشعة',
];

// ✅ Available times — عدل حسب أوقات الكابينيت
const TIMES = [
  '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30',
  '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30',
];

// ✅ Get today's date as min date
function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

// ✅ Get max date (3 months ahead)
function getMaxDate() {
  const date = new Date();
  date.setMonth(date.getMonth() + 3);
  return date.toISOString().split('T')[0];
}

export default function BookingForm() {
  const [form, setForm] = useState<FormData>({
    full_name: '',
    phone: '',
    email: '',
    gender: '',
    date: '',
    time: '',
    treatment: '',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1 = personal info, 2 = appointment

  // ✅ Real-time booked slots check
  const { bookedSlots } = useAvailableSlots(form.date);

  // ✅ Handle input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  // ✅ Validate step 1
  const validateStep1 = () => {
    if (!form.full_name.trim()) return 'الاسم الكامل مطلوب';
    if (!form.phone.trim()) return 'رقم الهاتف مطلوب';
    if (form.phone.length < 10) return 'رقم الهاتف غير صحيح';
    if (!form.gender) return 'الجنس مطلوب';
    return '';
  };

  // ✅ Validate step 2
  const validateStep2 = () => {
    if (!form.date) return 'التاريخ مطلوب';
    if (!form.time) return 'الوقت مطلوب';
    if (!form.treatment) return 'نوع العلاج مطلوب';
    return '';
  };

  // ✅ Go to step 2
  const handleNextStep = () => {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setStep(2);
    setError('');
  };

  // ✅ Submit booking to Supabase
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const err = validateStep2();
    if (err) { setError(err); return; }

    setLoading(true);
    setError('');

    try {
      // Step 1: Create or find patient
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .insert([
          {
            full_name: form.full_name.trim(),
            phone: form.phone.trim(),
            email: form.email.trim() || null,
            gender: form.gender || null,
          },
        ])
        .select()
        .single();

      if (patientError) throw patientError;

      // Step 2: Create appointment
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert([
          {
            patient_id: patient.id,
            patient_name: form.full_name.trim(),
            patient_phone: form.phone.trim(),
            appointment_date: form.date,
            appointment_time: form.time,
            treatment_type: form.treatment,
            status: 'pending',
            source: 'website', // ← مهم جداً — هذا يخبر الداشبورد
            notes: form.notes.trim() || null,
            duration: 30,
          },
        ])
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Step 3: Create notification for the doctor
      await supabase.from('notifications').insert([
        {
          appointment_id: appointment.id,
          title: '🌐 New Website Booking',
          message: `${form.full_name} booked ${form.treatment} on ${form.date} at ${form.time}`,
          type: 'appointment',
          is_read: false,
        },
      ]);

      // ✅ Success!
      setSuccess(true);
      setForm({
        full_name: '',
        phone: '',
        email: '',
        gender: '',
        date: '',
        time: '',
        treatment: '',
        notes: '',
      });
      setStep(1);

    } catch (err: unknown) {
      console.error('Booking error:', err);
      setError('حدث خطأ أثناء الحجز. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Success Screen
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
          {/* Success Icon */}
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="text-3xl font-bold text-gray-800 mb-2">تم الحجز بنجاح! ✅</h2>
          <p className="text-gray-500 mb-1">Rendez-vous confirmé</p>
          <p className="text-gray-500 mb-6">Appointment Confirmed</p>

          <div className="bg-blue-50 rounded-2xl p-4 mb-6 text-right">
            <p className="text-sm text-blue-600 font-medium">
              📅 سيتم التواصل معك قريباً لتأكيد الموعد
            </p>
            <p className="text-sm text-blue-500 mt-1">
              Nous vous contacterons bientôt pour confirmer
            </p>
          </div>

          <button
            onClick={() => setSuccess(false)}
            className="w-full bg-blue-600 text-white py-3 rounded-2xl font-semibold hover:bg-blue-700 transition-colors"
          >
            حجز موعد آخر / Autre rendez-vous
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-white text-center">
          <div className="text-5xl mb-3">🦷</div>
          <h1 className="text-2xl font-bold">Cabinet Dentaire</h1>
          <p className="text-blue-200 mt-1">حجز موعد / Prendre Rendez-vous</p>
        </div>

        {/* Steps Indicator */}
        <div className="flex items-center justify-center gap-4 px-8 py-4 bg-gray-50 border-b">
          <div className={`flex items-center gap-2 ${step === 1 ? 'text-blue-600' : 'text-green-500'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
              ${step === 1 ? 'bg-blue-600 text-white' : 'bg-green-500 text-white'}`}>
              {step === 1 ? '1' : '✓'}
            </div>
            <span className="text-sm font-medium hidden sm:block">معلوماتك الشخصية</span>
          </div>

          <div className={`flex-1 h-0.5 ${step === 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />

          <div className={`flex items-center gap-2 ${step === 2 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
              ${step === 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              2
            </div>
            <span className="text-sm font-medium hidden sm:block">تفاصيل الموعد</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8">

          {/* ─────────────────── STEP 1 ─────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-800 text-right">
                معلوماتك الشخصية 👤
              </h2>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 text-right">
                  الاسم الكامل * / Nom complet
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={form.full_name}
                  onChange={handleChange}
                  placeholder="أدخل اسمك الكامل..."
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-right
                    focus:border-blue-500 focus:outline-none transition-colors"
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 text-right">
                  رقم الهاتف * / Téléphone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="0612345678"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-right
                    focus:border-blue-500 focus:outline-none transition-colors"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 text-right">
                  البريد الإلكتروني / Email (اختياري)
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="example@gmail.com"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-left
                    focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 text-right">
                  الجنس * / Genre
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, gender: 'male' })}
                    className={`py-3 rounded-xl border-2 font-semibold transition-all
                      ${form.gender === 'male'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-blue-200'
                      }`}
                  >
                    👨 ذكر / Homme
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, gender: 'female' })}
                    className={`py-3 rounded-xl border-2 font-semibold transition-all
                      ${form.gender === 'female'
                        ? 'border-pink-500 bg-pink-50 text-pink-700'
                        : 'border-gray-200 text-gray-600 hover:border-pink-200'
                      }`}
                  >
                    👩 أنثى / Femme
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-right">
                  <p className="text-red-600 text-sm font-medium">⚠️ {error}</p>
                </div>
              )}

              {/* Next Button */}
              <button
                type="button"
                onClick={handleNextStep}
                className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg
                  hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
              >
                التالي ← / Suivant
              </button>
            </div>
          )}

          {/* ─────────────────── STEP 2 ─────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ← رجوع
                </button>
                <h2 className="text-xl font-bold text-gray-800">
                  تفاصيل الموعد 📅
                </h2>
              </div>

              {/* Treatment Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 text-right">
                  نوع العلاج * / Type de soin
                </label>
                <select
                  name="treatment"
                  value={form.treatment}
                  onChange={handleChange}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-right
                    focus:border-blue-500 focus:outline-none transition-colors bg-white"
                  required
                >
                  <option value="">اختر نوع العلاج...</option>
                  {TREATMENTS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 text-right">
                  تاريخ الموعد * / Date
                </label>
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  min={getTodayDate()}
                  max={getMaxDate()}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3
                    focus:border-blue-500 focus:outline-none transition-colors"
                  required
                />
              </div>

              {/* Time */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 text-right">
                  الوقت المفضل * / Heure préférée
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {TIMES.map((time) => {
                    const isBooked = bookedSlots.includes(time);
                    const isSelected = form.time === time;
                    return (
                      <button
                        key={time}
                        type="button"
                        disabled={isBooked}
                        onClick={() => !isBooked && setForm({ ...form, time })}
                        className={`py-2 px-1 rounded-xl border-2 text-sm font-semibold transition-all relative
                          ${isBooked
                            ? 'border-red-200 bg-red-50 text-red-300 cursor-not-allowed line-through'
                            : isSelected
                              ? 'border-blue-500 bg-blue-600 text-white'
                              : 'border-gray-200 text-gray-600 hover:border-blue-300'
                          }`}
                        title={isBooked ? 'هذا الوقت محجوز / Ce créneau est réservé' : ''}
                      >
                        {time}
                        {isBooked && (
                          <span className="absolute -top-1 -right-1 text-xs">🔴</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-400 text-right">
                  🔴 محجوز / Réservé &nbsp;|&nbsp; ⬜ متاح / Disponible
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 text-right">
                  ملاحظات / Notes (اختياري)
                </label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="أي معلومات إضافية..."
                  rows={3}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-right
                    focus:border-blue-500 focus:outline-none transition-colors resize-none"
                />
              </div>

              {/* Summary Card */}
              {form.full_name && form.date && form.time && form.treatment && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-right">
                  <p className="text-blue-700 font-bold text-sm mb-2">📋 ملخص الموعد:</p>
                  <p className="text-blue-600 text-sm">👤 {form.full_name}</p>
                  <p className="text-blue-600 text-sm">📅 {form.date} - {form.time}</p>
                  <p className="text-blue-600 text-sm">🦷 {form.treatment}</p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-right">
                  <p className="text-red-600 text-sm font-medium">⚠️ {error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 rounded-xl font-bold text-lg text-white transition-all shadow-lg
                  ${loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 shadow-green-200'
                  }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    جاري الحجز...
                  </span>
                ) : (
                  '✅ تأكيد الحجز / Confirmer'
                )}
              </button>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-8 pb-6 text-center">
          <p className="text-xs text-gray-400">
            🔒 بياناتك محفوظة وآمنة • Vos données sont sécurisées
          </p>
        </div>
      </div>
    </div>
  );
}
