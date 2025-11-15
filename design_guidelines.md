# Design Guidelines: Professional News Platform

## Design Approach

**Selected Approach:** Reference-Based Design  
**Primary References:** Ground News (bias visualization), NDTV (content density), Inshorts (card efficiency), Reuters/Al Jazeera (credibility and trust)

**Core Principles:**
1. **Information Density with Breathing Room** - Pack meaningful content while maintaining scannable layouts
2. **Trust Through Clarity** - Clean typography, clear attribution, professional spacing
3. **Speed-Optimized Reading** - Efficient card layouts, strong visual hierarchy, quick comprehension
4. **Bias Transparency** - Clear visual indicators without overwhelming the content

---

## Typography System

**Font Families:**
- Headlines: Inter or Roboto (700, 600 weights) - strong, authoritative
- Body Text: System font stack or Inter (400, 500 weights) - optimal readability
- UI Elements: Same as body for consistency

**Type Scale:**
- Breaking News Ticker: text-sm (14px)
- Article Card Headlines: text-lg to text-xl (18-20px)
- Homepage Hero Headline: text-4xl to text-6xl (36-60px)
- Article Page Title: text-5xl (48px)
- Section Headers: text-2xl to text-3xl (24-30px)
- Body Text: text-base (16px)
- Metadata (author, date): text-sm (14px)
- Tags/Labels: text-xs (12px)

**Hierarchy Rules:**
- Article titles always bold (font-semibold or font-bold)
- Metadata uses reduced opacity (opacity-70)
- Publisher names medium weight (font-medium)

---

## Layout System

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, 8, 12, 16, 24
- Component padding: p-4, p-6, p-8
- Section spacing: gap-6, gap-8, gap-12
- Card margins: m-4, m-6
- Page containers: px-4 md:px-8 lg:px-16

**Grid Structure:**

**Homepage:**
- Breaking News Ticker: Full-width sticky bar at top (h-12)
- Hero Section: Featured story with large image (2/3 width) + 2-3 trending stories sidebar (1/3 width) on desktop
- Main Feed: 3-column grid (lg:grid-cols-3, md:grid-cols-2, grid-cols-1) with gap-6
- Sidebar: Sticky filters panel (w-64) on desktop, collapsible drawer on mobile

**Article Page:**
- Max-width container: max-w-4xl for content, max-w-7xl for hero image
- Single column reading experience
- Related articles: 3-column grid at bottom

**Dashboard Pages:**
- Sidebar navigation: w-64 fixed on desktop
- Main content area: Responsive grid for cards/tables
- Admin analytics: 2x2 stat grid, then data tables below

---

## Component Library

### Navigation
- **Top Header:** Fixed navbar (h-16), logo left, search center, user menu right, category links below (h-12)
- **Category Pills:** Horizontal scrollable tabs with active state underline
- **Filter Panel:** Checkbox groups with section headers, bias selector with visual indicators (Left/Center/Right badges)

### Article Cards
**Standard Card:**
- Thumbnail image: aspect-ratio-16/9, rounded-lg
- Publisher logo: Small circle (w-6 h-6) or badge
- Headline: 2-3 lines with line-clamp
- Metadata row: Publisher name · Time · Category tag
- Bias indicator: Small badge (left/center/right)
- Hover: Subtle scale transform (scale-105) with smooth transition

**Featured Card (Hero):**
- Large image background with gradient overlay
- Headline overlaid on image (text-4xl, text-white)
- Publisher + metadata over image
- Full-width or 2/3 width

**List Card (Compact):**
- Horizontal layout: small thumbnail left (w-24), content right
- Single line headline, minimal metadata

### Forms & Inputs
**Editor Dashboard:**
- Rich text editor: Full-width with toolbar, min-h-96
- Image upload: Drag-drop zone with preview thumbnail grid
- Select dropdowns: ShadCN Select components for category, bias, publisher
- Tag input: Chip-style multi-select
- Action buttons: Primary (Publish), Secondary (Save Draft), Tertiary (Delete)

### Data Display
**Admin Dashboard:**
- Stat cards: 4-column grid, each card with icon, number (text-4xl), label
- Tables: Striped rows, hover states, action column with icon buttons
- Charts: Pie chart for bias breakdown, line chart for page views (use chart library)

### Interactive Elements
**Breaking News Ticker:**
- Horizontal auto-scroll with pause on hover
- Multiple news items separated by bullets
- Smooth CSS animation

**Search Bar:**
- Expandable on mobile (icon → full input)
- Search icon left, clear button right
- Dropdown suggestions below input (absolute positioning)

**Dark/Light Toggle:**
- Moon/Sun icon toggle in header
- Smooth transition-all on theme change

**Bookmark Icon:**
- Heart or bookmark icon on article cards
- Filled state when saved
- Local storage persistence

### Overlays
- **Mobile Menu:** Full-screen drawer from left with blur backdrop
- **Modal Dialogs:** Centered, max-w-lg, backdrop blur
- **Image Lightbox:** Full viewport with close button

---

## Animations

**Minimal, Purposeful Motion:**
- Page transitions: Fade-in on route change (duration-200)
- Card hover: Scale and shadow (hover:scale-105 hover:shadow-xl transition-transform)
- Infinite scroll: Fade-in new cards as they load
- Breaking ticker: Auto-scroll animation (CSS keyframes)
- Filter application: Brief loading skeleton

**No:**
- Excessive parallax
- Auto-playing carousels
- Distracting scroll-triggered animations

---

## Images

### Hero Section
**Homepage Hero:**
- Large featured article image (16:9 ratio, 1920x1080)
- Gradient overlay for text readability
- Blurred background for overlaid buttons

### Article Cards
- Thumbnail images: 16:9 aspect ratio, 800x450 minimum
- Publisher logos: Square, 200x200, transparent background
- Author avatars (if used): Circular, 100x100

### Article Page
- Hero image: Full-width, 21:9 or 16:9 ratio, high quality (2400x1080)
- In-content images: Max-width container, caption below
- Related article thumbnails: Same as card thumbnails

### Dashboard
- Uploaded article images: Preview thumbnails in 3-column grid
- Publisher logos in management table: Small (w-12 h-12)

**Image Treatment:**
- All images: rounded-lg corners
- Hover states: Slight brightness increase
- Lazy loading for performance
- Responsive srcset for different viewport sizes

---

## Page-Specific Layouts

### Homepage
1. Breaking news ticker (fixed top)
2. Navigation header
3. Hero featured story + trending sidebar
4. Filter pills (horizontal scroll)
5. Main article grid (3 columns)
6. Infinite scroll loading

### Article Page
1. Hero image with title overlay
2. Publisher info + metadata bar
3. Content (max-w-prose for readability)
4. Tags section
5. Bias breakdown visualization
6. Related articles grid

### Editor Dashboard
1. Sidebar navigation
2. Article list table or grid view toggle
3. Create/Edit form: Full-width rich editor
4. Image management panel
5. Preview pane (optional toggle)

### Admin Dashboard
1. Sidebar navigation
2. Stats overview (4-card grid)
3. Quick actions panel
4. Tables for publishers/editors/articles management
5. Analytics charts section

---

**Accessibility:** WCAG AA compliance, keyboard navigation for all interactive elements, focus states on all inputs, semantic HTML structure, aria-labels for icon-only buttons.