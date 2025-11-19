# CLAUDE.md - BirdSong Project Guide for AI Assistants

## Project Overview

**BirdSong** is a Chrome browser extension that provides continuous playback of bird songs with a beautiful, modern UI. It's a sophisticated example of Chrome Extension Manifest V3 architecture, featuring offscreen audio playback, service worker orchestration, and React-based UI.

**Primary Function:** Automatically plays bird songs in sequence, with intelligent filtering for small songbirds (<30cm, <200g) from around the world, using Cornell Lab of Ornithology's Macaulay Library and eBird APIs.

**Tech Stack:**
- **Framework:** WXT (modern Chrome extension framework built on Vite)
- **Frontend:** React 18 + TypeScript
- **Styling:** Tailwind CSS + custom CSS
- **APIs:** eBird API v2, Macaulay Library API (unofficial), AVONET bird database
- **Build:** Vite (via WXT), TypeScript
- **Language:** Mixed Japanese/English (docs in Japanese, code in English)

---

## Architecture Overview

### Extension Architecture Pattern: MV3 with Offscreen Audio

```
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│   Popup/View     │       │    Background    │       │    Offscreen     │
│   (React UI)     │◄─────►│ Service Worker   │◄─────►│  Audio Player    │
│                  │       │  (Orchestrator)  │       │  (HTMLAudio)     │
└──────────────────┘       └──────────────────┘       └──────────────────┘
         │                          │                           │
         │                          ▼                           │
         │                 chrome.storage.local                 │
         │                 (State Persistence)                  │
         │                                                      │
         └──────────────────────────────────────────────────────┘
                    Real-time sync via chrome.runtime messages
```

### Key Architectural Decisions

1. **Offscreen Document for Audio:** Chrome MV3 service workers cannot play audio directly. The offscreen document (entrypoints/offscreen/offscreen.ts) handles all audio playback using Web Audio API with DynamicsCompressor for volume normalization.

2. **Service Worker as Orchestrator:** background.ts coordinates all logic, manages state, and routes messages between popup and offscreen.

3. **Message-Based Communication:** All components communicate via chrome.runtime.sendMessage/onMessage.

4. **Triple-State Architecture:**
   - **UI State:** React component state (ephemeral)
   - **Background State:** Central source of truth (persisted)
   - **Offscreen State:** Real-time audio element state (queried on-demand)

5. **Graceful Auto-Resume:** Playback can resume automatically when browser restarts (configurable by user).

---

## Directory Structure

