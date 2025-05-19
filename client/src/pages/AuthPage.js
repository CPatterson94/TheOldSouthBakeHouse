import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/main.scss";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/register";
      const res = await fetch(`http://localhost:3002${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isLogin
            ? { email: form.email, password: form.password }
            : {
                name: form.name,
                email: form.email,
                password: form.password,
                phone: form.phone,
              }
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unknown error");
      setSuccess(
        isLogin
          ? "Login successful!"
          : "Registration successful! You can now log in."
      );
      if (isLogin) {
        // Save token to localStorage (for demo)
        localStorage.setItem("token", data.token);
        window.dispatchEvent(new Event("authchange")); // Notify navbar to update
        navigate("/");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page container">
      <div className="auth-toggle">
        <button
          className={`btn btn-primary${isLogin ? "" : " btn-secondary"}`}
          onClick={() => setIsLogin(true)}
        >
          Login
        </button>
        <button
          className={`btn btn-primary${!isLogin ? "" : " btn-secondary"}`}
          onClick={() => setIsLogin(false)}
        >
          Register
        </button>
      </div>
      <form className="auth-form" onSubmit={handleSubmit}>
        {!isLogin && (
          <>
            <label>
              Name
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required={!isLogin}
              />
            </label>
            <label>
              Phone
              <input
                type="text"
                name="phone"
                value={form.phone}
                onChange={handleChange}
              />
            </label>
          </>
        )}
        <label>
          Email
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
            minLength={6}
          />
        </label>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading
            ? isLogin
              ? "Logging in..."
              : "Registering..."
            : isLogin
            ? "Login"
            : "Register"}
        </button>
        {error && (
          <div className="error" style={{ color: "red", marginTop: 10 }}>
            {error}
          </div>
        )}
        {success && (
          <div className="success" style={{ color: "green", marginTop: 10 }}>
            {success}
          </div>
        )}
      </form>
    </div>
  );
};

export default AuthPage;
