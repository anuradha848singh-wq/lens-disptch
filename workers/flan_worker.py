import os
import json
import time
import psycopg2
from transformers import T5ForConditionalGeneration, T5Tokenizer
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL not set — flan_worker requires PostgreSQL")

# ── Dual Model Loading ────────────────────────────────────────────────────────
# Small (~300MB): entity extraction, ticker extraction, quote extraction
# Large (~800MB): summaries, foreign gaze, executive briefings (only for 10+ sources)
# Large is lazy-loaded on first use to save RAM on small PCs.

print(f"[{datetime.now()}] Loading FLAN-T5 Small (~300MB RAM)...")
SMALL_MODEL = "google/flan-t5-small"
small_tokenizer = T5Tokenizer.from_pretrained(SMALL_MODEL)
small_model = T5ForConditionalGeneration.from_pretrained(SMALL_MODEL)
small_model.eval()
print(f"[{datetime.now()}] FLAN-T5 Small ready.")

large_tokenizer = None
large_model = None

def get_large_model():
    """Lazy-load FLAN-T5 Large only when needed (clusters with 10+ sources)."""
    global large_tokenizer, large_model
    if large_model is None:
        print(f"[{datetime.now()}] Loading FLAN-T5 Large (~800MB RAM)...")
        LARGE_MODEL = "google/flan-t5-large"
        large_tokenizer = T5Tokenizer.from_pretrained(LARGE_MODEL)
        large_model = T5ForConditionalGeneration.from_pretrained(LARGE_MODEL)
        large_model.eval()
        print(f"[{datetime.now()}] FLAN-T5 Large ready.")
    return large_tokenizer, large_model


def run_small(prompt, max_tokens=120):
    """Run inference on FLAN-T5 Small."""
    inputs = small_tokenizer(prompt, return_tensors="pt", max_length=512, truncation=True)
    outputs = small_model.generate(**inputs, max_new_tokens=max_tokens, num_beams=2, early_stopping=True)
    return small_tokenizer.decode(outputs[0], skip_special_tokens=True).strip()


def run_large(prompt, max_tokens=200):
    """Run inference on FLAN-T5 Large."""
    tok, mod = get_large_model()
    inputs = tok(prompt, return_tensors="pt", max_length=700, truncation=True)
    outputs = mod.generate(**inputs, max_new_tokens=max_tokens, num_beams=4, no_repeat_ngram_size=3, early_stopping=True)
    return tok.decode(outputs[0], skip_special_tokens=True).strip()


# ── Bias helper ──────────────────────────────────────────────────────────────
def derive_bias(bias_rating):
    if not bias_rating:
        return "center"
    b = bias_rating.lower()
    if "left" in b:
        return "left"
    if "right" in b:
        return "right"
    return "center"


# ── Publisher Country Map (auto-assign on startup) ───────────────────────────
PUBLISHER_COUNTRIES = {
    # India
    "the-hindu": "IN", "ndtv": "IN", "times-of-india": "IN",
    "indian-express": "IN", "hindustan-times": "IN", "economic-times": "IN",
    "business-standard": "IN", "livemint": "IN", "the-print": "IN",
    "scroll-in": "IN", "the-quint": "IN", "the-wire": "IN",
    "news18": "IN", "zee-news": "IN", "swarajya": "IN", "opindia": "IN",
    # UK
    "the-guardian": "UK", "bbc-news": "UK", "the-telegraph": "UK",
    "the-independent": "UK", "the-times-uk": "UK", "the-sun": "UK",
    "daily-mail": "UK", "mirror": "UK", "the-spectator": "UK",
    # Qatar
    "al-jazeera": "QA",
    # Germany
    "dw": "DE",
    # France
    "france-24": "FR",
    # Canada
    "cbc-news": "CA", "toronto-star": "CA",
    # Australia
    "sydney-morning-herald": "AU",
    # Singapore
    "the-straits-times": "SG",
    # Japan
    "nikkei-asia": "JP",
    # Israel
    "haaretz": "IL",
    # Hong Kong
    "south-china-morning-post": "HK",
}


def ensure_publisher_countries(conn):
    """One-time auto-assign country codes to known publishers."""
    cur = conn.cursor()
    updated = 0
    for slug, country in PUBLISHER_COUNTRIES.items():
        cur.execute(
            "UPDATE publishers SET country = %s WHERE slug = %s AND (country = 'US' OR country IS NULL)",
            (country, slug)
        )
        updated += cur.rowcount
    conn.commit()
    if updated > 0:
        print(f"[{datetime.now()}] Updated {updated} publisher country codes.")
    cur.close()


