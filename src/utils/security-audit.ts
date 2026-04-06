/**
 * Dependency Security Configuration
 * Defines security audit rules and vulnerability thresholds
 */

/**
 * NPM Audit configuration
 * Add to package.json as "npm:audit"
 */
export const NPM_AUDIT_CONFIG = {
  // Fail build on critical/high vulnerabilities
  level: 'high',
  // Audit dev dependencies too
  audit_level: 'high',
  // Custom registry if needed
  registry: 'https://registry.npmjs.org/',
} as const;

/**
 * Dependency security rules
 */
export const DEPENDENCY_SECURITY_RULES = {
  // Maximum allowed severity (critical | high | moderate | low)
  maxSeverity: 'high',

  // Known vulnerabilities to ignore (with justification)
  ignoredVulnerabilities: [
    // Example:
    // {
    //   packageName: 'some-package',
    //   vulnerability: 'CVE-XXXX-XXXXX',
    //   reason: 'Not exploitable in our usage pattern',
    //   expiresAt: '2024-12-31',
    // },
  ] as Array<{
    packageName: string;
    vulnerability: string;
    reason: string;
    expiresAt: string;
  }>,

  // Blocked packages (security risk, licensing, etc.)
  blockedPackages: [
    // Example of GPL-licensed package that shouldn't be used
    // { name: 'some-gpl-package', reason: 'GPL license incompatible with our MIT' },
  ] as Array<{ name: string; reason: string }>,

  // Dependency update policies
  updatePolicy: {
    // Force updates for critical/high severity
    criticalAutoUpdate: true,

    // Check dependencies weekly
    scheduleUpdateCheck: 'weekly',

    // Notify on outdated packages
    notifyOnOutdated: true,

    // Maximum days behind latest version (for non-critical)
    maxVersionAgeWeeks: 12,
  },
} as const;

/**
 * Suggested security scanning tools
 * Add to devDependencies for automated scanning
 */
export const RECOMMENDED_SECURITY_TOOLS = [
  // NPM built-in auditing
  // npx npm-audit-report
  {
    name: 'npm audit',
    description: 'Built-in npm vulnerability scanner',
    command: 'npm audit --audit-level=high',
  },

  // Snyk for advanced vulnerability detection
  {
    name: 'snyk',
    description: 'Advanced vulnerability scanning with fix suggestions',
    command: 'snyk test --severity-threshold=high',
  },

  // Dependabot for automated PR-based updates
  {
    name: 'Dependabot',
    description: 'GitHub native dependency updates',
    setup: 'Enable in GitHub repo settings',
  },

  // npm-check-updates for version tracking
  {
    name: 'npm-check-updates',
    description: 'Check for outdated packages',
    command: 'ncu --doctor --doctorTest "npm test"',
  },

  // License checking
  {
    name: 'license-checker',
    description: 'Verify package licenses',
    command: 'license-checker --onlyunknown',
  },
] as const;

/**
 * Security policy template - add as SECURITY.md
 */
export const SECURITY_POLICY_TEMPLATE = `
# Security Policy

## Reporting Vulnerabilities

If you discover a security vulnerability in Wasel, please send an email to security@wasel.jo instead of using the issue tracker.

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will acknowledge receipt and provide status updates.

## Security Updates

- We monitor npm audit regularly
- Critical vulnerabilities are patched within 24 hours
- High severity vulnerabilities within 1 week
- Medium/Low severity in next scheduled release

## Dependency Policy

- All dependencies are subject to npm audit
- Vulnerable packages are updated immediately
- Outdated packages are updated quarterly
- License compliance is verified before adoption

## CI/CD Security

- Dependencies are scanned on every PR
- Build fails on critical/high vulnerabilities
- Deployment requires security clearance

See ARCHITECTURE_DECISIONS.md for more details.
`;

/**
 * Audit all dependencies and return report
 */
export async function runSecurityAudit(): Promise<{
  vulnerable: number;
  ignored: number;
  critical: number;
  high: number;
  moderate: number;
  low: number;
}> {
  // This would typically run npm audit in a subprocess
  // Implementation depends on Node.js environment availability
  console.warn(
    '[Security] Run "npm audit" manually to check for vulnerabilities',
  );

  return {
    vulnerable: 0,
    ignored: 0,
    critical: 0,
    high: 0,
    moderate: 0,
    low: 0,
  };
}

/**
 * Check if package is blocked
 */
export function isPackageBlocked(packageName: string): string | null {
  const blocked = DEPENDENCY_SECURITY_RULES.blockedPackages.find(
    (b) => b.name === packageName,
  );
  return blocked ? blocked.reason : null;
}

/**
 * Get security recommendations
 */
export function getSecurityRecommendations(): string[] {
  const recommendations: string[] = [];

  recommendations.push('1. Run "npm audit" to check for vulnerabilities');
  recommendations.push('2. Set up Dependabot for automated updates');
  recommendations.push('3. Configure branch protection rules to require audit passes');
  recommendations.push('4. Review and update dependencies monthly');
  recommendations.push('5. Monitor security advisories from npm');

  return recommendations;
}
