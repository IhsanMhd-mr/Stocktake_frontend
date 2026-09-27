export function formatDateTime(value) {
  if (!value) return 'Never';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function displayName(value) {
  const labels = {
    PENDING: 'Not Started', IN_PROGRESS: 'In Progress', DONE: 'Done', COMPLETED: 'Done',
    RECHECK: 'Recheck Needed', DRAFT: 'Setup', PREPARATION: 'Setup', STOCK_TAKE: 'Stock Take',
    USER: 'Worker', ADMIN: 'Administrator', SUPER_ADMIN: 'Super Administrator', ACTIVE: 'Active'
  };
  return labels[value] || String(value || 'UNKNOWN').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function errorMessage(error) {
  return error?.message || 'Something went wrong.';
}

export function isLockedError(error) {
  return ['STOCK_TAKE_LOCKED', 'PHYSICAL_UNIT_UNAVAILABLE'].includes(error?.code);
}
