# Exeges — Bible Reader

A beautiful, personal Bible reader built with React + Vite. Built for family use — deep reading, not browsing.

---

## Vision

**Exeges exists to make Scripture feel like a real book.** Not a search result, not a feed, not an app that demands interaction. You open it, you see text, and the words are easy to read. Everything else is invisible.

The core principle is simple: **the text gets all the space, all the warmth, all the care.** Backgrounds are ivory, never white. Text is Georgia or a warm serif, never system sans. Line height is generous (1.75) and every character has room to breathe. Dark mode uses charcoal-brown undertones, not harsh black.

This is built as a single family's tool — bookmarks persist in localStorage, font sizes are saved per device, reading position survives a page refresh. It's personal. That's the point.

---

## Current Status (v0.1 — July 2026)

### ✅ Complete

| Feature | Details |
|---------|---------|
| **KJV Bible** | All 66 books, ~31K verses, fully local (`bible.json`) |
| **Typography** | Warm ivory background, Georgia serif, generous leading (1.75), 65ch max-width |
| **Dark mode** | Toggle with ☾/☀ icon; respects system preference by default |
| **Bookmarks** | Click any verse to bookmark (key: `bookId-chapter-verse`, stored in localStorage) |
| **Font size controls** | A−/A+ buttons in the bottom bar; 9 sizes (14–24px), persisted per device |
| **Reading mode** | Tap anywhere or click 📖 to hide all chrome for immersive reading |
| **Sidebar navigation** | Slide-in panel with book list → expandable chapter grids, grouped by testament |
| **Reading progress** | Thin scroll-based progress bar at the top of viewport |
| **URL hash links** | Shareable chapter links (`/#/genesis/1`), popstate support for back-button |
| **Last position** | Remembers last book/chapter across page refreshes via localStorage |

### 🔧 Recently Fixed (July 2026)

- Added missing `--radius-*` design tokens (were completely absent despite widespread use)
- Fixed hardcoded hex typo (`#F6EF E3` → `#F6EFD3`) on background color
- Improved contrast ratios: `text-muted` colors now meet minimum readability thresholds in both modes
- Wired up bookmark visual styling (accent bar + tinted background for bookmarked verses)
- Softened verse animations from jarring slide-in to subtle fade-only (200ms vs 350ms)
- Increased bottom controls bar padding and button touch targets (8px → more, 48px → 52px)

---

## Architecture

```
src/
├── data/
│    └── bible.json           # All 66 books, full KJV text (~31K verses)
├── hooks/
│    ├── useBibleData.js      # Book/chapter state + navigation logic
│    ├── useBookmarks.js      # localStorage bookmarks (persisted per verse)
│    └── useTheme.js          # Dark/light mode + font size + system preference detection
├── components/
│    ├── Reader/
│    │    └── ChapterReader.jsx     # Verse-by-verse rendering with scroll-to-anchor
│    ├── Navigation/
│    │    ├── Sidebar.jsx           # Book list + expandable chapter grids
│    │    ├── ChapterNav.jsx        # Prev/Next chapter buttons (built, not wired yet)
│    │    ├── TranslationPicker.jsx # Stub for future multi-translation
│    │    └── ReadingProgress.jsx   # Scroll-based progress bar
│    └── Shared/
│        ├── BookmarkButton.jsx    # Heart toggle per verse
│        └── FontSizeControl.jsx   # A−/A+ buttons
├── styles/
│    ├── shared.css           # Reset, base typography, app shell layout
│    ├── tokens.css           # Design tokens (colors, spacing, radii, typography)
│    ├── reader.css           # Reader-specific styles (verses, chapter header, animations)
│    └── navigation.css       # Sidebar, panel, and control styles
├── App.jsx                  # Main shell — ties everything together
└── main.jsx                 # Entry point
```

### Design System

- **Palette:** Warm ivory (`#F6EFD3`) as primary background, warm terracotta (`#A05D3C`) as accent. Dark mode swaps to charcoal-brown (`#1A1510`). No sterile white, no harsh black.
- **Typography:** Georgia fallback with Source Serif 4 / Lora. UI elements use system sans-serif. Body text at 18px base, scaling up to 21px on desktop.
- **Spacing scale:** `--space-xs` through `--space-3xl` (0.25rem → 4.5rem). Responsive breakpoints at 480px / 768px / 1024px.
- **Radius scale:** `sm: 4px`, `md: 8px`, `lg: 12px`, `xl: 16px`.
- **Animations:** Subtle fade-in on verse load (200ms, 15ms stagger). Smooth transitions for theme and layout shifts.

---

## Known Issues & Technical Debt

| Issue | Priority | Notes |
|-------|----------|-------|
| **Sidebar performance** | Medium | 66 books with expandable grids — will feel sluggish on low-end devices with very long books |
| **ChapterNav not wired** | Low | `ChapterReader` renders but prev/next buttons are dead components; need to wire them up |
| **TranslationPicker is stub** | Low | UI exists in Sidebar but only shows "KJV" — the infrastructure for multi-translation is ready though |
| **Large bundle size** | Medium | `bible.json` is ~130K lines — should be compressed for production builds |
| **No loading state for long chapters** | Low | Genesis 1 loads fast, but longer chapters (e.g., Psalm 119) may benefit from a lazy render approach |

---

## Roadmap

### Phase 2: Polish (`v0.2`) — "Feels finished"
- [ ] Wire up `ChapterNav` prev/next buttons with proper book boundary logic
- [ ] Add a subtle "back to top" button when scrolling mid-chapter
- [ ] Improve sidebar performance for large book lists (virtualize or lazy render)
- [ ] Add production build compression (`bible.json` → gzipped ~15KB estimated)
- [ ] Favicon and PWA-ready manifest

### Phase 3: Multi-Translation (`v0.3`) — "Study capability"
- [ ] Integrate ESV and NASB translations alongside KJV
- [ ] Translation picker becomes functional (KJV, ESV, NASB dropdowns)
- [ ] Verse comparison view (side-by-side or stacked translation display)

### Phase 4: Deep Study (`v1.0`) — "Exegetical"
- [ ] Greek NT text integration
- [ ] Hebrew OT text integration
- [ ] Morphological analysis and lexical tools
- [ ] Cross-references between verses
- [ ] Search across all books and translations

### Phase 5: Social (`v2.0`) — "Shared reading"
- [ ] Reading plans (daily/devotionals)
- [ ] Shared bookmarks across devices (cloud sync)
- [ ] Comment/marginal notes per verse
- [ ] Export bookmarks as PDF or text file

---

## Getting Started

```bash
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

For a production build: `npm run build` (output in `dist/`)

To test the app visually: `npm run preview` (serves `dist/` locally)

---

## License

MIT. For personal/family use.
