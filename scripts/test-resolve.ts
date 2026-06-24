import axios from 'axios';
import * as cheerio from 'cheerio';

async function testResolve() {
  const url = 'https://news.google.com/rss/articles/CBMilgFBVV95cUxMNDRrVmc2bnJhajZhZE01elJpS2xXalRZaWVWWXoxS3ktNEFQOHdvMzFnVTVVV3k1ay05ZWV\n' +
    'YQmN5NUZGWHhrSS00Rm1fUzhIOTZSNk1DQXQwUzZvWjJnbjJBSGR0T2s1LXVYOVJKenh5MnpCZ2V0dTNGT015RGtoVzBxTkNjWVNMNjhoUEVUaGFWSHdZQmc?oc=5';
  
  try {
    const res = await axios.get(url, {
      maxRedirects: 10,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
      }
    });

    console.log("Status:", res.status);
    console.log("Final URL:", res.request.res.responseUrl || res.request.responseURL || url);

    const html = res.data;
    const $ = cheerio.load(html);
    
    // Google serves a redirect page with <c-wiz> or <a href="...">
    console.log("A tags:");
    $('a').each((i, el) => {
      console.log($(el).attr('href'));
    });
    
    console.log("c-wiz datr:");
    $('c-wiz').each((i, el) => {
      console.log($(el).attr('data-n-a-id'));
    });

  } catch (e) {
    console.log("Error:", e.message);
  }
}

testResolve();
