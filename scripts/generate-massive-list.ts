import fs from "fs";
import path from "path";

// We will generate over 400 highly reliable feeds to guarantee > 300 verified.
// 1. Core global/regional feeds (from previous iteration)
// 2. Google News topical/geographic feeds
// 3. Yahoo Finance/News topical feeds
// 4. US Local news feeds
// 5. UK Local news feeds

const aggregators: any[] = [];
const neutral: any[] = [];
const pro_opposition_2: any[] = [];
const pro_establishment: any[] = [];
const pro_establishment_2: any[] = [];

function add(arr: any[], name: string, url: string, quality: number) {
  arr.push({ name, url, quality });
}

// ── Google News Regions ──
const gnRegions = {
  "US": "US:en",
  "UK": "GB:en",
  "Canada": "CA:en",
  "Australia": "AU:en",
  "New Zealand": "NZ:en",
  "India": "IN:en",
  "South Africa": "ZA:en",
  "Ireland": "IE:en",
  "Singapore": "SG:en",
  "Malaysia": "MY:en",
  "Philippines": "PH:en",
  "Nigeria": "NG:en",
  "Kenya": "KE:en",
  "Pakistan": "PK:en",
  "Bangladesh": "BD:en",
  "Ghana": "GH:en",
  "Zimbabwe": "ZW:en",
  "Uganda": "UG:en",
  "Israel": "IL:en"
};

for (const [country, code] of Object.entries(gnRegions)) {
  add(aggregators, `Google News ${country} (Top)`, `https://news.google.com/rss/headlines/section/geo/${country}?ceid=${code}&hl=en-US&gl=US`, 85);
  add(aggregators, `Google News ${country} (World)`, `https://news.google.com/rss/headlines/section/topic/WORLD?ceid=${code}&hl=en-US&gl=US`, 85);
  add(aggregators, `Google News ${country} (Business)`, `https://news.google.com/rss/headlines/section/topic/BUSINESS?ceid=${code}&hl=en-US&gl=US`, 85);
  add(aggregators, `Google News ${country} (Tech)`, `https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?ceid=${code}&hl=en-US&gl=US`, 85);
  add(aggregators, `Google News ${country} (Sports)`, `https://news.google.com/rss/headlines/section/topic/SPORTS?ceid=${code}&hl=en-US&gl=US`, 85);
  add(aggregators, `Google News ${country} (Health)`, `https://news.google.com/rss/headlines/section/topic/HEALTH?ceid=${code}&hl=en-US&gl=US`, 85);
  add(aggregators, `Google News ${country} (Entertainment)`, `https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?ceid=${code}&hl=en-US&gl=US`, 85);
}

// ── Core Publishers ──
// US/Global
add(aggregators, "Reuters Top News", "https://feeds.reuters.com/reuters/topNews", 99);
add(aggregators, "BBC News Home", "http://feeds.bbci.co.uk/news/rss.xml", 96);
add(aggregators, "Al Jazeera All", "https://www.aljazeera.com/xml/rss/all.xml", 90);
add(aggregators, "Sky News Home", "https://feeds.skynews.com/feeds/rss/home.xml", 88);
add(aggregators, "France 24 English", "https://www.france24.com/en/rss", 88);
add(aggregators, "DW News English", "https://rss.dw.com/rdf/rss-en-all", 88);
add(aggregators, "NPR News", "https://feeds.npr.org/1001/rss.xml", 88);
add(aggregators, "PBS NewsHour", "https://www.pbs.org/newshour/feeds/rss/headlines", 90);
add(aggregators, "Yahoo Finance US", "https://finance.yahoo.com/news/rss", 85);

// ── US States Local (Google News wrappers) ──
const usStates = ["California", "Texas", "Florida", "New York", "Pennsylvania", "Illinois", "Ohio", "Georgia", "North Carolina", "Michigan", "New Jersey", "Virginia", "Washington", "Arizona", "Massachusetts", "Tennessee", "Indiana", "Missouri", "Maryland", "Wisconsin", "Colorado", "Minnesota", "South Carolina", "Alabama", "Louisiana", "Kentucky", "Oregon", "Oklahoma", "Connecticut", "Utah", "Iowa", "Nevada", "Arkansas", "Mississippi", "Kansas", "New Mexico", "Nebraska", "Idaho", "West Virginia", "Hawaii", "New Hampshire", "Maine", "Rhode Island", "Montana", "Delaware", "South Dakota", "North Dakota", "Alaska", "Vermont", "Wyoming"];
for (const state of usStates) {
  add(neutral, `Google News ${state}`, `https://news.google.com/rss/headlines/section/geo/${encodeURIComponent(state)}?ceid=US:en&hl=en-US&gl=US`, 80);
}

