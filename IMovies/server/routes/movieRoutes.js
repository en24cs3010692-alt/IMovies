
const express = require("express");
const mongoose = require("mongoose");
const Movie = require("../models/Movie");
const Show = require("../models/Show");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

// Get all movies
router.get("/", async (req, res) => {
  try {
    const movies = await Movie.find().sort({ createdAt: -1 });
    res.json(movies);
  } catch (error) {
    res.status(500).json({ message: "Unable to fetch movies." });
  }
});

// Get a movie by ID
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid movie ID." });
    }

    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ message: "Movie not found." });

    res.json(movie);
  } catch (error) {
    res.status(500).json({ message: "Unable to fetch movie." });
  }
});

// Add a movie
router.post("/", adminMiddleware, async (req, res) => {
  try {
    const { title, duration, genre, description, language, releaseDate, posterUrl, rating } = req.body;

    if (!title?.trim() || !Number.isFinite(Number(duration)) || Number(duration) <= 0) {
      return res.status(400).json({
        message: "A title and a positive duration are required.",
      });
    }

    const movie = await Movie.create({
      title: title.trim(),
      duration: Number(duration),
      genre: Array.isArray(genre)
        ? genre
        : String(genre || "").split(",").map((item) => item.trim()).filter(Boolean),
      description: description || "",
      language: language || "Hindi",
      releaseDate: releaseDate || undefined,
      posterUrl: posterUrl || "",
      rating: rating === "" || rating == null ? 0 : Number(rating),
    });

    res.status(201).json(movie);
  } catch (error) {
    res.status(400).json({ message: error.message || "Unable to add movie." });
  }
});

// Edit a movie
router.put("/:id", adminMiddleware, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid movie ID." });
    }

    const updates = { ...req.body };
    delete updates._id;
    delete updates.createdAt;
    delete updates.updatedAt;

    if (updates.genre && !Array.isArray(updates.genre)) {
      updates.genre = String(updates.genre)
        .split(",").map((item) => item.trim()).filter(Boolean);
    }

    if (updates.duration !== undefined) updates.duration = Number(updates.duration);
    if (updates.rating !== undefined) updates.rating = Number(updates.rating);

    const movie = await Movie.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!movie) return res.status(404).json({ message: "Movie not found." });

    res.json(movie);
  } catch (error) {
    res.status(400).json({ message: error.message || "Unable to update movie." });
  }
});

// Delete a movie only when it has no shows
router.delete("/:id", adminMiddleware, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid movie ID." });
    }

    const hasShows = await Show.exists({ movie: req.params.id });
    if (hasShows) {
      return res.status(409).json({
        message: "This movie has shows. Delete its shows first.",
      });
    }

    const movie = await Movie.findByIdAndDelete(req.params.id);
    if (!movie) return res.status(404).json({ message: "Movie not found." });

    res.json({ message: "Movie deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Unable to delete movie." });
  }
});

module.exports = router;