# ── Source selection helpers ──────────────────────────────────────────────────

def pick_best_sources(cur, cluster_id):
    """Pick up to 3 sources: {left, center, right} — best factuality first."""
    cur.execute("""
        SELECT a.id, a.title, a.excerpt, p.name AS publisher_name,
               p.bias_rating, p.factuality_rating, length(a.excerpt) AS excerpt_len
        FROM articles a
        JOIN publishers p ON p.id = a.source_id
        WHERE a.cluster_id = %s AND a.status = 'published'
          AND a.excerpt IS NOT NULL AND length(a.excerpt) > 100
        ORDER BY
            CASE p.factuality_rating
                WHEN 'very_high' THEN 1 WHEN 'high' THEN 2
                WHEN 'mixed' THEN 3 ELSE 4
            END ASC, length(a.excerpt) DESC
    """, (cluster_id,))
    rows = cur.fetchall()
    sources = {"left": None, "center": None, "right": None}
    for row in rows:
        _, title, excerpt, pub_name, bias_rating, factuality, _ = row
        lean = derive_bias(bias_rating or "")
        if sources[lean] is None:
            sources[lean] = {
                "title": title, "excerpt": (excerpt or "")[:600],
                "publisher": pub_name or "Unknown", "bias": lean,
            }
        if all(v is not None for v in sources.values()):
            break
    return {k: v for k, v in sources.items() if v is not None}


def pick_domestic_vs_foreign(cur, cluster_id):
    """Pick best domestic (IN) and foreign (non-IN) source for Foreign Gaze."""
    domestic, foreign = None, None
    cur.execute("""
        SELECT a.title, a.excerpt, p.name, p.country, p.bias_rating
        FROM articles a JOIN publishers p ON p.id = a.source_id
        WHERE a.cluster_id = %s AND a.status = 'published'
          AND a.excerpt IS NOT NULL AND length(a.excerpt) > 100
        ORDER BY length(a.excerpt) DESC
    """, (cluster_id,))
    for title, excerpt, pub_name, country, bias in cur.fetchall():
        entry = {"title": title, "excerpt": (excerpt or "")[:500], "publisher": pub_name, "country": country}
        if country == "IN" and domestic is None:
            domestic = entry
        elif country != "IN" and country is not None and foreign is None:
            foreign = entry
        if domestic and foreign:
            break
    return domestic, foreign


# ── Task 1: Cross-source summary (existing, uses model tier) ────────────────

def generate_summary(sources, source_count):
    """3 bullet points. Uses Large for 10+ sources, Small otherwise."""
    source_blocks = "\n\n".join([
        f"[{v['publisher']}]: {v['excerpt']}" for v in sources.values()
    ])
    prompt = (
        "You are a neutral news editor. "
        "Read the following news sources covering the same event. "
        "Write exactly 3 short bullet points summarising only what happened right now. "
        "Be factual. Do not include historical background. "
        "Each bullet must be one sentence under 25 words.\n\n"
        f"{source_blocks}\n\n"
        "3 bullet points:"
    )
    text = run_large(prompt, 180) if source_count >= 10 else run_small(prompt, 150)
    raw_lines = text.replace("\\n", "\n").split("\n")
    bullets = []
    for line in raw_lines:
        clean = line.strip().lstrip("•–*-123456789.) ")
        if len(clean) > 20:
            bullets.append(clean)
    if not bullets:
        bullets = [s.strip() for s in text.split(". ") if len(s.strip()) > 20]
    return bullets[:3]


# ── Task 2: Framing difference (existing) ───────────────────────────────────

def generate_framing_diff(sources, source_count):
    """Framing diff between left and right. Needs both."""
    left = sources.get("left")
    right = sources.get("right")
    if not left or not right:
        return None
    prompt = (
        "Two news outlets cover the same event very differently. "
        "In 2 sentences, explain specifically how their framing differs: "
        "what each side emphasises, what language they use, "
        "and what each side leaves out. Be concrete and specific.\n\n"
        f"Left-leaning source ({left['publisher']}):\n{left['excerpt']}\n\n"
        f"Right-leaning source ({right['publisher']}):\n{right['excerpt']}\n\n"
        "Framing difference:"
    )
    result = run_large(prompt, 120) if source_count >= 10 else run_small(prompt, 100)
    return result if len(result) > 20 else None


