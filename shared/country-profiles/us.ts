import { CountryProfile } from './types';

export const US_PROFILE: CountryProfile = {
  countryCode: 'US',
  displayName: 'United States',
  biasModel: 'SPECTRUM',
  scorerStrategyId: 'spectrum-v1',
  enabledFeatures: ['spectrum_blindspot', 'market_impact'],
  dataSources: {
    scraperIds: ['fox-news', 'cnn', 'msnbc', 'npr', 'nytimes'],
    languages: ['en'],
  },
};
