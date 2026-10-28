
const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      required: true,
      unique: true,
    },
    userEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    show: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Show",
      required: true,
    },
    seats: {
      type: [String],
      required: true,
      validate: {
        validator: (seats) => seats.length > 0,
        message: "At least one seat must be selected",
      },
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["confirmed", "cancelled"],
      default: "confirmed",
    },
    paymentStatus: {
  type: String,
  enum: ["pending", "paid", "failed", "refunded"],
  default: "paid",
},
ticketRef: {
  type: String,
  unique: true,
  sparse: true,
},
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
