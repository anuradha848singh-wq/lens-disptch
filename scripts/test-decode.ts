import axios from 'axios';
import * as cheerio from 'cheerio';

async function testFetch() {
  const url = 'https://news.google.com/articles/CBMilgFBVV95cUxMNDRrVmc2bnJhajZhZE01elJpS2xXalRZaWVWWXoxS3ktNEFQOHdvMzFnVTVVV3k1ay05ZWV\nYQmN5NUZGWHhrSS00Rm1fUzhIOTZSNk1DQXQwUzZvWjJnbjJBSGR0T2s1LXVYOVJKenh5MnpCZ2V0dTNGT015RGtoVzBxTkNjWVNMNjhoUEVUaGFWSHdZQmc?oc=5'.replace(/\n/g, '');
  
  try {
    const res = await axios.get(url, {
      maxRedirects: 10,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const html = res.data;
    const $ = cheerio.load(html);
    
    console.log("Looking for URLs in links:");
    $('a').each((i, el) => {
      console.log($(el).attr('href'));
    });

    console.log("Looking for window.location in scripts:");
    const scripts = $('script').map((i, el) => $(el).html()).get();
    for (const s of scripts) {
      if (s.includes('http')) {
        console.log("Script snippet with http:", s.substring(0, 100));
      }
    }

    console.log("Looking for data-n-a-id:");
    $('*[data-n-a-id]').each((i, el) => {
      console.log($(el).attr('data-n-a-id'));
    });
  } catch (e) {
    console.log("Error:", e.message);
  }
}
testFetch();
