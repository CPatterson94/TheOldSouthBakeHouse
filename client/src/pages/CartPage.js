import React, { useState, useEffect } from "react";

const initialGuest = { name: "", email: "" };

const CartPage = () => {
  const [cart, setCart] = useState([]);
  const [guest, setGuest] = useState(initialGuest);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [orderStatus, setOrderStatus] = useState("");
  const [error, setError] = useState("");
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [itemToRemove, setItemToRemove] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);

    if (token) {
      // User is logged in - fetch from database and sync localStorage cart
      syncAndLoadCart();
    } else {
      // User is not logged in - load from localStorage
      loadLocalStorageCart();
    }
  }, []);

  const loadLocalStorageCart = () => {
    const savedCartString = localStorage.getItem("cart");
    if (savedCartString) {
      try {
        const parsedCart = JSON.parse(savedCartString);
        if (Array.isArray(parsedCart)) {
          setCart(parsedCart);
        } else {
          console.error(
            "Cart data in localStorage is invalid (not an array). Resetting."
          );
          localStorage.setItem("cart", JSON.stringify([]));
          setCart([]);
        }
      } catch (error) {
        console.error(
          "Failed to parse cart data from localStorage. Resetting.",
          error
        );
        localStorage.setItem("cart", JSON.stringify([]));
        setCart([]);
      }
    } else {
      setCart([]);
    }
  };

  const syncAndLoadCart = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      // First, sync any localStorage cart items to database
      const localCart = JSON.parse(localStorage.getItem("cart")) || [];
      if (localCart.length > 0) {
        await fetch("http://localhost:3002/cart/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ items: localCart }),
        });

        // Clear localStorage cart after syncing
        localStorage.removeItem("cart");
      }

      // Then fetch the current cart from database
      const response = await fetch("http://localhost:3002/cart", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCart(data.items);
      } else {
        console.error("Failed to fetch cart from database");
        setCart([]);
      }
    } catch (error) {
      console.error("Error syncing/loading cart:", error);
      setCart([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === "cart" && !isLoggedIn) {
        // Only listen to localStorage changes if user is not logged in
        const newValue = e.newValue;
        if (newValue === null) {
          setCart([]);
        } else {
          try {
            const parsedCart = JSON.parse(newValue);
            if (Array.isArray(parsedCart)) {
              setCart(parsedCart);
            } else {
              console.error(
                "Invalid cart data from storage event (not an array)."
              );
              setCart([]);
            }
          } catch (err) {
            console.error("Failed to parse cart data from storage event.", err);
            setCart([]);
          }
        }
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [isLoggedIn]);

  // Listen for login/logout events
  useEffect(() => {
    const handleAuthChange = () => {
      const token = localStorage.getItem("token");
      const newIsLoggedIn = !!token;

      if (newIsLoggedIn !== isLoggedIn) {
        setIsLoggedIn(newIsLoggedIn);

        if (newIsLoggedIn) {
          // User just logged in
          syncAndLoadCart();
        } else {
          // User just logged out - switch to localStorage
          loadLocalStorageCart();
        }
      }
    };

    window.addEventListener("storage", handleAuthChange);
    window.addEventListener("cartchange", handleAuthChange);

    return () => {
      window.removeEventListener("storage", handleAuthChange);
      window.removeEventListener("cartchange", handleAuthChange);
    };
  }, [isLoggedIn]);

  const handleGuestChange = (e) => {
    setGuest({ ...guest, [e.target.name]: e.target.value });
  };

  const handleIncreaseQuantity = async (itemId) => {
    if (isLoggedIn) {
      // Update database cart
      try {
        const token = localStorage.getItem("token");
        const item = cart.find((item) => item.id === itemId);

        await fetch("http://localhost:3002/cart/update", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            productId: itemId,
            quantity: item.quantity + 1,
          }),
        });

        // Update local state
        setCart((prevCart) =>
          prevCart.map((item) =>
            item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item
          )
        );

        window.dispatchEvent(new Event("cartchange"));
      } catch (error) {
        console.error("Error updating cart:", error);
      }
    } else {
      // Update localStorage cart
      setCart((prevCart) => {
        const newCart = prevCart.map((item) =>
          item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item
        );
        localStorage.setItem("cart", JSON.stringify(newCart));
        window.dispatchEvent(new Event("cartchange"));
        return newCart;
      });
    }
  };

  const handleDecreaseQuantity = async (itemId) => {
    if (isLoggedIn) {
      // Update database cart
      try {
        const token = localStorage.getItem("token");
        const item = cart.find((item) => item.id === itemId);
        const newQuantity = Math.max(1, item.quantity - 1);

        await fetch("http://localhost:3002/cart/update", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            productId: itemId,
            quantity: newQuantity,
          }),
        });

        // Update local state
        setCart((prevCart) =>
          prevCart.map((item) =>
            item.id === itemId ? { ...item, quantity: newQuantity } : item
          )
        );

        window.dispatchEvent(new Event("cartchange"));
      } catch (error) {
        console.error("Error updating cart:", error);
      }
    } else {
      // Update localStorage cart
      setCart((prevCart) => {
        const newCart = prevCart.map((item) =>
          item.id === itemId
            ? { ...item, quantity: Math.max(1, item.quantity - 1) }
            : item
        );
        localStorage.setItem("cart", JSON.stringify(newCart));
        window.dispatchEvent(new Event("cartchange"));
        return newCart;
      });
    }
  };

  const handleRemoveItem = async (itemId) => {
    if (isLoggedIn) {
      // Remove from database cart
      try {
        const token = localStorage.getItem("token");

        await fetch("http://localhost:3002/cart/remove", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            productId: itemId,
          }),
        });

        // Update local state
        setCart((prevCart) => prevCart.filter((item) => item.id !== itemId));
        window.dispatchEvent(new Event("cartchange"));
      } catch (error) {
        console.error("Error removing from cart:", error);
      }
    } else {
      // Remove from localStorage cart
      setCart((prevCart) => {
        const newCart = prevCart.filter((item) => item.id !== itemId);
        localStorage.setItem("cart", JSON.stringify(newCart));
        window.dispatchEvent(new Event("cartchange"));
        return newCart;
      });
    }
  };

  const handleRemoveAllClick = (itemId) => {
    setItemToRemove(itemId);
    setShowRemoveModal(true);
  };

  const confirmRemoveAll = () => {
    if (itemToRemove) {
      handleRemoveItem(itemToRemove);
    }
    setShowRemoveModal(false);
    setItemToRemove(null);
  };

  const cancelRemoveAll = () => {
    setShowRemoveModal(false);
    setItemToRemove(null);
  };

  const handleOrder = async () => {
    setOrderStatus("");
    setError("");
    if (!isLoggedIn && (!guest.name || !guest.email)) {
      setError("Name and email are required for guest checkout.");
      return;
    }

    try {
      const orderPayload = {
        items: cart,
        guest: isLoggedIn ? null : guest,
      };

      const res = await fetch("http://localhost:3002/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(isLoggedIn && {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          }),
        },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Order failed");

      setOrderStatus("Order placed successfully!");

      // Clear cart after successful order
      if (isLoggedIn) {
        // Clear database cart
        const token = localStorage.getItem("token");
        await fetch("http://localhost:3002/cart/clear", {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } else {
        // Clear localStorage cart
        localStorage.removeItem("cart");
      }

      setCart([]);
      window.dispatchEvent(new Event("cartchange"));
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="cart-page container">
        <h2>Your Cart</h2>
        <p>Loading cart...</p>
      </div>
    );
  }

  return (
    <div className="cart-page container">
      <h2>Your Cart</h2>
      {cart.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <>
          <table style={{ width: "100%", marginTop: 20 }}>
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Actions</th> {/* Changed header from Remove to Actions */}
              </tr>
            </thead>
            <tbody>
              {cart.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>
                    {item.quantity > 1 && (
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => handleDecreaseQuantity(item.id)}
                        style={{ marginRight: "5px" }}
                      >
                        -
                      </button>
                    )}
                    <span
                      style={{
                        margin: "0 8px",
                        display: "inline-block",
                        minWidth: "20px",
                        textAlign: "center",
                      }}
                    >
                      {item.quantity}
                    </span>
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => handleIncreaseQuantity(item.id)}
                      style={{ marginLeft: "5px" }}
                    >
                      +
                    </button>
                  </td>
                  <td>${(item.price * item.quantity).toFixed(2)}</td>
                  <td>
                    {item.quantity === 1 && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        Remove
                      </button>
                    )}
                    {item.quantity >= 2 && (
                      <button
                        className="btn btn-warning btn-sm" // Changed to warning for differentiation
                        onClick={() => handleRemoveAllClick(item.id)}
                      >
                        Remove All
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div
            style={{ textAlign: "right", marginTop: 10, fontWeight: "bold" }}
          >
            Total: $
            {cart
              .reduce((sum, item) => sum + item.price * item.quantity, 0)
              .toFixed(2)}
          </div>
        </>
      )}
      {!isLoggedIn && cart.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3>Guest Checkout</h3>
          <label>
            Name
            <input
              type="text"
              name="name"
              value={guest.name}
              onChange={handleGuestChange}
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              name="email"
              value={guest.email}
              onChange={handleGuestChange}
              required
            />
          </label>
        </div>
      )}
      {error && <div style={{ color: "red", marginTop: 10 }}>{error}</div>}
      {orderStatus && (
        <div style={{ color: "green", marginTop: 10 }}>{orderStatus}</div>
      )}
      {cart.length > 0 && (
        <button
          className="btn btn-primary"
          style={{ marginTop: 20 }}
          onClick={handleOrder}
        >
          Place Order
        </button>
      )}

      {/* Remove All Confirmation Modal */}
      {showRemoveModal && (
        <div
          className="modal show"
          style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Removal</h5>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete all items?</p>
              </div>
              <div
                className="modal-footer"
                style={{ display: "flex", justifyContent: "space-evenly" }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={cancelRemoveAll}
                >
                  No
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={confirmRemoveAll}
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
