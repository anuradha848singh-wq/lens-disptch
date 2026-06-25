export const ENTITY_ALIASES: Record<string, string> = {
  // Global Leaders & Politicians
  "biden": "Joe Biden",
  "potus": "Joe Biden",
  "trump": "Donald Trump",
  "donald j. trump": "Donald Trump",
  "modi": "Narendra Modi",
  "narendra damodardas modi": "Narendra Modi",
  "putin": "Vladimir Putin",
  "zelensky": "Volodymyr Zelensky",
  "zelenskyy": "Volodymyr Zelensky",
  "xi": "Xi Jinping",
  "xi jinping": "Xi Jinping",
  "macron": "Emmanuel Macron",
  "sunak": "Rishi Sunak",
  "netanyahu": "Benjamin Netanyahu",
  "bibi": "Benjamin Netanyahu",
  "kim jong un": "Kim Jong Un",
  
  // US Politicians
  "harris": "Kamala Harris",
  "kamala": "Kamala Harris",
  "obama": "Barack Obama",
  "desantis": "Ron DeSantis",
  "haley": "Nikki Haley",
  "mcconnell": "Mitch McConnell",
  "schumer": "Chuck Schumer",
  
  // Tech Leaders
  "musk": "Elon Musk",
  "elon": "Elon Musk",
  "zuckerberg": "Mark Zuckerberg",
  "zuck": "Mark Zuckerberg",
  "cook": "Tim Cook",
  "pichai": "Sundar Pichai",
  "nadella": "Satya Nadella",
  "altman": "Sam Altman",
  
  // Organizations & Companies
  "un": "United Nations",
  "united nations": "United Nations",
  "who": "World Health Organization",
  "eu": "European Union",
  "nato": "NATO",
  "fbi": "FBI",
  "cia": "CIA",
  "doj": "Department of Justice",
  "dod": "Department of Defense",
  "apple inc": "Apple",
  "apple": "Apple",
  "msft": "Microsoft",
  "microsoft": "Microsoft",
  "google": "Google",
  "alphabet": "Google",
  "meta": "Meta Platforms",
  "facebook": "Meta Platforms",
  "amazon": "Amazon",
  "amzn": "Amazon",
  "tesla": "Tesla",
  "tsla": "Tesla",
  "spacex": "SpaceX",
  "openai": "OpenAI",
  
  // Nations & Geographies
  "us": "United States",
  "usa": "United States",
  "america": "United States",
  "united states of america": "United States",
  "uk": "United Kingdom",
  "britain": "United Kingdom",
  "great britain": "United Kingdom",
  "prc": "China",
  "china": "China",
  "russia": "Russia",
  "russian federation": "Russia",
  "uae": "United Arab Emirates",
  "ksa": "Saudi Arabia",
  "dprk": "North Korea",
  "south korea": "South Korea",
  "rok": "South Korea"
};

export function normalizeEntity(entity: string): string {
  const lower = entity.toLowerCase().trim();
  if (ENTITY_ALIASES[lower]) {
    return ENTITY_ALIASES[lower];
  }
  return entity;
}
