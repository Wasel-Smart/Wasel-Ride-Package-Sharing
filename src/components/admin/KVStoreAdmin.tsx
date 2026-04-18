/**
 * Admin KV Store Manager
 * Example component for managing app config and feature flags
 * 
 * Usage: Import in admin dashboard
 */

import { useState } from 'react';
import {
  useAllAppConfigs,
  useAllFeatureFlags,
  useSetAppConfig,
  useSetFeatureFlag,
  useToggleFeatureFlag,
} from '../../hooks/useKVStore';
import type { FeatureFlagValue, AppConfig, KVMetadata } from '../../types/kv-store.types';

export function KVStoreAdmin() {
  const [activeTab, setActiveTab] = useState<'config' | 'flags'>('flags');

  return (
    <div className="kv-store-admin">
      <div className="tabs">
        <button
          onClick={() => setActiveTab('flags')}
          className={activeTab === 'flags' ? 'active' : ''}
        >
          Feature Flags
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={activeTab === 'config' ? 'active' : ''}
        >
          App Config
        </button>
      </div>

      {activeTab === 'flags' && <FeatureFlagsManager />}
      {activeTab === 'config' && <AppConfigManager />}
    </div>
  );
}

function FeatureFlagsManager() {
  const { data: flags, isLoading } = useAllFeatureFlags();
  const toggleFlag = useToggleFeatureFlag();

  if (isLoading) return <div>Loading feature flags...</div>;

  return (
    <div className="feature-flags-manager">
      <h2>Feature Flags</h2>
      
      <div className="flags-list">
        {flags?.map((entry) => {
          const flagName = entry.key.replace('feature_flag:', '');
          const value = entry.value as FeatureFlagValue;
          
          return (
            <div key={entry.key} className="flag-item">
              <div className="flag-header">
                <h3>{flagName}</h3>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={value.enabled}
                    onChange={(e) => {
                      toggleFlag.mutate({
                        featureName: flagName,
                        enabled: e.target.checked,
                      });
                    }}
                  />
                  <span className="slider"></span>
                </label>
              </div>
              
              <div className="flag-details">
                <p className="description">
                  {value.metadata?.description || 'No description'}
                </p>
                
                {value.rollout && (
                  <div className="rollout-info">
                    <strong>Rollout:</strong> {value.rollout.type}
                    {value.rollout.percentage && (
                      <span> - {value.rollout.percentage}%</span>
                    )}
                  </div>
                )}
                
                <div className="metadata">
                  <span className="env">{entry.metadata.environment}</span>
                  <span className="owner">{entry.metadata.owner}</span>
                  <span className="updated">
                    Updated: {new Date(entry.updated_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AppConfigManager() {
  const { data: configs, isLoading } = useAllAppConfigs();

  if (isLoading) return <div>Loading app configs...</div>;

  return (
    <div className="app-config-manager">
      <h2>App Configuration</h2>
      
      <div className="configs-list">
        {configs?.map((entry) => {
          const configKey = entry.key.replace('app_config:', '');
          const value = entry.value as AppConfig;
          
          return (
            <div key={entry.key} className="config-item">
              <div className="config-header">
                <h3>{configKey}</h3>
              </div>
              
              <div className="config-details">
                <pre>{JSON.stringify(value, null, 2)}</pre>
                
                <div className="metadata">
                  <span className="env">{entry.metadata.environment}</span>
                  <span className="owner">{entry.metadata.owner}</span>
                  <span className="updated">
                    Updated: {new Date(entry.updated_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function QuickFeatureToggle({ featureName }: { featureName: string }) {
  const { data: flag } = useAllFeatureFlags();
  const toggleFlag = useToggleFeatureFlag();
  
  const currentFlag = flag?.find(f => f.key === `feature_flag:${featureName}`);
  const isEnabled = (currentFlag?.value as FeatureFlagValue)?.enabled ?? false;

  return (
    <button
      onClick={() => {
        toggleFlag.mutate({
          featureName,
          enabled: !isEnabled,
        });
      }}
      className={isEnabled ? 'enabled' : 'disabled'}
    >
      {featureName}: {isEnabled ? 'ON' : 'OFF'}
    </button>
  );
}
