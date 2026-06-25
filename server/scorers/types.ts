import { BiasModel } from '../../shared/country-profiles/types';

export interface SourceArticle {
  id: string;
  url: string;
  publisherId?: string;
  publisherName?: string;
  biasRating?: string | null;
  // include other properties as needed
}

export interface ScorerInput {
  storyId: string; // Maps to clusterId
  sources: SourceArticle[]; 
}

export interface ScorerOutput {
  biasModel: BiasModel;
  scores: Record<string, any>;   
  metadata: Record<string, unknown>;
}

export type ScorerStrategy = (input: ScorerInput) => Promise<ScorerOutput>;
