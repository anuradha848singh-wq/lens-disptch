export type RSSSource = {
  url: string;
  name: string;
  quality: number;
  warning?: string;
};

export const GLOBAL_RSS_SOURCES: Record<string, RSSSource[]> = {
  "AGGREGATORS": [
    {
      "name": "Google News US (Top)",
      "url": "https://news.google.com/rss/headlines/section/geo/US?ceid=US:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News US (World)",
      "url": "https://news.google.com/rss/headlines/section/topic/WORLD?ceid=US:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News US (Business)",
      "url": "https://news.google.com/rss/headlines/section/topic/BUSINESS?ceid=US:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News US (Tech)",
      "url": "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?ceid=US:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News US (Sports)",
      "url": "https://news.google.com/rss/headlines/section/topic/SPORTS?ceid=US:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News US (Health)",
      "url": "https://news.google.com/rss/headlines/section/topic/HEALTH?ceid=US:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News US (Entertainment)",
      "url": "https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?ceid=US:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News UK (Top)",
      "url": "https://news.google.com/rss/headlines/section/geo/UK?ceid=GB:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News UK (World)",
      "url": "https://news.google.com/rss/headlines/section/topic/WORLD?ceid=GB:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News UK (Business)",
      "url": "https://news.google.com/rss/headlines/section/topic/BUSINESS?ceid=GB:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News UK (Tech)",
      "url": "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?ceid=GB:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News UK (Sports)",
      "url": "https://news.google.com/rss/headlines/section/topic/SPORTS?ceid=GB:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News UK (Health)",
      "url": "https://news.google.com/rss/headlines/section/topic/HEALTH?ceid=GB:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News UK (Entertainment)",
      "url": "https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?ceid=GB:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Canada (Top)",
      "url": "https://news.google.com/rss/headlines/section/geo/Canada?ceid=CA:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Canada (World)",
      "url": "https://news.google.com/rss/headlines/section/topic/WORLD?ceid=CA:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Canada (Business)",
      "url": "https://news.google.com/rss/headlines/section/topic/BUSINESS?ceid=CA:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Canada (Tech)",
      "url": "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?ceid=CA:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Canada (Sports)",
      "url": "https://news.google.com/rss/headlines/section/topic/SPORTS?ceid=CA:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Canada (Health)",
      "url": "https://news.google.com/rss/headlines/section/topic/HEALTH?ceid=CA:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Canada (Entertainment)",
      "url": "https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?ceid=CA:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Australia (Top)",
      "url": "https://news.google.com/rss/headlines/section/geo/Australia?ceid=AU:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Australia (World)",
      "url": "https://news.google.com/rss/headlines/section/topic/WORLD?ceid=AU:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Australia (Business)",
      "url": "https://news.google.com/rss/headlines/section/topic/BUSINESS?ceid=AU:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Australia (Tech)",
      "url": "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?ceid=AU:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Australia (Sports)",
      "url": "https://news.google.com/rss/headlines/section/topic/SPORTS?ceid=AU:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Australia (Health)",
      "url": "https://news.google.com/rss/headlines/section/topic/HEALTH?ceid=AU:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Australia (Entertainment)",
      "url": "https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?ceid=AU:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News New Zealand (Top)",
      "url": "https://news.google.com/rss/headlines/section/geo/New Zealand?ceid=NZ:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News New Zealand (World)",
      "url": "https://news.google.com/rss/headlines/section/topic/WORLD?ceid=NZ:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News New Zealand (Business)",
      "url": "https://news.google.com/rss/headlines/section/topic/BUSINESS?ceid=NZ:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News New Zealand (Tech)",
      "url": "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?ceid=NZ:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News New Zealand (Sports)",
      "url": "https://news.google.com/rss/headlines/section/topic/SPORTS?ceid=NZ:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News New Zealand (Health)",
      "url": "https://news.google.com/rss/headlines/section/topic/HEALTH?ceid=NZ:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News New Zealand (Entertainment)",
      "url": "https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?ceid=NZ:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News India (Top)",
      "url": "https://news.google.com/rss/headlines/section/geo/India?ceid=IN:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News India (World)",
      "url": "https://news.google.com/rss/headlines/section/topic/WORLD?ceid=IN:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News India (Business)",
      "url": "https://news.google.com/rss/headlines/section/topic/BUSINESS?ceid=IN:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News India (Tech)",
      "url": "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?ceid=IN:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News India (Sports)",
      "url": "https://news.google.com/rss/headlines/section/topic/SPORTS?ceid=IN:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News India (Health)",
      "url": "https://news.google.com/rss/headlines/section/topic/HEALTH?ceid=IN:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News India (Entertainment)",
      "url": "https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?ceid=IN:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News South Africa (Top)",
      "url": "https://news.google.com/rss/headlines/section/geo/South Africa?ceid=ZA:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News South Africa (World)",
      "url": "https://news.google.com/rss/headlines/section/topic/WORLD?ceid=ZA:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News South Africa (Business)",
      "url": "https://news.google.com/rss/headlines/section/topic/BUSINESS?ceid=ZA:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News South Africa (Tech)",
      "url": "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?ceid=ZA:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News South Africa (Sports)",
      "url": "https://news.google.com/rss/headlines/section/topic/SPORTS?ceid=ZA:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News South Africa (Health)",
      "url": "https://news.google.com/rss/headlines/section/topic/HEALTH?ceid=ZA:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News South Africa (Entertainment)",
      "url": "https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?ceid=ZA:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Ireland (Top)",
      "url": "https://news.google.com/rss/headlines/section/geo/Ireland?ceid=IE:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Ireland (World)",
      "url": "https://news.google.com/rss/headlines/section/topic/WORLD?ceid=IE:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Ireland (Business)",
      "url": "https://news.google.com/rss/headlines/section/topic/BUSINESS?ceid=IE:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Ireland (Tech)",
      "url": "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?ceid=IE:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Ireland (Sports)",
      "url": "https://news.google.com/rss/headlines/section/topic/SPORTS?ceid=IE:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Ireland (Health)",
      "url": "https://news.google.com/rss/headlines/section/topic/HEALTH?ceid=IE:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Ireland (Entertainment)",
      "url": "https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?ceid=IE:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Singapore (Top)",
      "url": "https://news.google.com/rss/headlines/section/geo/Singapore?ceid=SG:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Singapore (World)",
      "url": "https://news.google.com/rss/headlines/section/topic/WORLD?ceid=SG:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Singapore (Business)",
      "url": "https://news.google.com/rss/headlines/section/topic/BUSINESS?ceid=SG:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Singapore (Tech)",
      "url": "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?ceid=SG:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Singapore (Sports)",
      "url": "https://news.google.com/rss/headlines/section/topic/SPORTS?ceid=SG:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Singapore (Health)",
      "url": "https://news.google.com/rss/headlines/section/topic/HEALTH?ceid=SG:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Singapore (Entertainment)",
      "url": "https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?ceid=SG:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Malaysia (Top)",
      "url": "https://news.google.com/rss/headlines/section/geo/Malaysia?ceid=MY:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Malaysia (World)",
      "url": "https://news.google.com/rss/headlines/section/topic/WORLD?ceid=MY:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Malaysia (Business)",
      "url": "https://news.google.com/rss/headlines/section/topic/BUSINESS?ceid=MY:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Malaysia (Tech)",
      "url": "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?ceid=MY:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Malaysia (Sports)",
      "url": "https://news.google.com/rss/headlines/section/topic/SPORTS?ceid=MY:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Malaysia (Health)",
      "url": "https://news.google.com/rss/headlines/section/topic/HEALTH?ceid=MY:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Malaysia (Entertainment)",
      "url": "https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?ceid=MY:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Philippines (Top)",
      "url": "https://news.google.com/rss/headlines/section/geo/Philippines?ceid=PH:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Philippines (World)",
      "url": "https://news.google.com/rss/headlines/section/topic/WORLD?ceid=PH:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Philippines (Business)",
      "url": "https://news.google.com/rss/headlines/section/topic/BUSINESS?ceid=PH:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Philippines (Tech)",
      "url": "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?ceid=PH:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Philippines (Sports)",
      "url": "https://news.google.com/rss/headlines/section/topic/SPORTS?ceid=PH:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Philippines (Health)",
      "url": "https://news.google.com/rss/headlines/section/topic/HEALTH?ceid=PH:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Philippines (Entertainment)",
      "url": "https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?ceid=PH:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Nigeria (Top)",
      "url": "https://news.google.com/rss/headlines/section/geo/Nigeria?ceid=NG:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Nigeria (World)",
      "url": "https://news.google.com/rss/headlines/section/topic/WORLD?ceid=NG:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Nigeria (Business)",
      "url": "https://news.google.com/rss/headlines/section/topic/BUSINESS?ceid=NG:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Nigeria (Tech)",
      "url": "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?ceid=NG:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Nigeria (Sports)",
      "url": "https://news.google.com/rss/headlines/section/topic/SPORTS?ceid=NG:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Nigeria (Health)",
      "url": "https://news.google.com/rss/headlines/section/topic/HEALTH?ceid=NG:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Nigeria (Entertainment)",
      "url": "https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?ceid=NG:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Kenya (Top)",
      "url": "https://news.google.com/rss/headlines/section/geo/Kenya?ceid=KE:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Kenya (World)",
      "url": "https://news.google.com/rss/headlines/section/topic/WORLD?ceid=KE:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Kenya (Business)",
      "url": "https://news.google.com/rss/headlines/section/topic/BUSINESS?ceid=KE:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Kenya (Tech)",
      "url": "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?ceid=KE:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Kenya (Sports)",
      "url": "https://news.google.com/rss/headlines/section/topic/SPORTS?ceid=KE:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Kenya (Health)",
      "url": "https://news.google.com/rss/headlines/section/topic/HEALTH?ceid=KE:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Kenya (Entertainment)",
      "url": "https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?ceid=KE:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Pakistan (Top)",
      "url": "https://news.google.com/rss/headlines/section/geo/Pakistan?ceid=PK:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Pakistan (World)",
      "url": "https://news.google.com/rss/headlines/section/topic/WORLD?ceid=PK:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Pakistan (Business)",
      "url": "https://news.google.com/rss/headlines/section/topic/BUSINESS?ceid=PK:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Pakistan (Tech)",
      "url": "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?ceid=PK:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Pakistan (Sports)",
      "url": "https://news.google.com/rss/headlines/section/topic/SPORTS?ceid=PK:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Pakistan (Health)",
      "url": "https://news.google.com/rss/headlines/section/topic/HEALTH?ceid=PK:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Pakistan (Entertainment)",
      "url": "https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?ceid=PK:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Bangladesh (Top)",
      "url": "https://news.google.com/rss/headlines/section/geo/Bangladesh?ceid=BD:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Bangladesh (World)",
      "url": "https://news.google.com/rss/headlines/section/topic/WORLD?ceid=BD:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Bangladesh (Business)",
      "url": "https://news.google.com/rss/headlines/section/topic/BUSINESS?ceid=BD:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Bangladesh (Tech)",
      "url": "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?ceid=BD:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Bangladesh (Sports)",
      "url": "https://news.google.com/rss/headlines/section/topic/SPORTS?ceid=BD:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Bangladesh (Health)",
      "url": "https://news.google.com/rss/headlines/section/topic/HEALTH?ceid=BD:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Bangladesh (Entertainment)",
      "url": "https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?ceid=BD:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Ghana (Top)",
      "url": "https://news.google.com/rss/headlines/section/geo/Ghana?ceid=GH:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Ghana (World)",
      "url": "https://news.google.com/rss/headlines/section/topic/WORLD?ceid=GH:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Ghana (Business)",
      "url": "https://news.google.com/rss/headlines/section/topic/BUSINESS?ceid=GH:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Ghana (Tech)",
      "url": "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?ceid=GH:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Ghana (Sports)",
      "url": "https://news.google.com/rss/headlines/section/topic/SPORTS?ceid=GH:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Ghana (Health)",
      "url": "https://news.google.com/rss/headlines/section/topic/HEALTH?ceid=GH:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Ghana (Entertainment)",
      "url": "https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?ceid=GH:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Zimbabwe (Top)",
      "url": "https://news.google.com/rss/headlines/section/geo/Zimbabwe?ceid=ZW:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Zimbabwe (World)",
      "url": "https://news.google.com/rss/headlines/section/topic/WORLD?ceid=ZW:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Zimbabwe (Business)",
      "url": "https://news.google.com/rss/headlines/section/topic/BUSINESS?ceid=ZW:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Zimbabwe (Tech)",
      "url": "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?ceid=ZW:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Zimbabwe (Sports)",
      "url": "https://news.google.com/rss/headlines/section/topic/SPORTS?ceid=ZW:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Zimbabwe (Health)",
      "url": "https://news.google.com/rss/headlines/section/topic/HEALTH?ceid=ZW:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Zimbabwe (Entertainment)",
      "url": "https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?ceid=ZW:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Uganda (Top)",
      "url": "https://news.google.com/rss/headlines/section/geo/Uganda?ceid=UG:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Uganda (World)",
      "url": "https://news.google.com/rss/headlines/section/topic/WORLD?ceid=UG:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Uganda (Business)",
      "url": "https://news.google.com/rss/headlines/section/topic/BUSINESS?ceid=UG:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Uganda (Tech)",
      "url": "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?ceid=UG:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Uganda (Sports)",
      "url": "https://news.google.com/rss/headlines/section/topic/SPORTS?ceid=UG:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Uganda (Health)",
      "url": "https://news.google.com/rss/headlines/section/topic/HEALTH?ceid=UG:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Uganda (Entertainment)",
      "url": "https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?ceid=UG:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Israel (Top)",
      "url": "https://news.google.com/rss/headlines/section/geo/Israel?ceid=IL:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Israel (World)",
      "url": "https://news.google.com/rss/headlines/section/topic/WORLD?ceid=IL:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Israel (Business)",
      "url": "https://news.google.com/rss/headlines/section/topic/BUSINESS?ceid=IL:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Israel (Tech)",
      "url": "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?ceid=IL:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Israel (Sports)",
      "url": "https://news.google.com/rss/headlines/section/topic/SPORTS?ceid=IL:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Israel (Health)",
      "url": "https://news.google.com/rss/headlines/section/topic/HEALTH?ceid=IL:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Google News Israel (Entertainment)",
      "url": "https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?ceid=IL:en&hl=en-US&gl=US",
      "quality": 85
    },
    {
      "name": "Reuters Top News",
      "url": "https://feeds.reuters.com/reuters/topNews",
      "quality": 99
    },
    {
      "name": "BBC News Home",
      "url": "http://feeds.bbci.co.uk/news/rss.xml",
      "quality": 96
    },
    {
      "name": "Al Jazeera All",
      "url": "https://www.aljazeera.com/xml/rss/all.xml",
      "quality": 90
    },
    {
      "name": "Sky News Home",
      "url": "https://feeds.skynews.com/feeds/rss/home.xml",
      "quality": 88
    },
    {
      "name": "France 24 English",
      "url": "https://www.france24.com/en/rss",
      "quality": 88
    },
    {
      "name": "DW News English",
      "url": "https://rss.dw.com/rdf/rss-en-all",
      "quality": 88
    },
    {
      "name": "NPR News",
      "url": "https://feeds.npr.org/1001/rss.xml",
      "quality": 88
    },
    {
      "name": "PBS NewsHour",
      "url": "https://www.pbs.org/newshour/feeds/rss/headlines",
      "quality": 90
    },
    {
      "name": "Yahoo Finance US",
      "url": "https://finance.yahoo.com/news/rss",
      "quality": 85
    }
  ],
  "neutral": [
    {
      "name": "Google News California",
      "url": "https://news.google.com/rss/headlines/section/geo/California?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Texas",
      "url": "https://news.google.com/rss/headlines/section/geo/Texas?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Florida",
      "url": "https://news.google.com/rss/headlines/section/geo/Florida?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News New York",
      "url": "https://news.google.com/rss/headlines/section/geo/New%20York?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Pennsylvania",
      "url": "https://news.google.com/rss/headlines/section/geo/Pennsylvania?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Illinois",
      "url": "https://news.google.com/rss/headlines/section/geo/Illinois?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Ohio",
      "url": "https://news.google.com/rss/headlines/section/geo/Ohio?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Georgia",
      "url": "https://news.google.com/rss/headlines/section/geo/Georgia?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News North Carolina",
      "url": "https://news.google.com/rss/headlines/section/geo/North%20Carolina?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Michigan",
      "url": "https://news.google.com/rss/headlines/section/geo/Michigan?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News New Jersey",
      "url": "https://news.google.com/rss/headlines/section/geo/New%20Jersey?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Virginia",
      "url": "https://news.google.com/rss/headlines/section/geo/Virginia?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Washington",
      "url": "https://news.google.com/rss/headlines/section/geo/Washington?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Arizona",
      "url": "https://news.google.com/rss/headlines/section/geo/Arizona?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Massachusetts",
      "url": "https://news.google.com/rss/headlines/section/geo/Massachusetts?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Tennessee",
      "url": "https://news.google.com/rss/headlines/section/geo/Tennessee?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Indiana",
      "url": "https://news.google.com/rss/headlines/section/geo/Indiana?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Missouri",
      "url": "https://news.google.com/rss/headlines/section/geo/Missouri?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Maryland",
      "url": "https://news.google.com/rss/headlines/section/geo/Maryland?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Wisconsin",
      "url": "https://news.google.com/rss/headlines/section/geo/Wisconsin?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Colorado",
      "url": "https://news.google.com/rss/headlines/section/geo/Colorado?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Minnesota",
      "url": "https://news.google.com/rss/headlines/section/geo/Minnesota?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News South Carolina",
      "url": "https://news.google.com/rss/headlines/section/geo/South%20Carolina?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Alabama",
      "url": "https://news.google.com/rss/headlines/section/geo/Alabama?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Louisiana",
      "url": "https://news.google.com/rss/headlines/section/geo/Louisiana?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Kentucky",
      "url": "https://news.google.com/rss/headlines/section/geo/Kentucky?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Oregon",
      "url": "https://news.google.com/rss/headlines/section/geo/Oregon?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Oklahoma",
      "url": "https://news.google.com/rss/headlines/section/geo/Oklahoma?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Connecticut",
      "url": "https://news.google.com/rss/headlines/section/geo/Connecticut?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Utah",
      "url": "https://news.google.com/rss/headlines/section/geo/Utah?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Iowa",
      "url": "https://news.google.com/rss/headlines/section/geo/Iowa?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Nevada",
      "url": "https://news.google.com/rss/headlines/section/geo/Nevada?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Arkansas",
      "url": "https://news.google.com/rss/headlines/section/geo/Arkansas?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Mississippi",
      "url": "https://news.google.com/rss/headlines/section/geo/Mississippi?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Kansas",
      "url": "https://news.google.com/rss/headlines/section/geo/Kansas?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News New Mexico",
      "url": "https://news.google.com/rss/headlines/section/geo/New%20Mexico?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Nebraska",
      "url": "https://news.google.com/rss/headlines/section/geo/Nebraska?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Idaho",
      "url": "https://news.google.com/rss/headlines/section/geo/Idaho?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News West Virginia",
      "url": "https://news.google.com/rss/headlines/section/geo/West%20Virginia?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Hawaii",
      "url": "https://news.google.com/rss/headlines/section/geo/Hawaii?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News New Hampshire",
      "url": "https://news.google.com/rss/headlines/section/geo/New%20Hampshire?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Maine",
      "url": "https://news.google.com/rss/headlines/section/geo/Maine?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Rhode Island",
      "url": "https://news.google.com/rss/headlines/section/geo/Rhode%20Island?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Montana",
      "url": "https://news.google.com/rss/headlines/section/geo/Montana?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Delaware",
      "url": "https://news.google.com/rss/headlines/section/geo/Delaware?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News South Dakota",
      "url": "https://news.google.com/rss/headlines/section/geo/South%20Dakota?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News North Dakota",
      "url": "https://news.google.com/rss/headlines/section/geo/North%20Dakota?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Alaska",
      "url": "https://news.google.com/rss/headlines/section/geo/Alaska?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Vermont",
      "url": "https://news.google.com/rss/headlines/section/geo/Vermont?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Wyoming",
      "url": "https://news.google.com/rss/headlines/section/geo/Wyoming?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News London",
      "url": "https://news.google.com/rss/headlines/section/geo/London?ceid=GB:en&hl=en-GB&gl=GB",
      "quality": 80
    },
    {
      "name": "Google News Manchester",
      "url": "https://news.google.com/rss/headlines/section/geo/Manchester?ceid=GB:en&hl=en-GB&gl=GB",
      "quality": 80
    },
    {
      "name": "Google News Birmingham",
      "url": "https://news.google.com/rss/headlines/section/geo/Birmingham?ceid=GB:en&hl=en-GB&gl=GB",
      "quality": 80
    },
    {
      "name": "Google News Leeds",
      "url": "https://news.google.com/rss/headlines/section/geo/Leeds?ceid=GB:en&hl=en-GB&gl=GB",
      "quality": 80
    },
    {
      "name": "Google News Glasgow",
      "url": "https://news.google.com/rss/headlines/section/geo/Glasgow?ceid=GB:en&hl=en-GB&gl=GB",
      "quality": 80
    },
    {
      "name": "Google News Sheffield",
      "url": "https://news.google.com/rss/headlines/section/geo/Sheffield?ceid=GB:en&hl=en-GB&gl=GB",
      "quality": 80
    },
    {
      "name": "Google News Bradford",
      "url": "https://news.google.com/rss/headlines/section/geo/Bradford?ceid=GB:en&hl=en-GB&gl=GB",
      "quality": 80
    },
    {
      "name": "Google News Edinburgh",
      "url": "https://news.google.com/rss/headlines/section/geo/Edinburgh?ceid=GB:en&hl=en-GB&gl=GB",
      "quality": 80
    },
    {
      "name": "Google News Liverpool",
      "url": "https://news.google.com/rss/headlines/section/geo/Liverpool?ceid=GB:en&hl=en-GB&gl=GB",
      "quality": 80
    },
    {
      "name": "Google News Bristol",
      "url": "https://news.google.com/rss/headlines/section/geo/Bristol?ceid=GB:en&hl=en-GB&gl=GB",
      "quality": 80
    },
    {
      "name": "Google News Cardiff",
      "url": "https://news.google.com/rss/headlines/section/geo/Cardiff?ceid=GB:en&hl=en-GB&gl=GB",
      "quality": 80
    },
    {
      "name": "Google News Belfast",
      "url": "https://news.google.com/rss/headlines/section/geo/Belfast?ceid=GB:en&hl=en-GB&gl=GB",
      "quality": 80
    },
    {
      "name": "Google News Tokyo",
      "url": "https://news.google.com/rss/headlines/section/geo/Tokyo?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Delhi",
      "url": "https://news.google.com/rss/headlines/section/geo/Delhi?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Shanghai",
      "url": "https://news.google.com/rss/headlines/section/geo/Shanghai?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Sao Paulo",
      "url": "https://news.google.com/rss/headlines/section/geo/Sao%20Paulo?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Mexico City",
      "url": "https://news.google.com/rss/headlines/section/geo/Mexico%20City?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Cairo",
      "url": "https://news.google.com/rss/headlines/section/geo/Cairo?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Dhaka",
      "url": "https://news.google.com/rss/headlines/section/geo/Dhaka?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Mumbai",
      "url": "https://news.google.com/rss/headlines/section/geo/Mumbai?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Beijing",
      "url": "https://news.google.com/rss/headlines/section/geo/Beijing?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Osaka",
      "url": "https://news.google.com/rss/headlines/section/geo/Osaka?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Karachi",
      "url": "https://news.google.com/rss/headlines/section/geo/Karachi?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Chongqing",
      "url": "https://news.google.com/rss/headlines/section/geo/Chongqing?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Istanbul",
      "url": "https://news.google.com/rss/headlines/section/geo/Istanbul?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Buenos Aires",
      "url": "https://news.google.com/rss/headlines/section/geo/Buenos%20Aires?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Kolkata",
      "url": "https://news.google.com/rss/headlines/section/geo/Kolkata?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Kinshasa",
      "url": "https://news.google.com/rss/headlines/section/geo/Kinshasa?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Lagos",
      "url": "https://news.google.com/rss/headlines/section/geo/Lagos?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Manila",
      "url": "https://news.google.com/rss/headlines/section/geo/Manila?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Tianjin",
      "url": "https://news.google.com/rss/headlines/section/geo/Tianjin?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Guangzhou",
      "url": "https://news.google.com/rss/headlines/section/geo/Guangzhou?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Rio de Janeiro",
      "url": "https://news.google.com/rss/headlines/section/geo/Rio%20de%20Janeiro?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Lahore",
      "url": "https://news.google.com/rss/headlines/section/geo/Lahore?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Bangalore",
      "url": "https://news.google.com/rss/headlines/section/geo/Bangalore?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Shenzhen",
      "url": "https://news.google.com/rss/headlines/section/geo/Shenzhen?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Moscow",
      "url": "https://news.google.com/rss/headlines/section/geo/Moscow?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Chennai",
      "url": "https://news.google.com/rss/headlines/section/geo/Chennai?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Bogota",
      "url": "https://news.google.com/rss/headlines/section/geo/Bogota?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Paris",
      "url": "https://news.google.com/rss/headlines/section/geo/Paris?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Jakarta",
      "url": "https://news.google.com/rss/headlines/section/geo/Jakarta?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Lima",
      "url": "https://news.google.com/rss/headlines/section/geo/Lima?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Bangkok",
      "url": "https://news.google.com/rss/headlines/section/geo/Bangkok?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Seoul",
      "url": "https://news.google.com/rss/headlines/section/geo/Seoul?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Hyderabad",
      "url": "https://news.google.com/rss/headlines/section/geo/Hyderabad?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News London",
      "url": "https://news.google.com/rss/headlines/section/geo/London?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Tehran",
      "url": "https://news.google.com/rss/headlines/section/geo/Tehran?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Chicago",
      "url": "https://news.google.com/rss/headlines/section/geo/Chicago?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Chengdu",
      "url": "https://news.google.com/rss/headlines/section/geo/Chengdu?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Nanjing",
      "url": "https://news.google.com/rss/headlines/section/geo/Nanjing?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Wuhan",
      "url": "https://news.google.com/rss/headlines/section/geo/Wuhan?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Ho Chi Minh City",
      "url": "https://news.google.com/rss/headlines/section/geo/Ho%20Chi%20Minh%20City?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Luanda",
      "url": "https://news.google.com/rss/headlines/section/geo/Luanda?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Ahmedabad",
      "url": "https://news.google.com/rss/headlines/section/geo/Ahmedabad?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Kuala Lumpur",
      "url": "https://news.google.com/rss/headlines/section/geo/Kuala%20Lumpur?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Xi'an",
      "url": "https://news.google.com/rss/headlines/section/geo/Xi'an?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Hong Kong",
      "url": "https://news.google.com/rss/headlines/section/geo/Hong%20Kong?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Dongguan",
      "url": "https://news.google.com/rss/headlines/section/geo/Dongguan?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Hangzhou",
      "url": "https://news.google.com/rss/headlines/section/geo/Hangzhou?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Foshan",
      "url": "https://news.google.com/rss/headlines/section/geo/Foshan?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Shenyang",
      "url": "https://news.google.com/rss/headlines/section/geo/Shenyang?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Riyadh",
      "url": "https://news.google.com/rss/headlines/section/geo/Riyadh?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Baghdad",
      "url": "https://news.google.com/rss/headlines/section/geo/Baghdad?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Santiago",
      "url": "https://news.google.com/rss/headlines/section/geo/Santiago?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Surat",
      "url": "https://news.google.com/rss/headlines/section/geo/Surat?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Madrid",
      "url": "https://news.google.com/rss/headlines/section/geo/Madrid?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Suzhou",
      "url": "https://news.google.com/rss/headlines/section/geo/Suzhou?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Pune",
      "url": "https://news.google.com/rss/headlines/section/geo/Pune?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Harbin",
      "url": "https://news.google.com/rss/headlines/section/geo/Harbin?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Houston",
      "url": "https://news.google.com/rss/headlines/section/geo/Houston?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Dallas",
      "url": "https://news.google.com/rss/headlines/section/geo/Dallas?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Toronto",
      "url": "https://news.google.com/rss/headlines/section/geo/Toronto?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Dar es Salaam",
      "url": "https://news.google.com/rss/headlines/section/geo/Dar%20es%20Salaam?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Miami",
      "url": "https://news.google.com/rss/headlines/section/geo/Miami?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Belo Horizonte",
      "url": "https://news.google.com/rss/headlines/section/geo/Belo%20Horizonte?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Singapore",
      "url": "https://news.google.com/rss/headlines/section/geo/Singapore?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Philadelphia",
      "url": "https://news.google.com/rss/headlines/section/geo/Philadelphia?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Atlanta",
      "url": "https://news.google.com/rss/headlines/section/geo/Atlanta?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Fukuoka",
      "url": "https://news.google.com/rss/headlines/section/geo/Fukuoka?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Khartoum",
      "url": "https://news.google.com/rss/headlines/section/geo/Khartoum?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Barcelona",
      "url": "https://news.google.com/rss/headlines/section/geo/Barcelona?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Johannesburg",
      "url": "https://news.google.com/rss/headlines/section/geo/Johannesburg?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Saint Petersburg",
      "url": "https://news.google.com/rss/headlines/section/geo/Saint%20Petersburg?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Qingdao",
      "url": "https://news.google.com/rss/headlines/section/geo/Qingdao?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Dalian",
      "url": "https://news.google.com/rss/headlines/section/geo/Dalian?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Washington",
      "url": "https://news.google.com/rss/headlines/section/geo/Washington?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Yangon",
      "url": "https://news.google.com/rss/headlines/section/geo/Yangon?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Alexandria",
      "url": "https://news.google.com/rss/headlines/section/geo/Alexandria?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Jinan",
      "url": "https://news.google.com/rss/headlines/section/geo/Jinan?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Guadalajara",
      "url": "https://news.google.com/rss/headlines/section/geo/Guadalajara?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Dubai",
      "url": "https://news.google.com/rss/headlines/section/geo/Dubai?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Sydney",
      "url": "https://news.google.com/rss/headlines/section/geo/Sydney?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Melbourne",
      "url": "https://news.google.com/rss/headlines/section/geo/Melbourne?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Cape Town",
      "url": "https://news.google.com/rss/headlines/section/geo/Cape%20Town?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Monterrey",
      "url": "https://news.google.com/rss/headlines/section/geo/Monterrey?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Montreal",
      "url": "https://news.google.com/rss/headlines/section/geo/Montreal?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Rome",
      "url": "https://news.google.com/rss/headlines/section/geo/Rome?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Berlin",
      "url": "https://news.google.com/rss/headlines/section/geo/Berlin?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Los Angeles",
      "url": "https://news.google.com/rss/headlines/section/geo/Los%20Angeles?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Seattle",
      "url": "https://news.google.com/rss/headlines/section/geo/Seattle?ceid=US:en&hl=en-US&gl=US",
      "quality": 80
    },
    {
      "name": "Google News Delhi",
      "url": "https://news.google.com/rss/headlines/section/geo/Delhi?ceid=IN:en&hl=en-IN&gl=IN",
      "quality": 80
    },
    {
      "name": "Google News Mumbai",
      "url": "https://news.google.com/rss/headlines/section/geo/Mumbai?ceid=IN:en&hl=en-IN&gl=IN",
      "quality": 80
    },
    {
      "name": "Google News Kolkata",
      "url": "https://news.google.com/rss/headlines/section/geo/Kolkata?ceid=IN:en&hl=en-IN&gl=IN",
      "quality": 80
    },
    {
      "name": "Google News Chennai",
      "url": "https://news.google.com/rss/headlines/section/geo/Chennai?ceid=IN:en&hl=en-IN&gl=IN",
      "quality": 80
    },
    {
      "name": "Google News Bangalore",
      "url": "https://news.google.com/rss/headlines/section/geo/Bangalore?ceid=IN:en&hl=en-IN&gl=IN",
      "quality": 80
    },
    {
      "name": "Google News Hyderabad",
      "url": "https://news.google.com/rss/headlines/section/geo/Hyderabad?ceid=IN:en&hl=en-IN&gl=IN",
      "quality": 80
    },
    {
      "name": "Google News Pune",
      "url": "https://news.google.com/rss/headlines/section/geo/Pune?ceid=IN:en&hl=en-IN&gl=IN",
      "quality": 80
    },
    {
      "name": "Google News Ahmedabad",
      "url": "https://news.google.com/rss/headlines/section/geo/Ahmedabad?ceid=IN:en&hl=en-IN&gl=IN",
      "quality": 80
    },
    {
      "name": "Google News Surat",
      "url": "https://news.google.com/rss/headlines/section/geo/Surat?ceid=IN:en&hl=en-IN&gl=IN",
      "quality": 80
    },
    {
      "name": "Google News Jaipur",
      "url": "https://news.google.com/rss/headlines/section/geo/Jaipur?ceid=IN:en&hl=en-IN&gl=IN",
      "quality": 80
    },
    {
      "name": "Google News Kerala",
      "url": "https://news.google.com/rss/headlines/section/geo/Kerala?ceid=IN:en&hl=en-IN&gl=IN",
      "quality": 80
    },
    {
      "name": "Google News Punjab",
      "url": "https://news.google.com/rss/headlines/section/geo/Punjab?ceid=IN:en&hl=en-IN&gl=IN",
      "quality": 80
    },
    {
      "name": "Axios",
      "url": "https://api.axios.com/feed/",
      "quality": 84
    },
    {
      "name": "UPI Top News",
      "url": "https://www.upi.com/rss/news/",
      "quality": 94
    },
    {
      "name": "Time",
      "url": "https://time.com/feed/",
      "quality": 82
    },
    {
      "name": "The Hill",
      "url": "https://thehill.com/feed/",
      "quality": 80
    },
    {
      "name": "Fortune",
      "url": "https://fortune.com/feed/",
      "quality": 80
    },
    {
      "name": "MarketWatch",
      "url": "http://feeds.marketwatch.com/marketwatch/topstories/",
      "quality": 85
    },
    {
      "name": "Investing.com",
      "url": "https://www.investing.com/rss/news.rss",
      "quality": 80
    },
    {
      "name": "Benzinga",
      "url": "https://www.benzinga.com/feed",
      "quality": 78
    },
    {
      "name": "Business Insider",
      "url": "https://feeds.businessinsider.com/custom/all",
      "quality": 78
    },
    {
      "name": "TechCrunch",
      "url": "https://techcrunch.com/feed/",
      "quality": 80
    },
    {
      "name": "Wired",
      "url": "https://www.wired.com/feed/rss",
      "quality": 85
    },
    {
      "name": "The Verge",
      "url": "https://www.theverge.com/rss/index.xml",
      "quality": 82
    },
    {
      "name": "Ars Technica",
      "url": "https://feeds.arstechnica.com/arstechnica/index",
      "quality": 88
    },
    {
      "name": "Engadget",
      "url": "https://www.engadget.com/rss.xml",
      "quality": 80
    },
    {
      "name": "MIT Tech Review",
      "url": "https://www.technologyreview.com/feed/",
      "quality": 90
    },
    {
      "name": "CNET",
      "url": "https://www.cnet.com/rss/news/",
      "quality": 80
    },
    {
      "name": "ZDNet",
      "url": "https://www.zdnet.com/news/rss.xml",
      "quality": 82
    },
    {
      "name": "Mashable",
      "url": "https://mashable.com/feeds/rss/all",
      "quality": 75
    },
    {
      "name": "VentureBeat",
      "url": "https://feeds.feedburner.com/venturebeat/SZYF",
      "quality": 82
    },
    {
      "name": "Gizmodo",
      "url": "https://gizmodo.com/rss",
      "quality": 78
    },
    {
      "name": "Polygon",
      "url": "https://www.polygon.com/rss/index.xml",
      "quality": 80
    },
    {
      "name": "Kotaku",
      "url": "https://kotaku.com/rss",
      "quality": 78
    },
    {
      "name": "Space.com",
      "url": "https://www.space.com/feeds/all",
      "quality": 85
    },
    {
      "name": "New Scientist",
      "url": "https://www.newscientist.com/feed/home/",
      "quality": 88
    },
    {
      "name": "Phys.org",
      "url": "https://phys.org/rss-feed/breaking/",
      "quality": 88
    },
    {
      "name": "CBS Sports",
      "url": "https://www.cbssports.com/rss/headlines/",
      "quality": 82
    },
    {
      "name": "Sky Sports News",
      "url": "https://www.skysports.com/rss/12040",
      "quality": 85
    },
    {
      "name": "Yahoo Sports UK",
      "url": "https://uk.sports.yahoo.com/rss/",
      "quality": 80
    },
    {
      "name": "Goal.com",
      "url": "https://www.goal.com/en/feeds/news",
      "quality": 80
    },
    {
      "name": "Variety",
      "url": "https://variety.com/feed/",
      "quality": 85
    },
    {
      "name": "Hollywood Reporter",
      "url": "https://www.hollywoodreporter.com/feed/",
      "quality": 85
    },
    {
      "name": "Rolling Stone",
      "url": "https://www.rollingstone.com/feed/",
      "quality": 82
    },
    {
      "name": "Pitchfork",
      "url": "https://pitchfork.com/rss/news/",
      "quality": 80
    },
    {
      "name": "The Hindu Top",
      "url": "https://www.thehindu.com/news/national/feeder/default.rss",
      "quality": 88
    },
    {
      "name": "LiveMint",
      "url": "https://www.livemint.com/rss/news",
      "quality": 82
    },
    {
      "name": "Economic Times",
      "url": "https://economictimes.indiatimes.com/rssfeedstopstories.cms",
      "quality": 80
    },
    {
      "name": "Times of India",
      "url": "https://timesofindia.indiatimes.com/rssfeedstopstories.cms",
      "quality": 75
    },
    {
      "name": "Hindu Business Line",
      "url": "https://www.thehindubusinessline.com/feeder/default.rss",
      "quality": 84
    },
    {
      "name": "India Today",
      "url": "https://www.indiatoday.in/rss/home",
      "quality": 78
    },
    {
      "name": "ABP Live",
      "url": "https://news.abplive.com/home/feed",
      "quality": 75
    },
    {
      "name": "Financial Express",
      "url": "https://www.financialexpress.com/feed/",
      "quality": 80
    },
    {
      "name": "CBC News",
      "url": "https://www.cbc.ca/cmlink/rss-topstories",
      "quality": 88
    },
    {
      "name": "Global News CA",
      "url": "https://globalnews.ca/feed/",
      "quality": 80
    },
    {
      "name": "CTV News",
      "url": "https://www.ctvnews.ca/rss/ctvnews-ca-top-stories-public-rss-1.822009",
      "quality": 82
    },
    {
      "name": "ABC News AU",
      "url": "https://www.abc.net.au/news/feed/51120/rss.xml",
      "quality": 88
    },
    {
      "name": "Sydney Morning Herald",
      "url": "https://www.smh.com.au/rss/world.xml",
      "quality": 86
    },
    {
      "name": "The Age",
      "url": "https://www.theage.com.au/rss/world.xml",
      "quality": 85
    },
    {
      "name": "Brisbane Times",
      "url": "https://www.brisbanetimes.com.au/rss/world.xml",
      "quality": 80
    },
    {
      "name": "WA Today",
      "url": "https://www.watoday.com.au/rss/world.xml",
      "quality": 80
    },
    {
      "name": "Stuff.co.nz",
      "url": "https://www.stuff.co.nz/rss/world",
      "quality": 82
    },
    {
      "name": "RNZ",
      "url": "https://www.rnz.co.nz/rss/world.xml",
      "quality": 88
    },
    {
      "name": "Otago Daily Times",
      "url": "https://www.odt.co.nz/news/world/rss",
      "quality": 80
    },
    {
      "name": "News24",
      "url": "https://feeds.news24.com/articles/news24/TopStories/rss",
      "quality": 84
    },
    {
      "name": "Daily Maverick",
      "url": "https://www.dailymaverick.co.za/feed/",
      "quality": 85
    },
    {
      "name": "EWN",
      "url": "https://ewn.co.za/RSS/News",
      "quality": 82
    },
    {
      "name": "AllAfrica",
      "url": "https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf",
      "quality": 85
    },
    {
      "name": "Daily Nation",
      "url": "https://nation.africa/kenya/news/rss",
      "quality": 82
    },
    {
      "name": "Nikkei Asia",
      "url": "https://asia.nikkei.com/rss/feed/nar",
      "quality": 90
    },
    {
      "name": "The Straits Times",
      "url": "https://www.straitstimes.com/news/world/rss.xml",
      "quality": 88
    },
    {
      "name": "South China Morning Post",
      "url": "https://www.scmp.com/rss/91/feed",
      "quality": 82
    },
    {
      "name": "Channel News Asia",
      "url": "https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml",
      "quality": 86
    },
    {
      "name": "Japan Times",
      "url": "https://www.japantimes.co.jp/feed/",
      "quality": 84
    },
    {
      "name": "Malay Mail",
      "url": "https://www.malaymail.com/feed/rss",
      "quality": 78
    },
    {
      "name": "Free Malaysia Today",
      "url": "https://www.freemalaysiatoday.com/feed/",
      "quality": 75
    },
    {
      "name": "Inquirer",
      "url": "https://www.inquirer.net/fullfeed",
      "quality": 82
    },
    {
      "name": "Rappler",
      "url": "https://www.rappler.com/feed",
      "quality": 82
    },
    {
      "name": "GMA News",
      "url": "https://data.gmanetwork.com/gno/rss/news/feed.xml",
      "quality": 80
    },
    {
      "name": "RTE",
      "url": "https://www.rte.ie/news/rss/news-headlines.xml",
      "quality": 88
    },
    {
      "name": "Irish Times",
      "url": "https://www.irishtimes.com/cmlink/news-1.1319192",
      "quality": 86
    }
  ],
  "pro_opposition_2": [
    {
      "name": "New York Times Home",
      "url": "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
      "quality": 92
    },
    {
      "name": "New York Times World",
      "url": "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
      "quality": 92
    },
    {
      "name": "The Guardian World",
      "url": "https://www.theguardian.com/world/rss",
      "quality": 88
    },
    {
      "name": "The Guardian UK",
      "url": "https://www.theguardian.com/uk/rss",
      "quality": 88
    },
    {
      "name": "The Guardian US",
      "url": "https://www.theguardian.com/us/rss",
      "quality": 88
    },
    {
      "name": "Vox",
      "url": "https://www.vox.com/rss/index.xml",
      "quality": 80
    },
    {
      "name": "CNN Top",
      "url": "http://rss.cnn.com/rss/edition.rss",
      "quality": 76
    },
    {
      "name": "CNN World",
      "url": "http://rss.cnn.com/rss/edition_world.rss",
      "quality": 76
    },
    {
      "name": "The Intercept",
      "url": "https://theintercept.com/feed/?rss",
      "quality": 74
    },
    {
      "name": "The Nation",
      "url": "https://www.thenation.com/feed/?post_type=article",
      "quality": 72
    },
    {
      "name": "Democracy Now",
      "url": "https://www.democracynow.org/democracynow.rss",
      "quality": 70
    },
    {
      "name": "Mother Jones",
      "url": "https://www.motherjones.com/feed/",
      "quality": 75
    },
    {
      "name": "Slate",
      "url": "https://slate.com/feeds/all.rss",
      "quality": 75
    },
    {
      "name": "Salon",
      "url": "https://www.salon.com/feed/",
      "quality": 70
    },
    {
      "name": "Vice",
      "url": "https://www.vice.com/en/rss",
      "quality": 72
    },
    {
      "name": "Rolling Stone Politics",
      "url": "https://www.rollingstone.com/politics/feed/",
      "quality": 75
    },
    {
      "name": "LA Times",
      "url": "https://www.latimes.com/world-nation/rss2.0.xml",
      "quality": 85
    },
    {
      "name": "Daily Mirror",
      "url": "https://www.mirror.co.uk/news/world-news/?service=rss",
      "quality": 65
    },
    {
      "name": "The Scotsman",
      "url": "https://www.scotsman.com/rss",
      "quality": 75
    },
    {
      "name": "Indian Express",
      "url": "https://indianexpress.com/feed/",
      "quality": 80
    },
    {
      "name": "NDTV",
      "url": "https://feeds.feedburner.com/ndtvnews-top-stories",
      "quality": 76
    },
    {
      "name": "Scroll.in",
      "url": "https://feeds.feedburner.com/ScrollinArticles.rss",
      "quality": 74
    },
    {
      "name": "Newslaundry",
      "url": "https://www.newslaundry.com/feed",
      "quality": 76
    },
    {
      "name": "The Quint",
      "url": "https://www.thequint.com/feed",
      "quality": 70
    },
    {
      "name": "News Minute",
      "url": "https://www.thenewsminute.com/feed",
      "quality": 70
    }
  ],
  "pro_establishment": [
    {
      "name": "Wall Street Journal",
      "url": "https://feeds.a.dj.com/rss/RSSWorldNews.xml",
      "quality": 90
    },
    {
      "name": "National Review",
      "url": "https://www.nationalreview.com/feed/",
      "quality": 74
    },
    {
      "name": "Fox News Politics",
      "url": "http://feeds.foxnews.com/foxnews/politics",
      "quality": 68
    },
    {
      "name": "Fox News World",
      "url": "http://feeds.foxnews.com/foxnews/world",
      "quality": 68
    },
    {
      "name": "New York Post",
      "url": "https://nypost.com/news/feed/",
      "quality": 65
    },
    {
      "name": "Washington Times",
      "url": "https://www.washingtontimes.com/rss/headlines/news/politics/",
      "quality": 65
    },
    {
      "name": "Daily Express",
      "url": "https://www.express.co.uk/posts/rss/78/world",
      "quality": 50
    },
    {
      "name": "Hindustan Times",
      "url": "https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml",
      "quality": 76
    },
    {
      "name": "News18",
      "url": "https://www.news18.com/rss/india.xml",
      "quality": 68
    },
    {
      "name": "Swarajya",
      "url": "https://swarajyamag.com/feed",
      "quality": 70
    },
    {
      "name": "OpIndia",
      "url": "https://www.opindia.com/feed/",
      "quality": 60
    },
    {
      "name": "India TV",
      "url": "https://www.indiatvnews.com/rssnews/topstory.xml",
      "quality": 65
    }
  ],
  "pro_establishment_2": [
    {
      "name": "Daily Wire",
      "url": "https://www.dailywire.com/feeds/rss.xml",
      "quality": 48
    },
    {
      "name": "Breitbart",
      "url": "https://feeds.feedburner.com/breitbart",
      "quality": 40
    },
    {
      "name": "OANN",
      "url": "https://www.oann.com/feed/",
      "quality": 40
    },
    {
      "name": "The Blaze",
      "url": "https://www.theblaze.com/feeds/feed.rss",
      "quality": 45
    },
    {
      "name": "PJ Media",
      "url": "https://pjmedia.com/feed/",
      "quality": 45
    }
  ]
};
