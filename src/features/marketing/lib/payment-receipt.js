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
