import { getMapProvider, type MapRouteCoordinate, type MapTileKind, type MapProviderTheme } from '@/platform';

export class MapProviderGateway {
  readonly provider = getMapProvider();

  fetchPointsOfInterest(type: 'mosque', bounds: string) {
    return this.provider.fetchPointsOfInterest?.(type, bounds) ?? Promise.resolve([]);
  }

  fetchRoutePath(points: MapRouteCoordinate[]) {
    return this.provider.fetchRoutePath?.(points) ?? Promise.resolve(points);
  }

  resolveTiles(kind: MapTileKind, theme: MapProviderTheme) {
    return this.provider.resolveTiles(kind, theme);
  }
}
