import { ChevronDown, ChevronRight, CircleCheck, CircleX, LoaderCircle, TriangleAlert } from 'lucide-react';
import type { ImportTestResult } from '../../core/ice-aktarma/toplu-baglanti-testi';

/** Ağaç ve katlanır bölüm oku: açıkken aşağı, kapalıyken sağa. */
export function AcKapaOku({ acik }: { acik: boolean }) {
  return acik ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />;
}

const TEST_IKONLARI = { basarili: CircleCheck, uyari: TriangleAlert, hata: CircleX };

/** Bağlantı testi sonucunun ikonu; anlamı çevreleyen öğenin `aria-label`'ında. */
export function TestIkonu({ sonuc }: { sonuc: ImportTestResult['sonuc'] }) {
  const Ikon = TEST_IKONLARI[sonuc];
  return <Ikon aria-hidden="true" />;
}

/** Süren bir işin (bağlanma, test) dönen ikonu. */
export function DonenIkon() {
  return <LoaderCircle aria-hidden="true" className="donen-ikon" />;
}
