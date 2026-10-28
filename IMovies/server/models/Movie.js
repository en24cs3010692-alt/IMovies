
const mongoose = require("mongoose");

const movieSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    genre: {
      type: [String],
      default: [],
    },
    duration: {
      type: Number,
      required: true,
    },
    language: {
      type: String,
      default: "Hindi",
    },
    releaseDate: {
      type: Date,
    },
    posterUrl: {
      type: String,
      default: "",
    },
    rating: {
      type: Number,
      min: 0,
      max: 10,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Movie", movieSchema);
