
import { useEffect, useState } from "react";
import api from "./api";

export default function TicketQRCode({ ticketRef }) {
  const [qr, setQr] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadQR() {
      try {
        const response = await api.get(
          `/tickets/${encodeURIComponent(ticketRef)}/qr`
        );

        if (active) setQr(response.data.qrDataUrl);
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              "Could not load ticket QR code."
          );
        }
      }
    }

    if (ticketRef) loadQR();

    return () => {
      active = false;
    };
  }, [ticketRef]);

  if (error) return <p role="alert">{error}</p>;
  if (!qr) return <p>Loading ticket QR code...</p>;

  return (
    <div className="ticket-qr">
      <img src={qr} alt={`QR code for ticket ${ticketRef}`} />
      <p>Ticket reference: {ticketRef}</p>
      <p>Scan to verify this ticket.</p>
    </div>
  );
}
