// Curated Publisher Bias & Factuality Database
// 100 verified, real-world sources — deduplicated, full-spectrum bias ratings
// Sources: Media Bias/Fact Check, Ad Fontes Media, AllSides

export type PublisherInfo = {
  bias: "pro_establishment" | "pro_opposition" | "regional_aligned" | "neutral";
  factuality: "very_high" | "high" | "mixed" | "low" | "very_low";
  ownerName: string;
  ownerType: "corporation" | "individual" | "nonprofit" | "government" | "unknown";
};

export const EXTENDED_PUBLISHER_BIAS_DB: Record<string, PublisherInfo> = {

  // ── USA: FAR LEFT ──────────────────────────────
  "dailykos.com":       { bias: "pro_opposition", factuality: "mixed",     ownerName: "Kos Media",                      ownerType: "corporation" },
  "counterpunch.org":   { bias: "pro_opposition", factuality: "mixed",     ownerName: "CounterPunch",                   ownerType: "nonprofit"   },

  // ── USA: LEFT ──────────────────────────────────
  "cnn.com":            { bias: "pro_opposition",     factuality: "mixed",     ownerName: "Warner Bros. Discovery",         ownerType: "corporation" },
  "msnbc.com":          { bias: "pro_opposition",     factuality: "mixed",     ownerName: "NBCUniversal (Comcast)",         ownerType: "corporation" },
  "huffpost.com":       { bias: "pro_opposition",     factuality: "mixed",     ownerName: "BuzzFeed Inc.",                  ownerType: "corporation" },
  "vox.com":            { bias: "pro_opposition",     factuality: "high",      ownerName: "Vox Media",                      ownerType: "corporation" },
  "motherjones.com":    { bias: "pro_opposition",     factuality: "high",      ownerName: "Foundation for National Progress",ownerType: "nonprofit"  },
  "theintercept.com":   { bias: "pro_opposition",     factuality: "high",      ownerName: "First Look Institute",           ownerType: "nonprofit"   },
  "rawstory.com":       { bias: "pro_opposition",     factuality: "mixed",     ownerName: "Raw Story Media",                ownerType: "corporation" },
  "salon.com":          { bias: "pro_opposition",     factuality: "mixed",     ownerName: "Salon Media Group",              ownerType: "corporation" },
  "nbcnews.com":        { bias: "pro_opposition",     factuality: "high",      ownerName: "NBCUniversal",                   ownerType: "corporation" },
  "theguardian.com":    { bias: "pro_opposition",     factuality: "high",      ownerName: "Scott Trust",                    ownerType: "nonprofit"   },
  "independent.co.uk":  { bias: "pro_opposition",     factuality: "high",      ownerName: "Evgeny Lebedev",                 ownerType: "individual"  },
  "mirror.co.uk":       { bias: "pro_opposition",     factuality: "mixed",     ownerName: "Reach plc",                      ownerType: "corporation" },
  "haaretz.com":        { bias: "pro_opposition",     factuality: "high",      ownerName: "Haaretz Group",                  ownerType: "corporation" },

  // ── USA: CENTER-LEFT ───────────────────────────
  "nytimes.com":        { bias: "pro_opposition", factuality: "high",   ownerName: "The New York Times Company",     ownerType: "corporation" },
  "washingtonpost.com": { bias: "pro_opposition", factuality: "high",   ownerName: "Jeff Bezos",                     ownerType: "individual"  },
  "npr.org":            { bias: "pro_opposition", factuality: "very_high",ownerName: "National Public Radio",        ownerType: "nonprofit"   },
  "politico.com":       { bias: "pro_opposition", factuality: "high",   ownerName: "Axel Springer",                  ownerType: "corporation" },
  "theatlantic.com":    { bias: "pro_opposition", factuality: "high",   ownerName: "Emerson Collective",             ownerType: "corporation" },
  "abcnews.go.com":     { bias: "pro_opposition", factuality: "high",   ownerName: "The Walt Disney Company",        ownerType: "corporation" },
  "cbsnews.com":        { bias: "pro_opposition", factuality: "high",   ownerName: "Paramount Global",               ownerType: "corporation" },
  "slate.com":          { bias: "pro_opposition", factuality: "high",   ownerName: "The Slate Group",                ownerType: "corporation" },
  "latimes.com":        { bias: "pro_opposition", factuality: "high",   ownerName: "Patrick Soon-Shiong",            ownerType: "individual"  },
  "ndtv.com":           { bias: "pro_opposition", factuality: "high",   ownerName: "Adani Group",                    ownerType: "corporation" },
  "theverge.com":       { bias: "pro_opposition", factuality: "high",   ownerName: "Vox Media",                      ownerType: "corporation" },
  "wired.com":          { bias: "pro_opposition", factuality: "high",   ownerName: "Condé Nast",                     ownerType: "corporation" },
  "scientificamerican.com":{ bias: "pro_opposition", factuality: "very_high",ownerName: "Springer Nature",           ownerType: "corporation" },
  "foreignpolicy.com":  { bias: "pro_opposition", factuality: "high",   ownerName: "Graham Holdings",                ownerType: "corporation" },
  "elpais.com":         { bias: "pro_opposition", factuality: "high",   ownerName: "Grupo Prisa",                    ownerType: "corporation" },

  // ── CENTER (LEAST BIASED) ──────────────────────
  "reuters.com":        { bias: "neutral", factuality: "very_high",   ownerName: "Thomson Reuters Corporation",    ownerType: "corporation" },
  "apnews.com":         { bias: "neutral", factuality: "very_high",   ownerName: "Associated Press",               ownerType: "nonprofit"   },
  "thehill.com":        { bias: "neutral", factuality: "high",        ownerName: "Nexstar Media Group",             ownerType: "corporation" },
  "axios.com":          { bias: "neutral", factuality: "high",        ownerName: "Cox Enterprises",                 ownerType: "corporation" },
  "bloomberg.com":      { bias: "neutral", factuality: "high",        ownerName: "Michael Bloomberg",               ownerType: "individual"  },
  "usatoday.com":       { bias: "neutral", factuality: "high",        ownerName: "Gannett Co.",                     ownerType: "corporation" },
  "pbs.org":            { bias: "neutral", factuality: "very_high",   ownerName: "Public Broadcasting Service",     ownerType: "nonprofit"   },
  "forbes.com":         { bias: "neutral", factuality: "high",        ownerName: "Integrated Whale Media",          ownerType: "corporation" },
  "csmonitor.com":      { bias: "neutral", factuality: "very_high",   ownerName: "Christian Science Publishing",    ownerType: "nonprofit"   },
  "propublica.org":     { bias: "neutral", factuality: "very_high",   ownerName: "ProPublica Inc.",                 ownerType: "nonprofit"   },
  "cnbc.com":           { bias: "neutral", factuality: "high",        ownerName: "NBCUniversal (Comcast)",          ownerType: "corporation" },
  "marketwatch.com":    { bias: "neutral", factuality: "high",        ownerName: "News Corp",                       ownerType: "corporation" },
  "bbc.com":            { bias: "neutral", factuality: "high",        ownerName: "BBC",                             ownerType: "government"  },
  "ft.com":             { bias: "neutral", factuality: "very_high",   ownerName: "Nikkei Inc.",                     ownerType: "corporation" },
  "economist.com":      { bias: "neutral", factuality: "very_high",   ownerName: "The Economist Group",             ownerType: "corporation" },
  "aljazeera.com":      { bias: "neutral", factuality: "mixed",       ownerName: "Al Jazeera Media Network",        ownerType: "government"  },
  "france24.com":       { bias: "neutral", factuality: "high",        ownerName: "France Médias Monde",             ownerType: "government"  },
  "dw.com":             { bias: "neutral", factuality: "high",        ownerName: "German Government",               ownerType: "government"  },
  "skynews.com":        { bias: "neutral", factuality: "high",        ownerName: "Comcast (Sky Group)",              ownerType: "corporation" },
  "euronews.com":       { bias: "neutral", factuality: "high",        ownerName: "Alpac Capital",                    ownerType: "corporation" },
  "swissinfo.ch":       { bias: "neutral", factuality: "very_high",   ownerName: "Swiss Broadcasting Corporation",   ownerType: "government"  },
  "irishtimes.com":     { bias: "neutral", factuality: "high",        ownerName: "Irish Times Trust",                ownerType: "nonprofit"   },
  "techcrunch.com":     { bias: "neutral", factuality: "high",        ownerName: "Yahoo!",                           ownerType: "corporation" },
  "arstechnica.com":    { bias: "neutral", factuality: "very_high",   ownerName: "Condé Nast",                       ownerType: "corporation" },
  "nature.com":         { bias: "neutral", factuality: "very_high",   ownerName: "Springer Nature",                  ownerType: "corporation" },
  "foreignaffairs.com": { bias: "neutral", factuality: "very_high",   ownerName: "Council on Foreign Relations",     ownerType: "nonprofit"   },
  "project-syndicate.org":{ bias: "neutral", factuality: "high",      ownerName: "Project Syndicate",                ownerType: "nonprofit"   },
  "thehindu.com":       { bias: "neutral", factuality: "high",        ownerName: "The Hindu Group",                  ownerType: "corporation" },
  "indianexpress.com":  { bias: "neutral", factuality: "high",        ownerName: "Indian Express Group",             ownerType: "corporation" },
  "hindustantimes.com": { bias: "neutral", factuality: "high",        ownerName: "HT Media Ltd",                     ownerType: "corporation" },
  "timesofindia.indiatimes.com": { bias: "neutral", factuality: "mixed", ownerName: "Bennett, Coleman & Co.",        ownerType: "corporation" },
  "economictimes.indiatimes.com":{ bias: "neutral", factuality: "high",ownerName: "Bennett, Coleman & Co.",          ownerType: "corporation" },
  "business-standard.com":{ bias: "neutral", factuality: "high",      ownerName: "Business Standard Ltd",            ownerType: "corporation" },
  "livemint.com":       { bias: "neutral", factuality: "high",        ownerName: "HT Media",                         ownerType: "corporation" },
  "print.in":           { bias: "neutral", factuality: "high",        ownerName: "Printline Media",                  ownerType: "corporation" },
  "scmp.com":           { bias: "neutral", factuality: "high",        ownerName: "Alibaba Group",                    ownerType: "corporation" },
  "straitstimes.com":   { bias: "neutral", factuality: "high",        ownerName: "Singapore Press Holdings",         ownerType: "corporation" },
  "japantimes.co.jp":   { bias: "neutral", factuality: "high",        ownerName: "News2u Holdings",                  ownerType: "corporation" },
  "smh.com.au":         { bias: "neutral", factuality: "high",        ownerName: "Nine Entertainment",               ownerType: "corporation" },
  "bangkokpost.com":    { bias: "neutral", factuality: "high",        ownerName: "Bangkok Post PCL",                 ownerType: "corporation" },
  "jakartapost.com":    { bias: "neutral", factuality: "high",        ownerName: "PT Bina Media Tenggara",           ownerType: "corporation" },
  "jpost.com":          { bias: "neutral", factuality: "high",        ownerName: "Mirkaei Tikshoret",                ownerType: "corporation" },
  "timesofisrael.com":  { bias: "neutral", factuality: "high",        ownerName: "Seth Klarman",                     ownerType: "individual"  },
  "cbc.ca":             { bias: "neutral", factuality: "high",        ownerName: "Canadian Government",              ownerType: "government"  },
  "globeandmail.com":   { bias: "neutral", factuality: "high",        ownerName: "Woodbridge Company",               ownerType: "corporation" },
  "dailymaverick.co.za":{ bias: "neutral", factuality: "high",        ownerName: "Maverick451",                      ownerType: "corporation" },
  "premiumtimesng.com": { bias: "neutral", factuality: "high",        ownerName: "Premium Times Nigeria",            ownerType: "corporation" },
  "kyivpost.com":       { bias: "neutral", factuality: "high",        ownerName: "KP Media",                         ownerType: "corporation" },

  // ── INDIA: LEFT ────────────────────────────────
  "scroll.in":          { bias: "pro_opposition",     factuality: "high",      ownerName: "Scroll Media Inc.",               ownerType: "corporation" },
  "thequint.com":       { bias: "pro_opposition",     factuality: "high",      ownerName: "Quint Digital Media",             ownerType: "corporation" },
  "thewire.in":         { bias: "pro_opposition",     factuality: "mixed",     ownerName: "Foundation for Independent Journalism", ownerType: "nonprofit" },

  // ── CENTER-RIGHT ───────────────────────────────
  "wsj.com":            { bias: "pro_establishment", factuality: "high",  ownerName: "News Corp (Rupert Murdoch)",      ownerType: "corporation" },
  "reason.com":         { bias: "pro_establishment", factuality: "high",  ownerName: "Reason Foundation",               ownerType: "nonprofit"   },
  "telegraph.co.uk":    { bias: "pro_establishment", factuality: "high",  ownerName: "Telegraph Media Group",           ownerType: "corporation" },
  "nationalpost.com":   { bias: "pro_establishment", factuality: "high",  ownerName: "Postmedia Network",               ownerType: "corporation" },

  // ── RIGHT ──────────────────────────────────────
  "foxnews.com":        { bias: "pro_establishment",    factuality: "mixed",     ownerName: "Fox Corporation",                 ownerType: "corporation" },
  "nypost.com":         { bias: "pro_establishment",    factuality: "mixed",     ownerName: "News Corp",                       ownerType: "corporation" },
  "washingtontimes.com":{ bias: "pro_establishment",    factuality: "mixed",     ownerName: "Operations Holdings",             ownerType: "corporation" },
  "dailywire.com":      { bias: "pro_establishment",    factuality: "mixed",     ownerName: "Bentkey Ventures",                ownerType: "corporation" },
  "nationalreview.com": { bias: "pro_establishment",    factuality: "high",      ownerName: "National Review Institute",       ownerType: "nonprofit"   },
  "dailycaller.com":    { bias: "pro_establishment",    factuality: "mixed",     ownerName: "Neil Patel",                      ownerType: "individual"  },
  "thefederalist.com":  { bias: "pro_establishment",    factuality: "mixed",     ownerName: "FDRLST Media",                    ownerType: "corporation" },
  "thesun.co.uk":       { bias: "pro_establishment",    factuality: "mixed",     ownerName: "News Group Newspapers",           ownerType: "corporation" },
  "news18.com":         { bias: "pro_establishment",    factuality: "mixed",     ownerName: "Network18 (Reliance)",            ownerType: "corporation" },
  "zeenews.india.com":  { bias: "pro_establishment",    factuality: "mixed",     ownerName: "Zee Media Corporation",           ownerType: "corporation" },
  "swarajyamag.com":    { bias: "pro_establishment",    factuality: "mixed",     ownerName: "Kovai Media Services",            ownerType: "corporation" },

  // ── FAR RIGHT ──────────────────────────────────
  "breitbart.com":      { bias: "pro_establishment", factuality: "low",      ownerName: "Breitbart News Network",          ownerType: "corporation" },
  "newsmax.com":        { bias: "pro_establishment", factuality: "low",      ownerName: "Newsmax Media",                   ownerType: "corporation" },
  "oann.com":           { bias: "pro_establishment", factuality: "low",      ownerName: "Herring Networks",                ownerType: "corporation" },
  "opindia.com":        { bias: "pro_establishment", factuality: "low",      ownerName: "Auryon Search",                   ownerType: "corporation" },

  // ── STATE MEDIA (kept for transparency) ────────
  "rt.com":             { bias: "neutral",   factuality: "very_low",  ownerName: "Russian Government",              ownerType: "government"  },
};
