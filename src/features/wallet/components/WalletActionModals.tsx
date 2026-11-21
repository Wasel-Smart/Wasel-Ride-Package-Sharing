import { CreditCard, Landmark, Smartphone, Zap } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { WaselColors } from '../../../tokens/wasel-tokens';
import { ActionModal as SharedActionModal } from './WalletShared';
import { tx } from '../../../locales/tx';

/** Accepts a Supabase UUID, an E.164 phone number, or an email address. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const E164_RE = /^\+[1-9]\d{6,14}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidRecipient(value: string): boolean {
  const v = value.trim();
  return UUID_RE.test(v) || E164_RE.test(v) || EMAIL_RE.test(v);
}

type WalletActionModalsProps = {
  actionLoading: boolean;
  balance: number;
  canWithdraw: boolean;
  isRTL: boolean;
  pinValue: string;
  currentPinValue: string;
  setCurrentPinValue: (value: string) => void;
  sendAmount: string;
  sendNote: string;
  sendRecipient: string;
  setPinValue: (value: string) => void;
  setSendAmount: (value: string) => void;
  setSendNote: (value: string) => void;
  setSendRecipient: (value: string) => void;
  setShowPinSetup: (value: boolean) => void;
  setShowSend: (value: boolean) => void;
  setShowTopUp: (value: boolean) => void;
  setShowWithdraw: (value: boolean) => void;
  setTopUpAmount: (value: string) => void;
  setTopUpMethod: (value: string) => void;
  setWithdrawAmount: (value: string) => void;
  setWithdrawBank: (value: string) => void;
  setWithdrawMethod: (value: string) => void;
  showPinSetup: boolean;
  showSend: boolean;
  showTopUp: boolean;
  showWithdraw: boolean;
  t: Record<string, string>;
  topUpAmount: string;
  topUpMethod: string;
  walletData: { pinSet?: boolean } | null;
  withdrawAmount: string;
  withdrawBank: string;
  withdrawMethod: string;
  onSend: () => void;
  onSetPin: () => void;
  onTopUp: () => void;
  onWithdraw: () => void;
};

export function WalletActionModals({
  actionLoading,
  balance,
  canWithdraw,
  isRTL,
  pinValue,
  currentPinValue,
  setCurrentPinValue,
  sendAmount,
  sendNote,
  sendRecipient,
  setPinValue,
  setSendAmount,
  setSendNote,
  setSendRecipient,
  setShowPinSetup,
  setShowSend,
  setShowTopUp,
  setShowWithdraw,
  setTopUpAmount,
  setTopUpMethod,
  setWithdrawAmount,
  setWithdrawBank,
  setWithdrawMethod,
  showPinSetup,
  showSend,
  showTopUp,
  showWithdraw,
  t,
  topUpAmount,
  topUpMethod,
  walletData,
  withdrawAmount,
  withdrawBank,
  withdrawMethod,
  onSend,
  onSetPin,
  onTopUp,
  onWithdraw,
}: WalletActionModalsProps) {
  void isRTL;

  const addMoneyLabel = t.addMoney ?? 'Add money';
  const withdrawLabel = t.withdraw ?? 'Withdraw';
  const sendMoneyLabel = t.sendMoney ?? 'Send money';
  const setPinLabel = t.setPin ?? 'Set PIN';
  const changePinLabel = t.changePin ?? 'Change PIN';

  return (
    <>
      <SharedActionModal show={showTopUp} onClose={() => setShowTopUp(false)} title={addMoneyLabel}>
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {[5, 10, 20, 50].map(amt => (
              <Button
                key={amt}
                variant={topUpAmount === String(amt) ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTopUpAmount(String(amt))}
                className="rounded-lg text-sm"
              >
                {amt}
              </Button>
            ))}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{t.topUpAmount}</Label>
            <Input
              type="number"
              value={topUpAmount}
              min="1"
              max="10000"
              step="0.5"
              onChange={e => setTopUpAmount(e.target.value)}
              className={`mt-1 rounded-lg ${topUpAmount && (parseFloat(topUpAmount) < 1 || parseFloat(topUpAmount) > 10000) ? 'border-destructive ring-1 ring-destructive' : ''}`}
              placeholder="0.00"
              aria-invalid={topUpAmount !== '' && (parseFloat(topUpAmount) < 1 || parseFloat(topUpAmount) > 10000)}
              aria-describedby="topup-amount-error"
            />
            {topUpAmount !== '' && (parseFloat(topUpAmount) < 1 || parseFloat(topUpAmount) > 10000) && (
              <p id="topup-amount-error" role="alert" className="mt-1 text-xs text-destructive">
                {parseFloat(topUpAmount) < 1
                  ? (t.minTopUp ?? 'Minimum top-up is 1 JOD')
                  : (t.maxTopUp ?? 'Maximum top-up is 10,000 JOD')}
              </p>
            )}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{t.paymentMethod}</Label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {[
                { id: 'card', label: t.card, icon: CreditCard },
                { id: 'apple_pay', label: t.applePay, icon: Smartphone },
                { id: 'bank_transfer', label: t.bankTransfer, icon: Landmark },
                { id: 'cliq', label: t.cliq, icon: Zap },
              ].map(method => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => { void setTopUpMethod(method.id); }}
                  className={`flex items-center gap-2 rounded-lg border p-3 text-sm transition-all ${topUpMethod === method.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-[var(--wasel-cyan)]/60'}`}
                >
                  <method.icon className="h-4 w-4" />
                  {method.label}
                </button>
              ))}
            </div>
          </div>
          <Button
            onClick={() => { void onTopUp(); }}
            disabled={actionLoading || !topUpAmount || parseFloat(topUpAmount) < 1 || parseFloat(topUpAmount) > 10000}
            className="h-11 w-full rounded-xl font-semibold"
            style={{ background: WaselColors.teal }}
          >
            {actionLoading
              ? t.processing
              : `${t.topUp} ${topUpAmount ? `${topUpAmount} ${t.jod}` : ''}`}
          </Button>
        </div>
      </SharedActionModal>

      <SharedActionModal
        show={showWithdraw}
        onClose={() => setShowWithdraw(false)}
        title={withdrawLabel}
      >
        <div className="space-y-3">
          {!canWithdraw ? (
            <p role="status" className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
              {t.withdrawUnavailableHint ?? 'Withdrawals are temporarily unavailable.'}
            </p>
          ) : null}
          <div>
            <Label className="text-xs text-muted-foreground">{t.withdrawAmount}</Label>
            <Input
              type="number"
              value={withdrawAmount}
              onChange={e => setWithdrawAmount(e.target.value)}
              disabled={!canWithdraw}
              className="mt-1 rounded-lg"
              placeholder="0.00"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t.availableLabel}: {balance.toFixed(2)} {t.jod}
            </p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{t.bankAccount}</Label>
            <Input
              value={withdrawBank}
              onChange={e => setWithdrawBank(e.target.value)}
              disabled={!canWithdraw}
              className="mt-1 rounded-lg"
              placeholder={tx('walletActionModals.jo12abcd')}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'instant', label: t.instant, fee: '0.50 JOD' },
              { id: 'bank_transfer', label: t.standard, fee: t.freeLabel },
            ].map(method => (
              <button
                key={method.id}
                type="button"
                onClick={() => { void setWithdrawMethod(method.id); }}
                disabled={!canWithdraw}
                className={`rounded-lg border p-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50 ${withdrawMethod === method.id ? 'border-primary bg-primary/10' : 'border-border hover:border-[var(--wasel-cyan)]/60'}`}
              >
                <p className="text-sm font-medium">{method.label}</p>
                <p className="text-xs text-muted-foreground">{method.fee}</p>
              </button>
            ))}
          </div>
          <Button
            onClick={() => { void onWithdraw(); }}
            disabled={actionLoading || !canWithdraw}
            className="h-11 w-full rounded-xl font-semibold"
            style={{ background: WaselColors.bronze }}
          >
            {actionLoading ? t.processing : t.confirmWithdraw}
          </Button>
        </div>
      </SharedActionModal>

      <SharedActionModal show={showSend} onClose={() => setShowSend(false)} title={sendMoneyLabel}>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">{t.recipientId}</Label>
            <Input
              value={sendRecipient}
              onChange={e => setSendRecipient(e.target.value)}
              className={`mt-1 rounded-lg ${sendRecipient && !isValidRecipient(sendRecipient) ? 'border-destructive ring-1 ring-destructive' : ''}`}
              placeholder={t.userIdPlaceholder}
              aria-invalid={sendRecipient !== '' && !isValidRecipient(sendRecipient)}
              aria-describedby="send-recipient-error"
            />
            {sendRecipient !== '' && !isValidRecipient(sendRecipient) && (
              <p id="send-recipient-error" role="alert" className="mt-1 text-xs text-destructive">
                {t.invalidRecipient ?? 'Enter a valid user ID, phone number (+9647…), or email'}
              </p>
            )}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{t.sendAmount}</Label>
            <Input
              type="number"
              value={sendAmount}
              onChange={e => setSendAmount(e.target.value)}
              className="mt-1 rounded-lg"
              placeholder="0.00"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{t.noteOptional}</Label>
            <Input
              value={sendNote}
              onChange={e => setSendNote(e.target.value)}
              className="mt-1 rounded-lg"
              placeholder={t.notePlaceholder}
            />
          </div>
          <Button
            onClick={() => { void onSend(); }}
            disabled={actionLoading || !sendRecipient.trim() || !isValidRecipient(sendRecipient) || !sendAmount || parseFloat(sendAmount) <= 0}
            className="h-11 w-full rounded-xl font-semibold"
            style={{ background: WaselColors.teal }}
          >
            {actionLoading
              ? t.processing
              : `${t.confirmSend} ${sendAmount ? `${sendAmount} ${t.jod}` : ''}`}
          </Button>
        </div>
      </SharedActionModal>

      <SharedActionModal
        show={showPinSetup}
        onClose={() => {
          setShowPinSetup(false);
          setPinValue('');
          setCurrentPinValue('');
        }}
        title={walletData?.pinSet ? changePinLabel : setPinLabel}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t.pinDescription}</p>
          {walletData?.pinSet && (
            <div>
              <Label className="text-xs text-muted-foreground">
                {t.currentPin ?? 'Current PIN'}
              </Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={currentPinValue}
                onChange={e => setCurrentPinValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="mt-1 rounded-lg text-center text-2xl tracking-[1em]"
                placeholder={t.maskedPin}
                autoComplete="current-password"
              />
            </div>
          )}
          <div className="flex justify-center gap-3">
            {[0, 1, 2, 3].map(index => (
              <div
                key={index}
                className={`flex h-14 w-12 items-center justify-center rounded-xl border-2 text-2xl font-bold transition-all ${pinValue.length > index ? 'border-primary text-foreground' : 'border-border text-transparent'}`}
              >
                {pinValue[index] ? '•' : ''}
              </div>
            ))}
          </div>
          <Input
            type="tel"
            maxLength={4}
            value={pinValue}
            onChange={e => setPinValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
            className="rounded-lg text-center text-2xl tracking-[1em]"
            placeholder={t.maskedPin}
            autoFocus
          />
          <Button
            onClick={() => { void onSetPin(); }}
            disabled={
              actionLoading ||
              pinValue.length !== 4 ||
              Boolean(walletData?.pinSet && currentPinValue.length !== 4)
            }
            className="h-11 w-full rounded-xl font-semibold"
            style={{ background: WaselColors.teal }}
          >
            {actionLoading ? t.processing : t.setPin}
          </Button>
        </div>
      </SharedActionModal>
    </>
  );
}
