import type { CountryCode, RegionConfig } from './types';
import { JORDAN } from './data/jo';
import { EGYPT } from './data/eg';
import { SAUDI_ARABIA } from './data/sa';
import { UAE } from './data/ae';
import { KUWAIT } from './data/kw';
import { BAHRAIN } from './data/bh';
import { QATAR } from './data/qa';
import { OMAN } from './data/om';
import { LEBANON } from './data/lb';
import { PALESTINE } from './data/ps';
import { MOROCCO } from './data/ma';
import { TUNISIA } from './data/tn';
import { IRAQ } from './data/iq';

export const REGIONS: Record<CountryCode, RegionConfig> = {
  JO: JORDAN,
  EG: EGYPT,
  SA: SAUDI_ARABIA,
  AE: UAE,
  KW: KUWAIT,
  BH: BAHRAIN,
  QA: QATAR,
  OM: OMAN,
  LB: LEBANON,
  PS: PALESTINE,
  MA: MOROCCO,
  TN: TUNISIA,
  IQ: IRAQ,
};

