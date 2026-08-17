# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
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
