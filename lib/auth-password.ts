export function normalizeStoredPassword(password: string) {
  const trimmed = password.trim();
  return trimmed.length === 4 ? `${trimmed}00` : trimmed;
}

export function getLoginPasswordCandidates(password: string) {
  const trimmed = password.trim();
  if (!trimmed) {
    return [];
  }

  const candidates = [trimmed];
  const normalized = normalizeStoredPassword(trimmed);
  if (normalized !== trimmed) {
    candidates.push(normalized);
  }
  return candidates;
}
