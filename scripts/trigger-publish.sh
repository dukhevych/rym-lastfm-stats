#!/bin/sh

# Require at least 1 arg (target), others have defaults
if [ $# -lt 1 ]; then
  echo "❌ Usage: $0 <target> [release_type=unlisted] [dry_run=true]"
  echo "   Example: $0 firefox"
  echo "   Example: $0 chrome beta false"
  exit 1
fi

TARGET=$1                     # required: firefox | chrome
RELEASE_TYPE=${2:-unlisted}   # default: unlisted
DRY_RUN=${3:-true}            # default: true

BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Workflow file based on target
if [ "$TARGET" = "firefox" ]; then
  WORKFLOW_FILE=".github/workflows/publish-firefox-extension.yml"
elif [ "$TARGET" = "chrome" ]; then
  WORKFLOW_FILE=".github/workflows/publish-chrome-extension.yml"
else
  echo "❌ Unknown target: $TARGET (must be 'firefox' or 'chrome')"
  exit 1
fi

echo "🚀 Triggering $TARGET publish"
echo "🔀 Branch:       $BRANCH"
echo "📦 Release type: $RELEASE_TYPE"
echo "🧪 Dry run:      $DRY_RUN"
echo "📄 Workflow:     $WORKFLOW_FILE"

gh workflow run "$WORKFLOW_FILE" \
  --repo dukhevych/rym-lastfm-stats \
  --ref "$BRANCH" \
  --field dry_run="$DRY_RUN" \
  --field release_type="$RELEASE_TYPE"
