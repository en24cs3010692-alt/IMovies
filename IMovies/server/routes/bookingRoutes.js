
const express = require("express");
const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Show = require("../models/Show");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const router = express.Router();

 // Admin: view bookings across all users
router.get("/admin/all", adminMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate({
        path: "show",
        populate: { path: "movie" },
      })
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    console.error("Admin fetch bookings error:", error.message);
    res.status(500).json({ message: "Unable to fetch all bookings." });
  }
});
router.patch("/:bookingId/cancel", authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findOne({
      bookingId: req.params.bookingId,
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    const user = await User.findById(req.user.userId);

    if (!user || booking.userEmail !== user.email) {
      return res.status(403).json({
        message: "You cannot cancel this booking.",
      });
    }

    if (booking.status !== "confirmed") {
      return res.status(400).json({
        message: "This booking is already cancelled.",
      });
    }

    if (booking.paymentStatus === "paid") {
      // Demo app: this is NOT a real payment refund.
      booking.paymentStatus = "refunded";
    }

    const show = await Show.findById(booking.show);

    if (show) {
      show.bookedSeats = show.bookedSeats.filter(
        (seat) => !booking.seats.includes(seat)
      );
      await show.save();
    }

    booking.status = "cancelled";
    await booking.save();

    res.json({
      message: "Booking cancelled.",
      booking,
    });
  } catch (error) {
    console.error("Cancellation error:", error.message);
    res.status(500).json({ message: "Unable to cancel booking." });
  }
});
const crypto = require("node:crypto");

// Demo checkout: no real payment is processed.
router.post("/checkout", authMiddleware, async (req, res) => {
  let reservedShowId = null;
  let reservedSeats = [];
  let bookingCreated = false;

  try {
    const { showId, seats, simulateResult } = req.body;

    if (!["success", "failure"].includes(simulateResult)) {
      return res.status(400).json({
        message: "Choose a valid demo payment result.",
      });
    }

    if (
      !showId ||
      !mongoose.isValidObjectId(showId) ||
      !Array.isArray(seats) ||
      seats.length === 0 ||
      new Set(seats).size !== seats.length ||
      !seats.every(
        (seat) =>
          typeof seat === "string" &&
          /^[A-J][1-6]$/.test(seat)
      )
    ) {
      return res.status(400).json({
        message: "Invalid show or seat selection.",
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(401).json({ message: "Please log in again." });
    }

    const show = await Show.findById(showId);
    if (!show) {
      return res.status(404).json({ message: "Show not found." });
    }

    if (
      seats.some((seat) => {
        const row = seat.charCodeAt(0) - 64;
        const number = Number(seat.slice(1));
        return row * 6 + number > show.totalSeats;
      })
    ) {
      return res.status(400).json({
        message: "A selected seat is outside this show's capacity.",
      });
    }

    if (simulateResult === "failure") {
      return res.status(402).json({
        paymentStatus: "failed",
        message: "Demo payment failed. No booking was created.",
      });
    }

    // Atomically reserve only seats that are still available.
    const updatedShow = await Show.findOneAndUpdate(
      {
        _id: showId,
        bookedSeats: { $nin: seats },
      },
      { $addToSet: { bookedSeats: { $each: seats } } },
      { new: true }
    );

    if (!updatedShow) {
      return res.status(409).json({
        message: "One or more seats have just been booked. Select again.",
      });
    }

    reservedShowId = showId;
    reservedSeats = seats;

    const booking = await Booking.create({
      bookingId: `IM-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`,
      ticketRef: `TKT-${crypto.randomUUID()}`,
      userEmail: user.email,
      show: showId,
      seats,
      totalAmount: show.ticketPrice * seats.length,
      status: "confirmed",
      paymentStatus: "paid",
    });

    bookingCreated = true;

    res.status(201).json({
      message: "Demo payment successful. Booking confirmed.",
      booking,
    });
  } catch (error) {
    // Roll back seat reservation if booking creation failed.
    if (reservedShowId && !bookingCreated) {
      await Show.updateOne(
        { _id: reservedShowId },
        { $pull: { bookedSeats: { $in: reservedSeats } } }
      ).catch((rollbackError) => {
        console.error("Seat rollback error:", rollbackError.message);
      });
    }

    console.error("Demo checkout error:", error.message);
    res.status(500).json({ message: "Checkout failed. Please try again." });
  }
});
// View only the logged-in user's bookings
router.get("/", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("email");

    if (!user) {
      return res.status(401).json({ message: "User account not found." });
    }

    const bookings = await Booking.find({
      userEmail: user.email,
    })
      .populate({
        path: "show",
        populate: { path: "movie" },
      })
      .sort({ createdAt: -1 });

    return res.json(bookings);
  } catch (error) {
    console.error("Fetch bookings error:", error.message);
    return res.status(500).json({
      message: "Unable to fetch bookings.",
    });
  }
});

// Book seats
router.post("/", authMiddleware, async (req, res) => {
  let reservedSeats = false;
  let showId;
  let seats;

  try {
    const { showId: requestedShowId, seats: requestedSeats } = req.body;

    if (
      !requestedShowId ||
      !Array.isArray(requestedSeats) ||
      requestedSeats.length === 0
    ) {
      return res.status(400).json({
        message: "Show ID and selected seats are required.",
      });
    }

    if (!mongoose.isValidObjectId(requestedShowId)) {
      return res.status(400).json({ message: "Invalid show ID." });
    }

    if (
      requestedSeats.some(
        (seat) => typeof seat !== "string" || !/^[A-J][1-6]$/.test(seat)
      ) ||
      new Set(requestedSeats).size !== requestedSeats.length
    ) {
      return res.status(400).json({
        message: "Choose valid seats from A1 to J6 without duplicates.",
      });
    }

    const user = await User.findById(req.user.userId).select("email");

    if (!user) {
      return res.status(401).json({ message: "User account not found." });
    }

    showId = requestedShowId;
    seats = requestedSeats;

    const show = await Show.findOneAndUpdate(
      {
        _id: showId,
        bookedSeats: { $nin: seats },
      },
      {
        $addToSet: { bookedSeats: { $each: seats } },
      },
      { new: true, runValidators: true }
    );

    if (!show) {
      return res.status(409).json({
        message: "Show not found or one or more seats are already booked.",
      });
    }

    reservedSeats = true;

    const bookingId = `IM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const booking = await Booking.create({
      bookingId,
      userEmail: user.email,
      show: show._id,
      seats,
      totalAmount: show.ticketPrice * seats.length,
    });

    reservedSeats = false;

    return res.status(201).json(booking);
  } catch (error) {
    if (reservedSeats && showId && seats) {
      await Show.updateOne(
        { _id: showId },
        { $pull: { bookedSeats: { $in: seats } } }
      );
    }

    console.error("Create booking error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "A duplicate booking was detected.",
      });
    }

    return res.status(500).json({
      message: "Unable to create booking. Please try again.",
    });
  }
});

module.exports = router;
