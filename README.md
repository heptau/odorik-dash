# Odorik Dash - Progressive Web App

[![GitHub License](https://img.shields.io/github/license/heptau/pgarachne?label=License)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-44%20passed-brightgreen)](https://github.com/heptau/odorik-dash/actions)
[![PWA](https://img.shields.io/badge/PWA-Installable-blue?logo=pwa)](https://odorik-dash.80.cz)

Modern web application for managing Odorik.cz services (calls, SMS, contacts, credits, SIM cards...).

### Features
- 📱 **Progressive Web App** - Installable on iPhone and Android
- ⚡ **Optimized for mobile** - Responsive design, native feel
- 🔒 **Secure authentication** - SIP credentials or API keys
- 💾 **Offline support** - Works without internet (cached data)
- 🌍 **11 languages** - Auto-detects system language
- 🚀 **Fast** - Built with Vite, React 19, Tailwind CSS 4

### Installation

```bash
npm install
npm run dev        # Development server
npm run build      # Production build to docs/
npm run lint       # ESLint check
npm run test       # Run tests
```

### Login

1. **SIP login** - Data for single line only
   - Username: SIP name (e.g. 300100)
   - Password: SIP password

2. **API login** - Access to all lines
   - Username: Odorik.cz registration ID
   - Password: API password (Settings → API password)

### Project Structure
```
src/
├── components/    # React components (Contacts, Calls, Sms, Activity, ...)
├── hooks/         # Custom React hooks (useBalance, useContacts, useActivity, ...)
├── i18n/          # Internationalization
│   └── locales/   # Language files (cs, en, de, es, fr, it, pl, pt, sk, uk, vi)
├── pwa/           # PWA files (manifest, icon, service worker)
├── test/          # Test setup
├── api.ts         # API functions and types
├── App.tsx        # Root component with navigation
└── main.tsx       # Entry point
```

### Deployment

```bash
npm run build
# Output is in docs/ - ready for GitHub Pages
```

### UI Indicators

**Status Badges** (in Lines/SIM cards view):
- `Data` / `LTE` / `Zmeškané` - Toggle status showing current settings
- Green badge = enabled, gray = disabled
- Amber badge (in detail) = change queued for next month

**SIM States**:
- Aktivní (green) = SIM is active
- Pozastavena (red) = SIM is suspended
- Změna... (amber) = change in progress

**Data Usage**:
- Progress bar shows current month consumption
- Color: green (<70%), orange (70-90%), red (>90%)

### Development

- **Tests**: Vitest + @testing-library/react (32 tests)
- **Linting**: ESLint with strict TypeScript mode
- **Type checking**: TypeScript strict mode
