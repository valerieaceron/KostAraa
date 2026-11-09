import {readProductTour, writeProductTour} from './product-tour.js';
const priority = status => ({active:1, dismissed:2, completed:3}[status] || 0);

// One queue per mounted tour keeps rapid Next/Skip/Finish requests in order.
export function createProductTourSync({request, storage, key, offline = false}) {
  let queue = Promise.resolve();
  let revision = 0;
  const cache = value => writeProductTour(storage, key, value.index, value.status);
  const save = value => {
    const current = ++revision;
    const cached = readProductTour(storage, key);
    if (priority(value.status) >= priority(cached.status) || cached.status === 'active') cache(value);
    if (offline) return Promise.resolve(value);
    const pending = queue.then(() => request('/api/user/product-tour', {method:'PATCH', body:JSON.stringify(value), keepalive:true})).then(response => {
      if (current === revision) cache(response.result);
      return response.result;
    });
    // A failed step must not prevent a later completion or retry from syncing.
    queue = pending.catch(() => {});
    return pending;
  };
  const load = async () => {
    const cached = readProductTour(storage, key);
    if (offline) return {progress:cached.status ? cached : null, eligible:false};
    const response = await request('/api/user/product-tour');
    const remote = response.result.progress;
    if (cached.status && (!remote || priority(cached.status) > priority(remote.status))) {
      return {...response.result, progress:await save(cached)};
    }
    if (remote) cache(remote);
    return response.result;
  };
  return {load, save};
}
