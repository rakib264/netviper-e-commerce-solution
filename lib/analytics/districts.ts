/**
 * District identity for every geo analytic on the admin side.
 *
 * An order's district is free text — typed at checkout, or resolved from the
 * map picker into `shippingAddress.coordinates.district` — so the same place
 * arrives spelled several ways ("Chattogram" / "Chittagong", "Bogura" /
 * "Bogra"). Every consumer (choropleth, targeting API, CSV export) folds those
 * onto one canonical name here; skipping it silently splits a district's
 * numbers across two rows and understates both.
 */

/** Canonical spelling → the id used by `public/geo-json/district_wise_bangla_name.json`. */
export const DISTRICT_ID_MAP: Readonly<Record<string, number>> = {
  Bandarban: 1,
  Barguna: 2,
  Barisal: 3,
  Bhola: 4,
  Bogra: 5,
  Brahmanbaria: 6,
  Chandpur: 7,
  Chittagong: 8,
  Chuadanga: 9,
  Comilla: 10,
  "Cox's Bazar": 11,
  Dhaka: 12,
  Dinajpur: 13,
  Faridpur: 14,
  Feni: 15,
  Gaibandha: 16,
  Gazipur: 17,
  Gopalganj: 18,
  Habiganj: 19,
  Jamalpur: 20,
  Jessore: 21,
  Jhalokati: 22,
  Jhenaidah: 23,
  Joypurhat: 24,
  Khagrachhari: 25,
  Khulna: 26,
  Kishoreganj: 27,
  Kurigram: 28,
  Kushtia: 29,
  Lakshmipur: 30,
  Lalmonirhat: 31,
  Madaripur: 32,
  Magura: 33,
  Manikganj: 34,
  Meherpur: 36,
  Moulvibazar: 35,
  Munshiganj: 37,
  Mymensingh: 38,
  Naogaon: 39,
  Narail: 40,
  Narayanganj: 41,
  Narsingdi: 42,
  Natore: 43,
  Nawabganj: 44,
  Netrokona: 45,
  Nilphamari: 46,
  Noakhali: 47,
  Pabna: 48,
  Panchagarh: 49,
  Patuakhali: 50,
  Pirojpur: 51,
  Rajbari: 52,
  Rajshahi: 53,
  Rangamati: 54,
  Rangpur: 55,
  Satkhira: 56,
  Shariatpur: 57,
  Sherpur: 58,
  Sirajganj: 59,
  Sunamganj: 60,
  Sylhet: 61,
  Tangail: 62,
  Thakurgaon: 63,
  Bagerhat: 64,
};

/** Districts in canonical spelling, alphabetical — drives filter dropdowns. */
export const DISTRICT_NAMES: readonly string[] = Object.keys(DISTRICT_ID_MAP).sort(
  (a, b) => a.localeCompare(b),
);

/** Id handed to a district the GeoJSON does not know, so it still renders a row. */
export const UNKNOWN_DISTRICT_ID = 999;

/**
 * Alternative spellings → canonical. Keys are folded (lower case, letters only)
 * so "Cox's Bazar", "coxs bazar" and "COX BAZAR" all land on one entry.
 */
const DISTRICT_ALIASES: Readonly<Record<string, string>> = {
  chattogram: 'Chittagong',
  chottogram: 'Chittagong',
  bogura: 'Bogra',
  jashore: 'Jessore',
  cumilla: 'Comilla',
  coxbazar: "Cox's Bazar",
  coxsbazaar: "Cox's Bazar",
  coxbazaar: "Cox's Bazar",
  barishal: 'Barisal',
  jhenidah: 'Jhenaidah',
  jhalakathi: 'Jhalokati',
  khagrachari: 'Khagrachhari',
  maulvibazar: 'Moulvibazar',
  moulavibazar: 'Moulvibazar',
  netrakona: 'Netrokona',
  chapainawabganj: 'Nawabganj',
  chapainababganj: 'Nawabganj',
  nawabgonj: 'Nawabganj',
};

