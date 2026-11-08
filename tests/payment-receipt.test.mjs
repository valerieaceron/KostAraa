import { test } from "node:test";
import assert from "node:assert/strict";
import { receiptValidationError, receiptReferenceError } from "../src/features/marketing/lib/payment-receipt.js";

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


test("receipt reference must exactly match a scanned reference, preserving leading zeroes", () => {
  assert.equal(receiptReferenceError(['001234567890'], '001234567890'), '');
  assert.match(receiptReferenceError(['001234567890'], '1234567890'), /does not match/);
  assert.match(receiptReferenceError(['123456789012'], '999999999999'), /does not match/);
  assert.match(receiptReferenceError([], '123456789012'), /does not match/);
  for (const value of ['', '123', '12345678901x', '1'.repeat(33)]) assert.match(receiptReferenceError(['123456789012'], value), /10–32 digit/);
});
