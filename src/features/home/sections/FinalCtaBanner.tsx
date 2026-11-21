import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Globe2, Route } from 'lucide-react';
import { WaselButton } from '../../../components/wasel-ui/WaselButton';
import { useLanguage } from '../../../contexts/LanguageContext';
import { C } from '../HomePageShared';

interface FinalCtaBannerProps {
  ar: boolean;
  onNavigate: ( path: string, source?: string ) => void;
}

export function FinalCtaBanner({ ar, onNavigate }: FinalCtaBannerProps) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  return (
    <motion.section
      initial={ reduceMotion ? false : 'hidden' }
      whileInView={ reduceMotion ? undefined : 'visible' }
      viewport={ { once: true, margin: '-60px' } }
      transition={ { duration: 0.28, ease: [ 0.4, 0, 0.2, 1 ] } }
      variants={ { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } } }
      className="wasel-home-section"
    >
      <div className="wasel-cta-glow-frame">
        <div className="wasel-cta-glow-inner">
          <div className="wasel-home-cta-banner" style={ { border: 'none', background: 'transparent', boxShadow: 'none' } }>
            <div
              style={ {
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '0.72rem',
                fontWeight: 850,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--primary)',
              } }
            >
              <Globe2 size={ 14 } aria-hidden="true" />
              { t( 'homeSections.coverageKicker' ) }
            </div>
            <h2 className="wasel-home-cta-title">
              { t( 'homeSections.finalCtaTitle' ) }
            </h2>
            <p className="wasel-home-cta-subtitle">
              { t( 'homeSections.finalCtaSubtitle' ) }
            </p>
            <div className="wasel-home-cta-actions">
              <WaselButton
                type="button"
                variant="primary"
                size="lg"
                icon={ <Route size={ 17 } /> }
                iconEnd={ ar ? <ArrowLeft size={ 16 } /> : <ArrowRight size={ 16 } /> }
                onClick={ () => { void onNavigate( '/find-ride', 'final_cta_find' ); } }
                style={ { boxShadow: '0 12px 32px rgba(0,229,255,0.28)' } }
              >
                { t( 'homeSections.finalCtaFind' ) }
              </WaselButton>
              <WaselButton
                type="button"
                variant="outline"
                size="lg"
                icon={ <Globe2 size={ 17 } /> }
                onClick={ () => { void onNavigate( '/app/auth?tab=register', 'final_cta_register' ); } }
                style={ { background: 'var(--secondary)', color: 'var(--foreground)', border: `1px solid ${ 'var(--border)' }` } }
              >
                { t( 'homeSections.finalCtaRegister' ) }
              </WaselButton>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
