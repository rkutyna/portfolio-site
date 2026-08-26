// Date formatting.
//
// These strings are rendered on the server and then hydrated in the browser.
// `toLocaleString` without an explicit time zone uses the *host's* zone, so the
// server (UTC) and the visitor's browser produced different text and React
// reported a hydration mismatch. Pinning the zone makes both sides agree.
const TIME_ZONE = 'America/New_York';

const DATE_TIME = {
  month: '2-digit',
  day: '2-digit',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: TIME_ZONE,
};

const DATE_ONLY = {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: TIME_ZONE,
};

export function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', DATE_TIME);
}

export function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', DATE_ONLY);
}
