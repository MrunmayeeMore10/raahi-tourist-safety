import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function cityNewsPlugin() {
  return {
    name: 'city-news-api',
    configureServer(server) {
      server.middlewares.use('/api/city-news', async (req, res) => {
        const url = new URL(req.url, 'http://localhost');
        const city = (url.searchParams.get('city') || '').trim();
        if (!city) {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ ok: false, error: 'City required', news: [] }));
        }

        try {
          const query = `${city} (safety OR protest OR crime OR curfew OR strike OR warning) when:90d`;
          const newsUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
          const resp = await fetch(newsUrl, { signal: AbortSignal.timeout(6000) });
          if (!resp.ok) throw new Error(`Google News HTTP ${resp.status}`);
          const xml = await resp.text();

          const items = [];
          const itemRegex = /<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<pubDate>(.*?)<\/pubDate>[\s\S]*?<source[^>]*>(.*?)<\/source>[\s\S]*?<\/item>/g;
          let match;
          const cutoff90Days = Date.now() - (90 * 24 * 60 * 60 * 1000);

          while ((match = itemRegex.exec(xml)) && items.length < 5) {
            const fullTitle = match[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
            const cleanTitle = fullTitle.replace(/\s*-\s*[^-]+$/, '').trim();
            const source = match[4].replace(/&amp;/g, '&');
            const pubDate = match[3];
            const link = match[2];

            // 1. Strict 90-day timestamp cutoff
            const pubTime = pubDate ? new Date(pubDate).getTime() : Date.now();
            if (pubDate && !isNaN(pubTime) && pubTime < cutoff90Days) {
              continue; // Skip anything published before 90 days ago
            }

            // 2. Reject historical old cases mentioning past years (e.g., 2004, 2012, 2015, 2020, 2021, 2024, etc.)
            if (/\b(19\d\d|200\d|201\d|202[0-5])\b/.test(cleanTitle)) {
              continue; // Skip old historical cases
            }

            // 3. Skip irrelevant sports matches (e.g. "striker signed", "football safety position", "vs.")
            if (/\b(striker|forward|transfer|champions league|la liga|premier league|serie a|fifa|uefa|fc\b|match report|vs\.|\bvs\b|colts|nfl|quarterback|touchdown|nba|wicket|cricket|ipl|football game)\b/i.test(cleanTitle)) {
              continue;
            }

            let dateLabel = "Last 3 Months";
            if (pubDate && !isNaN(pubTime)) {
              const daysAgo = Math.max(0, Math.floor((Date.now() - pubTime) / (1000 * 60 * 60 * 24)));
              if (daysAgo === 0) dateLabel = "Today";
              else if (daysAgo === 1) dateLabel = "Yesterday";
              else if (daysAgo < 7) dateLabel = `${daysAgo}d ago`;
              else if (daysAgo < 30) dateLabel = `${Math.floor(daysAgo / 7)}w ago (${new Date(pubTime).toLocaleDateString([], { month: 'short', day: 'numeric' })})`;
              else dateLabel = `${Math.floor(daysAgo / 30)}mo ago (${new Date(pubTime).toLocaleDateString([], { month: 'short', day: 'numeric' })})`;
            }

            let severity = 'info';
            let category = 'Travel Advisory';
            const lower = cleanTitle.toLowerCase();
            if (/curfew|riot|violent|shooting|terror|assault|explosion|hostage|killed|attack|danger/.test(lower)) {
              severity = 'high';
              category = 'Critical Alert';
            } else if (/protest|strike|demonstration|unrest|clash|looting|tear gas|scam|theft|pickpocket|warning/.test(lower)) {
              severity = 'medium';
              category = 'Disruption / Safety Warning';
            }

            items.push({
              title: cleanTitle,
              source,
              date: dateLabel,
              rawDate: pubDate,
              url: link,
              severity,
              category
            });
          }

          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ ok: true, city, news: items }));
        } catch (err) {
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ ok: false, error: err.message, news: [] }));
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), cityNewsPlugin()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true
      }
    }
  }
});

