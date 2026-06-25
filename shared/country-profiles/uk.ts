import { CountryProfile } from './types';

export const UK_PROFILE: CountryProfile = {
  countryCode: 'UK',
  displayName: 'United Kingdom',
  biasModel: 'QUADRANT_UK',
  scorerStrategyId: 'uk-quadrant-v1',
  enabledFeatures: ['spectrum_blindspot'],
  dataSources: {
    scraperIds: ['bbc', 'guardian', 'telegraph', 'daily-mail'],
    languages: ['en'],
  },
};
