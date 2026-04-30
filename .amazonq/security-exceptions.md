# Security Scan Exceptions

## Third-Party Library Issues

### @supabase/auth-js (v2.104.0)

**Status**: Accepted Risk - Third-party dependency  
**Last Reviewed**: 2025-04-22

#### Issue 1: Array delete usage
- **File**: `.eval-dist/assets/js/supabase-auth-B6aeF5KH.js:2`
- **Code**: `javascript-instead-of-delete-use-array-splice`
- **Severity**: Medium
- **Description**: Items removed from an array using `delete` can cause `undefined` holes
- **Mitigation**: This is in the minified Supabase auth library. We monitor for updates and will upgrade when a fix is available.

#### Issue 2: Redundant switch statements
- **File**: `.eval-dist/assets/js/supabase-auth-B6aeF5KH.js:17-18`
- **Code**: `javascript-redundant-switch-statement`
- **CWE**: CWE-705
- **Severity**: Medium
- **Description**: Redundant switch statement detected
- **Mitigation**: This is in the minified Supabase auth library. The code is functionally correct but could be optimized. We monitor for updates.

## Review Schedule

These exceptions should be reviewed:
- When upgrading `@supabase/supabase-js` dependency
- Quarterly security review
- Before major production releases

## Monitoring

- Track Supabase releases: https://github.com/supabase/supabase-js/releases
- Security advisories: https://github.com/supabase/supabase-js/security/advisories
