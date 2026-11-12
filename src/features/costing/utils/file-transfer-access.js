import {paymentJourneyState} from '../../workspace/plan-intent.js';

export const fileTransferUpgradeMessage = 'Upgrade to Business Plus to download or upload Excel files.';
export const canUseFileTransfers = data => paymentJourneyState(data) === 'active';

export const fileTransferUpgradeEvent = 'kostaraa:file-transfer-upgrade';
export function requestFileTransferUpgrade() {
  window.dispatchEvent(new window.CustomEvent(fileTransferUpgradeEvent));
}
