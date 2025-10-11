#!/bin/bash

# Maxclicks mcp server - Branch Setup Script
# This script sets up the recommended Git branching strategy

set -e

echo "=================================================="
echo "Maxclicks mcp server - Git Branch Setup"
echo "=================================================="
echo ""

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Error: Not a git repository"
    exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 Current branch: $CURRENT_BRANCH"
echo ""

# Check if there are any commits
if ! git log --oneline -1 > /dev/null 2>&1; then
    echo "→ No commits found. Creating initial commit..."
    git add setup-branches.sh
    git commit -m "Initial commit: Add branch setup script"
    echo "✅ Initial commit created"
    echo ""
fi

# Function to create branch if it doesn't exist
create_branch() {
    local branch_name=$1
    local source_branch=$2
    
    if git show-ref --verify --quiet refs/heads/$branch_name; then
        echo "✓ Branch '$branch_name' already exists"
    else
        echo "→ Creating branch '$branch_name' from '$source_branch'"
        git checkout -b $branch_name $source_branch
        git push -u origin $branch_name
        echo "✅ Created and pushed '$branch_name'"
    fi
}

echo "Setting up branch structure..."
echo ""

# Ensure we're on main
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "Switching to main branch..."
    git checkout main
fi

# Pull latest changes
echo "→ Pulling latest changes from main..."
if git ls-remote --heads origin main | grep -q main; then
    git pull origin main
else
    echo "⚠️  Remote 'main' branch not found. Skipping pull."
fi

# Create develop branch
echo ""
echo "1️⃣ Setting up 'develop' branch..."
create_branch "develop" "main"

# Create canary branch
echo ""
echo "2️⃣ Setting up 'canary' branch..."
create_branch "canary" "main"

# Return to original branch or develop
echo ""
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "→ Returning to $CURRENT_BRANCH..."
    git checkout $CURRENT_BRANCH
else
    echo "→ Switching to develop branch..."
    git checkout develop
fi

echo ""
echo "=================================================="
echo "✅ Branch setup complete!"
echo "=================================================="
echo ""
echo "📋 Branch structure:"
echo "   • main     - Production releases (protected)"
echo "   • canary   - Pre-release testing (protected)"
echo "   • develop  - Active development"
echo ""
echo "🔧 Next steps:"
echo "   1. Set up branch protection rules on GitHub:"
echo "      - Go to: Settings > Branches"
echo "      - Protect 'main' and 'canary' branches"
echo ""
echo "   2. Add NPM_TOKEN secret to GitHub:"
echo "      - Go to: Settings > Secrets > Actions"
echo "      - Add: NPM_TOKEN = <your npm token>"
echo ""
echo "   3. Start developing:"
echo "      git checkout develop"
echo "      git checkout -b feature/your-feature"
echo ""
echo "📖 Read BRANCHING_STRATEGY.md for detailed workflow"
echo "=================================================="
