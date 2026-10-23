import { test } from "node:test";
import assert from "node:assert/strict";
import { receiptValidationError } from "../src/features/marketing/lib/payment-receipt.js";

test("receipt preview accepts supported images up to the size limit", () => {
  assert.equal(receiptValidationError({ type: "image/jpeg", size: 1024 }), "");
  assert.equal(receiptValidationError({ type: "image/png", size: 5 * 1024 * 1024 }), "");
});

test("receipt preview rejects missing, empty, oversized, and unsupported files", () => {
  assert.match(receiptValidationError(null), /Choose a receipt/);
  assert.match(receiptValidationError({ type: "image/png", size: 0 }), /non-empty/);
  assert.match(receiptValidationError({ type: "image/jpeg", size: 5 * 1024 * 1024 + 1 }), /5 MB/);
  assert.match(receiptValidationError({ type: "application/pdf", size: 100 }), /JPG or PNG/);
  assert.match(receiptValidationError({ type: "image/svg+xml", size: 100 }), /JPG or PNG/);
  assert.match(receiptValidationError({ type: "", size: 100, name: "receipt.png" }), /JPG or PNG/);
});
