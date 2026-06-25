import { CountryProfile } from './types';
import { INDIA_PROFILE } from './in';
import { US_PROFILE } from './us';
import { UK_PROFILE } from './uk';

export const COUNTRY_PROFILE_REGISTRY: Record<string, CountryProfile> = {
  IN: INDIA_PROFILE,
  US: US_PROFILE,
  UK: UK_PROFILE,
};

export function getCountryProfile(code: string): CountryProfile {
  return COUNTRY_PROFILE_REGISTRY[code] ?? COUNTRY_PROFILE_REGISTRY['US']; // fallback default
}