# ── Task 3: Foreign Gaze (NEW — Premium Feature) ───────────────────────────

def generate_foreign_gaze(domestic, foreign, source_count):
    """Compare domestic Indian vs foreign coverage. Uses Large for 10+."""
    dom_prompt = (
        f"Summarize this Indian news report in 2 sentences: "
        f"[{domestic['publisher']}]: {domestic['excerpt']}\n\nSummary:"
    )
    for_prompt = (
        f"Summarize this international news report in 2 sentences: "
        f"[{foreign['publisher']}]: {foreign['excerpt']}\n\nSummary:"
    )
    run_fn = run_large if source_count >= 10 else run_small
    dom_summary = run_fn(dom_prompt, 80)
    for_summary = run_fn(for_prompt, 80)

    diff_prompt = (
        "An Indian newspaper and a foreign newspaper cover the same event in India.\n"
        f"Indian view: {dom_summary}\n"
        f"Foreign view: {for_summary}\n\n"
        "In 2 sentences, explain how the domestic and international framing differs:"
    )
    difference = run_fn(diff_prompt, 100)
    return {
        "domestic_summary": dom_summary,
        "foreign_summary": for_summary,
        "difference": difference,
        "domestic_sources": [domestic["publisher"]],
        "foreign_sources": [foreign["publisher"]],
    }


# ── Task 4: Market Ticker Extraction (NEW — FLAN-T5 Small) ─────────────────

def extract_market_tickers(cur, cluster_id):
    """Extract stock tickers from business/politics articles. Uses Small only."""
    cur.execute("""
        SELECT a.title, a.excerpt, p.name
        FROM articles a JOIN publishers p ON p.id = a.source_id
        WHERE a.cluster_id = %s AND a.status = 'published'
          AND a.excerpt IS NOT NULL AND length(a.excerpt) > 50
        ORDER BY length(a.excerpt) DESC LIMIT 3
    """, (cluster_id,))
    rows = cur.fetchall()
    if not rows:
        return None

    combined = "\n".join([f"{title}: {(excerpt or '')[:300]}" for title, excerpt, _ in rows])
    prompt = (
        "Extract all publicly traded companies mentioned in this news text. "
        "Return only a comma-separated list of stock ticker symbols (e.g. AAPL, TSLA, RELIANCE). "
        "If no companies are mentioned, say 'none'.\n\n"
        f"Text: {combined}\n\nTickers:"
    )
    result = run_small(prompt, 60)
    if not result or "none" in result.lower():
        return None

    tickers = [t.strip().upper() for t in result.split(",") if t.strip() and len(t.strip()) <= 12]
    if not tickers:
        return None

    # Extract company names too
    name_prompt = (
        "List the full company names for these tickers: "
        f"{', '.join(tickers)}. Return comma-separated names.\n\nCompanies:"
    )
    companies_text = run_small(name_prompt, 80)
    companies = [c.strip() for c in companies_text.split(",") if c.strip()]

    return {
        "tickers": tickers,
        "companies": companies,
        "extracted_from": rows[0][2] if rows else "unknown",
    }


# ── Task 5: Entity Quote Extraction (NEW — FLAN-T5 Small) ──────────────────

def extract_entity_quotes(cur, cluster_id):
    """Extract notable quotes from public figures. Uses Small only."""
    cur.execute("""
        SELECT a.title, a.excerpt, p.name
        FROM articles a JOIN publishers p ON p.id = a.source_id
        WHERE a.cluster_id = %s AND a.status = 'published'
          AND a.excerpt IS NOT NULL AND length(a.excerpt) > 100
        ORDER BY length(a.excerpt) DESC LIMIT 5
    """, (cluster_id,))
    rows = cur.fetchall()
    if not rows:
        return []

    quotes = []
    for title, excerpt, pub_name in rows:
        text = (excerpt or "")[:400]
        prompt = (
            "Extract any direct quotes from named people in this news text. "
            "Return in format: Person Name said \"quote\" about Topic. "
            "If no quotes found, say 'none'.\n\n"
            f"Text: {text}\n\nQuotes:"
        )
        result = run_small(prompt, 80)
        if result and "none" not in result.lower() and len(result) > 15:
            # Parse: try to extract entity name
            entity = result.split(" said")[0].strip() if " said" in result else "Unknown"
            topic_prompt = f"What topic is this quote about in 2 words: {result}\n\nTopic:"
            topic = run_small(topic_prompt, 10)
            quotes.append({
                "entity": entity[:80],
                "quote": result[:300],
                "topic": topic[:50] if topic else "general",
                "source": pub_name,
            })
        if len(quotes) >= 3:
            break

    return quotes


