import { CountryProfile } from './types';

export const INDIA_PROFILE: CountryProfile = {
  countryCode: 'IN',
  displayName: 'India',
  biasModel: 'MULTIFACET_IN',
  scorerStrategyId: 'in-multifacet-v1',
  enabledFeatures: ['vernacular_blindspot', 'state_capture_index', 'primary_source_pin'],
  dataSources: {
    scraperIds: ['dainik-bhaskar', 'eenadu', 'ndtv', 'republic'],
    languages: ['hi', 'en', 'te'],
  },
};
