import { WaselSkeleton } from '../../../components/wasel-ui';
import { C, R, SPACE } from '../../../utils/wasel-ds';

export function TrustSkeleton () {
  return (
    <div
      aria-busy="true"
      aria-label="Loading trust center"
      style={ { display: 'grid', gap: SPACE[ 5 ] } }
    >
      <div
        style={ {
          display: 'grid',
          gap: SPACE[ 4 ],
          padding: SPACE[ 5 ],
          borderRadius: R.xxl,
          border: `1px solid ${ C.border }`,
          background: `linear-gradient(180deg, ${ C.card }, rgba(9,22,34,0.92))`,
          boxShadow: '0 1px 0 rgba(0,229,255,0.06)',
        } }
      >
        <div style={ { display: 'grid', gap: 8 } }>
          <WaselSkeleton variant="line" width="60%" />
          <WaselSkeleton variant="line" width="100%" />
        </div>
        <div
          style={ {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: SPACE[ 3 ],
          } }
        >
          { Array.from( { length: 4 } ).map( ( _, index ) => (
            <WaselSkeleton key={ index } variant="card" height={ 80 } />
          ) ) }
        </div>
      </div>

      <div style={ { display: 'grid', gap: SPACE[ 4 ] } }>
        { Array.from( { length: 3 } ).map( ( _, index ) => (
          <WaselSkeleton key={ index } variant="card" height={ 100 } />
        ) ) }
      </div>
    </div>
  );
}