```
BirdSong/
├── entrypoints/                    # WXT entry points (browser extension contexts)
│   ├── background.ts               # Service worker - main orchestrator
│   ├── style.css                   # Global CSS with Tailwind directives
│   ├── offscreen/
│   │   ├── index.html              # Offscreen document HTML
│   │   └── offscreen.ts            # Audio player implementation
│   ├── popup/
│   │   ├── index.html              # Extension popup HTML
│   │   ├── main.tsx                # React root (popup)
│   │   └── App.tsx                 # Popup container
│   ├── view/
│   │   ├── index.html              # Standalone window HTML
│   │   ├── main.tsx                # React root (view)
│   │   └── view.tsx                # View container
│   └── player/                     # Legacy/alternative player (unused)
│
├── src/                            # Shared source code
│   ├── typeConst.ts                # **CENTRAL TYPE DEFINITIONS & CONSTANTS**
│   ├── components/
│   │   ├── BirdSongApp.tsx         # **MAIN APP COMPONENT** (used in popup + view)
│   │   └── ui/                     # Reusable UI components
│   │       ├── BirdInfo.tsx        # Bird information display
│   │       ├── PlaybackControls.tsx # Play/pause/skip/stop buttons
│   │       ├── RegionSelector.tsx  # Country dropdown (245+ regions)
│   │       ├── OptionsSection.tsx  # Settings (auto-resume toggle)
│   │       ├── WaitingStatus.tsx   # 60-second countdown display
│   │       ├── MediaToggle.tsx     # Image/video toggle switch
│   │       ├── DownloadSection.tsx # Audio history ZIP download
│   │       ├── useMessageListener.ts # **Custom hook for background events**
│   │       └── useOffscreenSync.ts   # **Custom hook for state sync**
│   ├── lib/
│   │   └── utils.ts                # Tailwind class merge utility
│   └── util/                       # Business logic utilities
│       ├── api.ts                  # **MAIN API INTEGRATION** (eBird + Macaulay)
│       ├── api_avonet.ts           # AVONET bird size data loader
│       ├── api_taxonomy.ts         # eBird taxonomy loader
│       ├── playCrontrol.ts         # Playback control functions
│       ├── offscreenManager.ts     # Offscreen document lifecycle manager
│       ├── messageHandlers.ts      # Background message routing
│       ├── audioHistory.ts         # Audio history + ZIP download
│       ├── optionsManager.ts       # User settings management
│       ├── popupNotifier.ts        # Popup notification system
│       └── commonfunc.ts           # Common utility functions
│
├── docs/                           # Documentation (Japanese)
│   ├── QUICKSTART.md               # Quick start guide
│   ├── OFFSCREEN_IMPLEMENTATION.md # Offscreen architecture details
│   ├── SYNC_IMPLEMENTATION.md      # State synchronization patterns
│   ├── MacaulayLibraryAPI.md       # API reverse engineering notes
│   ├── POPUP_LAYOUT.md             # UI/UX documentation
│   └── DEBUGGING.md                # Debugging guide
│
├── public/                         # Static assets
│   ├── data/
│   │   └── AVONET Supplementary dataset 1.csv  # Bird body mass dataset (40,000+ species)
│   └── icon/                       # Extension icons (NOT in repo - copied externally)
│
├── package.json                    # NPM dependencies & scripts
├── tsconfig.json                   # TypeScript configuration
├── wxt.config.ts                   # **WXT FRAMEWORK CONFIG**
├── tailwind.config.js              # Tailwind CSS configuration
├── postcss.config.js               # PostCSS configuration
├── README.md                       # Project overview (Japanese)
└── SETUP.md                        # Setup guide (Japanese)
```

---

## Key Files Deep Dive

### 1. `src/typeConst.ts` - CENTRAL TYPE DEFINITIONS

**ALWAYS check this file first** when working with types. Contains:

```typescript
// Core interfaces
Bird: {
  commonName, scientificName, speciesCode,
  audioUrl, imageUrl, videoUrl,
  recordist, location
}

BirdObservation: {
  // eBird API observation data
}

// Critical constants
WAIT_NEXT_BIRD_TIME: 60000  // 60 seconds between tracks
EBIRD_API_KEY: string       // eBird API token
EBIRD_BASE_URL: string      // https://api.ebird.org/v2
MACAULAY_BASE_URL: string   // https://search.macaulaylibrary.org/api/v1
REGIONS: Array<{code: string, name: string}>  // 245+ countries
```

### 2. `entrypoints/background.ts` - SERVICE WORKER ORCHESTRATOR

**Central hub for all extension logic.** Key responsibilities:

- Manages global state (isPlaying, isPaused, currentBird, region)
- Creates/manages offscreen document
- Routes messages between popup and offscreen
- Implements auto-resume on browser restart
- Persists state to chrome.storage.local
- Handles 60-second wait between tracks

**Important patterns:**
```typescript
// State persistence
chrome.storage.local.set({ playbackState: {...} })

// Offscreen management
await chrome.offscreen.createDocument({
  url: 'offscreen.html',
  reasons: ['AUDIO_PLAYBACK'],
  justification: 'Play bird songs continuously'
})

// Message routing
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  messageHandlers[message.type]?.(message, sender)
})
```