# ── Task 6: Executive Briefing (NEW — FLAN-T5 Large, 10+ sources only) ─────

def generate_executive_briefing(cur, cluster_id, headline):
    """Map-Reduce briefing. Only runs on clusters with 10+ sources."""
    cur.execute("""
        SELECT a.title, a.excerpt, p.name
        FROM articles a JOIN publishers p ON p.id = a.source_id
        WHERE a.cluster_id = %s AND a.status = 'published'
          AND a.excerpt IS NOT NULL AND length(a.excerpt) > 50
        ORDER BY a.published_at DESC LIMIT 20
    """, (cluster_id,))
    rows = cur.fetchall()
    if len(rows) < 5:
        return None

    # MAP phase: summarize each article into 1 sentence (using Small for speed)
    one_liners = []
    for title, excerpt, pub_name in rows[:15]:
        text = (excerpt or "")[:250]
        prompt = f"Summarize this news in exactly 1 sentence: {title}. {text}\n\nSummary:"
        summary = run_small(prompt, 40)
        if summary and len(summary) > 10:
            one_liners.append(f"- [{pub_name}] {summary}")

    if len(one_liners) < 3:
        return None

    combined = "\n".join(one_liners[:12])

    # REDUCE phase: synthesize briefing (using Large)
    summary_prompt = (
        f"Topic: {headline}\n\n"
        "Here are summaries from multiple news sources:\n"
        f"{combined}\n\n"
        "Write a 3-sentence executive summary of this developing story:"
    )
    exec_summary = run_large(summary_prompt, 150)

    players_prompt = (
        f"Based on these news summaries, list the 3-5 key people or organizations involved:\n"
        f"{combined}\n\nKey players (comma-separated):"
    )
    players_text = run_large(players_prompt, 60)
    key_players = [p.strip() for p in players_text.split(",") if p.strip()][:5]

    timeline_prompt = (
        f"Based on these summaries, list 3 key events in chronological order:\n"
        f"{combined}\n\nTimeline:"
    )
    timeline_text = run_large(timeline_prompt, 120)
    timeline = [t.strip().lstrip("•–*-123456789.) ") for t in timeline_text.split("\n") if len(t.strip()) > 10][:5]

    disc_prompt = (
        f"Do any of these sources disagree or contradict each other? "
        f"List specific discrepancies in 1-2 sentences:\n{combined}\n\nDiscrepancies:"
    )
    disc_text = run_large(disc_prompt, 80)
    discrepancies = [disc_text] if disc_text and len(disc_text) > 15 else []

    return {
        "summary": exec_summary,
        "key_players": key_players,
        "timeline": timeline if timeline else ["No clear timeline available"],
        "discrepancies": discrepancies,
        "generated_at": datetime.now().isoformat(),
    }


# ── Main loop ─────────────────────────────────────────────────────────────────

