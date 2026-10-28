
import { useCallback, useEffect, useState } from "react";

import api from "./api";

const emptyMovie = {
  title: "",
  description: "",
  genre: "",
  duration: "",
  language: "Hindi",
  releaseDate: "",
  posterUrl: "",
  rating: "0",
};

const emptyShow = {
  movie: "",
  theatreName: "",
  showDate: "",
  showTime: "",
  ticketPrice: "",
  totalSeats: "60",
};

function AdminDashboard({ onCreated }) {
  const [tab, setTab] = useState("movies");
  const [movies, setMovies] = useState([]);
  const [shows, setShows] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState(null);
  const [movieForm, setMovieForm] = useState(emptyMovie);
  const [showForm, setShowForm] = useState(emptyShow);
  const [editingMovie, setEditingMovie] = useState(null);
  const [editingShow, setEditingShow] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

 const loadData = useCallback(async () => {
    try {
      const [movieRes, showRes, bookingRes, statsRes] = await Promise.all([
        api.get("/movies"),
        api.get("/shows"),
        api.get("/bookings/admin/all"),
        api.get("/admin/stats"),
      ]);

      setMovies(movieRes.data);
      setShows(showRes.data);
      setBookings(bookingRes.data);
      setStats(statsRes.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load admin data. Check your admin login and API routes."
      );
    }
  }, []);

  useEffect(() => {
  const timer = setTimeout(() => {
    loadData();
  }, 0);

  return () => clearTimeout(timer);
}, [loadData]);

  function beginMovieEdit(movie) {
    setEditingMovie(movie._id);
    setMovieForm({
      title: movie.title || "",
      description: movie.description || "",
      genre: (movie.genre || []).join(", "),
      duration: String(movie.duration ?? ""),
      language: movie.language || "Hindi",
      releaseDate: movie.releaseDate
        ? String(movie.releaseDate).slice(0, 10)
        : "",
      posterUrl: movie.posterUrl || "",
      rating: String(movie.rating ?? 0),
    });
    setTab("movies");
    setMessage("");
    setError("");
  }

  function beginShowEdit(show) {
    setEditingShow(show._id);
    setShowForm({
      movie: show.movie?._id || show.movie || "",
      theatreName: show.theatreName || "",
      showDate: show.showDate || "",
      showTime: show.showTime || "",
      ticketPrice: String(show.ticketPrice ?? ""),
      totalSeats: String(show.totalSeats ?? 60),
    });
    setTab("shows");
    setMessage("");
    setError("");
  }

  async function submitMovie(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");

    try {
      const payload = {
        ...movieForm,
        duration: Number(movieForm.duration),
        rating: Number(movieForm.rating),
        genre: movieForm.genre
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      };

      if (!payload.title.trim() || payload.duration <= 0) {
        throw new Error("Enter a movie title and a positive duration.");
      }

      if (editingMovie) {
        await api.put(`/movies/${editingMovie}`, payload);
        setMessage("Movie updated successfully.");
      } else {
        await api.post("/movies", payload);
        setMessage("Movie added successfully.");
      }

      setMovieForm(emptyMovie);
      setEditingMovie(null);
      await loadData();
      if (onCreated) await onCreated();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to save movie."
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitShow(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");

    try {
      const payload = {
        ...showForm,
        ticketPrice: Number(showForm.ticketPrice),
        totalSeats: Number(showForm.totalSeats),
      };

      if (
        !payload.movie ||
        !payload.theatreName.trim() ||
        !payload.showDate ||
        !payload.showTime ||
        payload.ticketPrice < 0 ||
        payload.totalSeats < 1
      ) {
        throw new Error("Please complete all show fields with valid values.");
      }

      if (editingShow) {
        await api.put(`/shows/${editingShow}`, payload);
        setMessage("Show updated successfully.");
      } else {
        await api.post("/shows", payload);
        setMessage("Show created successfully.");
      }

      setShowForm(emptyShow);
      setEditingShow(null);
      await loadData();
      if (onCreated) await onCreated();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to save show."
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteRecord(type, id, label) {
    if (!window.confirm(`Delete this ${label}? This cannot be undone.`)) {
      return;
    }

    setMessage("");
    setError("");

    try {
      await api.delete(`/${type}/${id}`);
      setMessage(`${label} deleted successfully.`);
      await loadData();
      if (onCreated) await onCreated();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          `Unable to delete ${label.toLowerCase()}.`
      );
    }
  }

  const tabs = [
    ["stats", "Overview"],
    ["movies", "Manage Movies"],
    ["shows", "Manage Shows"],
    ["bookings", "All Bookings"],
  ];

  return (
    <section className="section admin-dashboard" id="admin-dashboard">
      <p className="eyebrow">ADMINISTRATION</p>
      <h2>Admin Dashboard</h2>
      <p>Manage the movie catalogue, show schedules and bookings.</p>

      {message && <div className="notice">{message}</div>}
      {error && <div className="notice error">{error}</div>}

      <div className="admin-tabs">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className="primary-button"
            aria-pressed={tab === key}
            onClick={() => {
              setTab(key);
              setMessage("");
              setError("");
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "stats" && (
        <div className="admin-stat-grid">
          {[
            ["Movies", stats?.movieCount],
            ["Shows", stats?.showCount],
            ["Confirmed Bookings", stats?.bookingCount],
            [
              "Booking Revenue",
              stats
                ? `₹${Number(stats.totalRevenue).toLocaleString("en-IN")}`
                : undefined,
            ],
          ].map(([label, value]) => (
            <article className="admin-stat" key={label}>
              <p>{label}</p>
              <h3>{value ?? "—"}</h3>
            </article>
          ))}
          <button type="button" className="primary-button" onClick={loadData}>
            Refresh Dashboard
          </button>
        </div>
      )}

      {tab === "movies" && (
        <>
          <h3>{editingMovie ? "Edit Movie" : "Add Movie"}</h3>
          <form className="booking-form" onSubmit={submitMovie}>
            <label className="field-label">Title</label>
            <input required value={movieForm.title}
              onChange={(e) => setMovieForm({ ...movieForm, title: e.target.value })} />

            <label className="field-label">Description</label>
            <textarea value={movieForm.description}
              onChange={(e) => setMovieForm({ ...movieForm, description: e.target.value })} />

            <label className="field-label">Genres (comma-separated)</label>
            <input value={movieForm.genre}
              onChange={(e) => setMovieForm({ ...movieForm, genre: e.target.value })}
              placeholder="Action, Drama" />

            <label className="field-label">Duration in minutes</label>
            <input required type="number" min="1" value={movieForm.duration}
              onChange={(e) => setMovieForm({ ...movieForm, duration: e.target.value })} />

            <label className="field-label">Language</label>
            <input value={movieForm.language}
              onChange={(e) => setMovieForm({ ...movieForm, language: e.target.value })} />

            <label className="field-label">Release date</label>
            <input type="date" value={movieForm.releaseDate}
              onChange={(e) => setMovieForm({ ...movieForm, releaseDate: e.target.value })} />

            <label className="field-label">Poster URL</label>
            <input type="url" value={movieForm.posterUrl}
              onChange={(e) => setMovieForm({ ...movieForm, posterUrl: e.target.value })} />

            <label className="field-label">Rating (0–10)</label>
            <input type="number" min="0" max="10" step="0.1"
              value={movieForm.rating}
              onChange={(e) => setMovieForm({ ...movieForm, rating: e.target.value })} />

            <button className="primary-button" disabled={busy} type="submit">
              {busy ? "Saving..." : editingMovie ? "Save Movie Changes" : "Add Movie"}
            </button>
            {editingMovie && (
              <button type="button" className="primary-button"
                onClick={() => { setEditingMovie(null); setMovieForm(emptyMovie); }}>
                Cancel Edit
              </button>
            )}
          </form>

          <h3>Existing Movies ({movies.length})</h3>
          <div className="admin-record-list">
            {movies.map((movie) => (
              <article className="admin-record" key={movie._id}>
                <div>
                  <strong>{movie.title}</strong>
                  <p>{movie.duration} min · {(movie.genre || []).join(", ")}</p>
                </div>
                <div className="admin-record-actions">
                  <button type="button" onClick={() => beginMovieEdit(movie)}>Edit</button>
                  <button type="button"
                    onClick={() => deleteRecord("movies", movie._id, "Movie")}>
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {tab === "shows" && (
        <>
          <h3>{editingShow ? "Edit Show" : "Create Show"}</h3>
          <form className="booking-form" onSubmit={submitShow}>
            <label className="field-label">Movie</label>
            <select required value={showForm.movie}
              onChange={(e) => setShowForm({ ...showForm, movie: e.target.value })}>
              <option value="">Select a movie</option>
              {movies.map((movie) => (
                <option key={movie._id} value={movie._id}>{movie.title}</option>
              ))}
            </select>

            <label className="field-label">Theatre name</label>
            <input required value={showForm.theatreName}
              onChange={(e) => setShowForm({ ...showForm, theatreName: e.target.value })} />

            <label className="field-label">Show date</label>
            <input required type="date" value={showForm.showDate}
              onChange={(e) => setShowForm({ ...showForm, showDate: e.target.value })} />

            <label className="field-label">Show time</label>
            <input required type="time" value={showForm.showTime}
              onChange={(e) => setShowForm({ ...showForm, showTime: e.target.value })} />

            <label className="field-label">Ticket price (₹)</label>
            <input required type="number" min="0" step="0.01"
              value={showForm.ticketPrice}
              onChange={(e) => setShowForm({ ...showForm, ticketPrice: e.target.value })} />

            <label className="field-label">Total seats</label>
            <input required type="number" min="1" step="1"
              value={showForm.totalSeats}
              onChange={(e) => setShowForm({ ...showForm, totalSeats: e.target.value })} />

            <button className="primary-button" disabled={busy} type="submit">
              {busy ? "Saving..." : editingShow ? "Save Show Changes" : "Create Show"}
            </button>
            {editingShow && (
              <button type="button" className="primary-button"
                onClick={() => { setEditingShow(null); setShowForm(emptyShow); }}>
                Cancel Edit
              </button>
            )}
          </form>

          <h3>Existing Shows ({shows.length})</h3>
          <div className="admin-record-list">
            {shows.map((show) => (
              <article className="admin-record" key={show._id}>
                <div>
                  <strong>{show.movie?.title || "Movie unavailable"}</strong>
                  <p>{show.theatreName} · {show.showDate} · {show.showTime}</p>
                  <p>₹{show.ticketPrice} · {show.bookedSeats?.length || 0}/{show.totalSeats} seats booked</p>
                </div>
                <div className="admin-record-actions">
                  <button type="button" onClick={() => beginShowEdit(show)}>Edit</button>
                  <button type="button"
                    onClick={() => deleteRecord("shows", show._id, "Show")}>
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {tab === "bookings" && (
        <>
          <h3>All Bookings ({bookings.length})</h3>
          <button type="button" className="primary-button" onClick={loadData}>
            Refresh Bookings
          </button>
          <div className="admin-record-list">
            {bookings.map((booking) => (
              <article className="admin-record" key={booking._id}>
                <div>
                  <strong>{booking.bookingId}</strong>
                  <p>{booking.userEmail}</p>
                  <p>{booking.show?.movie?.title || "Movie unavailable"} · {booking.show?.theatreName || "Theatre unavailable"}</p>
                  <p>Seats: {(booking.seats || []).join(", ")}</p>
                  <p>Amount: ₹{booking.totalAmount} · Status: {booking.status}</p>
                  <p>{booking.createdAt ? new Date(booking.createdAt).toLocaleString() : ""}</p>
                </div>
              </article>
            ))}
            {bookings.length === 0 && <p>No bookings found.</p>}
          </div>
        </>
      )}
    </section>
  );
}

export default AdminDashboard;
