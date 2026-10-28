
import { useEffect, useState } from "react";
import api from "./api";
import "./App.css";
import Auth from "./Auth";
import AdminDashboard from "./AdminDashboard";
import PaymentCheckout from "./PaymentCheckout";
import TicketQRCode from "./TicketQRCode";
const seatRows = "ABCDEFGHIJ".split("");
const seatNumbers = [1, 2, 3, 4, 5, 6];

function App() {
  const [movies, setMovies] = useState([]);
  const [shows, setShows] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [selectedShowId, setSelectedShowId] = useState("");
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);
  const [myBookings, setMyBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("imoviesUser")) || null;
    } catch {
      return null;
    }
  });

  const selectedShow = shows.find(
    (show) => show._id === selectedShowId
  );
  
const allGenres = [
  ...new Set(
    movies.flatMap((movie) =>
      Array.isArray(movie.genre) ? movie.genre : []
    )
  ),
].sort();

const filteredMovies = movies.filter((movie) => {
  const matchesSearch = movie.title
    .toLowerCase()
    .includes(searchTerm.trim().toLowerCase());

  const matchesGenre =
    selectedGenre === "All" ||
    (movie.genre || []).includes(selectedGenre);

  return matchesSearch && matchesGenre;
});

  function handleLogout() {
    localStorage.removeItem("imoviesToken");
    localStorage.removeItem("imoviesUser");
    setCurrentUser(null);
    setMyBookings([]);
    setSelectedTicket(null);
    setMessage("");
    setError("");
    setBookingsError("");
  }

  async function fetchMyBookings() {
    if (!currentUser) {
      setBookingsError("Please log in to view your bookings.");
      return;
    }

    setBookingsLoading(true);
    setBookingsError("");

    try {
      const response = await api.get("/bookings");
      setMyBookings(response.data);
    } catch (err) {
      setBookingsError(
        err.response?.data?.message ||
          "Unable to load bookings. Please try again."
      );
    } finally {
      setBookingsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const [movieResponse, showResponse] = await Promise.all([
          api.get("/movies"),
          api.get("/shows"),
        ]);

        if (!cancelled) {
          setMovies(movieResponse.data);
          setShows(showResponse.data);
          setSelectedShowId(showResponse.data[0]?._id || "");
        }
      } catch {
        if (!cancelled) {
          setError(
            "Unable to load movies or shows. Check your backend."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, []);

  function toggleSeat(seat) {
    if (!currentUser) {
      setError("Please log in before booking tickets.");
      return;
    }

    if (!selectedShow || selectedShow.bookedSeats?.includes(seat)) {
      return;
    }

    setSelectedSeats((current) =>
      current.includes(seat)
        ? current.filter((item) => item !== seat)
        : [...current, seat]
    );

    setMessage("");
    setError("");
  }

  function chooseShow(showId) {
    setSelectedShowId(showId);
    setSelectedSeats([]);
    setMessage("");
    setError("");
  }

  function bookTickets(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!currentUser) {
      setError("Please log in before booking tickets.");
      return;
    }

    if (!selectedShow || selectedSeats.length === 0) {
      setError("Please select at least one seat.");
      return;
    }

    // PaymentCheckout handles the demo checkout after seat selection.
    setShowCheckout(true);
  }

  async function handleCheckoutSuccess(newBooking) {
    setShowCheckout(false);
    setSelectedSeats([]);
    setMessage(
      `Booking confirmed! Booking ID: ${
        newBooking?.bookingId || newBooking?._id || "Confirmed"
      }`
    );

    await loadData();

    try {
      const response = await api.get("/bookings");
      setMyBookings(response.data);
      const savedBooking = response.data.find(
        (item) =>
          item._id === newBooking?._id ||
          item.bookingId === newBooking?.bookingId
      );
      setSelectedTicket(savedBooking || newBooking || null);
    } catch {
      // The booking succeeded; the user can load their tickets manually.
    }
  }

  async function cancelBooking(booking) {
    const bookingId = booking?.bookingId;
    if (!bookingId) {
      setBookingsError("This booking has no booking reference to cancel.");
      return;
    }

    const confirmed = window.confirm(
      "Cancel this booking? In this demo, the seats will be released. No real payment refund is processed."
    );
    if (!confirmed) return;

    setBookingsError("");
    try {
      await api.patch(
        `/bookings/${encodeURIComponent(bookingId)}/cancel`
      );
      setMessage(`Booking ${bookingId} was cancelled.`);
      if (selectedTicket?.bookingId === bookingId) {
        setSelectedTicket(null);
      }
      await loadData();
      await fetchMyBookings();
    } catch (err) {
      setBookingsError(
        err.response?.data?.message || "Unable to cancel this booking."
      );
    }
  }

  async function loadData() {
    try {
      const [movieResponse, showResponse] = await Promise.all([
        api.get("/movies"),
        api.get("/shows"),
      ]);

      setMovies(movieResponse.data);
      setShows(showResponse.data);

      setSelectedShowId((current) =>
        current && showResponse.data.some((show) => show._id === current)
          ? current
          : showResponse.data[0]?._id || ""
      );

      setError("");
    } catch {
      setError("Unable to refresh movies or shows.");
    }
  }

  const bookedSeats = selectedShow?.bookedSeats || [];
  const ticketPrice = selectedShow?.ticketPrice || 0;

  return (
    <div className="app">
      <nav className="navbar">
        <a className="brand" href="#home">
          iMovies<span>.</span>
        </a>

        
<div className="nav-links">
  <a href="#home">Home</a>
  <a href="#movies">Movies</a>
  <a href="#booking">Book Tickets</a>
  <a href="#my-bookings">My Bookings</a>
  <a href="#account">Account</a>

  {currentUser?.role === "admin" && (
    <a href="#admin-dashboard">Admin Dashboard</a>
  )}
</div>
</nav>


      <header className="hero" id="home">
        <p className="eyebrow">YOUR MOVIE. YOUR MOMENT.</p>
        <h1>
          Big Screen.
          <br />
          <span>Big Experience.</span>
        </h1>
        <p>Discover movies and reserve your favourite seats.</p>
        <a className="primary-button" href="#booking">
          Book a Ticket
        </a>
      </header>

      <main>
        {currentUser ? (
          <section className="section" id="account">
            <p className="eyebrow">YOUR IMOVIES ACCOUNT</p>
            <h2>Welcome, {currentUser.name}!</h2>
            <p>{currentUser.email}</p>

            <button
              className="primary-button"
              type="button"
              onClick={handleLogout}
            >
              Log Out
            </button>
          </section>
        ) : (
          <section className="section" id="account">
            <p className="eyebrow">YOUR IMOVIES ACCOUNT</p>
            <h2>Sign in to iMovies</h2>
            <p>Log in or create an account to book your tickets.</p>
            <Auth onLogin={setCurrentUser} />
          </section>
        )}
        {currentUser?.role === "admin" && (
  <AdminDashboard onCreated={loadData} />
)}
        <section className="section" id="movies">
          <p className="eyebrow">NOW SHOWING</p>
          <h2>Explore Movies</h2>
          
<div className="movie-filters">
  <input
    type="text"
    className="movie-search"
    placeholder="Search movies by title..."
    value={searchTerm}
    onChange={(event) => setSearchTerm(event.target.value)}
    aria-label="Search movies by title"
  />

  <select
    className="genre-select"
    value={selectedGenre}
    onChange={(event) => setSelectedGenre(event.target.value)}
    aria-label="Filter movies by genre"
  >
    <option value="All">All Genres</option>
    {allGenres.map((genre) => (
      <option value={genre} key={genre}>
        {genre}
      </option>
    ))}
  </select>
</div>

          {loading ? (
            <p>Loading movies...</p>
          ) : movies.length === 0 ? (
  <p>No movies have been added yet.</p>
) : filteredMovies.length === 0 ? (
  <p className="seat-note">
    No movies match your search or selected genre.
  </p>
) : (
            <div className="movie-grid">
              {filteredMovies.map((movie) => (
                <article className="movie-card" key={movie._id}>
                  {movie.posterUrl ? (
                    <img src={movie.posterUrl} alt={movie.title} />
                  ) : (
                    <div className="poster-placeholder">iM</div>
                  )}

                  <div className="movie-info">
                    <h3>{movie.title}</h3>
                    <p>
                      {movie.genre?.join(" · ") || "Feature Film"}
                    </p>
                    <p>
                      {movie.language} · {movie.duration} min
                    </p>
                    <span className="rating">
                      ★ {movie.rating ?? "N/A"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="section booking-section" id="booking">
          <p className="eyebrow">YOUR NEXT MOVIE NIGHT</p>
          <h2>Select Your Seats</h2>

          {error && <div className="notice error">{error}</div>}
          {message && <div className="notice success">{message}</div>}

          {!currentUser && (
            <p className="seat-note">
              Please log in to reserve your seats.
            </p>
          )}

          {loading ? (
            <p>Loading available shows...</p>
          ) : shows.length === 0 ? (
            <p>
              No shows are available. Add a show using Thunder Client first.
            </p>
          ) : (
            <>
              <label className="field-label" htmlFor="show">
                Choose a show
              </label>

              <select
                id="show"
                className="show-select"
                value={selectedShowId}
                onChange={(event) => chooseShow(event.target.value)}
              >
                {shows.map((show) => (
                  <option value={show._id} key={show._id}>
                    {(typeof show.movie === "object"
                      ? show.movie?.title
                      : "Movie") || "Movie"}{" "}
                    — {show.theatreName} — {show.showDate} at{" "}
                    {show.showTime} — ₹{show.ticketPrice}
                  </option>
                ))}
              </select>

              {selectedShow && (
                <>
                  <div className="show-details">
                    <div>
                      <h3>
                        {typeof selectedShow.movie === "object"
                          ? selectedShow.movie?.title
                          : "Selected Movie"}
                      </h3>
                      <p>{selectedShow.theatreName}</p>
                      <p>
                        {selectedShow.showDate} · {selectedShow.showTime}
                      </p>
                    </div>

                    <div className="price">
                      ₹{ticketPrice}
                      <small> / seat</small>
                    </div>
                  </div>

                  <div className="seat-panel">
                    <div className="screen">SCREEN THIS WAY</div>

                    <div className="seat-legend">
                      <span>
                        <i className="legend-seat available" /> Available
                      </span>
                      <span>
                        <i className="legend-seat selected" /> Selected
                      </span>
                      <span>
                        <i className="legend-seat booked" /> Booked
                      </span>
                    </div>

                    <div className="seat-grid">
                      {seatRows.map((row) => (
                        <div className="seat-row" key={row}>
                          <span className="row-label">{row}</span>

                          {seatNumbers.map((number) => {
                            const seat = `${row}${number}`;
                            const isBooked = bookedSeats.includes(seat);
                            const isSelected =
                              selectedSeats.includes(seat);

                            return (
                              <button
                                type="button"
                                key={seat}
                                className={`seat ${
                                  isBooked
                                    ? "booked"
                                    : isSelected
                                      ? "selected"
                                      : "available"
                                }`}
                                disabled={isBooked || !currentUser}
                                aria-pressed={isSelected}
                                title={
                                  isBooked
                                    ? "Already booked"
                                    : `Seat ${seat}`
                                }
                                onClick={() => toggleSeat(seat)}
                              >
                                {number}
                              </button>
                            );
                          })}

                          <span className="row-label">{row}</span>
                        </div>
                      ))}
                    </div>

                    <p className="seat-note">
                      {bookedSeats.length} booked seat(s) shown for this
                      show.
                    </p>
                  </div>

                  <div className="booking-form">
                    <div className="booking-summary">
                      <div>
                        <span>Selected seats</span>
                        <strong>
                          {selectedSeats.length
                            ? selectedSeats.join(", ")
                            : "None"}
                        </strong>
                      </div>

                      <div>
                        <span>Total amount</span>
                        <strong>
                          ₹{selectedSeats.length * ticketPrice}
                        </strong>
                      </div>
                    </div>

                    {!showCheckout ? (
                      <button
                        className="primary-button book-button"
                        type="button"
                        disabled={selectedSeats.length === 0 || !currentUser}
                        onClick={bookTickets}
                      >
                        Continue to Checkout
                      </button>
                    ) : (
                      <PaymentCheckout
                        showId={selectedShow._id}
                        seats={selectedSeats}
                        onSuccess={handleCheckoutSuccess}
                        onCancel={() => setShowCheckout(false)}
                      />
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </section>

        <section className="section" id="my-bookings">
          <p className="eyebrow">YOUR TICKETS</p>
          <h2>My Bookings</h2>
          <p>View your confirmed bookings and digital tickets here.</p>

          {currentUser ? (
            <button
              className="primary-button book-button"
              type="button"
              onClick={fetchMyBookings}
              disabled={bookingsLoading}
            >
              {bookingsLoading ? "Loading..." : "Load My Tickets"}
            </button>
          ) : (
            <p className="seat-note">
              Please log in to view your bookings.
            </p>
          )}

          {bookingsError && (
            <div className="notice error">{bookingsError}</div>
          )}

          {currentUser &&
            !bookingsLoading &&
            myBookings.length === 0 &&
            !bookingsError && (
              <p className="seat-note">
                Click "Load My Tickets" to view your bookings.
              </p>
            )}

          <div className="movie-grid">
            {myBookings.map((booking) => {
              const show = booking.show;
              const movie =
                show && typeof show.movie === "object"
                  ? show.movie
                  : null;

              
return (
  <article className="movie-card booking-card" key={booking._id}>
    <div className="movie-info">
      <h3>{movie?.title || "Movie Ticket"}</h3>

      <p>{show?.theatreName || "Theatre details unavailable"}</p>

      <p>
        {show?.showDate || "Date unavailable"}
        {show?.showTime ? ` · ${show.showTime}` : ""}
      </p>

      <p>
        Seats: {booking.seats?.join(", ") || "Not available"}
      </p>

      <p>Booking ID: {booking.bookingId || booking._id}</p>

      <p>Total: ₹{booking.totalAmount}</p>

      <p className={`booking-status ${booking.status || "confirmed"}`}>
        Status: {booking.status || "confirmed"}
      </p>

      <div className="booking-actions">
        <button
          className="primary-button"
          type="button"
          onClick={() => setSelectedTicket(booking)}
        >
          View Ticket
        </button>

        {booking.status === "confirmed" && (
          <button
            className="primary-button cancel-button"
            type="button"
            onClick={() => cancelBooking(booking)}
          >
            Cancel Booking
          </button>
        )}
      </div>
    </div>
  </article>
);
            })}
          </div>

          {/* DIGITAL TICKET MODAL */}
          {selectedTicket && (
            <div
              className="ticket-overlay"
              onClick={(event) => {
                if (event.target === event.currentTarget) {
                  setSelectedTicket(null);
                }
              }}
            >
              <div
                className="digital-ticket"
                role="dialog"
                aria-modal="true"
                aria-labelledby="ticket-title"
              >
                <button
                  className="ticket-close"
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  aria-label="Close ticket"
                >
                  ×
                </button>

                <p className="eyebrow">IMOVIES · DIGITAL TICKET</p>

                <h2 id="ticket-title">
                  {selectedTicket.show?.movie?.title || "Movie Ticket"}
                </h2>

                <p className="ticket-status">
                  {selectedTicket.status || "Confirmed"}
                </p>

                <div className="ticket-divider" />

                <div className="ticket-details">
                  <div>
                    <span>THEATRE</span>
                    <strong>
                      {selectedTicket.show?.theatreName || "N/A"}
                    </strong>
                  </div>

                  <div>
                    <span>DATE</span>
                    <strong>
                      {selectedTicket.show?.showDate || "N/A"}
                    </strong>
                  </div>

                  <div>
                    <span>SHOW TIME</span>
                    <strong>
                      {selectedTicket.show?.showTime || "N/A"}
                    </strong>
                  </div>

                  <div>
                    <span>SEATS</span>
                    <strong>
                      {selectedTicket.seats?.join(", ") || "N/A"}
                    </strong>
                  </div>

                  <div>
                    <span>BOOKING ID</span>
                    <strong>
                      {selectedTicket.bookingId || selectedTicket._id}
                    </strong>
                  </div>

                  <div>
                    <span>TOTAL AMOUNT</span>
                    <strong>₹{selectedTicket.totalAmount}</strong>
                  </div>
                </div>

                {selectedTicket.ticketRef &&
                  selectedTicket.status === "confirmed" &&
                  selectedTicket.paymentStatus === "paid" && (
                    <TicketQRCode ticketRef={selectedTicket.ticketRef} />
                  )}

                <p className="ticket-footer">
                  Thank you for booking with iMovies. Enjoy the show!
                </p>

                <button
                  className="primary-button"
                  type="button"
                  onClick={() => window.print()}
                >
                  Print Ticket
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      <footer>
        © {new Date().getFullYear()} iMovies. Enjoy the show.
      </footer>
    </div>
  );
}

export default App;