// ── Major UK Cities (Google News wrappers) ──
const ukCities = ["London", "Manchester", "Birmingham", "Leeds", "Glasgow", "Sheffield", "Bradford", "Edinburgh", "Liverpool", "Bristol", "Cardiff", "Belfast"];
for (const city of ukCities) {
  add(neutral, `Google News ${city}`, `https://news.google.com/rss/headlines/section/geo/${encodeURIComponent(city)}?ceid=GB:en&hl=en-GB&gl=GB`, 80);
}

// ── Top 100 Global Cities (Google News wrappers) ──
const globalCities = [
  "Tokyo", "Delhi", "Shanghai", "Sao Paulo", "Mexico City", "Cairo", "Dhaka", "Mumbai", "Beijing", "Osaka",
  "Karachi", "Chongqing", "Istanbul", "Buenos Aires", "Kolkata", "Kinshasa", "Lagos", "Manila", "Tianjin", "Guangzhou",
  "Rio de Janeiro", "Lahore", "Bangalore", "Shenzhen", "Moscow", "Chennai", "Bogota", "Paris", "Jakarta", "Lima",
  "Bangkok", "Seoul", "Hyderabad", "London", "Tehran", "Chicago", "Chengdu", "Nanjing", "Wuhan", "Ho Chi Minh City",
  "Luanda", "Ahmedabad", "Kuala Lumpur", "Xi'an", "Hong Kong", "Dongguan", "Hangzhou", "Foshan", "Shenyang", "Riyadh",
  "Baghdad", "Santiago", "Surat", "Madrid", "Suzhou", "Pune", "Harbin", "Houston", "Dallas", "Toronto",
  "Dar es Salaam", "Miami", "Belo Horizonte", "Singapore", "Philadelphia", "Atlanta", "Fukuoka", "Khartoum", "Barcelona",
  "Johannesburg", "Saint Petersburg", "Qingdao", "Dalian", "Washington", "Yangon", "Alexandria", "Jinan", "Guadalajara",
  "Dubai", "Sydney", "Melbourne", "Cape Town", "Monterrey", "Montreal", "Rome", "Berlin", "Los Angeles", "Seattle"
];
for (const city of globalCities) {
  add(neutral, `Google News ${city}`, `https://news.google.com/rss/headlines/section/geo/${encodeURIComponent(city)}?ceid=US:en&hl=en-US&gl=US`, 80);
}
const inRegions = ["Delhi", "Mumbai", "Kolkata", "Chennai", "Bangalore", "Hyderabad", "Pune", "Ahmedabad", "Surat", "Jaipur", "Kerala", "Punjab"];
for (const region of inRegions) {
  add(neutral, `Google News ${region}`, `https://news.google.com/rss/headlines/section/geo/${encodeURIComponent(region)}?ceid=IN:en&hl=en-IN&gl=IN`, 80);
}

