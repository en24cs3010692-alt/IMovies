
const express = require("express");
const Movie = require("../models/Movie");
const Show = require("../models/Show");
const Booking = require("../models/Booking");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

router.use(adminMiddleware);

router.get("/stats", async (req, res) => {
  try {
    const [movieCount, showCount, bookingCount, revenueResult] =
      await Promise.all([
        Movie.countDocuments(),
        Show.countDocuments(),
        Booking.countDocuments({ status: "confirmed" }),
        Booking.aggregate([
          { $match: { status: "confirmed" } },
          { $group: { _id: null, revenue: { $sum: "$totalAmount" } } },
        ]),
      ]);

    res.json({
      movieCount,
      showCount,
      bookingCount,
      totalRevenue: revenueResult[0]?.revenue || 0,
    });
  } catch (error) {
    console.error("Admin stats error:", error.message);
    res.status(500).json({ message: "Unable to load dashboard statistics." });
  }
});

module.exports = router;
