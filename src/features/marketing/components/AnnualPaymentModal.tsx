import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowRight, Check, Clock3, FileImage, QrCode, Upload, X } from "lucide-react";
import "../styles/annual-payment.css";
import { receiptValidationError } from "../lib/payment-receipt";

export function AnnualPaymentModal({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [imageReady, setImageReady] = useState(false);
  const [error, setError] = useState("");
  const [reviewPreview, setReviewPreview] = useState(false);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (!receipt) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(receipt);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [receipt]);

  useEffect(() => {
    if (reviewPreview) {
      reviewHeading.current?.focus();
      dialog.current?.scrollTo({ top: 0 });
    }
  }, [reviewPreview]);

  function selectReceipt(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setImageReady(false);
    setReceipt(null);
    const validationError = receiptValidationError(file);
    setError(validationError);
    if (!validationError) setReceipt(file);
  }

  function previewReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (receipt && previewUrl && imageReady && !error) setReviewPreview(true);
  }

  return <dialog className="annual-payment" ref={dialog} aria-labelledby="annual-payment-title" onCancel={onClose}>
    <button className="annual-payment-close" type="button" onClick={onClose} aria-label="Close payment instructions"><X aria-hidden="true"/></button>
    <header className="annual-payment-header">
      <h2 id="annual-payment-title" ref={reviewHeading} tabIndex={-1}>{reviewPreview ? "Your verification preview" : "Grow at your own pace."}</h2>
      <p>{reviewPreview ? "After a receipt is submitted, our team reviews it within 12 hours. You can use Free while you wait." : "We’re setting up automated payments. In the meantime, pay via our GCash QR, send your receipt, and start with Free while we verify your payment."}</p>
    </header>

    {reviewPreview ? <div className="annual-payment-review">
      <div className="annual-payment-review-icon"><Clock3 aria-hidden="true"/></div>
      <h3>Review within 12 hours</h3>
      <p>Your Annual plan starts after payment is verified. Until then, you can create an account and use the Free plan.</p>
      <div className="annual-payment-file-summary"><FileImage aria-hidden="true"/><div><b>{receipt?.name}</b><span>Selected for preview · not submitted</span></div></div>
      <ol className="annual-payment-timeline">
        <li><Check aria-hidden="true"/><span>Receipt selected for preview</span></li>
        <li><Clock3 aria-hidden="true"/><span>Once submitted, review takes up to 12 hours</span></li>
        <li><ArrowRight aria-hidden="true"/><span>Annual access begins after verification</span></li>
      </ol>
      <a className="button annual-payment-primary" href="/signup?plan=annual">Create a free account<ArrowRight aria-hidden="true"/></a>
      <button className="annual-payment-text-button" type="button" onClick={() => setReviewPreview(false)}>Back to receipt</button>
    </div> : <>
      <div className="annual-payment-total"><div><b>Annual membership</b><span>One payment for 12 months</span></div><strong>₱899</strong></div>
      <div className="annual-payment-steps">
        <section className="annual-payment-step" aria-labelledby="annual-payment-pay">
          <h3 id="annual-payment-pay"><span>1</span>Pay with GCash</h3>
          <p>When payments are available, scan our QR in GCash and send exactly ₱899. Save the receipt after paying.</p>
          <div className="annual-payment-qr" aria-label="Sample QR illustration. Not a valid payment code.">
            <QrCode aria-hidden="true" strokeWidth={1}/>
            <span>QR placeholder</span>
            <small>Not for payment</small>
          </div>
        </section>
        <form className="annual-payment-step" onSubmit={previewReview}>
          <h3><span>2</span>Add your receipt</h3>
          <p>Use a clear image showing the amount, date, and GCash reference number.</p>
          <label className="annual-payment-file" htmlFor="annual-receipt">
            <Upload aria-hidden="true"/><b>{receipt ? "Replace receipt" : "Choose receipt image"}</b><span id="annual-receipt-hint">JPG or PNG · up to 5 MB</span>
            <input id="annual-receipt" type="file" accept="image/jpeg,image/png" onChange={selectReceipt} aria-describedby={`annual-receipt-hint${error ? " annual-receipt-error" : ""}`} aria-invalid={Boolean(error)}/>
          </label>
          {error && <p className="annual-payment-error" id="annual-receipt-error" role="alert">{error}</p>}
          {receipt && previewUrl && <div className="annual-payment-receipt">
            <img src={previewUrl} alt="Selected receipt preview" onLoad={() => setImageReady(true)} onError={() => { setImageReady(false); setReceipt(null); setError("This image could not be opened. Choose another JPG or PNG receipt."); }}/>
            <div className="annual-payment-file-summary"><FileImage aria-hidden="true"/><div><b>{receipt.name}</b><span>{Math.max(1, Math.round(receipt.size / 1024))} KB · not submitted</span></div><button type="button" onClick={() => { setReceipt(null); setError(""); }} aria-label="Remove selected receipt"><X aria-hidden="true"/></button></div>
          </div>}
          <button className="button annual-payment-primary" type="submit" disabled={!receipt || !previewUrl || !imageReady || Boolean(error)}>Preview verification<ArrowRight aria-hidden="true"/></button>
          <p className="annual-payment-small"><Clock3 aria-hidden="true"/>Review within 12 hours of receipt submission.</p>
        </form>
      </div>
      <footer className="annual-payment-footer">
        <div><h3>Prefer to start free?</h3><p>Create your account now. Upgrade to Annual when you’re ready.</p></div>
        <a href="/signup?plan=annual">Start with Free</a>
      </footer>
    </>}
  </dialog>;
}
