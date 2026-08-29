/**
 * @deprecated Import from './wallet/walletApi' directly.
 * This barrel exists for backward compatibility with existing import sites.
 */
export { walletApi, getWalletCapabilities } from './wallet/walletApi';
export type {
  InsightsData,
  PaymentMethodInput,
  PaymentMethodRow,
  WalletCapabilities,
  WalletData,
  WalletEscrow,
  WalletSubscription,
  WalletSummary,
  WalletTransaction,
  RewardItem,
} from './wallet/walletTypes';
