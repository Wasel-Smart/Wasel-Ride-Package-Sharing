#!/usr/bin/env bash

# 🎯 MAINTENANCE CHECKLIST: Weekly Ritual for 10/10 Repository
#
# This checklist ensures your repository stays at world-class quality.
# Complete this weekly to maintain 10/10 rating and catch issues early.
#
# Time commitment: 30-45 minutes per week
# Run every: Monday morning
#
# Complete items in order. If any fail, escalate immediately.

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Config
REPO="Wasel-Smart/Wasel-Ride-Package-Sharing"
LOG_FILE="maintenance-$(date +%Y-%m-%d).log"

echo -e "${PURPLE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║    🏗️  Weekly Maintenance Checklist             ║${NC}"
echo -e "${PURPLE}║    Wasel Repository Health Check                ║${NC}"
echo -e "${PURPLE}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo "Run date: $(date)"
echo "Logging to: $LOG_FILE"
echo ""

# Initialize checklist
declare -A CHECKS
CHECKS[total]=0
CHECKS[passed]=0
CHECKS[failed]=0
CHECKS[warnings]=0

function log_check() {
    local status=$1
    local name=$2
    local details=$3
    
    ((CHECKS[total]++))
    
    case $status in
        PASS)
            echo -e "  ${GREEN}✅ PASS${NC} : $name"
            ((CHECKS[passed]++))
            ;;
        FAIL)
            echo -e "  ${RED}❌ FAIL${NC} : $name"
            if [ -n "$details" ]; then
                echo -e "         $details"
            fi
            ((CHECKS[failed]++))
            ;;
        WARN)
            echo -e "  ${YELLOW}⚠️  WARN${NC} : $name"
            if [ -n "$details" ]; then
                echo -e "         $details"
            fi
            ((CHECKS[warnings]++))
            ;;
        INFO)
            echo -e "  ${BLUE}ℹ️  INFO${NC} : $name"
            if [ -n "$details" ]; then
                echo "         $details"
            fi
            ;;
    esac
}

# ============================================
# SECTION 1: Code Quality
# ============================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📋 Section 1: Code Quality${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 1.1: TypeScript strict mode
if npm run check:ts-strict 2>/dev/null >/dev/null; then
    log_check "PASS" "TypeScript strict mode"
else
    log_check "FAIL" "TypeScript strict mode" "Run: npm run check:ts-strict --fix"
fi

# 1.2: Linting
if npm run lint 2>/dev/null >/dev/null; then
    log_check "PASS" "ESLint validation"
else
    log_check "WARN" "ESLint found issues" "Run: npm run lint:fix"
fi

# 1.3: Format checking
if npm run format:check 2>/dev/null >/dev/null; then
    log_check "PASS" "Code formatting"
else
    log_check "WARN" "Code formatting issues" "Run: npm run format"
fi

# 1.4: Test coverage
if npm run test:coverage 2>/dev/null | grep -q "100%"; then
    log_check "PASS" "Test coverage (100%)"
elif npm run test:coverage 2>/dev/null | grep -q "8[0-9]%"; then
    log_check "WARN" "Test coverage" "Target: >85%, consider adding more tests"
else
    log_check "FAIL" "Test coverage" "Below 80%, please improve"
fi

echo ""

# ============================================
# SECTION 2: Build & Dependencies
# ============================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📦 Section 2: Build & Dependencies${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 2.1: Production build
if npm run build 2>/dev/null >/dev/null; then
    log_check "PASS" "Production build"
else
    log_check "FAIL" "Production build" "Run: npm run build"
fi

# 2.2: Bundle size
if npm run size 2>/dev/null >/dev/null; then
    log_check "PASS" "Bundle size check"
else
    log_check "WARN" "Bundle size exceeds limits" "Run: npm run size:why"
fi

# 2.3: Dependency vulnerabilities
VULN_COUNT=$(npm audit --json 2>/dev/null | grep -o '"vulnerabilities":{[^}]*}' | grep -o '[0-9]\+' | head -1 || echo "0")
if [ "$VULN_COUNT" -eq 0 ]; then
    log_check "PASS" "Security vulnerabilities" "None found"
else
    log_check "WARN" "Security vulnerabilities" "Found $VULN_COUNT issues. Run: npm audit"
fi

# 2.4: Outdated dependencies
OUTDATED=$(npm outdated 2>/dev/null | tail -n +2 | wc -l)
if [ "$OUTDATED" -eq 0 ]; then
    log_check "PASS" "Dependency updates" "All current"
else
    log_check "INFO" "Outdated dependencies" "$OUTDATED packages available. Consider updating."
fi

echo ""

# ============================================
# SECTION 3: Repository Health
# ============================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🏥 Section 3: Repository Health${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 3.1: Open PRs
OPEN_PRS=$(gh pr list --repo "$REPO" --state open 2>/dev/null | wc -l)
if [ "$OPEN_PRS" -le 2 ]; then
    log_check "PASS" "Open PRs" "Count: $OPEN_PRS (target: 0-2)"
elif [ "$OPEN_PRS" -le 5 ]; then
    log_check "WARN" "Open PRs" "Count: $OPEN_PRS (getting high)"
else
    log_check "FAIL" "Open PRs" "Count: $OPEN_PRS (ACTION REQUIRED)"
fi

