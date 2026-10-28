
import { useState } from "react";
import api from "./api";

export default function PaymentCheckout({
  showId,
  seats,
  onSuccess,
  onCancel,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function pay(simulateResult) {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await api.post("/bookings/checkout", {
        showId,
        seats,
        simulateResult,
      });

      setMessage(response.data.message);
      if (onSuccess) onSuccess(response.data.booking);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Checkout failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="checkout-panel">
      <h2>Checkout</h2>
      <p>Selected seats: {seats.join(", ")}</p>
      <p className="checkout-notice">
        Demo payment only. No real money will be charged.
      </p>

      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}

      <button
        type="button"
        disabled={loading || !showId || !seats?.length}
        onClick={() => pay("success")}
      >
        {loading ? "Processing..." : "Simulate Payment Success"}
      </button>

      <button
        type="button"
        disabled={loading}
        onClick={() => pay("failure")}
      >
        Simulate Payment Failure
      </button>

      <button
        type="button"
        disabled={loading}
        onClick={onCancel}
      >
        Back
      </button>
    </section>
  );
}
