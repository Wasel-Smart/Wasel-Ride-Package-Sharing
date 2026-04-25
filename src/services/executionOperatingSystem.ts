export type ExecutionMaturityLevel = 'baseline' | 'standardized' | 'managed' | 'optimized';

export interface ExecutionOwner {
  domain: string;
  accountableRole: string;
  scope: string;
  successMetric: string;
}

export interface ExecutionKpi {
  id: string;
  title: string;
  area: 'product' | 'operations' | 'engineering' | 'commercial';
  definition: string;
  target: string;
  cadence: 'weekly' | 'biweekly' | 'monthly';
  source: string;
}

export interface ExecutionCadence {
  title: string;
  frequency: string;
  purpose: string;
  requiredInputs: string[];
  mandatoryOutputs: string[];
}

export interface ExecutionPlaybook {
  title: string;
  owner: string;
  trigger: string;
  exitCriteria: string[];
}

export interface ContinuousImprovementLoop {
  phase: string;
  objective: string;
  deliverable: string;
}

export interface ExecutionOperatingSystemSnapshot {
  maturityScore: number;
  maturityLevel: ExecutionMaturityLevel;
  targetScore: number;
  executionPrinciples: string[];
  owners: ExecutionOwner[];
  kpis: ExecutionKpi[];
  cadences: ExecutionCadence[];
  playbooks: ExecutionPlaybook[];
  improvementLoop: ContinuousImprovementLoop[];
  enforcementRules: string[];
}

