
import { useState } from "react";
import api from "./api";

function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/register";

      const response = await api.post(endpoint, {
        ...(isLogin ? {} : { name }),
        email: email.trim().toLowerCase(),
        password,
      });

      const { token, user } = response.data;

      localStorage.setItem("imoviesToken", token);
      localStorage.setItem("imoviesUser", JSON.stringify(user));

      onLogin(user);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Authentication failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section auth-section" id="account">
      <p className="eyebrow">YOUR IMOVIES ACCOUNT</p>
      <h2>{isLogin ? "Welcome Back" : "Create Your Account"}</h2>
      <p>
        {isLogin
          ? "Log in to access your account."
          : "Register to get started with IMovies."}
      </p>

      {error && <div className="notice error">{error}</div>}

      <form className="booking-form" onSubmit={handleSubmit}>
        {!isLogin && (
          <>
            <label className="field-label" htmlFor="auth-name">
              Full name
            </label>
            <input
              id="auth-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
            />
          </>
        )}

        <label className="field-label" htmlFor="auth-email">
          Email address
        </label>
        <input
          id="auth-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />

        <label className="field-label" htmlFor="auth-password">
          Password
        </label>
        <input
          id="auth-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          placeholder="At least 8 characters"
          required
        />

        <button
          className="primary-button book-button"
          type="submit"
          disabled={loading}
          style={{ marginTop: 14 }}
        >
          {loading
            ? "Please wait..."
            : isLogin
              ? "Log In"
              : "Create Account"}
        </button>
      </form>

      <p>
        {isLogin ? "New to IMovies?" : "Already have an account?"}{" "}
        <button
          type="button"
          className="auth-switch"
          onClick={() => {
            setIsLogin(!isLogin);
            setError("");
          }}
        >
          {isLogin ? "Register" : "Log In"}
        </button>
      </p>
    </section>
  );
}

export default Auth;
