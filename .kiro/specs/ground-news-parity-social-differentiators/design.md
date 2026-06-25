# Design Document: Ground News Parity + Social Layer + Differentiators

## Overview

This feature implements three major capability expansions for The Lens Dispatch platform: achieving feature parity with Ground News' core bias transparency mechanics (Phase 1), adding a privacy-first social layer with community verification (Phase 2), and introducing proprietary differentiators including AI-neutral synthesis and echo chamber scoring (Phase 3). The platform already has a working 4-bucket bias taxonomy (`pro_establishment`, `pro_opposition`, `regional_aligned`, `neutral`) adapted for the Indian media landscape, replacing the traditional US left/center/right model.

The design addresses critical gaps identified in the audit: broken bucket aggregation logic, inconsistent AI summary generation, missing comments infrastructure despite frontend rendering, and US-centric content sourcing that contradicts the platform's India focus. All new features integrate with existing components including the clustering engine (`server/processing.ts`), quality gate (`server/quality-gate.ts`), and authenticated admin routes.

**Key Constraints:**
- No fake/placeholder data in production code
- All 🟡 clarifications must be resolved before implementation
- Maintain existing design system: Playfair Display + DM Sans, shadcn "new-york" style, framer-motion animations
- Preserve mobile breakpoints and accessibility (focus-visible states)
- 4-bucket field names already exist on cluster payloads (field structure correct, aggregation logic broken)

## Architecture

```mermaid
graph TB
    subgraph "Phase 1: Core Gaps"
        A1[Fix Bucket Aggregation]
        A2[Dynamic Scoring Worker]
        A3[Blindspot Detector]
        A4[Framing Analyzer]
        A5[My Bias Dashboard]
    end
    
    subgraph "Phase 2: Social Layer"
        B1[User Profiles]
        B2[Comments System]
        B3[Community Verification]
        B4[Follow System]
        B5[Share Card Generator]
    end
    
    subgraph "Phase 3: Differentiators"
        C1[AI Neutral Synthesis]
        C2[Vernacular Gap Detector]
        C3[Echo Chamber Score]
        C4[Correction Tracker]
    end
    
    subgraph "Existing Infrastructure"
        D1[(PostgreSQL DB)]
        D2[BullMQ Workers]
        D3[Clustering Engine]
        D4[Quality Gate]
        D5[Admin Auth]
    end
    
    A1 --> D3
    A2 --> D2
    A2 --> D1
    A3 --> D3
    A4 --> D3
    A5 --> D1
    
    B1 --> D1
    B2 --> D1
    B2 --> D5
    B3 --> D1
    B4 --> D1
    B5 --> D1
    
    C1 --> D2
    C1 --> D4
    C2 --> D1
    C3 --> B4
    C4 --> D3
    
    style A1 fill:#ff6b6b
    style B2 fill:#4ecdc4
    style C1 fill:#95e1d3
```

### System Flow: Story Cluster with Social Layer

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant DB
    participant Worker
    participant AI
    
    User->>Frontend: View Article Detail
    Frontend->>API: GET /api/articles/:id/full
    API->>DB: Fetch article + cluster
    API->>DB: Fetch bucket counts
    Note over API,DB: FIX: Aggregation logic corrected
    DB-->>API: Article + corrected bias distribution
    API->>DB: Fetch comments for cluster
    DB-->>API: Comments + votes
    API-->>Frontend: Full pack with social data
    
    User->>Frontend: Post comment
    Frontend->>API: POST /api/comments
    API->>DB: Rate limit check
    API->>DB: Profanity filter
    API->>DB: Insert comment
    DB-->>API: Comment ID
    API-->>Frontend: Success
    
    User->>Frontend: Vote on bias tag
    Frontend->>API: POST /api/community-ratings
    API->>DB: Record vote
    API->>DB: Check dissent threshold
    alt >40% dissent
        API->>Worker: Queue review job
    end
    DB-->>API: Vote recorded
    API-->>Frontend: Updated consensus
    
    Worker->>DB: Poll for scoring jobs
    Worker->>DB: Fetch publisher article history (30d)
    Worker->>AI: Calculate sensationalism scores
    Worker->>DB: Update dynamic scores
    Worker-->>API: Scores refreshed
