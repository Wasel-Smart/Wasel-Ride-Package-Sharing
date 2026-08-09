const fs = require('fs');
const path = 'src/features/trust/TrustCenterPage.tsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(
  "import { TrustScoreDisplay } from './components';",
  "import { ReviewQueue, TrustScoreDisplay, VerificationSteps } from './components';"
);
fs.writeFileSync(path, content);
console.log('Fixed imports');
