import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { trackGrowthEvent } from '../../../services/growthEngine';
import { parseFindRideParams } from '../../../pages/waselCorePageHelpers';
import { RIDE_SEARCHES_KEY } from '../../../pages/waselCoreRideData';
import { readStoredStringList, writeStoredStringList } from '../../../pages/waselCoreStorage';
import { useLocalAuth } from '../../../contexts/LocalAuth';
import { ALL_CITIES } from '../../../utils/validation';

const DEFAULT_FROM = 'Baghdad';
const DEFAULT_TO = 'Basra';

export function useRideSearch() {
  const location = useLocation();
  const { user } = useLocalAuth();
  const { initialFrom, initialTo, initialDate, initialSearched } = parseFindRideParams(
    location.search,
  );

  const [from, setFrom] = useState(initialFrom || DEFAULT_FROM);
  const [to, setTo] = useState(initialTo || DEFAULT_TO);
  const [date, setDate] = useState(initialDate);
  const [searched, setSearched] = useState(initialSearched);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>(() =>
    readStoredStringList(RIDE_SEARCHES_KEY),
  );

  // Sync URL params → state when the URL changes (e.g. back/forward navigation)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextFrom = params.get('from') ?? '';
    const nextTo = params.get('to') ?? '';
    if (nextFrom) setFrom(nextFrom);
    if (nextTo) setTo(nextTo);
    const nextDate = params.get('date') ?? '';
    const nextSearched = params.get('search') === '1';
    setDate(nextDate);
    setSearched(nextSearched);
  }, [location.search]);

  // Persist recent searches
  useEffect(() => {
    writeStoredStringList(RIDE_SEARCHES_KEY, recentSearches);
  }, [recentSearches]);

  const handleSearch = useCallback(() => {
    if (from === to) {
      setSearchError('Please choose different cities for departure and destination.');
      setSearched(false);
      return;
    }
    setSearchError(null);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSearched(true);
      setRecentSearches(prev => {
        const label = `${from} to ${to}${date ? ` on ${date}` : ''}`;
        return [label, ...prev.filter(item => item !== label)].slice(0, 4);
      });
      void trackGrowthEvent({
        userId: user?.id,
        eventName: 'ride_search_executed',
        funnelStage: 'searched',
        serviceType: 'ride',
        from,
        to,
        metadata: { date: date || null },
      });
    }, 700);
  }, [from, to, date, user?.id]);

  return {
    from,
    setFrom,
    to,
    setTo,
    date,
    setDate,
    searched,
    setSearched,
    loading,
    searchError,
    setSearchError,
    recentSearches,
    handleSearch,
    cities: ALL_CITIES,
  };
}
