const fs = require('fs');
const path = 'src/features/trust/TrustCenterPage.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add component imports
const importBlock = `import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import {
  confirmTrustPhoneVerification,
  enableTrustDriverMode,
  getTrustCenterStatus,
  resendTrustEmailConfirmation,
  startTrustPhoneVerification,
  submitTrustDriverDocuments,
  submitTrustIdentityVerification,
} from '../../services/trustCenter';
import {
  buildFallbackTrustCenterStatus,
  type TrustCenterStatus,
  type TrustStepId,
  type TrustStepState,
} from '../../services/trustCenterModel';
import { evaluateTrustCapability } from '../../services/trustRules';
import { C, F, R, SH, SPACE, TYPE } from '../../utils/wasel-ds';`;

const componentImport = `import {
  ReviewQueue,
  TrustScoreDisplay,
  VerificationSteps,
} from './components';`;

content = content.replace(importBlock, importBlock + '\n' + componentImport);

// Replace trust score JSX with TrustScoreDisplay component
const trustScorePattern = /<div\s+style=\{\{\s+display:\s+'flex',\s+alignItems:\s+'center',\s+justifyContent:\s+'center',\s+gap:\s+12\s+\}\}>\s+<div\s+style=\{\{\s+width:\s+80,\s+height:\s+80[^}]+\}\}\s+fontSize:\s+'1\.5rem',\s+fontWeight:\s+800\s+\}\}>\s+\{user\.trustScore\}\s+<\/div>\s+<div\s+style=\{\{\s+fontWeight:\s+700\s+\}\}>\s+\{t\('trustCenterExpanded\.trustScore'\)\}\s+<\/div>\s+<\/div>/;

const trustScoreMatch = content.match(trustScorePattern);
if (trustScoreMatch) {
  content = content.replace(trustScoreMatch[0], `<TrustScoreDisplay score={user.trustScore} label={t('trustCenterExpanded.trustScore')} />`);
}

fs.writeFileSync(path, content);
console.log('TrustCenterPage.tsx refactored');
