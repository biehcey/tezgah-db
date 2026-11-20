import { Check, Circle, CircleDot, Lock, LockOpen, Minus, X } from 'lucide-react';
import type { StatementStatus } from '../../core/script-calistirma';

/** prod yazma kilidinin ikonu; yanındaki metin durumu söyler. */
export function KilitIkonu({ durum }: { durum: 'salt-okunur' | 'yazma-acik' }) {
  return durum === 'yazma-acik' ? <LockOpen aria-hidden="true" /> : <Lock aria-hidden="true" />;
}

const DURUM_IKONLARI = { basarili: Check, hatali: X, calisiyor: CircleDot, sirada: Circle, calistirilmadi: Minus };

/** İfade kartındaki durum ikonu (editör kenar çubuğu aynı durumu metin işaretiyle gösterir). */
export function DurumIkonu({ durum }: { durum: StatementStatus }) {
  const Ikon = DURUM_IKONLARI[durum];
  return <Ikon aria-hidden="true" />;
}