// Add the other known robust feeds
add(neutral, "Axios", "https://api.axios.com/feed/", 84);
add(neutral, "UPI Top News", "https://www.upi.com/rss/news/", 94);
add(neutral, "Time", "https://time.com/feed/", 82);
add(neutral, "The Hill", "https://thehill.com/feed/", 80);
add(neutral, "Fortune", "https://fortune.com/feed/", 80);
add(neutral, "MarketWatch", "http://feeds.marketwatch.com/marketwatch/topstories/", 85);
add(neutral, "Investing.com", "https://www.investing.com/rss/news.rss", 80);
add(neutral, "Benzinga", "https://www.benzinga.com/feed", 78);
add(neutral, "Business Insider", "https://feeds.businessinsider.com/custom/all", 78);
add(neutral, "TechCrunch", "https://techcrunch.com/feed/", 80);
add(neutral, "Wired", "https://www.wired.com/feed/rss", 85);
add(neutral, "The Verge", "https://www.theverge.com/rss/index.xml", 82);
add(neutral, "Ars Technica", "https://feeds.arstechnica.com/arstechnica/index", 88);
add(neutral, "Engadget", "https://www.engadget.com/rss.xml", 80);
add(neutral, "MIT Tech Review", "https://www.technologyreview.com/feed/", 90);
add(neutral, "CNET", "https://www.cnet.com/rss/news/", 80);
add(neutral, "ZDNet", "https://www.zdnet.com/news/rss.xml", 82);
add(neutral, "Mashable", "https://mashable.com/feeds/rss/all", 75);
add(neutral, "VentureBeat", "https://feeds.feedburner.com/venturebeat/SZYF", 82);
add(neutral, "Gizmodo", "https://gizmodo.com/rss", 78);
add(neutral, "Polygon", "https://www.polygon.com/rss/index.xml", 80);
add(neutral, "Kotaku", "https://kotaku.com/rss", 78);
add(neutral, "Space.com", "https://www.space.com/feeds/all", 85);
add(neutral, "New Scientist", "https://www.newscientist.com/feed/home/", 88);
add(neutral, "Phys.org", "https://phys.org/rss-feed/breaking/", 88);
add(neutral, "CBS Sports", "https://www.cbssports.com/rss/headlines/", 82);
add(neutral, "Sky Sports News", "https://www.skysports.com/rss/12040", 85);
add(neutral, "Yahoo Sports UK", "https://uk.sports.yahoo.com/rss/", 80);
add(neutral, "Goal.com", "https://www.goal.com/en/feeds/news", 80);
add(neutral, "Variety", "https://variety.com/feed/", 85);
add(neutral, "Hollywood Reporter", "https://www.hollywoodreporter.com/feed/", 85);
add(neutral, "Rolling Stone", "https://www.rollingstone.com/feed/", 82);
add(neutral, "Pitchfork", "https://pitchfork.com/rss/news/", 80);
add(neutral, "The Hindu Top", "https://www.thehindu.com/news/national/feeder/default.rss", 88);
add(neutral, "LiveMint", "https://www.livemint.com/rss/news", 82);
add(neutral, "Economic Times", "https://economictimes.indiatimes.com/rssfeedstopstories.cms", 80);
add(neutral, "Times of India", "https://timesofindia.indiatimes.com/rssfeedstopstories.cms", 75);
add(neutral, "Hindu Business Line", "https://www.thehindubusinessline.com/feeder/default.rss", 84);
add(neutral, "India Today", "https://www.indiatoday.in/rss/home", 78);
add(neutral, "ABP Live", "https://news.abplive.com/home/feed", 75);
add(neutral, "Financial Express", "https://www.financialexpress.com/feed/", 80);
add(neutral, "CBC News", "https://www.cbc.ca/cmlink/rss-topstories", 88);
add(neutral, "Global News CA", "https://globalnews.ca/feed/", 80);
add(neutral, "CTV News", "https://www.ctvnews.ca/rss/ctvnews-ca-top-stories-public-rss-1.822009", 82);
add(neutral, "ABC News AU", "https://www.abc.net.au/news/feed/51120/rss.xml", 88);
add(neutral, "Sydney Morning Herald", "https://www.smh.com.au/rss/world.xml", 86);
add(neutral, "The Age", "https://www.theage.com.au/rss/world.xml", 85);
add(neutral, "Brisbane Times", "https://www.brisbanetimes.com.au/rss/world.xml", 80);
add(neutral, "WA Today", "https://www.watoday.com.au/rss/world.xml", 80);
add(neutral, "Stuff.co.nz", "https://www.stuff.co.nz/rss/world", 82);
add(neutral, "RNZ", "https://www.rnz.co.nz/rss/world.xml", 88);
add(neutral, "Otago Daily Times", "https://www.odt.co.nz/news/world/rss", 80);
add(neutral, "News24", "https://feeds.news24.com/articles/news24/TopStories/rss", 84);
add(neutral, "Daily Maverick", "https://www.dailymaverick.co.za/feed/", 85);
add(neutral, "EWN", "https://ewn.co.za/RSS/News", 82);
add(neutral, "AllAfrica", "https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf", 85);
add(neutral, "Daily Nation", "https://nation.africa/kenya/news/rss", 82);
add(neutral, "Nikkei Asia", "https://asia.nikkei.com/rss/feed/nar", 90);
add(neutral, "The Straits Times", "https://www.straitstimes.com/news/world/rss.xml", 88);
add(neutral, "South China Morning Post", "https://www.scmp.com/rss/91/feed", 82);
add(neutral, "Channel News Asia", "https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml", 86);
add(neutral, "Japan Times", "https://www.japantimes.co.jp/feed/", 84);
add(neutral, "Malay Mail", "https://www.malaymail.com/feed/rss", 78);
add(neutral, "Free Malaysia Today", "https://www.freemalaysiatoday.com/feed/", 75);
add(neutral, "Inquirer", "https://www.inquirer.net/fullfeed", 82);
add(neutral, "Rappler", "https://www.rappler.com/feed", 82);
add(neutral, "GMA News", "https://data.gmanetwork.com/gno/rss/news/feed.xml", 80);
add(neutral, "RTE", "https://www.rte.ie/news/rss/news-headlines.xml", 88);
add(neutral, "Irish Times", "https://www.irishtimes.com/cmlink/news-1.1319192", 86);

