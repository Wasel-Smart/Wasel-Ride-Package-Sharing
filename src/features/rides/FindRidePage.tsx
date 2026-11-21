/**
 * FindRidePage — pure render shell.
 *
 * All state, effects and business logic live in useFindRideController.
 * Layout uses .wsl-* CSS utility classes; zero inline style={} here.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { Brain, CheckCircle2, Network, Search, Sparkles, TrendingUp } from 'lucide-react';
import { MapWrapper } from '../../components/MapWrapper';
import { PageShell, Protected, SectionHead, midpoint } from '../../pages/waselServiceShared';
import { } from '../../utils/wasel-ds';
import { WaselButton, WaselInput, WaselSelect } from '../../components/wasel-ui';
import { CITIES } from '../../pages/waselCoreRideData';
import { getMovementPriceQuote } from '../../services/movementPricing';
import { ServiceFlowPlaybook } from '../shared/ServiceFlowPlaybook';
import { BookingStatusBanners } from './components/BookingStatusBanners';
import { FindRideCard } from './components/FindRideCard';
import { FindRidePackagePanel } from './components/FindRidePackagePanel';
import { FindRideTripDetailModal } from './components/FindRideTripDetailModal';
import { useFindRideController } from './hooks/useFindRideController';

export function FindRidePage() {
  const ctrl = useFindRideController();
  const {
    nav, ar, t, copy, DS,
    tab, setTab,
    from, to, date, searched, setFrom, setTo, setDate, setSearched,
    searchFromCoord, searchToCoord,
    inventoryLoading, inventoryError, setInventoryRefreshKey,
    results, sort, setSort,
    corridorRides, nearbyCorridors, recommendedRides, bookedRides,
    routeIntelligence, selectedSignal, featuredSignals, selectedPriceQuote,
    bookedRideIds, selectedBooking, bookingInFlightId,
    searchError, bookingMessage, bookingSuccess, waitlistMessage, retentionMessage,
    setBookingSuccess,
    savedReminders, recurringSuggestions, demandStats,
    getRouteReminderForCorridor, formatRouteReminderSchedule,
    marketplaceNodes, pkg, setPkg,
    statCards, intelligenceLines, corridorPlan,
    handleSearch, handleOpenRide, handleBook,
    handleDemandCapture, handleSaveReminder,
    getRideBookingStatus, openMyTrips, resolveSignalForRoute,
  } = ctrl;

  return (
    <Protected>
      <PageShell>
        <SectionHead
          emoji={<Search size={24} />}
          title={ar ? 'احجز مشوار' : 'Book a Ride'}
          sub={copy.pageSub}
          action={{ label: copy.pageAction, onClick: () => nav('/app/offer-ride') }}
        />

        {/* Active bookings banner */}
        {bookedRideIds.size > 0 && (
          <div className="wsl-banner-green">
            <div className="wsl-row">
              <CheckCircle2 size={16} color={DS.green} />
              <span style={{ color: 'var(--foreground)', fontSize: '0.84rem', fontWeight: 700 }}>
                {bookedRideIds.size} active booking{bookedRideIds.size > 1 ? 's' : ''} in progress
              </span>
            </div>
            <WaselButton onClick={() => { void openMyTrips(); }} variant="outline" size="sm">
              View in My Trips
            </WaselButton>
          </div>
        )}

        {/* Tab switcher */}
        <div className="wsl-grid-2" style={{ marginBottom: '1.5rem' }}>
          {(['ride', 'package'] as const).map((key, i) => (
            <WaselButton
              key={key}
              onClick={() => { void setTab(key); }}
              variant={tab === key ? 'primary' : 'outline'}
            >
              {[copy.tabRide, copy.tabPackage][i]}
            </WaselButton>
          ))}
        </div>

        {tab === 'ride' && (
          <>
            {/* Search card */}
            <div className="wsl-card" style={{ marginBottom: '1.375rem' }}>
              <div className="wsl-search-grid">
                {[
                  { label: t.from, value: from, setter: setFrom, key: 'from' as const },
                  { label: t.to,   value: to,   setter: setTo,   key: 'to'   as const },
                ].map(field => (
                  <div key={field.key}>
                    <label htmlFor={`find-ride-${field.key}`} className="wsl-label">{field.label}</label>
                    <WaselSelect
                      id={`find-ride-${field.key}`}
                      value={field.value}
                      onChange={field.setter}
                      options={CITIES.map(city => ({ value: city, label: city }))}
                      containerStyle={{ gap: 0 }}
                      style={{ height: 46, paddingLeft: 42 }}
                    />
                  </div>
                ))}
                <div>
                  <label htmlFor="find-ride-date" className="wsl-label">{t.date}</label>
                  <WaselInput
                    id="find-ride-date"
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    style={{ height: 46 }}
                  />
                </div>
              </div>

              {searchError && (
                <p role="alert" style={{ color: DS.gold, fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                  {searchError}
                </p>
              )}

              <WaselButton onClick={handleSearch} fullWidth variant="primary">
                {inventoryLoading ? (
                  <span
                    role="status"
                    aria-label={t.searching}
                    style={{
                      width: 20, height: 20,
                      border: `2px solid ${'var(--border)'}`,
                      borderTop: `2px solid ${'var(--foreground)'}`,
                      borderRadius: '50%',
                      display: 'inline-block',
                    }}
                  />
                ) : (
                  <Search size={18} />
                )}
                {inventoryLoading ? t.searching : t.searchRides}
              </WaselButton>

              {inventoryError && (
                <div role="alert" className="wsl-banner-warn">
                  <span>
                    <strong>{copy.inventoryErrorTitle}.</strong> {copy.inventoryErrorDescription}
                  </span>
                  <WaselButton
                    type="button" variant="outline" size="sm"
                    disabled={inventoryLoading}
                    onClick={() => setInventoryRefreshKey(k => k + 1)}
                  >
                    {inventoryLoading ? t.searching : copy.retryInventory}
                  </WaselButton>
                </div>
              )}

              {/* Route preview + map */}
              <div className="wsl-card2" style={{ marginTop: '0.875rem' }}>
                <div className="wsl-row-between" style={{ marginBottom: '0.625rem' }}>
                  <div>
                    <p className="wsl-caption" style={{ margin: '0 0 0.25rem' }}>{t.routePreview}</p>
                    <p className="wsl-subtext" style={{ margin: 0 }}>
                      {selectedSignal
                        ? t.routeActivity(selectedSignal.liveSearches, selectedSignal.liveBookings, selectedSignal.activeDemandAlerts)
                        : t.selectRouteSignals}
                    </p>
                  </div>
                  {selectedSignal && (
                    <span className="wsl-pill wsl-pill-green">
                      {selectedSignal.forecastDemandScore}/100 {t.demandScore}
                    </span>
                  )}
                </div>
                <MapWrapper
                  mode="static"
                  center={midpoint(searchFromCoord, searchToCoord)}
                  pickupLocation={searchFromCoord}
                  dropoffLocation={searchToCoord}
                  height={180}
                  showMosques={false}
                  showRadars={false}
                />
              </div>
            </div>

            <BookingStatusBanners
              bookingMessage={bookingMessage}
              bookingSuccess={bookingSuccess}
              retentionMessage={retentionMessage}
              onDismissSuccess={() => setBookingSuccess(null)}
              onOpenMyTrips={openMyTrips}
              openMyTripsLabel={t.openMyTrips}
              keepBrowsingLabel={t.keepBrowsing}
            />

            {/* Stat cards 2×2 */}
            <div className="wsl-grid-2" style={{ marginTop: '0.875rem', marginBottom: '1.125rem' }}>
              {statCards.map(card => (
                <div key={card.label} className="wsl-card2">
                  <div className="wsl-caption">{card.label}</div>
                  <div className="wsl-value" style={{ color: card.tone }}>{card.value}</div>
                  <div className="wsl-subtext">{card.sub}</div>
                </div>
              ))}
            </div>

            {/* Results header */}
            <div className="wsl-row-between" style={{ marginBottom: '1rem' }}>
              <h2 className="wsl-heading" style={{ fontSize: '0.95rem', margin: 0 }}>
                {searched
                  ? t.resultsTitle(from, to, results.length)
                  : t.popularRoutesTitle(results.length)}
              </h2>
              {selectedSignal && (
                <div className="wsl-micro">
                  {t.bestPrice(selectedSignal.priceQuote.finalPriceJod)} · {t.nextDeparture(selectedSignal.nextWaveWindow)}
                </div>
              )}
              <div className="wsl-row" style={{ gap: '0.375rem' }}>
                {(['price', 'time', 'rating'] as const).map((key, i) => (
                  <WaselButton
                    key={key}
                    onClick={() => { void setSort(key); }}
                    variant={sort === key ? 'primary' : 'outline'}
                    size="sm"
                  >
                    {[t.cheapest, t.earliest, t.topRated][i]}
                  </WaselButton>
                ))}
              </div>
            </div>

            {/* Results list */}
            <div className="wsl-results-col">
              <AnimatePresence>
                {inventoryLoading ? (
                  <motion.div
                    key="ride-inventory-loading"
                    role="status" aria-live="polite" aria-label={t.searching}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="wsl-card"
                    style={{ textAlign: 'center', padding: '2rem 1.5rem', color: DS.sub }}
                  >
                    {t.searching}
                  </motion.div>
                ) : results.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="wsl-card"
                    style={{ padding: '3.75rem 1.5rem', textAlign: 'center' }}
                  >
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }} aria-hidden="true">
                      {copy.noResultsIcon}
                    </div>
                    <h3 className="wsl-heading" style={{ marginBottom: '0.5rem' }}>
                      {inventoryError ? copy.inventoryErrorTitle : t.noRidesFound}
                    </h3>
                    <p className="wsl-subtext">
                      {inventoryError ? copy.inventoryErrorDescription : t.noRideYet(selectedSignal?.nextWaveWindow)}
                    </p>
                    <div className="wsl-grid-2" style={{ marginTop: '1.125rem' }}>
                      <WaselButton
                        onClick={() => { setDate(''); setSearched(true); }}
                        variant="outline"
                      >
                        {t.clearDateFilter}
                      </WaselButton>
                      <WaselButton
                        onClick={() => nav(`/app/bus?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)}
                        variant="gold"
                      >
                        {t.openBusFallback}
                      </WaselButton>
                    </div>
                    <WaselButton
                      onClick={() => { void handleDemandCapture(); }}
                      fullWidth variant="outline"
                      style={{ marginTop: '0.625rem' }}
                    >
                      {copy.notifyMe}
                    </WaselButton>
                    {(waitlistMessage || demandStats.active > 0) && (
                      <p className="wsl-subtext" style={{ marginTop: '0.75rem' }}>
                        {waitlistMessage ?? t.activeAlerts(demandStats.active)}
                      </p>
                    )}
                    {nearbyCorridors.length > 0 && (
                      <div style={{ marginTop: '1.25rem', textAlign: 'left' }}>
                        <div className="wsl-heading" style={{ marginBottom: '0.625rem' }}>
                          {t.nearbyCorridors}
                        </div>
                        <div className="wsl-grid-auto">
                          {nearbyCorridors.map(ride => (
                            <WaselButton
                              key={ride.id}
                              onClick={() => { void handleOpenRide(ride); }}
                              variant="outline"
                              style={{ textAlign: 'left', padding: '0.75rem 0.875rem', height: 'auto', justifyContent: 'stretch' }}
                            >
                              <div className="wsl-row-between">
                                <div>
                                  <div style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: '0.84rem' }}>
                                    {ride.from} to {ride.to}
                                  </div>
                                  <div className="wsl-micro">{ride.time} | {ride.driver.name}</div>
                                </div>
                                <span className={`wsl-pill ${ride.seatsAvailable > 0 ? 'wsl-pill-cyan' : 'wsl-pill-gold'}`}>
                                  {ride.seatsAvailable > 0
                                    ? t.formatCurrency(getMovementPriceQuote({
                                        basePriceJod: ride.pricePerSeat,
                                        corridorId: resolveSignalForRoute(ride.from, ride.to)?.id,
                                        forecastDemandScore: resolveSignalForRoute(ride.from, ride.to)?.forecastDemandScore,
                                        membership: routeIntelligence.membership,
                                      }).finalPriceJod)
                                    : t.soldOut}
                                </span>
                              </div>
                            </WaselButton>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  results.map((ride, index) => (
                    <FindRideCard
                      key={ride.id}
                      ride={ride}
                      idx={index}
                      bookingStatus={getRideBookingStatus(ride.id)}
                      signal={resolveSignalForRoute(ride.from, ride.to)}
                      onOpen={() => handleOpenRide(ride)}
                      onOpenBooking={openMyTrips}
                    />
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* Intelligence + Popular corridors + Marketplace nodes */}
            <div className="wsl-two-col">
              {/* Intelligence panel */}
              <div className="wsl-panel">
                <div className="wsl-row" style={{ marginBottom: '0.75rem' }}>
                  <div className="wsl-icon-wrap wsl-icon-wrap-cyan">
                    <Brain size={18} color={DS.cyan} />
                  </div>
                  <div>
                    <div className="wsl-heading">{t.whyRouteFits}</div>
                    <div className="wsl-micro">{t.demandSignalsFor(from, to)}</div>
                  </div>
                </div>
                <div className="wsl-grid-auto">
                  {intelligenceLines.map(line => (
                    <div key={line} className="wsl-card2" style={{ fontSize: '0.82rem', lineHeight: 1.65, color: 'var(--foreground)' }}>
                      {line}
                    </div>
                  ))}
                </div>
                <div className="wsl-row" style={{ marginTop: '0.75rem', flexWrap: 'wrap' }}>
                  {(corridorPlan?.movementLayers ?? ['people', 'goods', 'services']).map(layer => (
                    <span key={layer} className="wsl-pill wsl-pill-green">
                      <Sparkles size={10} /> {layer}
                    </span>
                  ))}
                </div>
              </div>

              <div className="wsl-col">
                {/* Popular corridors */}
                <div className="wsl-panel">
                  <div className="wsl-row" style={{ marginBottom: '0.75rem' }}>
                    <div className="wsl-icon-wrap wsl-icon-wrap-gold">
                      <TrendingUp size={18} color={DS.gold} />
                    </div>
                    <div>
                      <div className="wsl-heading">{t.popularRoutesHeading}</div>
                      <div className="wsl-micro">{t.strongestDemandOutlook}</div>
                    </div>
                  </div>
                  <div className="wsl-grid-auto">
                    {featuredSignals.map(corridor => (
                      <WaselButton
                        key={corridor.id}
                        onClick={() => { setFrom(corridor.from); setTo(corridor.to); setSearched(true); }}
                        variant="outline"
                        style={{ textAlign: 'left', padding: '0.75rem 0.875rem', height: 'auto', justifyContent: 'stretch' }}
                      >
                        <div className="wsl-row-between">
                          <div>
                            <div style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: '0.84rem' }}>{corridor.label}</div>
                            <div className="wsl-micro">
                              {t.demandScore} {corridor.forecastDemandScore} | {t.formatCurrency(corridor.priceQuote.finalPriceJod)} | {corridor.routeOwnershipScore} {t.ownershipScore}
                            </div>
                          </div>
                          <span className="wsl-pill wsl-pill-cyan">{corridor.pricePressure}</span>
                        </div>
                      </WaselButton>
                    ))}
                  </div>
                </div>

                {/* Marketplace nodes */}
                <div className="wsl-panel">
                  <div className="wsl-row" style={{ marginBottom: '0.75rem' }}>
                    <div className="wsl-icon-wrap wsl-icon-wrap-green">
                      <Network size={18} color={DS.green} />
                    </div>
                    <div>
                      <div className="wsl-heading">{t.ridesCarryPackages}</div>
                      <div className="wsl-micro">{t.ridesAcceptParcels}</div>
                    </div>
                  </div>
                  <div className="wsl-grid-auto">
                    {marketplaceNodes.map(node => (
                      <div key={node.id} className="wsl-card2">
                        <div style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: '0.82rem' }}>{node.title}</div>
                        <div className="wsl-micro" style={{ lineHeight: 1.55 }}>{node.summary}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Reminders */}
            <div className="wsl-two-col">
              {/* Suggested reminders */}
              <div className="wsl-panel">
                <div className="wsl-heading" style={{ marginBottom: '0.75rem' }}>{t.suggestedReminders}</div>
                {recurringSuggestions.length > 0 ? (
                  <div className="wsl-grid-auto">
                    {recurringSuggestions.map(suggestion => {
                      const alreadySaved = Boolean(getRouteReminderForCorridor(suggestion.corridorId));
                      return (
                        <div key={suggestion.corridorId} className="wsl-card2">
                          <div className="wsl-row-between">
                            <div>
                              <div style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: '0.84rem' }}>{suggestion.label}</div>
                              <div className="wsl-micro">
                                {suggestion.confidenceScore}/100 | {t.formatCurrency(suggestion.priceQuote.finalPriceJod)} | {t.weeklySignals(suggestion.weeklyFrequency)}
                              </div>
                            </div>
                            <span className="wsl-pill wsl-pill-green">{suggestion.recommendedFrequency}</span>
                          </div>
                          <p className="wsl-subtext" style={{ marginTop: '0.5rem' }}>{suggestion.reason}</p>
                          <div className="wsl-row" style={{ marginTop: '0.625rem', flexWrap: 'wrap' }}>
                            <WaselButton
                              onClick={() => { setFrom(suggestion.from); setTo(suggestion.to); setSearched(true); }}
                              variant="outline" size="sm"
                            >
                              {t.searchRouteButton}
                            </WaselButton>
                            <WaselButton
                              onClick={() => { void handleSaveReminder(suggestion.corridorId); }}
                              variant={alreadySaved ? 'gold' : 'primary'} size="sm"
                            >
                              {alreadySaved ? t.reminderActive : t.saveReminder}
                            </WaselButton>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="wsl-subtext">{t.bookMoreForReminders}</p>
                )}
              </div>

              {/* Saved reminders */}
              <div className="wsl-panel">
                <div className="wsl-heading" style={{ marginBottom: '0.75rem' }}>{t.savedReminders}</div>
                {savedReminders.length > 0 ? (
                  <div className="wsl-grid-auto">
                    {savedReminders.slice(0, 4).map(reminder => (
                      <div key={reminder.id} className="wsl-card-sm">
                        <div style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: '0.8rem' }}>{reminder.label}</div>
                        <div className="wsl-micro">{formatRouteReminderSchedule(reminder)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="wsl-subtext" style={{ lineHeight: 1.55 }}>{t.saveRouteForReminders}</p>
                )}
              </div>
            </div>

            {/* Best matches + Recent searches + Booked trips */}
            <div className="wsl-two-col">
              <div className="wsl-panel">
                <div className="wsl-heading" style={{ marginBottom: '0.75rem' }}>{t.bestRideMatches}</div>
                <div className="wsl-grid-auto">
                  {recommendedRides.map(ride => {
                    const rideSignal     = resolveSignalForRoute(ride.from, ride.to);
                    const ridePriceQuote = getMovementPriceQuote({
                      basePriceJod: ride.pricePerSeat,
                      corridorId: rideSignal?.id,
                      forecastDemandScore: rideSignal?.forecastDemandScore,
                      membership: routeIntelligence.membership,
                    });
                    return (
                      <WaselButton
                        key={ride.id}
                        onClick={() => { void handleOpenRide(ride); }}
                        variant="outline"
                        style={{ textAlign: 'left', padding: '0.75rem 0.875rem', height: 'auto', justifyContent: 'stretch' }}
                      >
                        <div className="wsl-row-between">
                          <div>
                            <div style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: '0.84rem' }}>{ride.from} to {ride.to}</div>
                            <div className="wsl-micro">
                              {ride.time} | {ride.driver.name} | {rideSignal ? `${rideSignal.routeOwnershipScore}/100 ${t.ownershipScore}` : ride.car}
                            </div>
                          </div>
                          <span className={`wsl-pill ${bookedRideIds.has(ride.id) ? 'wsl-pill-green' : 'wsl-pill-cyan'}`}>
                            {bookedRideIds.has(ride.id) ? t.booked : t.formatCurrency(ridePriceQuote.finalPriceJod)}
                          </span>
                        </div>
                      </WaselButton>
                    );
                  })}
                </div>
              </div>

              <div className="wsl-col">
                {[
                  {
                    title: t.recentSearches,
                    items: recentSearches.map((label, i) => ({ key: `search-${i}-${label}`, label })),
                    empty: t.searchHelp,
                    clickable: true,
                  },
                  {
                    title: t.bookedTrips,
                    items: bookedRides.map(ride => ({
                      key: `booked-${ride.id}`,
                      label: `${ride.from} to ${ride.to} | ${ride.time} | ${ride.driver.name}`,
                    })),
                    empty: t.noTripsYet,
                    clickable: false,
                  },
                ].map(card => (
                  <div key={card.title} className="wsl-panel">
                    <div className="wsl-heading" style={{ marginBottom: '0.75rem' }}>{card.title}</div>
                    {card.items.length > 0 ? (
                      <div className="wsl-grid-auto">
                        {card.items.map(item => (
                          <button
                            key={item.key}
                            type="button"
                            className="wsl-clickable-row"
                            onClick={() => {
                              if (!card.clickable) { openMyTrips(); return; }
                              const parts = item.label.split(' to ');
                              if (parts[0]) setFrom(parts[0]);
                              const toPart = parts[1]?.split(' on ')[0];
                              if (toPart) setTo(toPart);
                              setSearched(true);
                            }}
                          >
                            <span>{item.label}</span>
                            <Search size={12} color={DS.muted} />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="wsl-subtext">{card.empty}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === 'package' && (
          <FindRidePackagePanel ar={ar} copy={copy} t={t} pkg={pkg} setPkg={setPkg} />
        )}

        <ServiceFlowPlaybook focusService={tab === 'ride' ? 'find-ride' : 'send-package'} />

        {/* Detail modal */}
        {ctrl.selected && (
          <FindRideTripDetailModal
            ride={ctrl.selected}
            bookingStatus={
              selectedBooking &&
              (selectedBooking.status === 'pending_driver' || selectedBooking.status === 'confirmed')
                ? selectedBooking.status
                : null
            }
            signal={resolveSignalForRoute(ctrl.selected.from, ctrl.selected.to)}
            isBooking={bookingInFlightId === ctrl.selected.id}
            onClose={() => ctrl.setSelected(null)}
            onBook={() => { void handleBook(ctrl.selected!); }}
            onOpenBooking={openMyTrips}
          />
        )}
      </PageShell>
    </Protected>
  );
}

export default FindRidePage;

