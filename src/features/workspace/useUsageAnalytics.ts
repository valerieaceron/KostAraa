import {useEffect, useRef} from 'react';
import {apiJson, isOfflineUser} from '../costing/utils/api';

export function useUsageAnalytics(enabled:boolean, feature:string) {
  const tracker = useRef<any>(null);
  const current = useRef(feature);
  current.current = feature;

  useEffect(() => {
    if (!enabled || isOfflineUser() || !sessionStorage.getItem('kostaraa.token')) return;
    let stopped = false;
    let lastFeature = '';
    const session = Promise.resolve().then(() => stopped ? null : apiJson('/api/usage-analytics/sessions', {
      method: 'POST',
      body: JSON.stringify({entry_feature_code: current.current, device_type: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop'}),
    })).then(data => data?.data?.session_public_id || null).catch(() => null);
    const send = async (suffix:string, body:any, keepalive=false) => {
      const id = await session;
      if (id) await apiJson(`/api/usage-analytics/sessions/${id}/${suffix}`, {method:'PATCH', body:JSON.stringify(body), keepalive}).catch(() => {});
    };
    const open = async (code:string) => {
      if (stopped || lastFeature === code) return;
      lastFeature = code;
      const id = await session;
      if (!id || stopped) return;
      await apiJson('/api/usage-analytics/events', {method:'POST', body:JSON.stringify({session_public_id:id, feature_code:code, event_name:'feature_opened', page_path:`/workspace?page=${code}`})}).catch(() => {});
    };
    const end = () => {
      if (stopped) return;
      stopped = true;
      void send('end', {exit_feature_code:current.current}, true);
    };
    tracker.current = {open, end};
    const heartbeat = window.setInterval(() => {
      if (!stopped && document.visibilityState === 'visible') void send('heartbeat', {feature_code:current.current});
    }, 60000);
    const featureOpened = (event:any) => { if (typeof event.detail === 'string') void open(event.detail); };
    const araa = () => { void open('araa'); };
    const pageShow = (event:PageTransitionEvent) => { if (event.persisted) window.location.reload(); };
    window.addEventListener('pagehide', end);
    window.addEventListener('pageshow', pageShow);
    window.addEventListener('kostaraa:open-araa', araa);
    window.addEventListener('kostaraa:feature-opened', featureOpened);
    return () => {
      window.clearInterval(heartbeat);
      window.removeEventListener('pagehide', end);
      window.removeEventListener('pageshow', pageShow);
      window.removeEventListener('kostaraa:open-araa', araa);
      window.removeEventListener('kostaraa:feature-opened', featureOpened);
      end();
      tracker.current = null;
    };
  }, [enabled]);

  useEffect(() => { if (enabled) void tracker.current?.open(feature); }, [enabled, feature]);
  return {end:() => tracker.current?.end(), open:(code:string) => tracker.current?.open(code)};
}