/** Lower case, letters only — makes matching independent of spacing and punctuation. */
function fold(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, '');
}

/** Folded key → canonical spelling. Built once; aliases win over nothing, never over a real name. */
const CANONICAL_BY_FOLDED: Readonly<Record<string, string>> = (() => {
  const index: Record<string, string> = {};
  for (const canonical of Object.keys(DISTRICT_ID_MAP)) index[fold(canonical)] = canonical;
  for (const [alias, canonical] of Object.entries(DISTRICT_ALIASES)) {
    if (!index[alias]) index[alias] = canonical;
  }
  return index;
})();

/**
 * Fold a raw district string onto its canonical spelling.
 *
 * Returns `null` for blank input so callers drop the row rather than inventing
 * an "Unknown" bucket that would then compete for ad budget. An unrecognised
 * but non-blank name is returned trimmed — a real district we have no GeoJSON
 * id for still deserves to appear in the tables.
 */
export function normalizeDistrictName(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return CANONICAL_BY_FOLDED[fold(trimmed)] ?? trimmed;
}

/** GeoJSON id for a canonical district name, or `UNKNOWN_DISTRICT_ID`. */
export function getDistrictId(canonical: string): number {
  return DISTRICT_ID_MAP[canonical] ?? UNKNOWN_DISTRICT_ID;
}

/** Human label for the well-known postal codes we can name; else `null`. */
export const POSTAL_CODE_LOCATIONS: Readonly<Record<string, string>> = {
  // Dhaka
  '1000': 'Dhaka GPO',
  '1100': 'Motijheel',
  '1203': 'New Market',
  '1204': 'Ramna',
  '1205': 'Dhanmondi',
  '1206': 'Elephant Road',
  '1207': 'Dhanmondi',
  '1208': 'Lalmatia',
  '1209': 'Gulshan',
  '1211': 'Tejgaon',
  '1212': 'Baridhara',
  '1213': 'Mohammadpur',
  '1214': 'Green Road',
  '1215': 'Mohammadpur',
  '1216': 'Shyamoli',
  '1217': 'Mohammadpur',
  '1219': 'Kalabagan',
  '1221': 'Wari',
  '1229': 'Uttara',
  '1230': 'Uttara',
  // Chittagong
  '4000': 'Agrabad',
  '4100': 'Kotwali',
  '4203': 'Pahartali',
  '4210': 'Halishahar',
  '4220': 'Panchlaish',
  // Sylhet
  '3100': 'Sylhet Sadar',
  '3110': 'Lamabazar',
  '3114': 'Zindabazar',
  // Rajshahi
  '6000': 'Rajshahi Sadar',
  '6100': 'Boalia',
  '6203': 'Motihar',
  // Khulna
  '9000': 'Khulna Sadar',
  '9100': 'Daulatpur',
  '9203': 'Sonadanga',
  // Barisal
  '8100': 'Rupatali',
  '8200': 'Barisal Sadar',
  // Rangpur
  '5400': 'Rangpur Sadar',
  '5450': 'Mahiganj',
  // Comilla
  '3500': 'Comilla Sadar',
  '3503': 'Kandirpar',
  // Narayanganj
  '1400': 'Narayanganj Sadar',
  '1420': 'Sonargaon',
  // Gazipur
  '1700': 'Gazipur Sadar',
  '1703': 'Tongi',
  '1704': 'Kaliakair',
};

/**
 * Every spelling that folds onto `canonical`, including the canonical itself.
 *
 * Used to push a district filter down into the Mongo `$match` — matching only
 * the canonical spelling would drop the orders that were stored as an alias.
 */
export function districtSpellings(canonical: string): string[] {
  const target = fold(canonical);
  const spellings = new Set<string>([canonical]);
  for (const name of Object.keys(DISTRICT_ID_MAP)) {
    if (fold(name) === target) spellings.add(name);
  }
  for (const [alias, mapped] of Object.entries(DISTRICT_ALIASES)) {
    if (fold(mapped) === target) spellings.add(alias);
  }
  return [...spellings];
}
