import {useEffect, useRef} from 'react';
import {createPortal} from 'react-dom';
import {Crown, X} from 'lucide-react';
import {fileTransferUpgradeEvent} from '../utils/file-transfer-access';
import '../styles/file-transfer-upgrade.css';

export default function FileTransferUpgrade() {
  const dialog = useRef(null);
  useEffect(() => {
    const show = () => {if (!dialog.current?.open) dialog.current?.showModal();};
    window.addEventListener(fileTransferUpgradeEvent, show);
    return () => {window.removeEventListener(fileTransferUpgradeEvent, show);dialog.current?.close();};
  }, []);
  const close = () => dialog.current?.close();
  return createPortal(<dialog ref={dialog} className="file-transfer-upgrade" aria-labelledby="file-transfer-upgrade-title" aria-describedby="file-transfer-upgrade-copy">
    <button className="file-transfer-upgrade-close" type="button" aria-label="Close upgrade popup" onClick={close}><X size={20} aria-hidden="true"/></button>
    <Crown className="file-transfer-upgrade-icon" size={28} aria-hidden="true"/>
    <h2 id="file-transfer-upgrade-title">Unlock Excel with Business Plus</h2>
    <p id="file-transfer-upgrade-copy">Upgrade to Business Plus to download your Inventory, Product Library, and Grid as Excel files, and upload materials to Inventory.</p>
    <p className="file-transfer-upgrade-note">You can keep adding materials and products manually on your free plan.</p>
    <div className="file-transfer-upgrade-actions">
      <button type="button" onClick={close}>Maybe later</button>
      <a href="/workspace?page=subscription&plan=annual" onClick={close}>View Business Plus</a>
    </div>
  </dialog>, document.body);
}
