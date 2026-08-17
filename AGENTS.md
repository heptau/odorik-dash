# Odorik Dash - AI Context

## ⚠️ CRITICAL: Never Commit Without Permission
**NEVER make git commits automatically.** Only commit when explicitly requested by user. This has highest priority.

## Project Summary
Odorik Dash is a modernization of the original PWA app. Built on React 19 + TypeScript + Tailwind CSS instead of vanilla JS.

## Technology Stack
- **Frontend**: React 19, TypeScript 5.9, Tailwind CSS 4
- **Build**: Vite 8
- **Testing**: Vitest + @testing-library/react + jsdom (32 tests)
- **Code Quality**: ESLint + TypeScript strict mode
- **APIs**: Odorik.cz REST API (documentation in openapi.yaml)
- **PWA**: Service Worker + Web App Manifest (offline support)

## Directory Structure
```
src/
├── components/        # React components (Contacts, Calls, Sms, Activity, ...)
├── hooks/             # Custom React hooks (useBalance, useContacts, useActivity, ...)
├── i18n/              # Internationalization (11 languages)
│   └── locales/       # EDIT LOCALIZATIONS HERE (cs, en, de, es, fr, it, pl, pt, sk, uk, vi)
├── pwa/               # PWA files (manifest, icon, service worker)
├── test/              # Test setup
├── api.ts             # API functions + types (OdorikCall, OdorikSMS, ...)
├── App.tsx            # Root component with tab navigation
└── main.tsx           # Entry point

docs/                  # Build output for GitHub Pages
├── index.html         # Built HTML
├── assets/            # Built JS/CSS
├── locales/           # Copied from src/i18n/locales/
├── app.webmanifest    # PWA manifest
├── sw.js              # Service Worker
├── odorik-icon.svg    # App icon
└── CNAME              # Custom domain (keep in git!)
```
```

## ⚠️ IMPORTANT: Localization (i18n)
- **Source localization**: `src/i18n/locales/*.json` (11 languages: cs, en, de, es, fr, it, pl, pt, sk, uk, vi)
- **Build automatically copies** to `docs/locales/`
- **NEVER EDIT files in `docs/locales/`** - they will be overwritten on build
- When editing localization, always edit files in `src/i18n/locales/`

### Language Picker (iOS-style)
- Settings language picker is split into **Suggested** and **Other** sections
- **Suggested**: Auto (first) + system-preferred languages in system order
- **Other**: Remaining languages in alphabetical order
- Uses `navigator.languages` to detect system preferences

## Key Features (Status)
- ✅ Authentication (SIP/API credentials, encrypted with AES-GCM using a random per-device key + random IV per save, both generated with `crypto.getRandomValues`)
- ✅ Unified Activity feed (calls + SMS history, with filters)
- ✅ SMS history (received/sent, sending)
- ✅ Speed dials (CRUD contacts)
- ✅ Active calls management (list + hangup, auto-refresh 5s)
- ✅ Statistics (monthly overview)
- ✅ Balance management (with cache, auto-refresh)
- ✅ SIM card management (data usage, packages)
- ✅ Callback
- ✅ PWA support (offline, installable)
- ✅ i18n (11 languages with auto-detection)
- ✅ Logout with cache clearing (Settings → Logout)

## API Integration

### Calls + SMS Detection
API endpoint `/calls.json` with parameter `include_sms=true` returns calls and SMS in a single array.
**Important**: SMS messages are detected by `destination_name === 'SMS zpráva'` (not by `direction` field which can be null).

```typescript
// In fetchCallsAndSMS in api.ts:
const isSms = item.destination_name === 'SMS zpráva';
```

### API Endpoints Used
- `GET /api/v1/calls.json` - calls (+ `include_sms=true` for SMS)
- `GET /api/v1/sms/sms.json` - SMS (separate endpoint)
- `POST /api/v1/sms` - send SMS
- `GET /api/v1/callback` - callback
- `GET /api/v1/lines.json` - lines
- `GET /api/v1/sim_cards.json` - SIM cards
- `GET /api/v1/active_calls.json` - active calls
- `DELETE /api/v1/active_calls/{id}.json` - hangup call

## Architecture Decisions

### Cache Strategy
- **Primary**: IndexedDB (`odorik_cache` database) - unlimited size
- **Legacy**: localStorage for backup (keys starting with `odorik_`)
- Function `clearAllCaches()` clears both stores on logout

### Cache Functions (IndexedDB)
```typescript
loadFromCache<T>(key: string): Promise<T[]>      // Load from cache
saveToCache<T>(key: string, data: T[]): Promise<void>  // Save to cache
readCache<T>(key: string): Promise<TimestampedCacheEntry<T> | null>  // Timestamped read
writeCache<T>(key: string, data: T): Promise<void>  // Timestamped write
clearAllCaches(): Promise<void>                   // Clear all cache
```

### Component State Management
- Most components use `useEffect` with async cache loading
- Lazy initializers are not used (cache is async)
- Background sync for updating data from API

## Language Rules
- **User Communication:** Always respond in the same language the user uses to communicate with you.
- **Code, Comments, Commit Messages:** All source code, variable names in code, and commit messages must be in English.
- **AGENTS.md & System Documents:** Use English when proposing changes to this file or other system documents.

## Development Guidelines
1. **TypeScript**: Always strict mode, no `any`
2. **Components**: Functional components with hooks
3. **Styling**: Tailwind utility classes (mobile-first responsive)
4. **API calls**: Abstraction in `api.ts`
5. **Errors**: Propagate to UI, log to console
6. **Tests**: `npm run test` or `make test`
7. **Build**: `npm run build` or `make build`
8. **API Documentation**: If `openapi.yaml` doesn't match actual API behavior, fix it automatically without asking.
9. **Commits**: Never commit automatically - only when explicitly requested by user.
10. **Code Formatting**: Use `.editorconfig` - enables EditorConfig support in your IDE (VS Code: EditorConfig extension, IntelliJ: native support)

## Testing
- **Framework**: Vitest + @testing-library/react
- **Environment**: jsdom
- **Setup**: `src/test/setup.ts`
- **Tests**: `src/api.test.ts`, `src/cache.test.ts`, `src/credentials.test.ts`
- **Run**: `npm run test` or `make test`

## Important Implementation Details

### Logout
- Button in Settings → "Odhlásit se"
- Cache clearing: `clearAllCaches()` (IndexedDB + localStorage)
- Credentials clearing: `clearCredentials()`
- Page reload: `window.location.reload()`

### Settings Component
```typescript
<Settings onLogout={handleLogout} />
```
Accepts `onLogout` prop for logout handler.

### Background Sync in useActivity
When loading from cache, new data is synced from the last cached item:
```typescript
const fromDate = new Date(newestItem.date).toISOString();
const toDate = new Date().toISOString();
```

## AI_CONTEXT Maintenance Rule
- This file should be updated after any significant change in architecture, security, routing, configuration, or documentation
- Don't wait for a special request - if the update is clearly relevant, make it automatically

## CHANGELOG.md Maintenance Rule
- **Every code change must be recorded in `CHANGELOG.md`**, under `[Unreleased]`, in the correct
  Keep a Changelog section (`Added`/`Changed`/`Fixed`/`Security`/...).
- The `[Unreleased]` section must reflect the net diff since the last released version, not a
  log of every edit made while getting there. If a change under `[Unreleased]` gets corrected,
  reworked, or redone (e.g. the user isn't happy with the first attempt, or it was buggy), **edit
  the existing entry in place** to describe the final behavior — don't append a second entry for
  the same change.
- Only once a version is actually released (new `## [x.y.z] - date` heading cut) does the
  `[Unreleased]` content become frozen history; before that point, entries under `[Unreleased]`
  are living text, not an append-only log.

## Known Issues / TODOs
- ESLint warnings for missing dependencies in useEffect (common React hooks patterns)
- CSS lightningcss warnings for opacity values (does not affect functionality)

## GitHub Pages Deployment
- **Build output**: `docs/` folder (not `dist/`)
- **Locales**: Copied to `docs/locales/` during build
- **Custom domain**: CNAME file in `docs/CNAME` (keep in git!)
- **Setup**: Settings → Pages → Source: Deploy from a branch → main, /docs