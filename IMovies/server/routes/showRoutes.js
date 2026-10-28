
const express = require("express");
const mongoose = require("mongoose");
const Show = require("../models/Show");
const Booking = require("../models/Booking");
const Movie = require("../models/Movie");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

// Get all shows
router.get("/", async (req, res) => {
  try {
    const shows = await Show.find()
      .populate("movie")
      .sort({ showDate: 1, showTime: 1 });

    res.json(shows);
  } catch (error) {
    res.status(500).json({ message: "Unable to fetch shows." });
  }
});

// Get shows for a movie
router.get("/movie/:movieId", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.movieId)) {
      return res.status(400).json({ message: "Invalid movie ID." });
    }

    const shows = await Show.find({ movie: req.params.movieId }).populate("movie");
    res.json(shows);
  } catch (error) {
    res.status(500).json({ message: "Unable to fetch shows." });
  }
});

// Create a show
router.post("/", adminMiddleware, async (req, res) => {
  try {
    const { movie, theatreName, showDate, showTime, ticketPrice, totalSeats } = req.body;

    if (
      !mongoose.isValidObjectId(movie) ||
      !theatreName?.trim() ||
      !showDate ||
      !showTime ||
      !Number.isFinite(Number(ticketPrice)) ||
      Number(ticketPrice) < 0 ||
      (totalSeats !== undefined &&
        (!Number.isInteger(Number(totalSeats)) || Number(totalSeats) < 1))
    ) {
      return res.status(400).json({ message: "Please provide valid show details." });
    }

    if (!(await Movie.exists({ _id: movie }))) {
      return res.status(404).json({ message: "Selected movie was not found." });
    }

    const show = await Show.create({
      movie,
      theatreName: theatreName.trim(),
      showDate,
      showTime,
      ticketPrice: Number(ticketPrice),
      totalSeats: totalSeats === undefined ? 60 : Number(totalSeats),
    });

    res.status(201).json(await show.populate("movie"));
  } catch (error) {
    res.status(400).json({ message: error.message || "Unable to create show." });
  }
});

// Edit show details
router.put("/:id", adminMiddleware, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid show ID." });
    }

    const show = await Show.findById(req.params.id);
    if (!show) return res.status(404).json({ message: "Show not found." });

    const { movie, theatreName, showDate, showTime, ticketPrice, totalSeats } = req.body;

    if (movie !== undefined) {
      if (!mongoose.isValidObjectId(movie) || !(await Movie.exists({ _id: movie }))) {
        return res.status(400).json({ message: "Select a valid movie." });
      }
      show.movie = movie;
    }

    if (theatreName !== undefined) {
      if (!theatreName.trim()) return res.status(400).json({ message: "Theatre name is required." });
      show.theatreName = theatreName.trim();
    }
    if (showDate !== undefined) show.showDate = showDate;
    if (showTime !== undefined) show.showTime = showTime;

    if (ticketPrice !== undefined) {
      if (!Number.isFinite(Number(ticketPrice)) || Number(ticketPrice) < 0) {
        return res.status(400).json({ message: "Ticket price must be zero or more." });
      }
      show.ticketPrice = Number(ticketPrice);
    }

    if (totalSeats !== undefined) {
      const count = Number(totalSeats);
      if (!Number.isInteger(count) || count < show.bookedSeats.length) {
        return res.status(400).json({
          message: "Total seats cannot be less than the number of already booked seats.",
        });
      }
      show.totalSeats = count;
    }

    await show.save();
    res.json(await show.populate("movie"));
  } catch (error) {
    res.status(400).json({ message: error.message || "Unable to update show." });
  }
});

// Delete a show only if it has no bookings
router.delete("/:id", adminMiddleware, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid show ID." });
    }

    const hasBookings = await Booking.exists({ show: req.params.id });
    if (hasBookings) {
      return res.status(409).json({
        message: "This show has booking records and cannot be deleted.",
      });
    }

    const show = await Show.findByIdAndDelete(req.params.id);
    if (!show) return res.status(404).json({ message: "Show not found." });

    res.json({ message: "Show deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Unable to delete show." });
  }
});

module.exports = router;
