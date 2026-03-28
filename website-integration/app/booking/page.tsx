import BookingForm from '../../components/BookingForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'حجز موعد | Cabinet Dentaire',
  description: 'احجز موعدك في الكابينيت الطبي بسهولة',
};

export default function BookingPage() {
  return <BookingForm />;
}
