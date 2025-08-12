import React, { useState } from "react";
import "../styles/main.scss";
import "../styles/AddProduct.scss";

const CATEGORY_OPTIONS = [
  "Bread",
  "Pastry",
  "Cake",
  "Cookie",
  "Pie",
  "Savory",
  "Other",
];

const initialState = {
  name: "",
  description: "",
  price: "",
  imageUrl: "",
  category: CATEGORY_OPTIONS[0],
  stock: "",
  status: "ACTIVE",
};

const AddProductPage = () => {
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unknown error");
      setSuccess("Product added successfully!");
      setForm(initialState);
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
            value={form.description}
            onChange={handleChange}
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
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
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
