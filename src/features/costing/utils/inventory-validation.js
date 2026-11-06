export function inventoryPurchaseErrors(itemCost, qty) {
  const cost = Number(itemCost);
  const quantity = Number(qty);
  return {
    itemCost: !String(itemCost ?? '').trim()
      ? 'Purchase amount is required'
      : !Number.isFinite(cost) || cost < 0.001 || cost > 999999999999.99
        ? 'Purchase amount must be between PHP 0.001 and PHP 999,999,999,999.99.'
        : '',
    qty: !String(qty ?? '').trim()
      ? 'Purchase quantity is required'
      : !Number.isFinite(quantity) || quantity < 0.0001 || quantity > 9999999999.9999
        ? 'Purchase quantity must be between 0.0001 and 9,999,999,999.9999.'
        : '',
  };
}
