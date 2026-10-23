const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || (import.meta.env?.DEV ? 'http://localhost:8000' : 'https://api.kostaraa.com')).replace(/\/+$/, '');

export function getSessionUser() {
  try {
    return JSON.parse(sessionStorage.getItem('kostaraa.user') || '{}');
  } catch {
    return {};
  }
}

export function isOfflineUser(user = getSessionUser()) {
  return String(user?.user_type || user?.userType || '').trim().toLowerCase() === 'offline user';
}

export async function apiJson(path, options = {}) {
  const token = sessionStorage.getItem('kostaraa.token');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }
  if (!response.ok || data.type === 'error' || data.success === false) {
    if (data.code === 'PLAN_LIMIT' && data.upgrade) window.dispatchEvent(new window.CustomEvent('kostaraa:upgrade-needed', {detail: data.message}));
    throw new Error(data.message || data.error || 'Unable to connect to the API.');
  }
  return data;
}

export function getApiItem(data) {
  if (data?.data?.item && typeof data.data.item === 'object') return data.data.item;
  if (data?.item && typeof data.item === 'object') return data.item;
  if (data?.data && typeof data.data === 'object' && !Array.isArray(data.data)) return data.data;
  return data;
}

export function getApiList(data) {
  if (Array.isArray(data)) return data;
  return [data?.result, data?.data?.result, data?.data?.items, data?.items, data?.inventory, data?.data].find(Array.isArray) || [];
}

export async function getAllApiItems(path) {
  const items = [];
  for (let page = 1; ; page++) {
    const data = await apiJson(`${path}?display=100&page=${page}`);
    const rows = getApiList(data);
    items.push(...rows);
    const total = Number(data.total_rows ?? data.data?.total_rows);
    if (!rows.length || (Number.isFinite(total) ? items.length >= total : rows.length < 100)) return items;
  }
}

export function normalizeInventoryItem(item) {
  return {
    ...item,
    id: item.id || item.inventory_item_id || crypto.randomUUID(),
    material: item.material || item.material_name || item.name || '',
    itemCost: Number(item.itemCost ?? item.purchase_cost) || 0,
    qty: Number(item.qty ?? item.purchase_quantity ?? item.quantity_on_hand) || 0,
    baseUnit: (item.baseUnit || item.base_unit || item.unit || '') === 'grams' ? 'g' : (item.baseUnit || item.base_unit || item.unit || ''),
    gramsPerCup: Number(item.gramsPerCup ?? item.grams_per_cup) || 0,
    piecesPerUnit: Number(item.piecesPerUnit ?? item.pieces_per_unit) || 0,
  };
}

export { API_BASE_URL };