export function getExecutionOperatingSystemSnapshot(): ExecutionOperatingSystemSnapshot {
  return {
    maturityScore: 6.5,
    maturityLevel: 'managed',
    targetScore: 10,
    executionPrinciples: [
      'No feature starts without an owner, KPI, source of truth, and acceptance criteria.',
      'No release ships without verification gates and rollback clarity.',
      'No incident closes without root-cause notes and follow-up ownership.',
      'Leadership reviews delivery with the same discipline used for strategy.',
    ],
    owners: [
      {
        domain: 'Rides and corridor liquidity',
        accountableRole: 'Product + marketplace owner',
        scope: 'Search, booking, route fill rate, corridor activation',
        successMetric: 'Search-to-book conversion and repeat corridor usage',
      },
      {
        domain: 'Packages and backhaul',
        accountableRole: 'Operations owner',
        scope: 'Package matching, tracking, return-lane adoption',
        successMetric: 'Package request-to-match conversion',
      },
      {
        domain: 'Wallet and monetization',
        accountableRole: 'Commercial owner',
        scope: 'Wallet reliability, corridor passes, and payment health',
        successMetric: 'Recurring corridor revenue',
      },
      {
        domain: 'Trust and safety',
        accountableRole: 'Trust owner',
        scope: 'Verification, support, dispute quality, gated actions',
        successMetric: 'Verification completion and support resolution time',
      },
      {
        domain: 'Engineering delivery',
        accountableRole: 'Tech owner',
        scope: 'Type safety, release quality, incidents, CI health',
        successMetric: 'Type-check debt count and release failure rate',
      },
    ],
    kpis: [
      {
        id: 'ride-conversion',
        title: 'Ride conversion',
        area: 'product',
        definition: 'Searches that become bookings on target corridors',
        target: '>= 18% weekly',
        cadence: 'weekly',
        source: 'Growth events + ride lifecycle',
      },
      {
        id: 'package-match-rate',
        title: 'Package match rate',
        area: 'operations',
        definition: 'Created package requests matched to live rides',
        target: '>= 70% weekly',
        cadence: 'weekly',
        source: 'Journey logistics + package tracking',
      },
      {
        id: 'wallet-fallback-rate',
        title: 'Wallet fallback rate',
        area: 'engineering',
        definition: 'Wallet reads served from direct backend bypasses',
        target: '< 5% weekly',
        cadence: 'weekly',
        source: 'Wallet reliability metadata',
      },
      {
        id: 'sync-error-rate',
        title: 'Sync error rate',
        area: 'engineering',
        definition: 'Ride/package records left in sync-error state',
        target: '< 1% weekly',
        cadence: 'weekly',
        source: 'Ride and journey sync states',
      },
      {
        id: 'recurring-revenue',
        title: 'Recurring corridor revenue',
        area: 'commercial',
        definition: 'Revenue from travel plans, corridor passes, and managed contracts',
        target: 'Growing month over month',
        cadence: 'monthly',
        source: 'Wallet subscriptions + commercial corridor engine',
      },
      {
        id: 'type-check-debt',
        title: 'Type-check debt',
        area: 'engineering',
        definition: 'Open TypeScript strictness failures blocking clean verification',
        target: '0',
        cadence: 'biweekly',
        source: 'CI type-check run',
      },
    ],
    cadences: [
      {
        title: 'Weekly delivery review',
        frequency: 'Every week',
        purpose: 'Inspect progress, blockers, and KPI drift across domains',
        requiredInputs: ['Owner status', 'KPI trend', 'release/incident status'],
        mandatoryOutputs: ['Red/yellow/green summary', 'next-week commitments', 'owner escalations'],
      },
      {
        title: 'Biweekly improvement cycle',
        frequency: 'Every 2 weeks',
        purpose: 'Identify one operational bottleneck and standardize the fix',
        requiredInputs: ['Bottleneck analysis', 'root cause', 'impact estimate'],
        mandatoryOutputs: ['Implemented fix', 'measured result', 'updated playbook'],
      },
      {
        title: 'Monthly commercial review',
        frequency: 'Every month',
        purpose: 'Track corridor monetization, contracts, and plan adoption',
        requiredInputs: ['Recurring revenue', 'contract health', 'pass adoption'],
        mandatoryOutputs: ['Commercial priority list', 'contract expansion decisions'],
      },
    ],
    playbooks: [
      {
        title: 'Feature delivery playbook',
        owner: 'Product + Tech',
        trigger: 'New feature or major scope change',
        exitCriteria: ['Owner assigned', 'KPI defined', 'verification passed', 'release note captured'],
      },
      {
        title: 'Incident and reliability playbook',
        owner: 'Tech owner',
        trigger: 'Outage, sync degradation, or critical regression',
        exitCriteria: ['Impact assessed', 'mitigation shipped', 'root cause documented', 'follow-up scheduled'],
      },
      {
        title: 'Commercial rollout playbook',
        owner: 'Commercial owner',
        trigger: 'New corridor pass, contract lane, or pricing change',
        exitCriteria: ['Revenue metric defined', 'billing path verified', 'owner signoff captured'],
      },
      {
        title: 'Design system change playbook',
        owner: 'Design owner',
        trigger: 'Shared UI pattern or token change',
        exitCriteria: ['Shared pattern updated', 'feature reuse mapped', 'visual regression checked'],
      },
    ],
    improvementLoop: [
      {
        phase: 'Measure',
        objective: 'Identify the bottleneck with data instead of intuition',
        deliverable: 'Single named bottleneck and baseline KPI',
      },
      {
        phase: 'Diagnose',
        objective: 'Confirm root cause and source of truth conflict',
        deliverable: 'Root-cause note with owner',
      },
      {
        phase: 'Implement',
        objective: 'Ship the smallest durable fix',
        deliverable: 'Code, process, or policy change',
      },
      {
        phase: 'Standardize',
        objective: 'Turn the fix into repeatable delivery behavior',
        deliverable: 'Updated playbook or checklist',
      },
    ],
    enforcementRules: [
      'No release with failing verification gates.',
      'No ownerless initiative in the delivery tracker.',
      'No KPI-free strategic priority.',
      'No unresolved red status older than one review cycle without escalation.',
    ],
  };
}
