/**
 * Generates user profile initials from the first letter of first name and first letter of last name.
 * e.g., "Alex Tan" -> "AT", "Juan Santos" -> "JS", "Marcus Vance Sterling" -> "MS"
 */
export function getUserInitials(name?: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  const firstInitial = parts[0][0] || '';
  const lastInitial = parts[parts.length - 1][0] || '';
  return `${firstInitial}${lastInitial}`.toUpperCase();
}