# 3.2: Open issues
OPEN_ISSUES=$(gh issue list --repo "$REPO" --state open 2>/dev/null | wc -l)
if [ "$OPEN_ISSUES" -le 5 ]; then
    log_check "PASS" "Open issues" "Count: $OPEN_ISSUES"
else
    log_check "INFO" "Open issues" "Count: $OPEN_ISSUES (review & triage)"
fi

# 3.3: Stale branches
STALE_BRANCHES=$(git branch -r --merged | wc -l)
log_check "INFO" "Stale branches" "$STALE_BRANCHES (cleanup if needed)"

# 3.4: Commit frequency
LAST_COMMIT=$(git log -1 --format="%ai" 2>/dev/null | cut -d' ' -f1)
DAYS_SINCE=$(( ($(date +%s) - $(date -d "$LAST_COMMIT" +%s)) / 86400 ))
if [ "$DAYS_SINCE" -le 7 ]; then
    log_check "PASS" "Recent activity" "Last commit $DAYS_SINCE days ago"
else
    log_check "WARN" "Recent activity" "Last commit $DAYS_SINCE days ago"
fi

echo ""

# ============================================
# SECTION 4: CI/CD Pipeline
# ============================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}⚙️  Section 4: CI/CD Pipeline${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 4.1: GitHub Actions status
if [ -d ".github/workflows" ]; then
    WF_COUNT=$(ls .github/workflows/*.yml 2>/dev/null | wc -l)
    log_check "PASS" "GitHub Actions" "$WF_COUNT workflows configured"
else
    log_check "FAIL" "GitHub Actions" "No workflows found"
fi

# 4.2: Branch protection
log_check "INFO" "Branch protection" "Verify in Settings → Branches"

# 4.3: Auto-merge enabled
log_check "INFO" "Auto-merge" "Verify in Settings → Pull Requests"

echo ""

# ============================================
# SECTION 5: Documentation
# ============================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📚 Section 5: Documentation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 5.1: README exists
if [ -f "README.md" ]; then
    log_check "PASS" "README.md exists"
else
    log_check "FAIL" "README.md missing"
fi

# 5.2: CONTRIBUTING.md exists
if [ -f "CONTRIBUTING.md" ]; then
    log_check "PASS" "CONTRIBUTING.md exists"
else
    log_check "WARN" "CONTRIBUTING.md missing"
fi

# 5.3: SECURITY.md exists
if [ -f "SECURITY.md" ]; then
    log_check "PASS" "SECURITY.md exists"
else
    log_check "WARN" "SECURITY.md missing"
fi

# 5.4: LICENSE exists
if [ -f "LICENSE" ] || [ -f "LICENSE.md" ] || grep -q "license" package.json 2>/dev/null; then
    log_check "PASS" "License configured"
else
    log_check "WARN" "License not found"
fi

echo ""

# ============================================
# SECTION 6: Tasks
# ============================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}✅ Action Items for This Week${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Review PRs
if [ "$OPEN_PRS" -gt 2 ]; then
    echo -e "  ${YELLOW}1. Review & merge open PRs${NC}"
    echo "     → $OPEN_PRS PRs open, target is 0-2"
    echo "     → Command: gh pr list --state open --repo $REPO"
    echo ""
fi

# Triage issues
if [ "$OPEN_ISSUES" -gt 10 ]; then
    echo -e "  ${YELLOW}2. Triage & prioritize issues${NC}"
    echo "     → $OPEN_ISSUES issues open"
    echo "     → Label and close duplicates"
    echo ""
fi

# Update dependencies
if [ "$OUTDATED" -gt 0 ]; then
    echo -e "  ${YELLOW}3. Update dependencies${NC}"
    echo "     → $OUTDATED packages outdated"
    echo "     → Run: npm outdated"
    echo ""
fi

# Fix vulnerabilities
if [ "$VULN_COUNT" -gt 0 ]; then
    echo -e "  ${RED}4. FIX SECURITY VULNERABILITIES${NC}"
    echo "     → $VULN_COUNT vulnerabilities found"
    echo "     → Run: npm audit fix"
    echo ""
fi

echo ""

# ============================================
# SUMMARY
# ============================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

PASS_RATE=$(( CHECKS[passed] * 100 / CHECKS[total] ))

echo "Total Checks: ${CHECKS[total]}"
echo -e "  ${GREEN}✅ Passed: ${CHECKS[passed]}${NC}"
echo -e "  ${YELLOW}⚠️  Warnings: ${CHECKS[warnings]}${NC}"
echo -e "  ${RED}❌ Failed: ${CHECKS[failed]}${NC}"
echo ""

if [ "${CHECKS[failed]}" -eq 0 ]; then
    echo -e "${GREEN}🎉 Repository Status: HEALTHY (${PASS_RATE}%)${NC}"
    EXIT_CODE=0
else
    echo -e "${RED}⚠️  Repository Status: ISSUES FOUND (${PASS_RATE}%)${NC}"
    EXIT_CODE=1
fi

echo ""
echo "Next maintenance: $(date -d 'next Monday' '+%A, %B %d')"
echo ""

# Save to log
{
    echo "Maintenance Run: $(date)"
    echo "Passed: ${CHECKS[passed]}"
    echo "Warnings: ${CHECKS[warnings]}"
    echo "Failed: ${CHECKS[failed]}"
    echo "Pass Rate: ${PASS_RATE}%"
} >> "$LOG_FILE"

echo "Logged to: $LOG_FILE"
echo ""

exit $EXIT_CODE