### 3. `entrypoints/offscreen/offscreen.ts` - AUDIO PLAYER

**Lightweight audio player with Web Audio API.** Key features:

- Uses HTMLAudioElement for playback
- Web Audio API with DynamicsCompressor (-20dB threshold, 15:1 ratio)
- Downloads audio as Blob to bypass CORS
- Sends events: audioStarted, audioEnded, audioError, audioPaused, audioResumed
- Manages playback state independently

**Critical pattern:**
```typescript
// Blob download to bypass CORS
const response = await fetch(url)
const blob = await response.blob()
const blobUrl = URL.createObjectURL(blob)
audioElement.src = blobUrl
```

### 4. `src/components/BirdSongApp.tsx` - MAIN UI COMPONENT

**Central React component used in both popup and view.** Contains:

- Region selection state
- Playback controls
- Bird information display
- Options/settings
- Custom hooks for message listening and state sync

**State synchronization pattern:**
```typescript
// Listen for background events
useMessageListener((message) => {
  if (message.type === 'birdChanged') {
    setCurrentBird(message.bird)
  }
})

// Sync with offscreen on mount
useOffscreenSync(() => {
  // Query real state from offscreen
})
```

### 5. `src/util/api.ts` - API INTEGRATION LAYER

**Main API logic for bird data fetching.** Key functions:

```typescript
// Get recent bird observations from eBird
getRecentObservations(regionCode): Promise<BirdObservation[]>

// Get media (audio/photo/video) from Macaulay Library
getMacaulayMedia(speciesCode, regionCode, mediaType): Promise<Media[]>

// MAIN SEARCH FUNCTION - finds random small bird with audio
searchBirdAudio(regionCode): Promise<Bird>
```

**Search algorithm:**
1. Fetch recent observations from eBird
2. Filter by target orders (Passeriformes, Caprimulgiformes, etc.)
3. Check body mass via AVONET data (≤200g for ≤30cm birds)
4. Shuffle observations
5. For each bird, query Macaulay Library for audio/photo/video
6. Return first bird with available media

**Important filtering logic:**
```typescript
const TARGET_ORDERS = [
  'Caprimulgiformes',  // Nightjars
  'Apodiformes',       // Swifts, hummingbirds
  'Charadriiformes',   // Plovers, sandpipers (small species)
  'Piciformes',        // Woodpeckers
  'Passeriformes'      // Songbirds (majority)
]

const MAX_BODY_MASS = 200  // grams (≈30cm body length)
```

### 6. `src/util/offscreenManager.ts` - OFFSCREEN LIFECYCLE

**Singleton class managing offscreen document.** Critical for audio playback:

```typescript
class OffscreenManager {
  async setupOffscreen(): Promise<void>
  async getOffscreenState(): Promise<OffscreenAudioState>
}
```

**Usage pattern:**
```typescript
import { offscreenManager } from './offscreenManager'

// Ensure offscreen exists before sending messages
await offscreenManager.setupOffscreen()
chrome.runtime.sendMessage({ type: 'playAudio', url: audioUrl })
```

---

## State Management Guide

### Three-Layer State Architecture

#### Layer 1: UI State (React Components)
- **Location:** BirdSongApp.tsx component state
- **Lifecycle:** Ephemeral (resets when popup closes)
- **Pattern:** useState hooks
- **Purpose:** UI rendering and user interaction

#### Layer 2: Background State (Service Worker)
- **Location:** background.ts module-level variables
- **Lifecycle:** Persisted to chrome.storage.local, restored on restart
- **Pattern:** Simple object state
- **Purpose:** Central source of truth for playback state

```typescript
// Background state structure
interface BackgroundState {
  currentBird: Bird | null
  isPlaying: boolean
  isPaused: boolean
  region: string
  isWaiting: boolean
  waitingTimeout: number | null
  waitingStartTime: number | null
}
```