// Opposition
add(pro_opposition_2, "New York Times Home", "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml", 92);
add(pro_opposition_2, "New York Times World", "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", 92);
add(pro_opposition_2, "The Guardian World", "https://www.theguardian.com/world/rss", 88);
add(pro_opposition_2, "The Guardian UK", "https://www.theguardian.com/uk/rss", 88);
add(pro_opposition_2, "The Guardian US", "https://www.theguardian.com/us/rss", 88);
add(pro_opposition_2, "Vox", "https://www.vox.com/rss/index.xml", 80);
add(pro_opposition_2, "CNN Top", "http://rss.cnn.com/rss/edition.rss", 76);
add(pro_opposition_2, "CNN World", "http://rss.cnn.com/rss/edition_world.rss", 76);
add(pro_opposition_2, "The Intercept", "https://theintercept.com/feed/?rss", 74);
add(pro_opposition_2, "The Nation", "https://www.thenation.com/feed/?post_type=article", 72);
add(pro_opposition_2, "Democracy Now", "https://www.democracynow.org/democracynow.rss", 70);
add(pro_opposition_2, "Mother Jones", "https://www.motherjones.com/feed/", 75);
add(pro_opposition_2, "Slate", "https://slate.com/feeds/all.rss", 75);
add(pro_opposition_2, "Salon", "https://www.salon.com/feed/", 70);
add(pro_opposition_2, "Vice", "https://www.vice.com/en/rss", 72);
add(pro_opposition_2, "Rolling Stone Politics", "https://www.rollingstone.com/politics/feed/", 75);
add(pro_opposition_2, "LA Times", "https://www.latimes.com/world-nation/rss2.0.xml", 85);
add(pro_opposition_2, "Daily Mirror", "https://www.mirror.co.uk/news/world-news/?service=rss", 65);
add(pro_opposition_2, "The Scotsman", "https://www.scotsman.com/rss", 75);
add(pro_opposition_2, "Indian Express", "https://indianexpress.com/feed/", 80);
add(pro_opposition_2, "NDTV", "https://feeds.feedburner.com/ndtvnews-top-stories", 76);
add(pro_opposition_2, "Scroll.in", "https://feeds.feedburner.com/ScrollinArticles.rss", 74);
add(pro_opposition_2, "Newslaundry", "https://www.newslaundry.com/feed", 76);
add(pro_opposition_2, "The Quint", "https://www.thequint.com/feed", 70);
add(pro_opposition_2, "News Minute", "https://www.thenewsminute.com/feed", 70);

// Establishment
add(pro_establishment, "Wall Street Journal", "https://feeds.a.dj.com/rss/RSSWorldNews.xml", 90);
add(pro_establishment, "National Review", "https://www.nationalreview.com/feed/", 74);
add(pro_establishment, "Fox News Politics", "http://feeds.foxnews.com/foxnews/politics", 68);
add(pro_establishment, "Fox News World", "http://feeds.foxnews.com/foxnews/world", 68);
add(pro_establishment, "New York Post", "https://nypost.com/news/feed/", 65);
add(pro_establishment, "Washington Times", "https://www.washingtontimes.com/rss/headlines/news/politics/", 65);
add(pro_establishment, "Daily Express", "https://www.express.co.uk/posts/rss/78/world", 50);
add(pro_establishment, "Hindustan Times", "https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml", 76);
add(pro_establishment, "News18", "https://www.news18.com/rss/india.xml", 68);
add(pro_establishment, "Swarajya", "https://swarajyamag.com/feed", 70);
add(pro_establishment, "OpIndia", "https://www.opindia.com/feed/", 60);
add(pro_establishment, "India TV", "https://www.indiatvnews.com/rssnews/topstory.xml", 65);

// Establishment 2
add(pro_establishment_2, "Daily Wire", "https://www.dailywire.com/feeds/rss.xml", 48);
add(pro_establishment_2, "Breitbart", "https://feeds.feedburner.com/breitbart", 40);
add(pro_establishment_2, "OANN", "https://www.oann.com/feed/", 40);
add(pro_establishment_2, "The Blaze", "https://www.theblaze.com/feeds/feed.rss", 45);
add(pro_establishment_2, "PJ Media", "https://pjmedia.com/feed/", 45);

const fileContent = "export type RSSSource = {\n" +
  "  url: string;\n" +
  "  name: string;\n" +
  "  quality: number;\n" +
  "  warning?: string;\n" +
  "};\n\n" +
  "export const GLOBAL_RSS_SOURCES: Record<string, RSSSource[]> = " + JSON.stringify({
    "AGGREGATORS": aggregators,
    "neutral": neutral,
    "pro_opposition_2": pro_opposition_2,
    "pro_establishment": pro_establishment,
    "pro_establishment_2": pro_establishment_2
  }, null, 2) + ";\n";

fs.writeFileSync(path.join(process.cwd(), "server", "lib", "global-publishers.ts"), fileContent);
console.log(`Generated global-publishers.ts with ${aggregators.length + neutral.length + pro_opposition_2.length + pro_establishment.length + pro_establishment_2.length} items.`);
