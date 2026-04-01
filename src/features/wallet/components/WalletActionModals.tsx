import { CreditCard, Landmark, Smartphone, Zap } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { WaselColors } from '../../../tokens/wasel-tokens';
import { ActionModal as SharedActionModal } from './WalletShared';

type WalletActionModalsProps = {
  actionLoading: boolean;
  balance: number;
  isRTL: boolean;
  pinValue: string;
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
  isRTL,
  pinValue,
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
  return (
    <>
      <SharedActionModal show={showTopUp} onClose={() => setShowTopUp(false)} title={t.addMoney}>
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {[5, 10, 20, 50].map((amt) => (
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
            <Input type="number" value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} className="mt-1 rounded-lg" placeholder="0.00" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{t.paymentMethod}</Label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {[
                { id: 'card', label: t.card, icon: CreditCard },
                { id: 'apple_pay', label: t.applePay, icon: Smartphone },
                { id: 'bank_transfer', label: t.bankTransfer, icon: Landmark },
                { id: 'cliq', label: t.cliq, icon: Zap },
              ].map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setTopUpMethod(method.id)}
                  className={`flex items-center gap-2 rounded-lg border p-3 text-sm transition-all ${topUpMethod === method.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-slate-500'}`}
                >
                  <method.icon className="h-4 w-4" />
                  {method.label}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={onTopUp} disabled={actionLoading} className="h-11 w-full rounded-xl font-semibold" style={{ background: WaselColors.teal }}>
            {actionLoading ? t.processing : `${t.topUp} ${topUpAmount ? `${topUpAmount} ${t.jod}` : ''}`}
          </Button>
        </div>
      </SharedActionModal>

      <SharedActionModal show={showWithdraw} onClose={() => setShowWithdraw(false)} title={t.withdraw}>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">{t.withdrawAmount}</Label>
            <Input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="mt-1 rounded-lg" placeholder="0.00" />
            <p className="mt-1 text-xs text-muted-foreground">{t.availableLabel}: {balance.toFixed(2)} {t.jod}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{t.bankAccount}</Label>
            <Input value={withdrawBank} onChange={(e) => setWithdrawBank(e.target.value)} className="mt-1 rounded-lg" placeholder="JO12ABCD..." />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'instant', label: t.instant, fee: '0.50 JOD' },
              { id: 'bank_transfer', label: t.standard, fee: t.freeLabel },
            ].map((method) => (
              <button
                key={method.id}
                type="button"
                onClick={() => setWithdrawMethod(method.id)}
                className={`rounded-lg border p-3 text-left transition-all ${withdrawMethod === method.id ? 'border-primary bg-primary/10' : 'border-border hover:border-slate-500'}`}
              >
                <p className="text-sm font-medium">{method.label}</p>
                <p className="text-xs text-muted-foreground">{method.fee}</p>
              </button>
            ))}
          </div>
          <Button onClick={onWithdraw} disabled={actionLoading} className="h-11 w-full rounded-xl font-semibold" style={{ background: WaselColors.bronze }}>
            {actionLoading ? t.processing : t.confirmWithdraw}
          </Button>
        </div>
      </SharedActionModal>

      <SharedActionModal show={showSend} onClose={() => setShowSend(false)} title={t.sendMoney}>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">{t.recipientId}</Label>
            <Input value={sendRecipient} onChange={(e) => setSendRecipient(e.target.value)} className="mt-1 rounded-lg" placeholder={t.userIdPlaceholder} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{t.sendAmount}</Label>
            <Input type="number" value={sendAmount} onChange={(e) => setSendAmount(e.target.value)} className="mt-1 rounded-lg" placeholder="0.00" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{t.noteOptional}</Label>
            <Input value={sendNote} onChange={(e) => setSendNote(e.target.value)} className="mt-1 rounded-lg" placeholder={t.notePlaceholder} />
          </div>
          <Button onClick={onSend} disabled={actionLoading} className="h-11 w-full rounded-xl font-semibold" style={{ background: WaselColors.teal }}>
            {actionLoading ? t.processing : `${t.confirmSend} ${sendAmount ? `${sendAmount} ${t.jod}` : ''}`}
          </Button>
        </div>
      </SharedActionModal>

      <SharedActionModal
        show={showPinSetup}
        onClose={() => {
          setShowPinSetup(false);
          setPinValue('');
        }}
        title={walletData?.pinSet ? t.changePin : t.setPin}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t.pinDescription}</p>
          <div className="flex justify-center gap-3">
            {[0, 1, 2, 3].map((index) => (
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
            onChange={(e) => setPinValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
            className="rounded-lg text-center text-2xl tracking-[1em]"
            placeholder={t.maskedPin}
            autoFocus
          />
          <Button onClick={onSetPin} disabled={actionLoading || pinValue.length !== 4} className="h-11 w-full rounded-xl font-semibold" style={{ background: WaselColors.teal }}>
            {actionLoading ? t.processing : t.setPin}
          </Button>
        </div>
      </SharedActionModal>
    </>
  );
}
