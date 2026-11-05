// App-wide settings. Edit places, fares and email domains here.

export const MAX_SEATS = 4; // one taxi
export const BOOK_AHEAD_DAYS = 7; // groups can be posted up to a week ahead
export const MINUTE_STEP = 15; // wheel picker interval
export const REMINDER_MINUTES = 15; // departure reminder

// Only these email domains can sign up. Keep in sync with firestore.rules (isCollegeEmail).
export const ALLOWED_EMAIL_DOMAINS = ['rub.edu.bt', 'education.gov.bt'];

export type Place = { id: string; name: string; short: string };

export const PLACES: Place[] = [
  { id: 'campus', name: 'Campus · Rinchending', short: 'Campus' },
  { id: 'town', name: 'Phuntsholing Town', short: 'Town' },
  { id: 'terminal', name: 'Phuntsholing Bus Terminal', short: 'Bus terminal' },
];

// Default total fare for the whole taxi, in Nu. The group creator can change it.
// Town <-> Campus is Nu. 200. CHECK the other fares before your demo.
const FARES: Record<string, number> = {
  'campus|town': 200,
  'campus|terminal': 200,
  'terminal|town': 100,
};

export function placeById(id: string): Place {
  return PLACES.find((p) => p.id === id) ?? PLACES[0];
}

/** Routes are directional: Town -> Campus and Campus -> Town are different boards. */
export function routeKey(fromId: string, toId: string) {
  return `${fromId}>${toId}`;
}

export function defaultFare(fromId: string, toId: string): number {
  const key = [fromId, toId].sort().join('|');
  return FARES[key] ?? 200;
}

export type RideType = 'taxi' | 'auto' | 'car';
export const RIDE_TYPES: { id: RideType; label: string }[] = [
  { id: 'taxi', label: 'Taxi' },
  { id: 'auto', label: 'Auto' },
  { id: 'car', label: 'My own car' },
];