def run():
    print(f"[{datetime.now()}] FLAN Worker v2 starting (Small+Large dual model)...")
    print(f"[{datetime.now()}] Polling every 2 minutes...")

    # One-time: ensure publisher country codes
    try:
        conn = psycopg2.connect(DATABASE_URL)
        ensure_publisher_countries(conn)
        conn.close()
    except Exception as e:
        print(f"[{datetime.now()}] Country setup warning: {e}")

    while True:
        try:
            conn = psycopg2.connect(DATABASE_URL)
            cur = conn.cursor()

            # Add columns if they don't exist (safe migration)
            for col, coltype in [
                ("ai_foreign_gaze", "jsonb"),
                ("ai_market_tickers", "jsonb"),
                ("ai_entity_quotes", "jsonb DEFAULT '[]'::jsonb"),
                ("ai_executive_briefing", "jsonb"),
            ]:
                try:
                    cur.execute(f"ALTER TABLE clusters ADD COLUMN IF NOT EXISTS {col} {coltype}")
                    conn.commit()
                except Exception:
                    conn.rollback()

            # Fetch qualifying clusters, including existing ai_summary to avoid overwriting Groq summaries
            cur.execute("""
                SELECT id, headline, importance_score, source_count,
                       left_count, right_count, ai_summary
                FROM clusters
                WHERE importance_score >= 25
                  AND source_count >= 5
                  AND ai_enriched_at IS NULL
                  AND last_updated_at > NOW() - INTERVAL '48 hours'
                ORDER BY importance_score DESC
                LIMIT 15
            """)
            rows = cur.fetchall()

            if not rows:
                print(f"[{datetime.now()}] No qualifying clusters. Waiting 2 min...")
                conn.close()
                time.sleep(120)
                continue

            print(f"[{datetime.now()}] Found {len(rows)} clusters to enrich...")

            for cluster_id, headline, importance, src_count, left_c, right_c, existing_ai_summary in rows:
                try:
                    model_tier = "LARGE" if src_count >= 10 else "SMALL"
                    print(f"\n  [{model_tier}] Processing: {headline[:60]}... "
                          f"(importance={importance}, sources={src_count})")

                    # 1. Pick best sources & generate summary (avoid overwriting Groq summary if it exists)
                    sources = pick_best_sources(cur, cluster_id)
                    bullets = []
                    framing = None
                    has_existing_summary = False
                    if existing_ai_summary:
                        try:
                            # Parse JSON if string, or use directly if list/dict (psycopg2 loads jsonb automatically)
                            parsed = json.loads(existing_ai_summary) if isinstance(existing_ai_summary, str) else existing_ai_summary
                            if parsed and len(parsed) > 0:
                                bullets = parsed
                                has_existing_summary = True
                                print("    — Groq summary already exists. Retaining existing summary bullets.")
                        except Exception as parse_err:
                            print(f"    — Failed to parse existing summary: {parse_err}")

                    if not has_existing_summary and len(sources) >= 2:
                        bullets = generate_summary(sources, src_count)
                        print(f"    ✓ Summary: {len(bullets)} bullets")
                        
                    if len(sources) >= 2:
                        framing = generate_framing_diff(sources, src_count)
                        if framing:
                            print(f"    ✓ Framing diff generated")

                    # 2. Foreign Gaze (domestic vs international)
                    foreign_gaze = None
                    domestic, foreign = pick_domestic_vs_foreign(cur, cluster_id)
                    if domestic and foreign:
                        foreign_gaze = generate_foreign_gaze(domestic, foreign, src_count)
                        print(f"    ✓ Foreign Gaze: {domestic['publisher']} vs {foreign['publisher']}")
                    else:
                        print(f"    — No Foreign Gaze (need both IN + foreign sources)")

                    # 3. Market Tickers (always Small)
                    tickers = extract_market_tickers(cur, cluster_id)
                    if tickers:
                        print(f"    ✓ Tickers: {', '.join(tickers['tickers'])}")

                    # 4. Entity Quotes (always Small)
                    quotes = extract_entity_quotes(cur, cluster_id)
                    if quotes:
                        print(f"    ✓ Quotes: {len(quotes)} entities")

                    # 5. Executive Briefing (Large only, 10+ sources)
                    briefing = None
                    if src_count >= 10:
                        briefing = generate_executive_briefing(cur, cluster_id, headline)
                        if briefing:
                            print(f"    ✓ Executive Briefing generated")
                    else:
                        print(f"    — Briefing skipped (need 10+ sources, have {src_count})")

                    # 6. Write all results to DB
                    cur.execute("""
                        UPDATE clusters SET
                            ai_summary = %s,
                            ai_framing_diff = %s,
                            ai_foreign_gaze = %s,
                            ai_market_tickers = %s,
                            ai_entity_quotes = %s,
                            ai_executive_briefing = %s,
                            ai_enriched_at = NOW()
                        WHERE id = %s
                    """, (
                        json.dumps(bullets),
                        framing,
                        json.dumps(foreign_gaze) if foreign_gaze else None,
                        json.dumps(tickers) if tickers else None,
                        json.dumps(quotes) if quotes else '[]',
                        json.dumps(briefing) if briefing else None,
                        cluster_id,
                    ))
                    conn.commit()
                    print(f"    ✓ Saved cluster {cluster_id[:8]}...")

                except Exception as e:
                    print(f"    ✗ Cluster {cluster_id[:8]}... failed: {e}")
                    import traceback
                    traceback.print_exc()
                    try:
                        conn.rollback()
                    except:
                        pass
                    continue

            conn.close()

        except Exception as e:
            print(f"[{datetime.now()}] Worker error: {e}")
            import traceback
            traceback.print_exc()
            if 'conn' in locals():
                try:
                    conn.close()
                except:
                    pass

        # 2-minute sleep between runs
        time.sleep(120)


if __name__ == "__main__":
    run()
