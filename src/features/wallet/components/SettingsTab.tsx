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
import { WaselColors } from '../../../tokens/wasel-tokens';

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
  onAddPaymentMethod: () => void;
  onRemovePaymentMethod: (paymentMethodId: string) => void;
  onSetDefaultPaymentMethod: (paymentMethodId: string) => void;
  actionsLocked?: boolean;
  actionsLockedMessage?: string;
}

export function SettingsTab({
  walletData, isRTL, t,
  autoTopUpEnabled, autoTopUpAmount, autoTopUpThreshold,
  onAutoTopUpToggle, onAutoTopUpAmountChange, onAutoTopUpThresholdChange,
  onShowPinSetup,
  onAddPaymentMethod,
  onRemovePaymentMethod,
  onSetDefaultPaymentMethod,
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
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: 'rgba(169,227,255,0.12)', border: `1px solid ${WaselColors.borderDark}` }}
              >
                <ShieldCheck className="h-5 w-5" style={{ color: WaselColors.teal }} />
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
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: 'rgba(25,231,187,0.12)', border: `1px solid ${WaselColors.borderDark}` }}
              >
                <RefreshCw className="h-5 w-5" style={{ color: WaselColors.green }} />
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
          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-muted-foreground">{isRTL ? 'وسائل الدفع' : 'Payment Methods'}</span>
            <Button size="sm" variant="outline" onClick={onAddPaymentMethod} disabled={actionsLocked} className="text-xs">
              {isRTL ? 'إضافة وسيلة' : 'Add method'}
            </Button>
          </div>
          {(walletData?.wallet.paymentMethods ?? []).length > 0 ? (
            <div className="space-y-2">
              {walletData?.wallet.paymentMethods.map((method) => (
                <div key={method.id} className="rounded-xl border border-border/30 bg-background/30 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {method.label || `${method.provider} ${method.last4 ? `•••• ${method.last4}` : method.type}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {method.provider} • {method.type}
                        {method.expiryMonth && method.expiryYear ? ` • ${String(method.expiryMonth).padStart(2, '0')}/${method.expiryYear}` : ''}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!method.isDefault && (
                        <Button size="sm" variant="outline" disabled={actionsLocked} onClick={() => onSetDefaultPaymentMethod(method.id)} className="text-xs">
                          {isRTL ? 'افتراضي' : 'Set default'}
                        </Button>
                      )}
                      <Button size="sm" variant="outline" disabled={actionsLocked} onClick={() => onRemovePaymentMethod(method.id)} className="text-xs">
                        {isRTL ? 'إزالة' : 'Remove'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/40 bg-background/20 p-4 text-sm text-muted-foreground">
              {isRTL ? 'لا توجد وسائل دفع محفوظة حتى الآن.' : 'No saved payment methods yet.'}
            </div>
          )}

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
