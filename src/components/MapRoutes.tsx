export function MapRoutes({ routes }: { routes: Array<{ id: string; path: Array<[number, number]> }> }) {
  return (
    <>
      {routes.map(route => (
        <div key={route.id} style={{ display: 'none' }}>
          {route.path.length} points
        </div>
      ))}
    </>
  );
}
