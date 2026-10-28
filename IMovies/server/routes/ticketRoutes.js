const express = require("express");
const mongoose = require("mongoose");
const QRCode = require("qrcode");
const Booking = require("../models/Booking");
const Show = require("../models/Show");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Return a QR code for the signed-in user's confirmed ticket.
router.get("/:ticketRef/qr", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(401).json({ message: "Please log in again." });
    }

    const booking = await Booking.findOne({
      ticketRef: req.params.ticketRef,
      userEmail: user.email,
      status: "confirmed",
      paymentStatus: "paid",
    });

    if (!booking) {
      return res.status(404).json({
        message: "Valid ticket not found.",
      });
    }

    const verificationUrl =
  `${process.env.SERVER_PUBLIC_URL || "http://localhost:5000"}` +
  `/api/tickets/verify/${encodeURIComponent(booking.ticketRef)}`;

    const qrDataUrl = await QRCode.toDataURL(verificationUrl);

    res.json({
      ticketRef: booking.ticketRef,
      qrDataUrl,
    });
  } catch (error) {
    console.error("Ticket QR error:", error.message);
    res.status(500).json({ message: "Unable to generate ticket QR." });
  }
});

// Public verification endpoint: reveals ticket details, not customer email.
router.get("/verify/:ticketRef", async (req, res) => {
  try {
    const booking = await Booking.findOne({
      ticketRef: req.params.ticketRef,
    }).populate({
      path: "show",
      populate: { path: "movie" },
    });

    if (!booking || booking.status !== "confirmed" ||
        booking.paymentStatus !== "paid") {
      return res.status(404).json({
        valid: false,
        message: "Ticket is invalid or cancelled.",
      });
    }

    res.json({
      valid: true,
      ticketRef: booking.ticketRef,
      movie: booking.show?.movie?.title || "Movie unavailable",
      theatre: booking.show?.theatreName || "Theatre unavailable",
      date: booking.show?.showDate,
      time: booking.show?.showTime,
      seats: booking.seats,
    });
  } catch (error) {
    res.status(500).json({ message: "Unable to verify ticket." });
  }
});

module.exports = router;