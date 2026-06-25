// Curated RSS feeds bucketed by 5-tier bias with quality scores
// Quality Scale: 90+ = Wire/Record-of-record | 80-89 = Quality journalism | 70-79 = Usable | <70 = Tabloid (excluded)
// Sources below quality 60 are REMOVED — they pollute clusters with clickbait

export type RSSSource = {
  url: string;
  name: string;
  quality: number;
  warning?: string;
};

export const RSS_SOURCES: Record<string, RSSSource[]> = {
  // ── TIER 0: WIRE SERVICES & GLOBAL AGGREGATORS ──
  // These are the gold standard. They seed every cluster with verified facts.
  "AGGREGATORS": [

    { name: "Reuters", url: "https://feeds.reuters.com/reuters/topNews", quality: 99 },
    { name: "BBC Breaking", url: "http://feeds.bbci.co.uk/news/rss.xml", quality: 96 },
    { name: "NYT Home Page", url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml", quality: 95 },
    { name: "CNN Top Stories", url: "http://rss.cnn.com/rss/edition.rss", quality: 92 },
    { name: "Al Jazeera World", url: "https://www.aljazeera.com/xml/rss/all.xml", quality: 90 },
    { name: "Sky News", url: "https://feeds.skynews.com/feeds/rss/world.xml", quality: 88 },
    { name: "France 24", url: "https://www.france24.com/en/rss", quality: 88 },
  ],

  // ── LEFT-LEANING SOURCES ──
  // Quality journalism with acknowledged editorial perspective
  "pro_opposition": [
    { name: "The Intercept", url: "https://theintercept.com/feed/?rss", quality: 74 },
    { name: "The Nation", url: "https://www.thenation.com/feed/?post_type=article", quality: 72 },
    { name: "Democracy Now", url: "https://www.democracynow.org/democracynow.rss", quality: 70 },
  ],

  "pro_opposition_2": [
    { name: "New York Times World", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", quality: 92 },
    { name: "Washington Post", url: "https://feeds.washingtonpost.com/rss/world", quality: 90 },
    { name: "The Guardian", url: "https://www.theguardian.com/world/rss", quality: 88 },
    { name: "The Atlantic", url: "https://feeds.theatlantic.com/TheAtlantic/all", quality: 86 },
    { name: "Vox", url: "https://www.vox.com/rss/index.xml", quality: 80 },
    { name: "The Independent", url: "https://www.independent.co.uk/news/world/rss", quality: 78 },
    { name: "CNN World", url: "http://rss.cnn.com/rss/edition_world.rss", quality: 76 },
    { name: "The Hindu", url: "https://www.thehindu.com/news/feeder/default.rss", quality: 82 },
    { name: "Haaretz", url: "https://www.haaretz.com/cira-api/6199859f/2.4411135", quality: 84 },
    { name: "South China Morning Post", url: "https://www.scmp.com/rss/91/feed", quality: 82 },
    { name: "Indian Express", url: "https://indianexpress.com/feed/", quality: 80 },
    { name: "NDTV", url: "https://feeds.feedburner.com/ndtvnews-top-stories", quality: 76 },
    { name: "The Wire", url: "https://thewire.in/feed/", quality: 72 },
    { name: "Scroll.in", url: "https://feeds.feedburner.com/ScrollinArticles.rss", quality: 74 },
    { name: "Newslaundry", url: "https://www.newslaundry.com/feed", quality: 76 },
    { name: "The Quint", url: "https://www.thequint.com/feed", quality: 70 },
  ],

  // ── CENTER SOURCES ──
  // Neutral, fact-first reporting — backbone of the platform
  "neutral": [
    { name: "BBC News", url: "http://feeds.bbci.co.uk/news/world/rss.xml", quality: 92 },
    { name: "UPI Top News", url: "https://www.upi.com/rss/news/", quality: 94 },
    { name: "NPR", url: "https://feeds.npr.org/1001/rss.xml", quality: 88 },
    { name: "PBS NewsHour", url: "https://www.pbs.org/newshour/feeds/rss/headlines", quality: 90 },
    { name: "Nikkei Asia", url: "https://asia.nikkei.com/rss/feed/nar", quality: 90 },
    { name: "CBC News", url: "https://www.cbc.ca/cmlink/rss-topstories", quality: 84 },
    { name: "The Straits Times", url: "https://www.straitstimes.com/news/world/rss.xml", quality: 88 },
    { name: "Sydney Morning Herald", url: "https://www.smh.com.au/rss/world.xml", quality: 86 },
    { name: "Axios", url: "https://api.axios.com/feed/", quality: 84 },
    { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml", quality: 82 },
    { name: "EuroNews", url: "https://www.euronews.com/rss?format=excerpt&level=vertical&name=news", quality: 82 },
    { name: "Time", url: "https://time.com/feed/", quality: 82 },
    { name: "The Hill", url: "https://thehill.com/feed/", quality: 80 },
    { name: "DW News", url: "https://rss.dw.com/rdf/rss-en-all", quality: 88 },
    { name: "Channel News Asia", url: "https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml", quality: 86 },
    { name: "The National UAE", url: "https://www.thenationalnews.com/arc/outboundfeeds/rss/", quality: 84 },
    { name: "The Globe and Mail", url: "https://www.theglobeandmail.com/arc/outboundfeeds/rss/category/world/", quality: 88 },
    { name: "LiveMint", url: "https://www.livemint.com/rss/news", quality: 82 },
    { name: "Business Standard", url: "https://www.business-standard.com/rss/home_page_top_stories.rss", quality: 84 },
    { name: "Al Jazeera English", url: "https://www.aljazeera.com/xml/rss/all.xml", quality: 85 },
    { name: "France 24 English", url: "https://www.france24.com/en/rss", quality: 84 },
    { name: "DW English", url: "https://rss.dw.com/xml/rss-en-all", quality: 83 },
    { name: "The Guardian World", url: "https://www.theguardian.com/world/rss", quality: 88 },
    { name: "South China Morning Post", url: "https://www.scmp.com/rss/91/feed", quality: 80 },
    { name: "Times of India", url: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms", quality: 75 },
    { name: "Straits Times", url: "https://www.straitstimes.com/news/world/rss.xml", quality: 82 },
    { name: "Middle East Eye", url: "https://www.middleeasteye.net/rss", quality: 76 },
  ],


  // ── RIGHT-LEANING SOURCES ──
  // Quality journalism with acknowledged editorial perspective
  "pro_establishment": [
    { name: "Wall Street Journal", url: "https://feeds.a.dj.com/rss/RSSWorldNews.xml", quality: 90 },
    { name: "The Times UK", url: "https://www.thetimes.co.uk/rss/world", quality: 82 },
    { name: "The Telegraph", url: "https://www.telegraph.co.uk/rss.xml", quality: 78 },
    { name: "National Review", url: "https://www.nationalreview.com/feed/", quality: 74 },
    { name: "The Spectator", url: "https://www.spectator.co.uk/rss", quality: 72 },
    { name: "Times of India", url: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms", quality: 70 },
    { name: "Jerusalem Post", url: "https://www.jpost.com/rss/rssfeedsfrontpage.aspx", quality: 76 },
    { name: "Fox News", url: "http://feeds.foxnews.com/foxnews/politics", quality: 68 },
    { name: "New York Post", url: "https://nypost.com/news/feed/", quality: 65 },
    { name: "Washington Times", url: "https://www.washingtontimes.com/rss/headlines/news/politics/", quality: 65 },
    { name: "Daily Caller", url: "https://dailycaller.com/feed/", quality: 58 },
    { name: "Daily Mail", url: "https://www.dailymail.co.uk/news/index.rss", quality: 50 },
    { name: "Hindustan Times", url: "https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml", quality: 76 },
    { name: "Economic Times", url: "https://economictimes.indiatimes.com/rssfeedstopstories.cms", quality: 80 },
    { name: "News18", url: "https://www.news18.com/rss/india.xml", quality: 68 },
    { name: "Swarajya", url: "https://swarajyamag.com/feed", quality: 70 },
  ],

  // ── FAR RIGHT ──
  // Minimal representation — only for blindspot detection
  "pro_establishment_2": [
    { name: "Daily Wire", url: "https://www.dailywire.com/feeds/rss.xml", quality: 48 },
    { name: "Newsmax", url: "https://www.newsmax.com/rss/Politics/1/", quality: 45 },
    { name: "Breitbart", url: "https://feeds.feedburner.com/breitbart", quality: 40 },
  ],
};

// Quality gates per tier — minimum score to enter processing queue
export const QUALITY_GATES: Record<string, number> = {
  "AGGREGATORS": 50,           // Wire services always pass
  "pro_opposition_2": 60,      // Left-leaning quality filter
  "neutral": 50,               // Center quality filter (most lenient to ensure high volume)
  "pro_establishment": 50,     // Right-leaning quality filter
  "pro_establishment_2": 40,   // Far-right allowed lower quality to maintain blindspot density
};
