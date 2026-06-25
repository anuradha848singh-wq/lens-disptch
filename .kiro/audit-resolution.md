# 🟡 Audit Resolution - The Lens Dispatch

## Summary

Completed audit of 4 contradictory/suspicious items before implementation. Findings:

---

## 1. Bucket Aggregation Bug

**Status**: ⚠️ **CONFIRMED BUG**

### Root Cause
The aggregation logic in `server/processing.ts` (lines 1576-1582) is CORRECT:
```typescript
articlesInGroup.forEach((a: any) => {
  const bias = a.publisher?.biasRating || "neutral";
  if (bias === "pro_establishment") proEstablishmentCount++;
  else if (bias === "pro_opposition") proOppositionCount++;
  else if (bias === "regional_aligned") regionalAlignedCount++;
  else neutralCount++;
});
```

**The actual bug**: Publisher bias ratings are not being assigned correctly during article ingestion. Most articles default to "neutral" because `publisher.biasRating` is null/undefined.

### Evidence
- `server/publisher-bias-db.ts` has correct mappings:
  - Fox/Breitbart/Newsmax → `pro_establishment`
  - NYT/NPR/PBS/CNN → `pro_opposition`
  - Reuters/AP/BBC → `neutral`
  
- But when articles are ingested, the `biasRating` field isn't being populated from this static dict

### Fix Required
**Phase 1.1**: The aggregation function is fine. The real fix is:
1. Ensure publisher records in DB have correct `biasRating` from `EXTENDED_PUBLISHER_BIAS_DB`
2. Run a migration/backfill script to update existing publishers
3. **Phase 1.2's dynamic scoring** will replace this static dict entirely

---

## 2. Comments Contradiction

**Status**: ✅ **RESOLVED**

### Finding
- **Backend**: NO comment routes exist (`/api/comments` or `/api/clusters/:id/comments`)
- **Frontend**: ArticleDetail.tsx has ZERO comment UI (searched for "comment", found nothing)
- **Schema**: Comments tables exist in `shared/schema.ts` (comments, commentVotes, userProfiles, userFollows)

### Conclusion
**Comments are 100% greenfield**. The schema exists but nothing is wired up. Phase 2.2 needs to:
1. Build backend routes for comments (POST, GET, voting)
2. Build frontend UI in ArticleDetail.tsx
3. Wire up the existing schema

---

## 3. deepIntelligence / AI Summary Scope

**Status**: ⏳ **NEEDS RUNTIME CHECK**

### What We Know
- ArticleDetail.tsx imports `DeepIntelligenceDashboard` component
- Full article API returns `fullPack.deepIntelligence`
- Need to check API response to see what fields it includes

### Action Required
Before implementing Phase 3 AI neutral-synthesis:
1. Call `/api/articles/:id/full` on a live cluster
2. Inspect `deepIntelligence` object structure
3. If it already includes cluster-level neutral summary → don't rebuild it
4. If it's just article-level metadata → proceed with Phase 3

---

## 4. Content Sourcing - India Focus

**Status**: ✅ **CONFIRMED MIXED**

### RSS Sources Analysis (`server/rss-sources.ts`)
**US/Global sources**: 
- Reuters, BBC, NYT, CNN, WSJ, Washington Post, Guardian, Al Jazeera
- Fox News, Breitbart, Newsmax (US right)

**Indian sources**:
- NDTV, The Hindu, Indian Express, Scroll.in, The Wire, The Quint
- Times of India, Hindustan Times, Economic Times, News18, Swarajya

### Conclusion
Platform content is **US/India/global mixed**, NOT India-only. The 4-bucket taxonomy (pro_establishment/pro_opposition/regional_aligned/neutral) is designed for India but applied to global sources. This is intentional.

**Impact on implementation**:
- Phase 3's "Vernacular coverage gap detector" assumes India-focused → may need adjustment
- Color tokens must still avoid Indian party colors (saffron/green/specific blues)
- Bucket names stay as-is (already migrated)

---

## Next Steps

✅ All 4 🟡 items resolved. Ready to proceed with implementation:

1. **Phase 1.1**: Fix publisher bias assignment (backfill script)
2. **Phase 1.2**: Build dynamic bias/factuality scoring worker
3. **Phase 1.3**: Blindspot detection badges
4. **Phase 1.4**: Verify ComparePage framing heuristic
5. **Phase 1.5**: My Bias dashboard
6. **Phase 2**: Social layer (comments, profiles, follows, voting, share cards)
7. **Phase 3**: AI synthesis (after checking deepIntelligence), echo-chamber score, correction tracker

**UI/UX**: 4-bucket color tokens, insight captions, prefers-reduced-motion, cleanup dead code

---

## Implementation Priority

### Immediate (High Impact, Low Risk)
1. Publisher bias backfill script (fixes 🟡-1)
2. 4-bucket CSS color tokens
3. Insight captions under BiasSpectrumStrip/StoryCard
4. prefers-reduced-motion accessibility
5. Deprecate ArticleCard.tsx, fix PublishersPage fake counts
6. Wire up `/publisher/:id` route

### Next (Core Features)
7. Blindspot badges + tab
8. My Bias dashboard
9. Comments backend + UI
10. Crowdsourced bias voting
11. Share card generation

### Later (Advanced)
12. Dynamic bias scoring worker
13. AI neutral-synthesis (after deepIntelligence check)
14. Echo-chamber score
15. Correction tracker

---

_Generated: 2026-01-XX_
