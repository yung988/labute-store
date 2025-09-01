#!/bin/bash

# Get target files/directories from arguments
TARGETS="$@"

if [ -z "$TARGETS" ]; then
  echo "No targets specified. Will clean entire project."
  TARGETS="."
fi

echo "🔍 Running typecheck..."
pnpm typecheck || { echo "❌ Typecheck failed!"; exit 1; }

echo "🔧 Running ESLint fixes..."
pnpm lint:fix || { echo "❌ ESLint fix failed!"; exit 1; }

echo "✨ Running Prettier on specified targets..."
pnpm format "$TARGETS" || { echo "❌ Prettier failed!"; exit 1; }

echo "✅ Code cleanup complete!"