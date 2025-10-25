# GitHub Actions CI/CD

This directory contains GitHub Actions workflows and automation configuration for svelte-collab.

## 📋 Workflows

### CI Pipeline (`workflows/ci.yml`)

Runs on every push and pull request to `main` and `develop` branches.

**Jobs:**

1. **Lint** 🧹
   - Runs Biome linter and formatter checks
   - Command: `pnpm biome:check`
   - Ensures code style consistency

2. **Type Check** 🔍
   - Runs svelte-check for TypeScript validation
   - Command: `pnpm check`
   - Catches type errors early

3. **Test** 🧪
   - Runs all 38 unit tests
   - Command: `pnpm test`
   - Ensures functionality works correctly

4. **Build** 📦
   - Verifies the package builds successfully
   - Command: `pnpm build`
   - Catches build-time errors

**Configuration:**
- Node.js: 20 LTS
- Package Manager: pnpm v9
- Dependency Caching: Enabled
- Frozen Lockfile: Yes (deterministic installs)

## 🤖 Dependabot (`dependabot.yml`)

Automated dependency updates run weekly.

**Update Groups:**

1. **Svelte** - `svelte*`, `@sveltejs/*`
2. **Y.js** - `yjs`, `y-*`
3. **Vitest** - `vitest*`, `@vitest/*`
4. **Dev Dependencies** - All development dependencies
5. **GitHub Actions** - Workflow action versions

**Benefits:**
- Dependencies stay up to date
- Security patches applied automatically
- Grouped updates reduce PR noise
- Weekly schedule prevents update fatigue

## 🎯 Status Badges

The following badges are displayed in the main README:

- **CI Status** - Shows if the latest commit passes all checks
- **License** - MIT License badge
- **TypeScript** - TypeScript version badge
- **Svelte** - Svelte version badge

## 🚀 Local Development

Run the same checks locally before pushing:

```bash
# Run all checks
pnpm biome:check  # Lint & format
pnpm check        # Type check
pnpm test         # Unit tests
pnpm build        # Build package

# Auto-fix issues
pnpm biome        # Fix lint/format issues
```

## 📊 Workflow Status

You can view workflow runs at:
https://github.com/rajsibajsi/svelte-collab/actions

## 🔧 Customizing Workflows

### Adding New Checks

To add a new check to the CI pipeline:

1. Open `.github/workflows/ci.yml`
2. Add a new job following the existing pattern:

```yaml
new-check:
  name: New Check
  runs-on: ubuntu-latest
  steps:
    - name: Checkout code
      uses: actions/checkout@v4
    # ... add your steps
```

### Changing Trigger Branches

Edit the `on` section in `ci.yml`:

```yaml
on:
  push:
    branches: [main, develop, feature/*]
  pull_request:
    branches: [main, develop]
```

### Adjusting Dependabot

Edit `dependabot.yml`:

```yaml
- package-ecosystem: "npm"
  directory: "/"
  schedule:
    interval: "daily"  # Change from weekly to daily
```

## 🎓 Best Practices

1. **Always run checks locally first** - Don't rely on CI to catch issues
2. **Keep workflows fast** - Use caching and parallelization
3. **Review Dependabot PRs** - Don't auto-merge, test updates first
4. **Monitor workflow runs** - Fix failing checks immediately
5. **Update actions regularly** - Keep GitHub Actions versions current

## 📚 Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [pnpm in CI](https://pnpm.io/continuous-integration)
- [Workflow Syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)

---

**Questions?** Open an issue or check the [main README](../README.md).

