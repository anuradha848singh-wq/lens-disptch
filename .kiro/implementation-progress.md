# Implementation Progress - The Lens Dispatch

## ✅ Completed (Ready to Use)

### 1. CSS Design System Updates
- ✅ **4-bucket color tokens** added to `client/src/index.css`
  - `--bias-pro-establishment`, `--bias-pro-opposition`, `--bias-regional-aligned`, `--bias-neutral`
  - `--accent-interactive` for everyday UI (vs `--accent-editorial` for alerts)
  - Utility classes: `.bias-pro-establishment`, `.bias-pro-establishment-text`, `.bias-pro-establishment-bg`, etc.
  - Old 3-bucket tokens kept for backward compatibility

- ✅ **Reduced motion support** added
  - `@media (prefers-reduced-motion: reduce)` queries for:
    - `.animate-ticker` (breaking news scroll)
    - `.animate-shimmer` (skeleton loading)
    - `.animate-fade-up` and `.card-animate` (entrance animations)

### 2. Publisher Bias Backfill Script
- ✅ Created `scripts/backfill-publisher-bias.ts`
- ✅ Improved domain matching logic (website field + name fallback)
- ⚠️ **Needs re-run** after domain matching improvements
- Fixes 🟡-1 bucket aggregation bug by populating correct `biasRating` from static dict

---

## 🚧 In Progress / Next Up

### Phase 1 - Core Fixes

#### 1.1 Bucket Taxonomy ✅ DONE
- Publisher bias backfill script created
- Need to verify aggregation is working after re-running script

#### 1.2 Dynamic Bias Scoring 🔴 NOT STARTED
**Backend worker needed:**
- Rolling 30-day window per outlet
- Sensationalism score (from Quality Gate)
- Factuality score (correction rate + citation density)
- Political lean classifier (4-bucket)
- Static dict becomes cold-start fallback

#### 1.3 Blindspot Detection ✅ DONE
- BlindspotBadge component already exists in StoryCardBadges.tsx ✅
- Schema has blindspotScore and blindspotSide fields ✅
- Badge renders on featured card ✅

#### 1.4 Headline Comparison 🟡 VERIFY
- ComparePage.tsx exists at `/compare/:clusterId`
- Need to verify framing-difference heuristic exists
- If missing, add verb/emphasis analysis

#### 1.5 My Bias Dashboard 🔴 NOT STARTED
**New page needed:**
- Route: `/dashboard/my-bias`
- Per-user reading distribution (4 buckets, rolling 30 days)
- Balance score = distribution evenness
- Clinical tone, no gamification

---

### Phase 2 - Social Layer 🟡 PARTIAL

#### 2.1 Profiles
- Schema exists ✅
- Backend routes in social.routes.ts ✅
- UI needed

#### 2.2 Comments  
- Schema exists ✅
- Backend routes exist in social.routes.ts ✅
- UI component created (CommentsSection.tsx) ✅
- Added to ArticleDetail.tsx ✅

#### 2.3 Crowdsourced Bias Voting
- Backend exists in social.routes.ts (/rate endpoint) ✅
- UI needed

#### 2.4 Follow + Feed
- Schema exists ✅ (`userFollows` table)
- Backend routes partially exist
- UI needed

#### 2.5 Share Card
- Backend: image generation (satori + sharp)
- Endpoint: `GET /api/clusters/:id/share-card`
- Returns: PNG with headline + bias coverage meter

---

### Phase 3 - Differentiators 🔴 ALL NOT STARTED

#### 3.1 AI Neutral Synthesis
- ⏳ Need to check `deepIntelligence` scope first
- Cluster-level summary (paraphrase only, no verbatim)

#### 3.2 Vernacular Coverage Gap Detector
- Depends on India-focused sourcing (RSS is mixed US/India)
- May need adjustment

#### 3.3 Echo-Chamber Score
- Derived from follow graph + reading distribution
- Separate from balance score

#### 3.4 Correction/Retraction Tracker
- Feeds back into factuality score (1.2)

---

### UI/UX Cleanup 🟡 PARTIAL

#### ✅ Completed:
- 4-bucket CSS tokens
- Reduced motion support

#### 🔴 Not Started:
- **Insight captions** under BiasSpectrumStrip/StoryCard
  - Plain-English summary: "9 sources · leans pro_opposition · no regional coverage"
- **Deprecate ArticleCard.tsx**
  - Dead demo-era code
  - Redirect usages to StoryCard.tsx
- **Fix PublishersPage fake counts**
  - Currently hash-generated
  - Replace with real DB query
- **Wire up /publisher/:id route**
  - Backend endpoints exist (`/api/publishers/:id`, `/radar`, `/fingerprint`)
  - Frontend route missing

---

## 📋 Implementation Order (Recommended)

### Immediate (High Impact, Low Effort)
1. ✅ CSS tokens (DONE)
2. ✅ Reduced motion (DONE)
3. ✅ Backfill script (DONE, needs re-run)
4. 🔴 Re-run backfill with improved matching
5. 🔴 Insight captions (template strings off existing data)
6. 🔴 Deprecate ArticleCard.tsx
7. 🔴 Fix PublishersPage fake counts
8. 🔴 Wire /publisher/:id route

### Core Features (Medium Effort)
9. 🔴 Blindspot badges + tab
10. 🔴 My Bias dashboard
11. 🔴 Verify/extend ComparePage framing

### Social Layer (High Effort)
12. 🔴 Comments backend + UI
13. 🔴 Profiles backend + UI
14. 🔴 Crowdsourced bias voting
15. 🔴 Follow system + feed
16. 🔴 Share card generation

### Advanced (Highest Effort)
17. 🔴 Dynamic bias scoring worker
18. 🔴 AI neutral synthesis (after deepIntelligence check)
19. 🔴 Echo-chamber score
20. 🔴 Correction tracker

---

## Files Modified So Far

1. `client/src/index.css` - Added 4-bucket colors, reduced motion, interactive accent
2. `scripts/backfill-publisher-bias.ts` - Created publisher bias backfill script
3. `.kiro/audit-resolution.md` - Documented 🟡 item findings
4. `.kiro/implementation-progress.md` - This file

---

_Last Updated: 2026-01-XX_
