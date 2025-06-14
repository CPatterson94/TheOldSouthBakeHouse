import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import "./Navbar.scss";

const Navbar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0); // New state for cart item count

  // Helper function to get cart item count from localStorage
  const getCartItemCount = useCallback(() => {
    const cartString = localStorage.getItem("cart");
    if (cartString) {
      try {
        const cart = JSON.parse(cartString);
        if (Array.isArray(cart)) {
          // Sums up the quantity of each item in the cart
          return cart.reduce(
            (total, item) => total + (Number(item.quantity) || 0),
            0
          );
        }
      } catch (e) {
        console.error("Error parsing cart for count:", e);
      }
    }
    return 0;
  }, []);

  useEffect(() => {
    // Combined function to update all relevant states from localStorage or events
    const updateAllStates = () => {
      // Update login and admin state
      const token = localStorage.getItem("token");
      setIsLoggedIn(!!token);
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          setIsAdmin(!!payload.isAdmin);
        } catch {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      // Update cart item count
      setCartItemCount(getCartItemCount());
    };

    updateAllStates(); // Initial call to set states

    // Handles 'storage' events (changes in other tabs/windows)
    const handleStorageEvent = (event) => {
      if (event.key === "token" || event.key === "cart" || event.key === null) {
        updateAllStates();
      }
    };

    // Listen to general storage events, custom authchange event, and custom cartchange event
    window.addEventListener("storage", handleStorageEvent);
    window.addEventListener("authchange", updateAllStates); // Fired on login/logout
    window.addEventListener("cartchange", updateAllStates); // Fired when cart is modified

    return () => {
      window.removeEventListener("storage", handleStorageEvent);
      window.removeEventListener("authchange", updateAllStates);
      window.removeEventListener("cartchange", updateAllStates);
    };
  }, [getCartItemCount]); // getCartItemCount is stable due to useCallback

  // The old syncLoginState function is now integrated into updateAllStates.

  const handleLogout = () => {
    localStorage.removeItem("token");
    // setIsLoggedIn and setIsAdmin will be updated by the 'authchange' event listener
    window.dispatchEvent(new Event("authchange")); // Notify other components/tabs
    // Consider if cart should be cleared on logout. If so, do it here:
    // localStorage.removeItem("cart");
    // window.dispatchEvent(new Event("cartchange"));
    window.location.href = "/"; // Or use navigate hook for SPA-style navigation
  };

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <Link to="/">
          <img
            src={
              process.env.PUBLIC_URL + "/OldSouthBakeHouseLogoTransparent.png"
            }
            alt="The Old South Bake House Logo"
            style={{ height: 40, marginRight: 10, verticalAlign: "middle" }}
          />
          The Old South Bakehouse
        </Link>
      </div>
      <ul className="navbar-links">
        <li>
          <Link to="/">Home</Link>
        </li>
        <li>
          <Link to="/products">Products</Link>
        </li>
        <li>
          <Link to="/about">About</Link>
        </li>
        <li>
          <Link to="/pickup">Pickup Locations</Link>
        </li>
        <li>
          <Link to="/cart">
            Cart {cartItemCount > 0 && `(${cartItemCount})`}
          </Link>
        </li>
        {isAdmin && (
          <li>
            <Link to="/admin">Admin Dashboard</Link>
          </li>
        )}
        {isLoggedIn ? (
          <>
            <li>
              <Link to="/account">Account</Link>
            </li>
            <li>
              <button className="navbar-login-btn" onClick={handleLogout}>
                Logout
              </button>
            </li>
          </>
        ) : (
          <li>
            <Link to="/login" className="navbar-login-btn">
              Login / Register
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