#### Layer 3: Offscreen State (Audio Element)
- **Location:** offscreen.ts audio element
- **Lifecycle:** Real-time, destroyed when offscreen document closes
- **Pattern:** HTMLAudioElement properties
- **Purpose:** Actual audio playback state (playing, paused, currentTime, duration)

**Critical: Offscreen state takes precedence.** When popup opens, it queries offscreen for real state.

### Message Flow Diagram

```
User clicks "Play"
       │
       ▼
[Popup] sends {type: 'start', region: 'US'}
       │
       ▼
[Background] updates state, calls searchBirdAudio()
       │
       ▼
[Background] sends {type: 'playAudio', url: '...'} to offscreen
       │
       ▼
[Offscreen] plays audio, sends {type: 'audioStarted', bird: {...}}
       │
       ▼
[Background] updates state, notifies popup
       │
       ▼
[Popup] receives {type: 'birdChanged', bird: {...}}, updates UI
```

### State Synchronization Hooks

**`useMessageListener(callback)`** - Subscribe to background events:
```typescript
useMessageListener((message) => {
  switch (message.type) {
    case 'birdChanged': setCurrentBird(message.bird); break
    case 'playbackStopped': setIsPlaying(false); break
    case 'waitingStarted': setIsWaiting(true); break
    // ...
  }
})
```

**`useOffscreenSync(callback)`** - Sync state on mount:
```typescript
useOffscreenSync(async () => {
  const state = await chrome.runtime.sendMessage({ type: 'getState' })
  // Update local state to match background/offscreen
})
```

---

## API Integration Details

### 1. eBird API v2 (Official)

**Purpose:** Get recent bird observations by region

**Base URL:** `https://api.ebird.org/v2`

**Key Endpoint:**
```
GET /data/obs/{regionCode}/recent?maxResults=100
Headers: X-eBirdApiToken: {API_KEY}
```

**Response:**
```typescript
[{
  specCode: "rebwoo",      // Species code
  comName: "Red-bellied Woodpecker",
  sciName: "Melanerpes carolinus",
  locName: "Central Park",
  lat: 40.7812,
  lng: -73.9665,
  obsDt: "2025-01-19 10:30"
}]
```

**Rate Limit:** 100 requests/minute

**Documentation:** https://documenter.getpostman.com/view/664302/S1ENwy59

### 2. Macaulay Library API (Unofficial - Reverse Engineered)

**Purpose:** Get audio/photo/video for bird species

**Base URL:** `https://search.macaulaylibrary.org/api/v1`

**Key Endpoint:**
```
GET /search?taxonCode={speciesCode}&mediaType={audio|photo|video}&count=50&sort=rating_rank_desc
```

**Response:**
```json
{
  "results": {
    "content": [{
      "assetId": "123456",
      "commonName": "Red-bellied Woodpecker",
      "scientificName": "Melanerpes carolinus",
      "mediaUrl": "https://cdn.download.ams.birds.cornell.edu/...",
      "previewUrl": "...",
      "userDisplayName": "John Smith",
      "location": "Central Park, NY"
    }]
  }
}
```

**Important Notes:**
- **NO official documentation exists** - API discovered via network inspection
- Uses weighted random selection (prioritizes high-quality recordings)
- Direct CDN URLs for audio/images/videos
- No explicit rate limits observed

**Quality Filter:** `quality=A,B,C,D,E` (A=highest, E=acceptable)

### 3. AVONET Database (Static CSV)

**Purpose:** Filter birds by body mass (to find small birds ≤200g)

**File:** `public/data/AVONET Supplementary dataset 1.csv`

**Size:** ~40,000 species

**Key Columns:**
- `Species2`: Scientific name
- `Mass`: Body mass in grams
- `Order2`: Taxonomic order

**Usage:**
```typescript
import { getAvonetData } from '@/util/api_avonet'

const avonetData = await getAvonetData()
const bodyMass = avonetData[scientificName]
if (bodyMass && bodyMass <= 200) {
  // Include this bird
}
```

