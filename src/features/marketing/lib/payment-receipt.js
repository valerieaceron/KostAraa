/** Validate a receipt before creating a local image preview. */
export function receiptValidationError(file) {
  if (!file) return "Choose a receipt image.";
  if (!["image/jpeg", "image/png"].includes(file.type)) {
    return "Choose a JPG or PNG image of your receipt.";
  }
  if (file.size === 0 || file.size > 5 * 1024 * 1024) {
    return "Choose a non-empty receipt image no larger than 5 MB.";
  }
  return "";
}

/** Match the entered reference against the numbers read by the payment API. */
export function receiptReferenceError(references, reference) {
  if (!/^[0-9]{10,32}$/.test(reference)) return "Enter the full 10–32 digit reference number shown on your receipt.";
  if (!references.includes(reference)) return "The reference number does not match your receipt. Check the number or upload the correct receipt.";
  return "";
}
