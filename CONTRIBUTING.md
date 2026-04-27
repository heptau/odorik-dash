# Contributing to Odorik Dash

## Development Setup

```bash
# Clone the repository
git clone https://github.com/your-repo/odorik-dash.git
cd odorik-dash

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm run test

# Build for production
npm run build
```

## Code Style

This project uses **EditorConfig** to maintain consistent code formatting. Please ensure your editor has EditorConfig support enabled.

### EditorConfig Settings

The `.editorconfig` file defines:
- **Indentation**: Tabs (3 spaces per tab)
- **Line endings**: LF (Unix-style)
- **Charset**: UTF-8
- **Trim trailing whitespace**: Yes
- **Insert final newline**: Yes

### VS Code Setup

If you use VS Code, install the [EditorConfig extension](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig) to automatically apply these settings.

### Other Editors

- **IntelliJ IDEA / WebStorm**: Native support (Settings → Editor → Code Style → Enable EditorConfig)
- **Sublime Text**: Install [EditorConfig](https://github.com/sindresorhus/EditorConfig) package
- **Atom**: Install [editorconfig](https://github.com/sindresorhus/atom-editorconfig) package

## Commit Messages

- Use English for all commit messages
- Keep messages concise and descriptive
- Start with a verb in imperative mood (e.g., "Add feature", "Fix bug", "Update documentation")

## Pull Requests

1. Create a branch from `main`
2. Make your changes
3. Run tests: `npm run test`
4. Run linting: `npm run lint`
5. Build: `npm run build`
6. Submit a pull request

## Testing

Run tests before submitting:

```bash
npm run test        # Run all tests
npm run test:watch  # Run tests in watch mode
```

## Building

```bash
npm run build
```

The build output is in `docs/` directory, ready for GitHub Pages deployment.