---

## Development Workflows

### Setup and Installation

```bash
# Clone repository
git clone <repo-url>
cd BirdSong

# Install dependencies
npm install

# Copy icons (if not in repo)
# Icons should be in public/icon/: icon16.png, icon32.png, icon48.png, icon128.png

# Start development server
npm run dev

# Output will be in .output/chrome-mv3/
```

### Loading Extension in Chrome

1. Open `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select `.output/chrome-mv3` folder

### Development Loop

```bash
# Start dev server (hot reload enabled)
npm run dev

# Make changes to code
# WXT automatically rebuilds

# Reload extension in chrome://extensions/
# Click the reload icon on BirdSong extension card

# Reopen popup to see changes
```

### Building for Production

```bash
# Production build (optimized)
npm run build

# Build for Firefox
npm run build:firefox

# Create distributable ZIP
npm run zip
```

### Debugging

**Background Script (Service Worker):**
1. Go to `chrome://extensions/`
2. Find BirdSong extension
3. Click "service worker" link (or "Inspect views: service worker")
4. Console opens with background.ts logs

**Popup/View:**
1. Right-click on extension popup
2. Select "Inspect"
3. DevTools opens for popup context

**Offscreen Document:**
1. Inspect background service worker
2. Use Chrome DevTools Protocol or check offscreen.ts logs in background console

**Network Requests:**
- Check Network tab in background service worker DevTools
- Filter by "macaulaylibrary.org" or "ebird.org"

**Storage:**
```javascript
// Check stored state in background console
chrome.storage.local.get('playbackState', console.log)
chrome.storage.sync.get('options', console.log)
```

---

## Common Tasks

### Adding a New Region

1. Edit `src/typeConst.ts`:
```typescript
export const REGIONS = [
  // ... existing regions
  { code: 'XX', name: 'Your Country' },
]
```

2. Extension will automatically include new region in dropdown

### Changing Wait Time Between Birds

1. Edit `src/typeConst.ts`:
```typescript
export const WAIT_NEXT_BIRD_TIME = 30000  // 30 seconds instead of 60
```

2. Rebuild and reload extension

### Adding a New Bird Filter

1. Edit `src/util/api.ts`:
```typescript
const TARGET_ORDERS = [
  // ... existing orders
  'Columbiformes',  // Add pigeons/doves
]
```

2. Adjust `MAX_BODY_MASS` constant if needed

### Modifying UI Colors/Theme

1. Edit `entrypoints/style.css`:
```css
.popup-header {
  background: linear-gradient(135deg, #your-color-1 0%, #your-color-2 100%);
}
```

2. Or use Tailwind classes in components:
```tsx
<div className="bg-gradient-to-r from-purple-500 to-indigo-600">
```

### Adding a New User Setting

1. Define type in `src/typeConst.ts`:
```typescript
export interface UserOptions {
  autoResumeOnStartup: boolean
  yourNewSetting: boolean  // Add here
}
```

2. Update `src/util/optionsManager.ts`:
```typescript
export async function getOptions(): Promise<UserOptions> {
  const result = await chrome.storage.sync.get('options')
  return {
    autoResumeOnStartup: result.options?.autoResumeOnStartup ?? false,
    yourNewSetting: result.options?.yourNewSetting ?? false,  // Default value
  }
}
```

3. Add UI control in `src/components/ui/OptionsSection.tsx`

### Adding a New UI Component

1. Create file in `src/components/ui/YourComponent.tsx`:
```tsx
import React from 'react'

interface YourComponentProps {
  // ...
}

export const YourComponent: React.FC<YourComponentProps> = ({ ... }) => {
  return <div>...</div>
}
```

2. Import and use in `BirdSongApp.tsx`:
```tsx
import { YourComponent } from './ui/YourComponent'

// In render
<YourComponent ... />
```

