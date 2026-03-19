import requests
from bs4 import BeautifulSoup
import re
from urllib.parse import urljoin
import sys
import json

def discover_rss(url):
    """
    Attempts to find RSS/Atom feed URLs from a given website URL.
    """
    try:
        # User-agent to avoid being blocked
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=15, allow_redirects=True)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'lxml')
        rss_links = []
        
        # 1. Look for <link> tags in <head>
        for link in soup.find_all('link', type=['application/rss+xml', 'application/atom+xml', 'text/xml', 'application/xml']):
            href = link.get('href')
            if href:
                full_url = urljoin(url, href)
                # Filter out some false positives
                if 'rss' in full_url.lower() or 'feed' in full_url.lower() or 'xml' in full_url.lower():
                    rss_links.append(full_url)
        
        # 2. Look for <a> tags with "rss" or "feed" in href
        if not rss_links:
            for a in soup.find_all('a', href=True):
                href = a['href']
                if 'rss' in href.lower() or '/feed' in href.lower():
                    rss_links.append(urljoin(url, href))
        
        # 3. Common patterns as fallback
        if not rss_links:
            common_paths = ['/feed', '/rss', '/rss.xml', '/index.xml', '/feed.xml']
            for path in common_paths:
                test_url = urljoin(url, path)
                try:
                    r = requests.head(test_url, headers=headers, timeout=5)
                    if r.status_code == 200 and ('xml' in r.headers.get('Content-Type', '').lower() or 'rss' in r.headers.get('Content-Type', '').lower()):
                        rss_links.append(test_url)
                except:
                    continue
                    
        return sorted(list(set(rss_links)))
    except Exception as e:
        return [f"Error: {str(e)}"]

if __name__ == "__main__":
    if len(sys.argv) > 1:
        target_url = sys.argv[1]
        feeds = discover_rss(target_url)
        print(json.dumps(feeds, indent=2))
    else:
        print("Usage: python rss_discoverer.py <url>")
