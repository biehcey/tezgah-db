/**
 * Öneri üreticileri, sırayla çağrılır ve sonuçları birleştirilir. Her öneri türü kendi dosyasında;
 * yeni tür (JOIN-FK 03, fonksiyon 04, tip 05) buraya tek satır ekler.
 */
import type { Uretici } from '../tipler';
import { anahtarKelimeler } from './anahtar-kelimeler';
import { cteAdlari } from './cte';
import { fonksiyonlar } from './fonksiyonlar';
import { iliskiler } from './iliskiler';
import { kolonlar } from './kolonlar';
import { takmaAdlar } from './takma-adlar';

export const URETICILER: readonly Uretici[] = [kolonlar, takmaAdlar, cteAdlari, iliskiler, anahtarKelimeler, fonksiyonlar];
