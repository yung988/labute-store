# 🚨 CRITICAL DEVELOPER NOTES - YEEZUZ2020 Store

## ⚠️ PACKAGE MANAGER REQUIREMENT

**THIS PROJECT EXCLUSIVELY USES PNPM - NO EXCEPTIONS**

### ✅ ALWAYS USE:
```bash
pnpm install
pnpm add [package]
pnpm add -D [package]
pnpm remove [package]
pnpm dev
pnpm build
pnpm start
```

### ❌ NEVER USE:
```bash
npm install     # ❌ FORBIDDEN
npm i           # ❌ FORBIDDEN  
yarn install    # ❌ FORBIDDEN
yarn add        # ❌ FORBIDDEN
npm run dev     # ❌ FORBIDDEN
```

## 🤖 FOR AI AGENTS:

When working on this project, you MUST:

1. **Always use `pnpm` commands** - Never suggest or use npm/yarn
2. **Check for pnpm-lock.yaml** - This is the lockfile, not package-lock.json
3. **Install pnpm first** if not available: `npm install -g pnpm`
4. **Use pnpm for all operations** - installing, adding, removing, running scripts

## 🔧 Why pnpm?

- **Disk efficiency** - Shared dependency storage
- **Faster installs** - Symlinked dependencies  
- **Strict dependency resolution** - Prevents phantom dependencies
- **Monorepo support** - Better workspace handling
- **Consistent lockfile** - pnpm-lock.yaml format

## 🚀 Quick Commands Reference

```bash
# Project setup
pnpm install                    # Install all dependencies

# Development  
pnpm dev                       # Start dev server
pnpm build                     # Build for production
pnpm start                     # Start production server
pnpm lint                      # Run linting

# Package management
pnpm add [package]             # Add runtime dependency
pnpm add -D [package]          # Add dev dependency
pnpm remove [package]          # Remove dependency
pnpm update                    # Update dependencies
pnpm outdated                  # Check for outdated packages

# Email system
pnpm dev                       # Then visit /preview/* for email templates
```

## 📁 Important Files

- `pnpm-lock.yaml` - Lockfile (commit this!)
- `package.json` - Dependencies and scripts
- `.npmrc` - pnpm configuration (if exists)

## 🛡️ Protection

If you see these files, it means someone used the wrong package manager:
- `package-lock.json` ❌ DELETE THIS
- `yarn.lock` ❌ DELETE THIS  
- `node_modules/.yarn-integrity` ❌ DELETE THIS

Then run: `pnpm install` to regenerate proper lockfile.

## 🔍 Verification

To verify pnpm is working correctly:

```bash
# Check pnpm version
pnpm --version

# Verify lockfile exists
ls -la pnpm-lock.yaml

# Check store location
pnpm store path
```

## 🆘 Emergency Recovery

If project is broken due to wrong package manager use:

```bash
# 1. Delete everything
rm -rf node_modules
rm -f package-lock.json yarn.lock

# 2. Clean install with pnpm
pnpm install

# 3. Verify it works
pnpm dev
```

---

**Remember: PNPM ONLY - This is not optional! 🔒**