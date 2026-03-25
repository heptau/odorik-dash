# Contributing to Odorik Dash

## Development Workflow

1. **Fork and clone**
2. Create feature branch: `git checkout -b feature/my-feature`
3. Make commits: `git commit -m "feat: description"`
4. Push: `git push origin feature/my-feature`
5. Open Pull Request

## Code Conventions

### Git commits
```
feat: add new feature
fix: fix bug
docs: documentation
style: formatting (no logic changes)
refactor: refactoring
test: tests
chore: build, deps, etc.
```

### TypeScript
- ✅ No `any` - always define types
- ✅ `strict: true` in tsconfig.json
- ✅ Naming: `camelCase` for variables/functions, `PascalCase` for components

### React Components
- Functional components with hooks
- Prop types in TypeScript interface
- Each component in separate file
- JSDoc comments for public components

### Tailwind CSS
- Mobile-first responsive design
- No inline styles
- Reusable classes in `@apply` if repeated

### Tests
```bash
npm test              # Run tests
npm run coverage      # Coverage report
```

## Release Workflow

1. Update `package.json` version (semver)
2. Update CHANGELOG
3. Tag: `git tag v1.2.3`
4. Push: `git push origin main --tags`
5. GitHub Actions deploy to GitHub Pages

## API Communication

- All API calls go through `src/services/odorikApi.ts`
- Always error handling
- 30s timeout
- Retry logic for critical requests