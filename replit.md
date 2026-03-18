# Ground News Clone — NewsHub

## Project Overview
A full-stack, Ground News-inspired multi-publisher news platform featuring political bias visualization, story clusters, admin/editor dashboards, full authentication, and all content served dynamically from a backend API with zero hardcoded data.

## Architecture
- **Frontend**: React + TypeScript + Vite, served at port 5000
- **Backend**: Express.js + TypeScript
- **Database**: In-memory storage (MemStorage) — resets on restart
- **Auth**: Session-based with bcrypt password hashing; cookies via cookie-parser
- **Styling**: Tailwind CSS + shadcn/ui components

## Key Features
- **Bias Visualization**: Left (blue) / Center (purple) / Right (red) bias bars on every article
- **Ground News-style UI**: Warm cream background, compact density, story cards with bias chips
- **Category/Bias Filtering**: Filter stories by topic or political lean
- **Breaking News Ticker**: Auto-scrolling ticker from live API data
- **Publisher Directory**: Publisher listing with bias ratings
- **Blindspot Feed**: Left-only and Right-only story sections
- **Bookmarks**: Authenticated users can save articles
- **Auth System**: Login, role-based access (admin/editor), session management
- **Editor Dashboard**: Full CRUD for articles with publish/draft workflow
- **Admin Dashboard**: Publisher management, article moderation, category management
- **Dark Mode**: Full light/dark theme toggle

## Credentials (Demo)
- Admin: `admin@newshub.com` / `admin123`
- Editor: `sarah@newshub.com` / `editor123`

## Routes
- `/` — Main news feed (home page)
- `/article/:id` — Article detail page
- `/blindspot` — Blindspot feed
- `/bookmarks` — Saved articles (auth required)
- `/publishers` — Publisher directory
- `/dashboard` — Editor dashboard (auth required)
- `/admin` — Admin dashboard (admin only)

## Project Structure
```
client/src/
  App.tsx               — Routes + providers
  pages/
    HomePage.tsx        — Main news feed with bias filtering
    ArticleDetail.tsx   — Full article view with bias breakdown
    BlindspotPage.tsx   — Stories only covered by one side
    BookmarksPage.tsx   — Saved articles
    PublishersPage.tsx  — Publisher listing
    EditorDashboard.tsx — Article management (Shadcn sidebar)
    AdminDashboard.tsx  — Platform management (Shadcn sidebar)
  components/
    BiasBar.tsx         — Core bias visualization component
    StoryCard.tsx       — Article card (featured/standard/list variants)
    MainNav.tsx         — Top navigation with auth
    CategoryStrip.tsx   — Scrollable category filter pills
    TopBanner.tsx       — "See every side" promotional banner
    BreakingTicker.tsx  — Breaking news scrolling ticker
    SidebarWidgets.tsx  — Sidebar: publishers, topics, blindspot CTA
    NewsFooter.tsx      — Site footer
    AuthModal.tsx       — Login/register modal
    ThemeProvider.tsx   — Dark/light mode
  lib/
    api.ts              — API client functions
    auth-context.tsx    — React auth context + hooks

server/
  index.ts              — Entry point
  routes.ts             — All API endpoints (~460 lines)
  storage.ts            — MemStorage implementation
  auth.ts               — bcrypt, sessions, middleware
  seed.ts               — Database seed (10 articles, 6 publishers, 3 bias types)

shared/
  schema.ts             — Drizzle schema + Zod validators + TypeScript types
```

## API Endpoints
- `GET /api/articles` — List articles with filtering (status, category, bias, search)
- `GET /api/articles/:id` — Get single article
- `POST /api/articles` — Create article (auth required)
- `PATCH /api/articles/:id` — Update article (auth required)
- `POST /api/articles/:id/publish` — Publish article (auth required)
- `DELETE /api/articles/:id` — Delete article (auth required)
- `GET /api/publishers` — List all publishers
- `GET /api/categories` — List all categories
- `GET /api/bookmarks` — Get bookmarks (auth required)
- `POST /api/bookmarks` — Add bookmark (auth required)
- `DELETE /api/bookmarks/:articleId` — Remove bookmark (auth required)
- `POST /api/auth/login` — Login
- `POST /api/auth/logout` — Logout
- `POST /api/auth/register` — Register
- `GET /api/auth/me` — Current user session
- `POST /api/upload` — Image upload (auth required)

## Dependencies
Key packages: `express`, `bcrypt`, `cookie-parser`, `multer`, `date-fns`, `drizzle-orm`, `drizzle-zod`, `@tanstack/react-query`, `wouter`, `shadcn/ui`, `lucide-react`, `framer-motion`