---

## Conventions and Best Practices

### Code Style

**TypeScript:**
- Use interfaces for data structures (not types)
- Explicit return types on exported functions
- Async functions for all chrome API calls
- Prefer const over let

**React:**
- Functional components only (no classes)
- Custom hooks for reusable logic (prefix with `use`)
- Props interfaces named `{ComponentName}Props`
- Event handlers prefixed with `handle` (handleStart, handleStop)

**Naming:**
- Components: PascalCase (BirdSongApp.tsx)
- Utilities: camelCase (api.ts, offscreenManager.ts)
- Constants: UPPER_SNAKE_CASE (WAIT_NEXT_BIRD_TIME)
- Hooks: usePrefix (useMessageListener.ts)

### File Organization

**When to create a new file:**
- New UI component → `src/components/ui/ComponentName.tsx`
- New utility function → Add to existing file or create in `src/util/`
- New type → Add to `src/typeConst.ts` (centralized)
- New hook → `src/components/ui/useHookName.ts`

**Import paths:**
- Use `@/` alias for src imports: `import { api } from '@/util/api'`
- Relative paths for same directory: `import { utils } from './utils'`

### Error Handling

**Always wrap async operations:**
```typescript
try {
  const data = await fetchData()
  // ...
} catch (error) {
  console.error('[Component] Error:', error)
  // Handle gracefully - show user message, retry, or fallback
}
```

**User-facing errors:**
- Show friendly messages (avoid technical jargon)
- Provide actionable suggestions ("Check internet connection")
- Log detailed errors to console for debugging

### Performance

