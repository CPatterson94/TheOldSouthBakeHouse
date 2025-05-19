import React, { useState, useEffect } from "react";

const initialGuest = { name: "", email: "" };

const getInitialCart = () => {
  const savedCartString = localStorage.getItem("cart");
  if (savedCartString) {
    try {
      const parsedCart = JSON.parse(savedCartString);
      if (Array.isArray(parsedCart)) {
        return parsedCart;
      }
      console.error(
        "Cart data in localStorage is invalid (not an array). Resetting."
      );
      localStorage.setItem("cart", JSON.stringify([])); // Clear invalid data
      return [];
    } catch (error) {
      console.error(
        "Failed to parse cart data from localStorage. Resetting.",
        error
      );
      localStorage.setItem("cart", JSON.stringify([])); // Clear invalid data
      return [];
    }
  }
  return []; // No cart in localStorage
};

const CartPage = () => {
  const [cart, setCart] = useState(getInitialCart);
  const [guest, setGuest] = useState(initialGuest);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [orderStatus, setOrderStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("token"));
    // Cart loading is now handled by useState(getInitialCart)
  }, []);

  useEffect(() => {
    // This effect syncs the `cart` state to localStorage whenever it changes.
    // This is important for changes made within CartPage (e.g., remove)
    // or by the storage event listener.
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === "cart") {
        const newValue = e.newValue;
        if (newValue === null) {
          // Cart was cleared or removed in another tab/window
          setCart([]);
        } else {
          try {
            const parsedCart = JSON.parse(newValue);
            if (Array.isArray(parsedCart)) {
              setCart(parsedCart);
            } else {
              // Invalid data from storage event, reset cart
              console.error(
                "Invalid cart data from storage event (not an array)."
              );
              setCart([]);
            }
          } catch (err) {
            // Parse error from storage event, reset cart
            console.error("Failed to parse cart data from storage event.", err);
            setCart([]);
          }
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const handleGuestChange = (e) => {
    setGuest({ ...guest, [e.target.name]: e.target.value });
  };

  const handleIncreaseQuantity = (itemId) => {
    setCart((prevCart) => {
      const newCart = prevCart.map((item) =>
        item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item
      );
      localStorage.setItem("cart", JSON.stringify(newCart));
      window.dispatchEvent(new Event("cartchange"));
      return newCart;
    });
  };

  const handleDecreaseQuantity = (itemId) => {
    // This button is only shown if quantity > 1, so we decrease.
    setCart((prevCart) => {
      const newCart = prevCart.map((item) =>
        item.id === itemId
          ? { ...item, quantity: Math.max(1, item.quantity - 1) } // Ensure quantity doesn't go below 1
          : item
      );
      localStorage.setItem("cart", JSON.stringify(newCart));
      window.dispatchEvent(new Event("cartchange"));
      return newCart;
    });
  };

  const handleRemoveItem = (itemId) => {
    // This button is shown when quantity is 1, to remove the item.
    setCart((prevCart) => {
      const newCart = prevCart.filter((item) => item.id !== itemId);
      localStorage.setItem("cart", JSON.stringify(newCart));
      window.dispatchEvent(new Event("cartchange"));
      return newCart;
    });
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
      setCart([]);
      localStorage.removeItem("cart");
      window.dispatchEvent(new Event("cartchange")); // Dispatch event after clearing cart
    } catch (err) {
      setError(err.message);
    }
  };

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
                        onClick={() => handleRemoveItem(item.id)}
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
    </div>
  );
};

export default CartPage;
