const fs = require('fs');
const path = require('path');

// Refactor BusPage.tsx to use extracted components
const busPagePath = 'src/features/bus/BusPage.tsx';
let content = fs.readFileSync(busPagePath, 'utf8');

// 1. Add component imports after the existing imports
const importBlock = `import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeftRight,
  ArrowRight,
  Award,
  Bus,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  MapPin,
  Route,
  Shield,
  TimerReset,
  Users,
} from 'lucide-react';
import { MapWrapper } from '../../components/MapWrapper';
import { useLocalAuth } from '../../contexts/LocalAuth';
import {
  createBusBooking,
  fetchBusRoutes,
  getOfficialBusRoutes,
  type BusRoute,
} from '../../services/bus';
import { createSupportTicket } from '../../services/supportInbox';
import { notificationsAPI } from '../../services/notifications.js';
import {
  CITIES,
  CoreExperienceBanner,
  DS,
  midpoint,
  PageShell,
  pill,
  Protected,
  r,
  resolveCityCoord,
  SectionHead,
} from '../shared/pageShared';
import { ServiceFlowPlaybook } from '../shared/ServiceFlowPlaybook';
import { C, SH } from '../../utils/wasel-ds';
import { tx } from '../../locales/tx';
import { useLanguage } from '../../contexts/LanguageContext';`;

const componentImport = `import {
  BusBookingForm,
  BusMap,
  BusRouteList,
  BusSchedule,
} from './components';`;

content = content.replace(importBlock, importBlock + '\n' + componentImport);

// 2. Remove helper functions that moved to components
const helpersToRemove = [
  `function getScheduleTimes(route: BusRoute) {
  return route.departureTimes?.length ? route.departureTimes : [route.dep];
}

function toMinutes(time: string) {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
}

function isExactRoute(route: BusRoute, from: string, to: string) {
  return route.from === from && route.to === to;
}

function getRouteStatus(route: BusRoute, tripDate: string, today: string, ar: boolean) {
  if (tripDate !== today) {
    return {
      label: ar ? 'مجدولة' : 'Scheduled',
      detail: route.scheduleDays ?? (ar ? 'جدول منشور' : 'Published schedule'),
      color: DS.cyan,
    };
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const times = getScheduleTimes(route)
    .map(toMinutes)
    .sort((a, b) => a - b);
  const next = times.find(minutes => minutes >= currentMinutes);

  if (next === undefined) {
    return { label: ar ? 'مغلق اليوم' : 'Closed today', detail: ar ? 'لا توجد مغادرات أخرى اليوم' : 'No more departures left today', color: DS.gold };
  }

  const minutesAway = next - currentMinutes;
  if (minutesAway <= 15) {
    return { label: ar ? 'الصعود قريباً' : 'Boarding soon', detail: ar ? \`\${minutesAway} دقيقة للمغادرة\` : \`\${minutesAway} min to departure\`, color: DS.green };
  }
  if (minutesAway <= 60) {
    return {
      label: ar ? 'مغادرة خلال الساعة' : 'Departing this hour',
      detail: ar ? \`\${minutesAway} دقيقة للمغادرة\` : \`\${minutesAway} min to departure\`,
      color: DS.cyan,
    };
  }

  return {
    label: ar ? 'لاحقاً اليوم' : 'Later today',
    detail: ar ? \`\${minutesAway} دقيقة للمغادرة التالية\` : \`\${minutesAway} min to the next departure\`,
    color: DS.cyan,
  };
}
`,
];

helpersToRemove.forEach(helper => {
  content = content.replace(helper, '');
});

// 3. Remove unused icon imports from lucide-react that are only used in extracted sections
const unusedIcons = ['Award', 'Bus', 'Calendar', 'MapPin', 'Route', 'Shield', 'TimerReset', 'Users'];
unusedIcons.forEach(icon => {
  content = content.replace(new RegExp(`  ${icon},\\n`, 'g'), '');
});
// Also remove from multi-line imports
content = content.replace(/,\n  Award\n/, '\n');
content = content.replace(/,\n  Bus\n/, '\n');
content = content.replace(/,\n  Calendar\n/, '\n');
content = content.replace(/,\n  MapPin\n/, '\n');
content = content.replace(/,\n  Route\n/, '\n');
content = content.replace(/,\n  Shield\n/, '\n');
content = content.replace(/,\n  TimerReset\n/, '\n');
content = content.replace(/,\n  Users\n/, '\n');

// Clean up empty lines in import block
content = content.replace(/,\n  (\w+),\n}/, (match, icon) => {
  return `\n  ${icon},\n}`;
});

// 4. Replace route cards JSX block with BusRouteList component
const routeCardsStart = content.indexOf('          <div\n            style={{');
// Find the route cards section by looking for the busRoutes.map pattern
const routeCardsPattern = /<div\s+style=\{\{\s+display:\s+'flex',\s+flexDirection:\s+'column',\s+gap:\s+14\s+\}\}>\s+\{busRoutes\.map\(\(route, index\)\s*=>\s*\{[\s\S]*?<\/div>\s+\}\)}\s+<\/div>/;

const routeCardsMatch = content.match(routeCardsPattern);
if (routeCardsMatch) {
  const busRoutesMapBlock = routeCardsMatch[0];
  content = content.replace(busRoutesMapBlock, `<BusRouteList
            routes={busRoutes}
            selectedId={selected}
            onSelect={(id) => { setSelected(id); setBookingComplete(false); setBookingSource(null); }}
            origin={origin}
            destination={destination}
            tripDate={tripDate}
            today={today}
            ar={ar}
            onBookingComplete={() => setBookingComplete(false)}
          />`);
}

// 5. Replace booking form sidebar with BusBookingForm component
const bookingFormStart = content.indexOf('          <div\n            className="sp-side-column"');
if (bookingFormStart > -1) {
  // Find the end of the sidebar (before ServiceFlowPlaybook or closing divs)
  const sidebarEnd = content.indexOf('        </div>\n        </div>\n\n        <ServiceFlowPlaybook', bookingFormStart);
  if (sidebarEnd > -1) {
    const sidebarBlock = content.substring(bookingFormStart, sidebarEnd);
    content = content.replace(sidebarBlock, `<BusBookingForm
            activeBus={activeBus}
            scheduleMode={scheduleMode}
            setScheduleMode={setScheduleMode}
            selectedDeparture={selectedDeparture}
            setSelectedDeparture={setSelectedDeparture}
            departureTimes={departureTimes}
            passengers={passengers}
            setPassengers={setPassengers}
            seatPreference={seatPreference}
            setSeatPreference={setSeatPreference}
            tripDate={tripDate}
            today={today}
            totalPrice={totalPrice}
            bookingDisabled={bookingDisabled}
            bookingBusy={bookingBusy}
            bookingComplete={bookingComplete}
            bookingTicketCode={bookingTicketCode}
            bookingSource={bookingSource}
            handleBusBooking={handleBusBooking}
            openBusSupport={openBusSupport}
            ar={ar}
          />`);
  }
}

fs.writeFileSync(busPagePath, content);
console.log('BusPage.tsx refactored');