**Critical optimizations:**
- Cache AVONET/taxonomy data (don't reload on every call)
- Use Blob URLs for audio (bypass CORS, enable offline caching)
- Debounce rapid user actions (button clicks)
- Lazy load heavy dependencies (JSZip for downloads)

**Anti-patterns to avoid:**
- Don't fetch audio in popup (use background/offscreen)
- Don't store large data in chrome.storage.sync (5KB limit)
- Don't create multiple offscreen documents (use singleton)

---

## Important Gotchas and Known Issues

### 1. Icons Not Included in Repository

**Issue:** `public/icon/` folder is NOT committed to git (see README.md)

**Solution:** Icons must be copied from external source:
```bash
# See README.md for icon source location
# Required files: icon16.png, icon32.png, icon48.png, icon128.png
```

### 2. Offscreen Document Limitations

**Issue:** Chrome can only have ONE offscreen document per extension

**Solution:** Use `offscreenManager.setupOffscreen()` which checks if document exists before creating

**Anti-pattern:**
```typescript
// BAD - might create duplicate
await chrome.offscreen.createDocument(...)
```

**Correct pattern:**
```typescript
// GOOD - singleton manager
await offscreenManager.setupOffscreen()
```

### 3. Service Worker Lifecycle

**Issue:** Chrome terminates service workers after 30 seconds of inactivity

**Impact:**
- Module-level variables reset when worker restarts
- Need to restore state from chrome.storage

**Solution:**
- Always persist state to chrome.storage.local
- Restore state on background script initialization

### 4. Popup Closes on Blur

**Issue:** Extension popup closes when user clicks outside

**Impact:** UI state is lost

**Solution:**
- Use "Open in New Window" to keep UI open permanently
- State persists in background regardless

### 5. CORS Restrictions on Audio URLs

**Issue:** Macaulay Library audio URLs have CORS restrictions

**Solution:** Download audio as Blob first:
```typescript
const response = await fetch(audioUrl)
const blob = await response.blob()
const blobUrl = URL.createObjectURL(blob)
audioElement.src = blobUrl
```

### 6. eBird API Rate Limiting

**Issue:** eBird API limits to 100 requests/minute

**Solution:**
- Use `count=100` to get maximum results per request
- Cache taxonomy/observation data when possible
- Implement exponential backoff on 429 errors (not currently implemented)

### 7. Region Filter Not Perfect

**Known limitation:** Macaulay Library's region filter sometimes returns birds from other regions

**Workaround:** Code already implements fallback to global search if regional search fails

### 8. TypeScript Path Aliases

**Issue:** `@/` alias only works in TypeScript files

**Solution:**
- Configured in tsconfig.json and wxt.config.ts
- Use relative imports in non-TS files

### 9. Audio Quality Variation

**Issue:** Some recordings are low quality or have background noise

**Solution:**
- Already implemented: weighted random selection prioritizing high-quality
- Future improvement: add quality filter UI

### 10. Auto-Resume Privacy Concerns

**Issue:** Auto-resume on browser startup might surprise users

**Solution:**
- Made configurable via OptionsSection
- Disabled by default (user must opt-in)
- Clearly labeled in UI

---

## Testing Strategy (Current: Manual Only)

### No Automated Tests Currently

**Current approach:** Manual testing via Chrome DevTools

**Recommended testing setup (not implemented):**
```json
{
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "vitest": "^1.0.0",
    "@types/chrome": "^0.0.268"
  }
}
```

### Manual Testing Checklist

**Basic playback:**
- [ ] Click "Start Playback" → audio plays
- [ ] Click "Pause" → audio pauses
- [ ] Click "Resume" → audio resumes
- [ ] Click "Skip" → next bird loads and plays
- [ ] Click "Stop" → audio stops completely

**Region selection:**
- [ ] Select region → next bird is from that region (usually)
- [ ] Change region during playback → next bird respects new region

**Auto-resume:**
- [ ] Enable auto-resume → close Chrome → reopen → playback resumes
- [ ] Disable auto-resume → close Chrome → reopen → playback doesn't resume

**UI updates:**
- [ ] Bird info displays correctly (name, image, recordist, location)
- [ ] Waiting countdown shows during 60-second wait
- [ ] Media toggle switches between image and video

**Error handling:**
- [ ] Disconnect internet → shows error message
- [ ] Skip rapidly → doesn't break
- [ ] Close popup during playback → audio continues in background

---

## WXT Framework Notes

### What is WXT?

**WXT** is a modern Chrome extension framework built on Vite. It provides:
- Auto-generated manifest.json from config
- Hot Module Replacement (HMR) for rapid development
- Multi-browser support (Chrome, Firefox, Safari)
- TypeScript and React support out of the box

### WXT File Conventions

**Entry points are discovered automatically:**
- `entrypoints/background.ts` → background service worker
- `entrypoints/popup/index.html` → popup page
- `entrypoints/offscreen/index.html` → offscreen document
- `entrypoints/*/main.tsx` → React entry point (auto-detected)

### WXT Configuration (wxt.config.ts)

```typescript
export default defineConfig({
  manifest: {
    // Merged into manifest.json
    permissions: ['storage', 'offscreen', 'downloads'],
    host_permissions: ['https://...']
  },
  vite: () => ({
    // Vite config (resolve aliases, plugins, etc.)
  }),
  dev: {
    server: { port: 3100 }
  }
})
```

### WXT Build Output

```
.output/
├── chrome-mv3/          # Chrome build (default)
│   ├── manifest.json    # Auto-generated
│   ├── background.js    # Bundled service worker
│   ├── popup.html       # Popup page
│   ├── offscreen.html   # Offscreen document
│   └── assets/          # CSS, images, etc.
└── firefox-mv2/         # Firefox build (if using npm run build:firefox)
```

---

## Quick Reference Commands

```bash
# Development
npm install              # Install dependencies
npm run dev             # Start dev server with HMR
npm run build           # Production build
npm run build:firefox   # Build for Firefox
npm run zip             # Create distribution ZIP

# Chrome Extension
chrome://extensions/    # Extension management page
# - Enable Developer Mode
# - Load unpacked → select .output/chrome-mv3
# - Click "Reload" after code changes

# Debugging
# Background: chrome://extensions/ → "service worker" link
# Popup: Right-click popup → "Inspect"
# Storage: chrome.storage.local.get(console.log)
```

---

## Resources and Documentation

### External Documentation
- **WXT Framework:** https://wxt.dev/
- **eBird API:** https://documenter.getpostman.com/view/664302/S1ENwy59
- **Chrome Extensions:** https://developer.chrome.com/docs/extensions/
- **Macaulay Library:** https://www.macaulaylibrary.org/ (no API docs)

### Internal Documentation (in `docs/`)
- **OFFSCREEN_IMPLEMENTATION.md:** Offscreen architecture deep dive
- **SYNC_IMPLEMENTATION.md:** State synchronization patterns
- **MacaulayLibraryAPI.md:** API reverse engineering notes
- **DEBUGGING.md:** Troubleshooting guide
- **QUICKSTART.md:** 5-minute setup

### Key Files to Reference
- `src/typeConst.ts` - All type definitions and constants
- `entrypoints/background.ts` - Main orchestrator logic
- `src/util/api.ts` - API integration patterns
- `src/components/BirdSongApp.tsx` - UI architecture

---

## Contributing Guidelines

### Before Making Changes

1. **Read relevant docs** in `docs/` folder
2. **Check typeConst.ts** for existing types/constants
3. **Test manually** in Chrome with DevTools open
4. **Verify state persistence** (close/reopen browser)

### When Adding Features

1. **Update types** in `typeConst.ts` if needed
2. **Add UI component** in `src/components/ui/`
3. **Update BirdSongApp.tsx** to use new component
4. **Add message handlers** in `messageHandlers.ts` if needed
5. **Test all user flows** (start, pause, skip, stop)

### Code Review Checklist

- [ ] TypeScript types are explicit
- [ ] Error handling is graceful
- [ ] State is persisted to chrome.storage where needed
- [ ] Console logs use prefixes ([Background], [Offscreen], etc.)
- [ ] UI is responsive and accessible
- [ ] No hardcoded values (use constants from typeConst.ts)
- [ ] Follows existing naming conventions
- [ ] Doesn't break existing functionality

---

## Version History

**v1.0.0** (January 2025)
- Initial release
- Continuous bird song playback
- Region selection (245+ countries)
- Auto-resume on startup
- Audio history download
- Image/video toggle
- 60-second wait between tracks

---

## License

MIT License

---

## AI Assistant Guidelines

When working on this codebase:

1. **Always check `src/typeConst.ts` first** for types and constants
2. **Use the Task tool** for exploratory code searches (don't grep directly)
3. **Test changes manually** - no automated test suite exists
4. **Preserve Japanese documentation** - don't translate without explicit request
5. **Follow WXT conventions** - entry points in `entrypoints/`, shared code in `src/`
6. **Respect offscreen singleton pattern** - use `offscreenManager.setupOffscreen()`
7. **Handle errors gracefully** - audio playback can fail for many reasons
8. **Maintain state persistence** - always sync critical state to chrome.storage
9. **Use message-based communication** - never directly access other contexts
10. **Document complex logic** - this codebase has intricate state management

**Most common tasks:**
- Adding UI components → `src/components/ui/`
- Modifying bird filters → `src/util/api.ts`
- Changing playback logic → `entrypoints/background.ts`
- Updating styles → `entrypoints/style.css` or Tailwind classes
- Adding settings → `src/util/optionsManager.ts` + `OptionsSection.tsx`

**When stuck:**
- Check `docs/` folder for detailed architecture docs
- Inspect background service worker console for logs
- Verify state in chrome.storage.local
- Test with different regions and bird species
- Check Network tab for API failures

---

**Last Updated:** 2025-01-19
**Maintained By:** AI Assistant (Claude)
**Project Status:** Active Development
