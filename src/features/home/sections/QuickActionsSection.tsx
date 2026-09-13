import { motion } from 'framer-motion';
import { ArrowRight, Route } from 'lucide-react';
import { ArrowLeft, ArrowRight, Layers, Sparkles } from 'lucide-react';
import type { QuickAction } from './types';
import { tx } from '../../../locales/tx';
import { useLanguage } from '../../../contexts/LanguageContext';
import { C } from '../HomePageShared';

interface QuickActionsSectionProps {
  quickActions: QuickAction[];
  onNavigate: ( path: string, source?: string ) => void;
}

export function QuickActionsSection ( { quickActions, onNavigate }: QuickActionsSectionProps ) {
  const { language } = useLanguage();
  const ar = language === 'ar';

  return (
    <motion.section initial={ false } className="wasel-home-section">
      <div className="wasel-home-section-header">
        <div style={ { display: 'flex', alignItems: 'center', gap: 10 } }>
          <div className="wasel-home-section-icon">
            <Route size={ 16 } />
            <div style={ { display: 'flex', alignItems: 'center', gap: 12 } }>
              <div
                className="wasel-home-section-icon"
                style={ {
                  background: 'rgba(0, 229, 255, 0.12)',
                  border: '1px solid rgba(0, 229, 255, 0.25)',
                  color: '#00E5FF',
                  boxShadow: '0 0 16px rgba(0, 229, 255, 0.15)',
                } }
              >
                <Layers size={ 17 } />
              </div>
              <h2 className="wasel-home-section-title">
                { tx( 'homeSections.quickActionsTitle' ) }
              </h2>
              ``              <div>
                <div
                  style={ {
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: '#00E5FF',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  } }
                >
                  <Sparkles size={ 11 } />
                  { ar ? 'خدمات واصل الأساسية' : 'Wasel Mobility Pillars' }
                </div>
                <h2 className="wasel-home-section-title" style={ { marginTop: 2 } }>
                  { tx( 'homeSections.quickActionsTitle' ) }
                </h2>
              </div>
            </div>
          </div>

          <div className="wasel-home-actions">
            { quickActions.map( action => {
              {
                quickActions.map( ( action, index ) => {
                  const Icon = action.icon;
                  return (
                    <motion.button
                      type="button"
                      key={ action.path }
                      onClick={ () =>
                        onNavigate(
                          action.path,
                          `quick_action_${ action.title.toLowerCase().replace( /\s+/g, '_' ) }`,
                        )
                      }
                      whileHover={ { y: -2 } }
                      whileHover={ { y: -3, scale: 1.01 } }
                      whileTap={ { scale: 0.99 } }
                      transition={ { duration: 0.18, ease: [ 0.16, 1, 0.3, 1 ] } }
                      className="wasel-home-action-card"
                      style={ {
                        borderTop: `1px solid ${ action.color }40`,
                      } }
                    >
                      <div className="wasel-home-action-card-header">
                        <div className="wasel-home-action-icon" style={ { background: action.dim, border: `1px solid ${ action.border }` } }>
                          <Icon size={ 20 } color={ action.color } />
                          <div
                            className="wasel-home-action-icon"
                            style={ {
                              background: action.dim,
                              border: `1px solid ${ action.border }`,
                              boxShadow: `0 4px 16px ${ action.color }20`,
                            } }
                          >
                            <Icon size={ 22 } color={ action.color } />
                          </div>
                          <div className="wasel-home-action-kicker">
                            <span className="wasel-home-action-kicker-dot" style={ { background: action.color, color: action.color } } />
                            <span
                              className="wasel-home-action-kicker-dot"
                              style={ {
                                background: action.color,
                                boxShadow: `0 0 8px ${ action.color }`,
                              } }
                            />
                            { action.kicker }
                          </div>
                        </div>

                        <div className="wasel-home-action-title">{ action.title }</div>
                        <div className="wasel-home-action-desc">{ action.desc }</div>
                        <div className="wasel-home-action-outcome">{ action.outcome }</div>
                        <div
                          className="wasel-home-action-outcome"
                          style={ {
                            background: 'rgba(255, 255, 255, 0.03)',
                            padding: '8px 12px',
                            borderRadius: 10,
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                          } }
                        >
                          { action.outcome }
                        </div>

                        <div className="wasel-home-action-cta" style={ { color: action.color } }>
                          { tx( 'homeSections.quickActionsCTA' ) }
                          <ArrowRight size={ 13 } />
                          <div
                            className="wasel-home-action-cta"
                            style={ {
                              color: action.color,
                              marginTop: 'auto',
                              paddingTop: 8,
                            } }
                          >
                            <span>{ tx( 'homeSections.quickActionsCTA' ) }</span>
                            { ar ? <ArrowLeft size={ 14 } /> : <ArrowRight size={ 14 } /> }
                          </div>
                        </motion.button>
                        );
        })}
                      </div>
                    </motion.section>
                  );
                }
