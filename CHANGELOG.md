# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- Opening a call or SMS detail in Activity crashed ("Invalid language tag: auto") while the
  language was set to "Auto" (the default). The detail, the call/SMS labels and the CSV export
  now use the language that "Auto" resolved to instead of falling back to English.
- "Clear cache" in Settings also deleted the saved login, its encryption key and the chosen
  language, so the user was logged out on the next reload. It now removes cached data only.
- Logging in or loading the balance failed when the password contained characters such as `&`,
  `#`, `+` or `=`, because the credentials were not URL-encoded in the balance request.
- Credentials are stored only after they have been verified; a failed login no longer leaves the
  rejected credentials saved (and no longer waits through three retries before showing the error).
- The contacts cache was written in a doubly wrapped shape, so cached contacts reached the app as
  a non-array and contact lookups in Activity (search, detail, CSV export) could crash until the
  background refresh finished - permanently when offline. Existing cache entries are still read.
- A call and an SMS with the same ID no longer overwrite each other when activity pages are merged.
- The active calls panel no longer flickers to "Loading…" on every 5-second poll.
- Lines no longer stay on the loading skeleton forever when opened offline with an empty cache.
- The app no longer hangs on the loading spinner when a translation file fails to download (it
  falls back to English), and quickly switching languages can't end on the wrong one.
- "Auto" language now follows the whole system language list in order, not just the first entry.
- The SMS detail shows translated "From"/"To" labels instead of always Czech "Od"/"Na".
- "Check for updates" in Settings reports when a new version was actually found, and its result
  is translated instead of always English.
- Activity requests that fail with an HTTP error or a non-list response now show an error instead
  of crashing.
- Wrong flag emoji for the +677 prefix.

### Security
- SIM card updates no longer write the request, including the account password, to the browser
  console.
- Logging out also removes the per-device encryption key.

### Changed
- The service worker ignores non-GET requests and no longer contains an unreachable
  `controllerchange` handler.
- `src/i18n` is split into `context.ts` (hooks, locale detection) and `I18nProvider.tsx`, and
  the remaining ESLint errors are fixed (`npm run lint` now passes with warnings only).

### Removed
- Unused `useCalls` and `useSMS` hooks and `RefreshContext` (not referenced anywhere).

## [1.1.3] - 2026-11-04

### Security
- Updated dependencies in `package-lock.json` to patched versions (undici, vite, vitest/@vitest/mocker, brace-expansion, source-map-js, js-yaml, browserslist, baseline-browser-mapping, @humanfs/node, zod), resolving the open Dependabot alerts. `minimatch` (dev-only, pulled in by ESLint) is pinned to `^11.0.1` via `overrides` in `package.json`.

## [1.1.2] - 2026-09-25

### Changed
- The mobile bottom navigation is now an iOS 26+ style floating "Liquid Glass" tab bar: a
  translucent, blurred capsule inset from the screen edges and sitting inside the home-indicator
  area, with a sliding pill highlighting the selected tab (the "More" tab lights up when the
  current screen lives in its menu). The "More" menu opens as a matching floating glass panel
  above the tab bar instead of a full-width bottom sheet. Every page leaves free space at the end
  so its last items can always be scrolled above the floating bar. Works in both light and dark
  mode and respects reduced-motion settings.
- The rest of the UI follows the current iOS look more closely: large 34 pt page titles; inset
  grouped lists with larger rounded corners, no borders or shadows, hairline separators inset to
  the text column and a tap highlight on rows; capsule-shaped primary and secondary buttons,
  filters and search fields (with a magnifier icon); menu-style pickers in Settings; action sheet,
  contact editor and detail dialogs as floating rounded sheets; lighter labels instead of tiny
  black uppercase ones; and a mobile header without the hairline and shadow. In dark mode the page
  background is now true black and inner fills are lighter than the cards they sit on, so cards,
  avatars and inputs no longer blend into each other. The action sheet's cancel button is now
  translated instead of always showing Czech "Zrušit".
- The app icon SVG is minified (same look, smaller file).

### Removed
- Unused components `Calls`, `Sms`, `OutgoingSms` and `SimCards` (not referenced anywhere since
  their features moved into Activity and Lines).
- The GitHub funding links (`.github/FUNDING.yml`).

