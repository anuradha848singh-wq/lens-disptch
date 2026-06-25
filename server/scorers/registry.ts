import { ScorerStrategy, ScorerInput, ScorerOutput } from './types';

export const spectrumScorer: ScorerStrategy = async (input: ScorerInput): Promise<ScorerOutput> => {
  let left = 0, center = 0, right = 0;
  
  for (const source of input.sources) {
    if (source.biasRating === 'pro_establishment' || source.biasRating === 'left') left++;
    else if (source.biasRating === 'pro_opposition' || source.biasRating === 'right') right++;
    else center++;
  }

  return {
    biasModel: 'SPECTRUM',
    scores: { left, center, right },
    metadata: { sourceCount: input.sources.length }
  };
};

export const ownershipGraphScorer: ScorerStrategy = async (input: ScorerInput): Promise<ScorerOutput> => {
  // Dummy logic for ownership graph
  const outlets = input.sources.map(s => ({
    outletId: s.publisherId || s.id,
    ownerEntity: 'Unknown',
    advertiserDependencyScore: 50,
    politicalDonationLinks: []
  }));

  return {
    biasModel: 'OWNERSHIP_GRAPH',
    scores: { outlets },
    metadata: {}
  };
};

export const hybridScorer: ScorerStrategy = async (input: ScorerInput): Promise<ScorerOutput> => {
  return {
    biasModel: 'HYBRID',
    scores: {},
    metadata: {}
  };
};

export const ukQuadrantScorer: ScorerStrategy = async (input: ScorerInput): Promise<ScorerOutput> => {
  let left_wing = 0, right_wing = 0, centrist = 0, eurosceptic = 0;
  
  for (const source of input.sources) {
    const bias = (source.biasRating || "").toLowerCase();
    
    if (bias.includes("left") || bias.includes("pro_establishment")) left_wing++;
    else if (bias.includes("right") || bias.includes("pro_opposition")) right_wing++;
    else centrist++;

    // Naive eurosceptic detection: if it's right wing or a tabloid, maybe flag as eurosceptic
    if (bias.includes("eurosceptic") || source.publisherName?.toLowerCase().includes("telegraph") || source.publisherName?.toLowerCase().includes("mail") || source.publisherName?.toLowerCase().includes("express")) {
      eurosceptic++;
    }
  }

  return {
    biasModel: 'QUADRANT_UK',
    scores: { left_wing, right_wing, centrist, eurosceptic },
    metadata: { sourceCount: input.sources.length }
  };
};

export const indiaMultifacetScorer: ScorerStrategy = async (input: ScorerInput): Promise<ScorerOutput> => {
  let pro_gov = 0, opposition = 0, regional = 0, non_aligned = 0;
  
  for (const source of input.sources) {
    const bias = (source.biasRating || "").toLowerCase();
    
    if (bias.includes("pro_establishment") || bias.includes("right")) pro_gov++;
    else if (bias.includes("pro_opposition") || bias.includes("left")) opposition++;
    else if (bias.includes("regional") || source.publisherName?.toLowerCase().includes("eenadu") || source.publisherName?.toLowerCase().includes("bhaskar")) regional++;
    else non_aligned++;
  }

  return {
    biasModel: 'MULTIFACET_IN',
    scores: { pro_gov, opposition, regional, non_aligned },
    metadata: { sourceCount: input.sources.length }
  };
};

export const SCORER_REGISTRY: Record<string, ScorerStrategy> = {
  'spectrum-v1': spectrumScorer,
  'ownership-graph-v1': ownershipGraphScorer,
  'hybrid-v1': hybridScorer,
  'uk-quadrant-v1': ukQuadrantScorer,
  'in-multifacet-v1': indiaMultifacetScorer,
};

