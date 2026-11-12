import {useEffect, useState} from 'react';
import {apiJson} from './api';
import {canUseFileTransfers} from './file-transfer-access';

export function useFileTransferAccess() {
  const [data, setData] = useState(null);
  useEffect(() => {
    let active = true, revision = 0;
    const refresh = async () => {
      const current = ++revision;
      try {
        const response = await apiJson('/api/payments');
        if (active && current === revision) setData(response.result);
      } catch { if (active && current === revision) setData(null); }
    };
    refresh();
    window.addEventListener('focus', refresh);
    return () => {active = false;window.removeEventListener('focus', refresh);};
  }, []);
  useEffect(() => {
    const expiresAt = Date.parse(data?.subscription?.expires_at);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return undefined;
    let timeout;
    const checkExpiry = () => {
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) setData(current => ({...current}));
      else timeout = setTimeout(checkExpiry, Math.min(remaining, 2147483647));
    };
    checkExpiry();
    return () => clearTimeout(timeout);
  }, [data]);
  return canUseFileTransfers(data);
}
