#!/bin/bash

# Wasel | واصل — Build Fix Script
# Automatically fixes the build and verifies it works

set -e  # Exit on any error

echo ""
echo "🔧 Wasel Build Fix Script"
echo "=========================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Install dependencies
echo -e "${YELLOW}📦 Step 1: Installing dependencies...${NC}"
echo ""
npm install
echo ""
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 2: Type check
echo -e "${YELLOW}🔍 Step 2: Running TypeScript type check...${NC}"
echo ""
npm run type-check
echo ""
echo -e "${GREEN}✅ Type check passed${NC}"
echo ""

# Step 3: Build
echo -e "${YELLOW}🏗️  Step 3: Building production bundle...${NC}"
echo ""
npm run build
echo ""
echo -e "${GREEN}✅ Build completed successfully${NC}"
echo ""

# Step 4: Verify dist directory
echo -e "${YELLOW}📂 Step 4: Verifying build output...${NC}"
echo ""

if [ ! -d "dist" ]; then
  echo -e "${RED}❌ Error: /dist directory not found${NC}"
  exit 1
fi

if [ ! -f "dist/index.html" ]; then
  echo -e "${RED}❌ Error: /dist/index.html not found${NC}"
  exit 1
fi

if [ ! -d "dist/assets" ]; then
  echo -e "${RED}❌ Error: /dist/assets directory not found${NC}"
  exit 1
fi

echo "   ✓ /dist directory exists"
echo "   ✓ /dist/index.html exists"
echo "   ✓ /dist/assets directory exists"

# Count JS files
JS_COUNT=$(find dist/assets -name "*.js" | wc -l)
echo "   ✓ Found ${JS_COUNT} JavaScript bundles"

# Count CSS files
CSS_COUNT=$(find dist/assets -name "*.css" | wc -l)
echo "   ✓ Found ${CSS_COUNT} CSS files"

echo ""
echo -e "${GREEN}✅ Build output verified${NC}"
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 SUCCESS! Build is now working!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Build Statistics:"
echo "   • Total JS files: ${JS_COUNT}"
echo "   • Total CSS files: ${CSS_COUNT}"
echo "   • Output directory: /dist"
echo ""
echo "🚀 Next Steps:"
echo "   1. Test the build locally:"
echo "      npm run preview"
echo ""
echo "   2. Deploy to production:"
echo "      npm run deploy"
echo ""
echo "   3. Analyze bundle size:"
echo "      npm run analyze"
echo ""
echo "📚 Documentation:"
echo "   • Full details: /BUILD_FIXED.md"
echo "   • Quick reference: /BUILD_FIX_SUMMARY.md"
echo ""
