// ============================================================
// IMPORTS
// ============================================================

import * as dotenv from 'dotenv';
import FirecrawlApp from '@mendable/firecrawl-js';
import { createClient } from '@supabase/supabase-js';

const ws = require('ws');

dotenv.config();

// ============================================================
// DATABASE
// ============================================================

// Role: Supabase client for all database operations
// Input: URL and anon key from environment variables
// Output: Supabase client instance
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!,
  { realtime: { transport: ws as any } }
);

// Role: Saves a product row to 4c_hair_products table
// Input: row object with all product fields
// Output: void
async function saveToDatabase(row: {
  hair_type:    string;
  product_name: string;
  brand:        string | null;
  source_url:   string;
  scraped_from: string;
  query:        string;
}) {
  const { error } = await supabase.from('4c_hair_products').insert(row);
  if (error) {
    console.log(`❌ Supabase error: ${error.message}`);
  } else {
    console.log(`💾 Saved — ${row.product_name} (${row.hair_type})`);
  }
}

// ============================================================
// LOGIC
// ============================================================

// Role: Wraps fetch with a timeout to skip slow requests
// Input: url, fetch options, timeoutMs (default 30s)
// Output: fetch Response object
async function fetchWithTimeout(
  url:       string,
  options:   any,
  timeoutMs: number = 30000
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return response;
  } catch (err: any) {
    clearTimeout(timer);
    throw new Error(`Request timed out after ${timeoutMs / 1000}s`);
  }
}

// Role: Scrapes a URL using Firecrawl and returns clean markdown text
// Input: url (string)
// Output: markdown string or empty string if scrape fails
async function scrapeUrl(url: string): Promise<string> {
  const scraped = await firecrawl.scrapeUrl(url, { formats: ['markdown'] });
  return scraped.success ? (scraped.markdown || '') : '';
}

// Role: Sends scraped content to Phi-4 to extract 4C hair product data
// Input: content (scraped text), query (search term), url (source URL)
// Output: structured product object or null if invalid
async function extractWithFoundry(
  content: string,
  query:   string,
  url:     string
) {
  console.log(`🧠 Extracting with Foundry...`);

  const response = await fetchWithTimeout(
    `https://textured-hair-agent-resource.services.ai.azure.com/openai/v1/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key':      process.env.AZURE_FOUNDRY_KEY!,
      },
      body: JSON.stringify({
        model:    'Phi-4-mini-instruct',
        messages: [
          {
            role:    'system',
            content: `You output ONLY raw JSON. No text before or after. No explanation. No markdown. ONLY a JSON object.`
          },
          {
            role:    'user',
            content: `Extract 4C hair product data from the content below.

Fill in this exact JSON. Use null for unknown fields:
{
  "hair_type": null,
  "product_name": null,
  "brand": null
}

Content:
${content.slice(0, 800)}`
          }
        ],
        max_tokens: 200
      })
    },
    30000
  );

  console.log(`📡 Foundry status: ${response.status}`);

  const data      = await response.json();
  const text      = data.choices?.[0]?.message?.content || '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    console.log(`⚠️  No JSON found`);
    return null;
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    const hasProductName = parsed.product_name && parsed.product_name !== 'null';
    const hasHairType    = parsed.hair_type && parsed.hair_type !== 'null';

    if (!hasHairType) {
      console.log(`⏭️  Skipping — no hair_type found`);
      return null;
    }

    if (!hasProductName) {
      console.log(`⏭️  Skipping — no product_name found`);
      return null;
    }

    return {
      hair_type:    parsed.hair_type,
      product_name: parsed.product_name,
      brand:        parsed.brand || null,
      source_url:   url,
      scraped_from: new URL(url).hostname,
      query,
    };
  } catch {
    console.log(`⚠️  Could not parse JSON`);
    return null;
  }
}

// ============================================================
// STATE
// ============================================================

// Role: Firecrawl client for web scraping
// Input: API key from environment variables
// Output: Firecrawl client instance
const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY!
});

// Role: Search queries targeting real 4C hair product pages
const queries = [
  '4C hair shampoo',
  '4C hair conditioner',
  '4C hair leave in conditioner',
  '4C hair oil',
  '4C hair gel',
  '4C hair butter',
  '4C hair mousse',
  '4C hair serum',
  '4C hair cream',
  '4C hair spray',
];

// ============================================================
// OUTPUT
// ============================================================

// Role: Runs the full pipeline for a single query — search, scrape, extract, save
// Input: query (search term string)
// Output: void
async function scrapeAndStructure(query: string) {
  console.log(`\n🔍 Searching for: "${query}"`);
  console.log(`─────────────────────────────────────`);

  const searchResult = await firecrawl.search(query, { limit: 10 });
  console.log(`✅ Found ${searchResult.data.length} results\n`);

  for (const result of searchResult.data) {
    console.log(`📄 Processing: ${result.url}`);

    try {
      const content = await scrapeUrl(result.url);
      console.log(`📝 Content length: ${content.length} chars`);

      const extracted = await extractWithFoundry(content, query, result.url);
      if (extracted) await saveToDatabase(extracted);

    } catch (err: any) {
      console.log(`⏭️  Skipping — ${err.message}`);
    }

    console.log(`─────────────────────────────────────`);
  }

  console.log(`✅ Query complete: "${query}"\n`);
}

// Role: Entry point — runs all queries sequentially
// Input: none
// Output: void
(async () => {
  for (const query of queries) {
    await scrapeAndStructure(query);
  }
  console.log(`\n🎉 All queries complete! Check your Supabase table.`);
})();