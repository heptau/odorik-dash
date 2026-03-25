# Odorik Dash - Progressive Web App

Modern web application for managing Odorik.cz services (calls, SMS, credits, SIM cards...).

### Features
- 📱 **Progressive Web App** - Installable on iPhone and Android
- ⚡ **Optimized for iOS** - Responsive design, native feel
- 🔒 **Secure authentication** - SIP credentials or API keys
- 💾 **Offline support** - Works without internet (limited functionality)
- 🚀 **Fast** - Built with Vite, React 19, Tailwind CSS

### Installation

```bash
cd /Users/zv/Code/odorik-dash
npm install
npm run dev        # Development
npm run build      # Production build
npm run lint       # ESLint check
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
├── components/    # Reusable components (Button, Card, etc.)
├── pages/        # Page-level components (Login, Dashboard, etc.)
├── services/     # API communication (odorikApi.ts, etc.)
├── hooks/        # Custom React hooks (useAuth, useCallHistory, etc.)
├── types/        # TypeScript interfaces
├── utils/        # Helper functions
├── context/      # Global state (AuthContext, etc.)
└── App.tsx       # Root component
```

### Deployment

```bash
npm run build
# Output is in docs/ - ready for GitHub Pages
```