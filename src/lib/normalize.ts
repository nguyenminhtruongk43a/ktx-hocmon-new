/**
 * Canonical formatting for location identifiers so that "ktx1", " KTX  1 ", "Ktx-1"
 * all compare equal as "KTX 1". Every Worker read from or written to Supabase goes
 * through these helpers, which is what keeps filters and aggregations consistent.
 */

function collapse(value: unknown): string {
  return String(value ?? '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

function canonicalSuffix(raw: string): string {
  const suffix = raw.trim().toUpperCase();
  return /^\d+$/.test(suffix) ? String(Number(suffix)) : suffix;
}

export function normalizeKtx(value: unknown): string {
  const v = collapse(value);
  if (!v) return '';
  const ascii = stripDiacritics(v);
  const match = ascii.match(/^(?:ktx|ky\s*tuc\s*xa)\s*[-_.:]?\s*([a-z0-9]+)$/i);
  if (match) return `KTX ${canonicalSuffix(match[1])}`;
  if (/^\d+$/.test(v)) return `KTX ${Number(v)}`;
  return v;
}

export function normalizeDay(value: unknown): string {
  const v = collapse(value);
  if (!v) return '';
  const ascii = stripDiacritics(v);
  const match = ascii.match(/^day\s*(?:nha)?\s*[-_.:]?\s*([a-z0-9]+)$/i);
  if (match) return `Dãy ${canonicalSuffix(match[1])}`;
  if (/^[a-z0-9]{1,3}$/i.test(v)) return `Dãy ${canonicalSuffix(v)}`;
  return v;
}

export function normalizeRoom(value: unknown): string {
  const v = collapse(value);
  if (!v) return '';
  const ascii = stripDiacritics(v);
  const match = ascii.match(/^(?:phong|p)\s*[-_.:]?\s*([a-z0-9]+)$/i);
  const core = match ? match[1] : v;
  return /^\d+$/.test(core) ? String(Number(core)) : core.toUpperCase();
}

export function normalizeText(value: unknown): string {
  return collapse(value);
}

export function normalizeCccd(value: unknown): string {
  return collapse(value).replace(/[\s.-]/g, '');
}

export function normalizeGender(value: unknown): string {
  const v = stripDiacritics(collapse(value)).toLowerCase();
  if (!v) return '';
  if (v === 'nam' || v === 'm' || v === 'male') return 'Nam';
  if (v === 'nu' || v === 'n' || v === 'f' || v === 'female') return 'Nữ';
  return collapse(value);
}

export function roomKey(ktx: string, day: string, room: string): string {
  return `${ktx}||${day}||${room}`;
}
