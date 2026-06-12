cat > README.md << 'EOF'
# 4C Hair Products Agent
**Agents League Hackathon 2026 — Reasoning Agents Track**

## What It Does
An AI agent that automatically scrapes the internet for 4C hair product data, extracts structured information using Microsoft Phi-4 on Azure AI Foundry, and stores it in a clean Supabase database. The agent collected 80+ real product data points across 10 product categories.

## The Problem It Solves
4C hair product information is scattered across the internet with no structured searchable source. This agent attempts to close that gap by automatically collecting and structuring 4C hair product data into one clean searchable database.

## Agent Pipeline
Query Input → Firecrawl scrapes the web → Azure AI Foundry structures the data → Supabase stores the results

- Query Input — 10 search terms targeting 4C hair product categories
- Firecrawl — scrapes product pages, blogs and YouTube descriptions
- Azure AI Foundry (Foundry IQ) — Phi-4-mini-instruct extracts structured product data
- Supabase — stores clean rows with hair_type, product_name, brand, source_url

## Tech Stack
- Language: TypeScript
- AI Model: Phi-4-mini-instruct via Azure AI Foundry (Foundry IQ)
- Scraping: Firecrawl
- Database: Supabase (PostgreSQL)
- Dev Tools: GitHub Copilot, Claude.ai

## Data Collected
80+ rows of structured 4C hair product data across 10 categories:
Shampoo, Conditioner, Leave-in Conditioner, Oil, Gel, Butter, Mousse, Serum, Cream, Spray

## How to Run
1. Clone the repo: git clone https://github.com/kamsiileagu26/4c-hair-products-agent
2. Install dependencies: npm install
3. Create a .env file with: FIRECRAWL_API_KEY, AZURE_FOUNDRY_ENDPOINT, AZURE_FOUNDRY_KEY, SUPABASE_URL, SUPABASE_KEY
4. Run: npx ts-node src/agent.ts

## Microsoft IQ Integration
This project integrates Foundry IQ. The agent uses Microsoft Azure AI Foundry to host and serve the Phi-4-mini-instruct model — the core reasoning layer that reads scraped content and extracts structured hair product data.
EOF
git add README.md && git commit -m "fix repo link in README" && git push