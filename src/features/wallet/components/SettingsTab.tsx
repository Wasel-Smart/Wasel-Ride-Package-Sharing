/**
 * SettingsTab — Wallet Dashboard settings tab
 * Extracted from WalletDashboard to reduce file size
 */

import { motion } from 'motion/react';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';
import type { WalletData } from '../../../services/walletApi';

interface SettingsTabProps {
  walletData: WalletData | null;
  isRTL: boolean;
  t: Record<string, string>;
  autoTopUpEnabled: boolean;
  autoTopUpAmount: string;
  autoTopUpThreshold: string;
  onAutoTopUpToggle: (enabled: boolean) => void;
  onAutoTopUpAmountChange: (val: string) => void;
  onAutoTopUpThresholdChange: (val: string) => void;
  onShowPinSetup: () => void;
  actionsLocked?: boolean;
  actionsLockedMessage?: string;
}

export function SettingsTab({
  walletData, isRTL, t,
  autoTopUpEnabled, autoTopUpAmount, autoTopUpThreshold,
  onAutoTopUpToggle, onAutoTopUpAmountChange, onAutoTopUpThresholdChange,
  onShowPinSetup,
  actionsLocked = false,
  actionsLockedMessage,
}: SettingsTabProps) {
  return (
    <div className="space-y-4">
      {/* PIN Security */}
      <Card className="rounded-xl">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{t.securityPin}</p>
                <p className="text-xs text-muted-foreground">{t.pinDescription}</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={onShowPinSetup} disabled={actionsLocked} className="text-xs">
              {walletData?.pinSet ? t.changePin : t.setPin}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Auto Top-Up */}
      <Card className="rounded-xl">
        <CardContent className="pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{t.autoTopUp}</p>
                <p className="text-xs text-muted-foreground">{t.autoTopUpDesc}</p>
              </div>
            </div>
            <Switch checked={autoTopUpEnabled} disabled={actionsLocked} onCheckedChange={onAutoTopUpToggle} />
          </div>
          {actionsLocked && actionsLockedMessage && (
            <p className="text-xs text-amber-500">{actionsLockedMessage}</p>
          )}

          {autoTopUpEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-2 gap-3 pt-2"
            >
              <div>
                <Label className="text-xs text-muted-foreground">{t.threshold}</Label>
                <Input
                  type="number"
                  value={autoTopUpThreshold}
                  disabled={actionsLocked}
                  onChange={(e) => onAutoTopUpThresholdChange(e.target.value)}
                  className="mt-1 h-9 text-sm rounded-lg"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t.topUpAmountSetting}</Label>
                <Input
                  type="number"
                  value={autoTopUpAmount}
                  disabled={actionsLocked}
                  onChange={(e) => onAutoTopUpAmountChange(e.target.value)}
                  className="mt-1 h-9 text-sm rounded-lg"
                />
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Wallet Info */}
      <Card className="rounded-xl">
        <CardContent className="pt-4 space-y-3">
          {[
            { label: isRTL ? '\u0627\u0644\u0639\u0645\u0644\u0629' : 'Currency', value: walletData?.currency || 'JOD' },
            { label: isRTL ? '\u0646\u0648\u0639 \u0627\u0644\u0645\u062D\u0641\u0638\u0629' : 'Wallet Type', value: walletData?.wallet?.walletType || 'user' },
            { label: isRTL ? '\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0625\u0646\u0634\u0627\u0621' : 'Created', value: walletData?.wallet?.createdAt ? new Date(walletData.wallet.createdAt).toLocaleDateString(isRTL ? 'ar-JO' : 'en-US') : '\u2014' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <span className="text-sm font-medium text-foreground">{item.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
