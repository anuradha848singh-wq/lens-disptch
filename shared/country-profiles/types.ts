export type BiasModel = 'OWNERSHIP_GRAPH' | 'SPECTRUM' | 'HYBRID' | 'QUADRANT_UK' | 'MULTIFACET_IN';

export type FeatureFlag =
  | 'vernacular_blindspot'
  | 'state_capture_index'
  | 'spectrum_blindspot'
  | 'primary_source_pin'
  | 'whatsapp_mirror'
  | 'market_impact';

export interface CountryProfile {
  countryCode: string;            // ISO 3166-1 alpha-2: 'IN', 'US', 'UK'
  displayName: string;
  biasModel: BiasModel;
  scorerStrategyId: string;       // key into the scorer registry
  enabledFeatures: FeatureFlag[];
  dataSources: {
    scraperIds: string[];
    languages: string[];          // ISO 639-1
  };
}
