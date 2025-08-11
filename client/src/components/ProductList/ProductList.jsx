import React, { useState, useEffect } from "react";
import ProductCard from "../ProductCard/ProductCard.jsx";
import "./ProductList.scss";

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cartMessage, setCartMessage] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch("http://localhost:3002/products");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setProducts(data);
      } catch (e) {
        setError(e.message);
        console.error("Failed to fetch products:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
    loadCartData();
  }, []);

  useEffect(() => {
    const handleCartChange = () => {
      loadCartData();
    };

    window.addEventListener("cartchange", handleCartChange);
    window.addEventListener("storage", handleCartChange);

    return () => {
      window.removeEventListener("cartchange", handleCartChange);
      window.removeEventListener("storage", handleCartChange);
    };
  }, [isLoggedIn]);

  const loadCartData = async () => {
    const token = localStorage.getItem("token");

    if (token) {
      // Load from database
      try {
        const response = await fetch("http://localhost:3002/cart", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setCart(data.items || []);
        }
      } catch (error) {
        console.error("Error fetching cart:", error);
        setCart([]);
      }
    } else {
      // Load from localStorage
      const localCart = JSON.parse(localStorage.getItem("cart")) || [];
      setCart(localCart);
    }
  };

  const getCartQuantity = (productId) => {
    const cartItem = cart.find((item) => item.id === productId);
    return cartItem ? cartItem.quantity : 0;
  };

  const handleIncreaseQuantity = async (productId) => {
    const token = localStorage.getItem("token");

    if (token) {
      // Update database cart
      try {
        const cartItem = cart.find((item) => item.id === productId);
        const newQuantity = cartItem ? cartItem.quantity + 1 : 1;

        await fetch("http://localhost:3002/cart/update", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            productId: productId,
            quantity: newQuantity,
          }),
        });

        // Update local state
        setCart((prevCart) => {
          const existing = prevCart.find((item) => item.id === productId);
          if (existing) {
            return prevCart.map((item) =>
              item.id === productId
                ? { ...item, quantity: item.quantity + 1 }
                : item
            );
          } else {
            const product = products.find((p) => p.id === productId);
            return [...prevCart, { ...product, quantity: 1 }];
          }
        });

        window.dispatchEvent(new Event("cartchange"));
      } catch (error) {
        console.error("Error updating cart:", error);
      }
    } else {
      // Update localStorage cart
      setCart((prevCart) => {
        const existing = prevCart.find((item) => item.id === productId);
        let newCart;

        if (existing) {
          newCart = prevCart.map((item) =>
            item.id === productId
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        } else {
          const product = products.find((p) => p.id === productId);
          newCart = [...prevCart, { ...product, quantity: 1 }];
        }

        localStorage.setItem("cart", JSON.stringify(newCart));
        window.dispatchEvent(new Event("cartchange"));
        return newCart;
      });
    }
  };

  const handleDecreaseQuantity = async (productId) => {
    const token = localStorage.getItem("token");
    const cartItem = cart.find((item) => item.id === productId);

    if (!cartItem) {
      return; // Don't do anything if item doesn't exist
    }

    if (cartItem.quantity === 1) {
      // Remove item from cart if quantity is 1
      await handleRemoveFromCart(productId);
      return;
    }

    if (token) {
      // Update database cart
      try {
        const newQuantity = cartItem.quantity - 1;

        await fetch("http://localhost:3002/cart/update", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            productId: productId,
            quantity: newQuantity,
          }),
        });

        // Update local state
        setCart((prevCart) =>
          prevCart.map((item) =>
            item.id === productId
              ? { ...item, quantity: item.quantity - 1 }
              : item
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
          item.id === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );

        localStorage.setItem("cart", JSON.stringify(newCart));
        window.dispatchEvent(new Event("cartchange"));
        return newCart;
      });
    }
  };

  const handleRemoveFromCart = async (productId) => {
    const token = localStorage.getItem("token");

    if (token) {
      // Remove from database cart
      try {
        await fetch("http://localhost:3002/cart/remove", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            productId: productId,
          }),
        });

        // Update local state
        setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
        window.dispatchEvent(new Event("cartchange"));
      } catch (error) {
        console.error("Error removing from cart:", error);
      }
    } else {
      // Remove from localStorage cart
      setCart((prevCart) => {
        const newCart = prevCart.filter((item) => item.id !== productId);
        localStorage.setItem("cart", JSON.stringify(newCart));
        window.dispatchEvent(new Event("cartchange"));
        return newCart;
      });
    }
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch("http://localhost:3002/products");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setProducts(data);
      } catch (e) {
        setError(e.message);
        console.error("Failed to fetch products:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const handleAddToCart = async (product) => {
    const token = localStorage.getItem("token");

    if (token) {
      // User is logged in - add to database cart
      try {
        const response = await fetch("http://localhost:3002/cart/add", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            productId: product.id,
            quantity: 1,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to add to cart");
        }

        setCartMessage(`${product.name} added to cart!`);
        window.dispatchEvent(new Event("cartchange"));
      } catch (error) {
        console.error("Error adding to cart:", error);
        setCartMessage("Error adding to cart");
      }
    } else {
      // User is not logged in - use localStorage
      let cart = JSON.parse(localStorage.getItem("cart")) || [];
      const existing = cart.find((item) => item.id === product.id);
      if (existing) {
        cart = cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        cart.push({ ...product, quantity: 1 });
      }
      localStorage.setItem("cart", JSON.stringify(cart));
      window.dispatchEvent(new Event("cartchange"));
      setCartMessage(`${product.name} added to cart!`);
    }

    setTimeout(() => setCartMessage(""), 1500);
  };

  if (loading) {
    return <p>Loading products...</p>;
  }

  if (error) {
    return <p>Error loading products: {error}</p>;
  }

  if (products.length === 0) {
    return <p>No products available at the moment.</p>;
  }

  return (
    <div className="product-list-container">
      <h2>Our Products</h2>
      {cartMessage && (
        <div style={{ color: "green", marginBottom: 10 }}>{cartMessage}</div>
      )}
      <div className="product-list">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={handleAddToCart}
            cartQuantity={getCartQuantity(product.id)}
            onIncreaseQuantity={handleIncreaseQuantity}
            onDecreaseQuantity={handleDecreaseQuantity}
          />
        ))}
      </div>
    </div>
  );
};

export default ProductList;
