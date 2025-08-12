import React, { useState, useEffect } from "react";
import "../styles/main.scss";
import "../styles/AddProduct.scss";

const initialState = {
  name: "",
  description: "",
  ingredients: "",
  price: "",
  imageUrl: "",
  category: "",
  stock: "",
  status: "ACTIVE",
};

const AddProductPage = () => {
  const [form, setForm] = useState(initialState);
  const [categories, setCategories] = useState([]);
  const [catLoading, setCatLoading] = useState(true);
  const [catError, setCatError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;
    const fetchCategories = async () => {
      setCatLoading(true);
      setCatError("");
      try {
        console.debug("[AddProduct] Fetching categories...");
        const res = await fetch("http://localhost:3002/products/categories");
        let data;
        try {
          data = await res.json();
        } catch (parseErr) {
          throw new Error("Invalid JSON from categories endpoint");
        }
        if (!res.ok) throw new Error(data.error || "Failed to load categories");
        if (cancelled) return;
        console.debug(`[AddProduct] Categories received:`, data);
        setCategories(Array.isArray(data) ? data : []);
        setForm((prev) => ({ ...prev, category: (data && data[0]) || "" }));
        if (!data || !data.length) {
          setCatError(
            "No categories found. Create one by adding a product or check server seeding."
          );
        }
      } catch (err) {
        if (cancelled) return;
        console.error("[AddProduct] Category fetch error:", err);
        setCatError(err.message);
      } finally {
        if (!cancelled) setCatLoading(false);
      }
    };
    fetchCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category) {
      setError("Please select a category before submitting.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:3002/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          price: parseFloat(form.price),
          stock: parseInt(form.stock, 10),
          ingredients: form.ingredients?.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unknown error");
      setSuccess("Product added successfully!");
      setForm((prev) => ({ ...initialState, category: categories[0] || "" }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-product-page container">
      <h2>Add Product</h2>
      <form className="add-product-form" onSubmit={handleSubmit}>
        <label>
          Name
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Description
          <textarea
            name="description"
            placeholder="A delicious product..."
            value={form.description}
            onChange={handleChange}
          />
        </label>
        <label>
          Ingredients (one per line or comma separated)
          <textarea
            name="ingredients"
            placeholder="Flour, Water, Yeast, Salt..."
            value={form.ingredients}
            onChange={handleChange}
            rows={5}
          />
        </label>
        <label>
          Price
          <input
            type="number"
            name="price"
            value={form.price}
            onChange={handleChange}
            min="0"
            step="0.01"
            required
          />
        </label>
        <label>
          Image URL
          <input
            type="text"
            name="imageUrl"
            value={form.imageUrl}
            onChange={handleChange}
          />
        </label>
        <label>
          Category
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            required
            disabled={catLoading}
          >
            {catLoading && <option value="">Loading categories...</option>}
            {!catLoading && !categories.length && (
              <option value="">No categories available</option>
            )}
            {!catLoading &&
              categories.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
          </select>
        </label>
        {catError && (
          <div
            style={{
              color: "#b35b00",
              fontSize: 12,
              marginTop: -6,
              marginBottom: 10,
            }}
          >
            {catError}
          </div>
        )}
        <label>
          Stock
          <input
            type="number"
            name="stock"
            value={form.stock}
            onChange={handleChange}
            min="0"
            required
          />
        </label>
        <label>
          Status
          <select name="status" value={form.status} onChange={handleChange}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </label>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Adding..." : "Add Product"}
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

export default AddProductPage;