### Fixed
- The balance in the header no longer shows raw API error text (e.g. "error authentication_failed
  Kč"). The Odorik API returns some errors with HTTP 200, so a balance response is now only
  accepted when it is a number; anything else is treated as an error (an authentication failure
  logs the user out as intended). Error strings cached as the balance by earlier versions are
  ignored, and a missing balance is shown as "—" instead of a bare "Kč".
- `/.well-known/security.txt` returned 404 on GitHub Pages: Jekyll skips dot-directories, so
  `make build` now always creates `docs/.nojekyll` to turn Jekyll off.

## [1.1.1] - 2026-08-17

### Changed
- Contact name/surname/note are no longer joined with invisible zero-width marker characters.
  Those markers get stripped or mangled by some SIP clients and other apps that pass the name
  through, so contacts are now delimited with two plain spaces instead — a convention apps that
  know it can split on or collapse to one space, and apps that don't just see a harmless double
  space (which HTML rendering collapses to one anyway). Existing contacts saved with either the
  older `<b>`/`<i>` tag format or the invisible-marker format keep parsing correctly and switch
  to the new double-space format the next time they're saved. When there's a surname or note but
  no first name, a literal `.` stands in for the blank first name so the leading double space
  can't be trimmed away by something along the way and throw off the split.

## [1.1.0] - 2026-08-17

### Security
- Stored login credentials (`localStorage`, AES-GCM) were encrypted with a key derived purely from
  a hardcoded string baked into the public JS bundle, combined with an all-zero IV reused on every
  encryption — so the "encryption" gave no real confidentiality (the key was derivable from the
  published source) and reusing a nonce under a fixed key is a critical AES-GCM misuse. Credentials
  are now encrypted with a random per-device key (generated once via `crypto.getRandomValues` and
  stored separately from the ciphertext) and a fresh random IV on every save. Credentials saved
  under the old scheme are transparently decrypted once and migrated to the new format.

### Changed
- Contact name/surname/note (company) are no longer joined with visible `<b>`/`<i>` HTML tags in
  the string stored via the Odorik API. They're now delimited with invisible zero-width marker
  characters instead, so the raw name still reads as plain text (no literal tags) anywhere it's
  shown without HTML rendering — on the phone, in other apps, or on the Odorik website itself.
  Existing contacts saved with the old `<b>`/`<i>` format keep parsing correctly and switch to the
  new format the next time they're saved.

### Fixed
- The service worker no longer registers during local development (`vite dev`), only in the
  production build. It was registering unconditionally (and in two places at once — `index.html`
  and `main.tsx`), which meant a browser used for local testing would cache-first every asset
  indefinitely and keep serving a stale JS bundle after source changes, since the dev server
  reuses the already-built `docs/sw.js`. The two registration sites are now consolidated into one,
  guarded by `import.meta.env.PROD`.
- Mobile header no longer slides up under the notch / Dynamic Island / status bar on iPhone when
  scrolled. `position: sticky` re-anchors to the viewport's top edge on scroll, ignoring the
  `env(safe-area-inset-top)` padding `<body>` already accounted for, so the header (and the
  offline banner) would jump into the camera/clock area. Both now offset by
  `env(safe-area-inset-top)` themselves, and a small bar behind the header fills that area with
  the same background so it blends in instead of showing the page background underneath.

## [1.0.0] - 2026-08-07

### Added
- Complete rewrite from the original vanilla-JS `script.js` app into a React 19 + TypeScript +
  Tailwind CSS 4 single-page app (Vite), with contacts, calls, SMS, callback, lines, SIM cards,
  statistics, and settings screens on top of a dedicated Odorik API client.
- Progressive Web App support: manifest, service worker, offline caching, and an app icon, so the
  dashboard can be installed on iPhone and Android and keep working without a connection.
- Offline indicator banner, plus disabling the balance refresh action and redirecting to the login
  screen automatically when the API reports an auth error.
- Pull-to-refresh, route-level code splitting, SEO metadata/sitemap, and accessibility
  improvements, along with a test suite (Vitest).
- Responsive mobile navigation: a bottom tab bar with a "More" menu for less-used sections, and
  sidebar items reordered for the desktop layout.
- 11 languages in total, with a Settings language picker split into "Suggested" (based on system
  language) and "Other" sections, similar to iOS.
- CSV export for activity history (calls/SMS), respecting the active locale.
- Detail view for activity items (calls/SMS) with full call/message information, and per-category
  cache TTL settings (contacts, activity, lines) in Settings.
- PWA update check in Settings, so users are notified when a new version is available.
- Expanded Settings "About" section with license, app details, and a link to the GitHub repo.
- `CNAME` template for GitHub Pages deployment.

### Changed
- Sidebar/bottom-nav items reordered by expected usage frequency.

### Fixed
- Modal and action-sheet positioning on Safari/iOS, by rendering them through a React Portal
  instead of inline in the component tree.
- Selected-language highlight background and picker item border radius in Settings.
- Activity price formatting (handled both string and number API responses) and day-of-week
  localization (now uses the active locale instead of always English).

### Security
- Updated transitive npm dependencies flagged by Dependabot: `undici` 7.29.0 (12 advisories,
  including one high-severity), `postcss` 8.5.26, `js-yaml` 4.3.1, `brace-expansion`
  1.1.18/5.0.9, `vite` 8.2.1, `@babel/core` 7.29.7.
