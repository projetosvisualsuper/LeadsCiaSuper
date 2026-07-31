/**
 * Utility functions for flexible phone number normalization and matching across the system.
 */

/**
 * Strips all non-digit characters from a phone string.
 */
export function normalizePhoneDigits(phone?: string | null): string {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '');
}

/**
 * Checks if a search term matches any target phone numbers, regardless of formatting.
 * For example: "+55 48 99999-9999", "(48) 99999-9999", "5548999999999" will all match each other.
 */
export function isPhoneMatch(searchTerm: string, targetPhones: (string | undefined | null)[]): boolean {
  if (!searchTerm) return false;

  const searchDigits = normalizePhoneDigits(searchTerm);
  if (searchDigits.length < 3) return false;

  const searchNo55 = searchDigits.replace(/^55/, '');

  for (const phone of targetPhones) {
    if (!phone) continue;
    const targetDigits = normalizePhoneDigits(phone);
    if (targetDigits.length < 3) continue;

    const targetNo55 = targetDigits.replace(/^55/, '');

    // Exact or substring match on digits
    if (
      targetDigits.includes(searchDigits) ||
      searchDigits.includes(targetDigits)
    ) {
      return true;
    }

    // Flexible DDI match (ignoring leading country code 55 if present in one but not the other)
    if (searchNo55.length >= 3 && targetNo55.length >= 3) {
      if (targetNo55.includes(searchNo55) || searchNo55.includes(targetNo55)) {
        return true;
      }
    }
  }

  return false;
}
