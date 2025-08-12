import React, { useEffect, useState } from "react";
import "../styles/ManageProductsPage.scss";

const STATUS_OPTIONS = ["ACTIVE", "INACTIVE", "ARCHIVED"]; // include ARCHIVED for completeness when editing

const ManageProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch("http://localhost:3002/products/categories");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load categories");
      setCategories(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:3002/admin/products", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch products");
      setProducts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    setError("");
    setSuccess("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:3002/products/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");
      setSuccess("Product status updated!");
      setProducts((prev) =>
        prev
          .map((p) => (p.id === id ? { ...p, status: newStatus } : p))
          .filter((p) => p.status !== "ARCHIVED")
      );
    } catch (err) {
      setError(err.message);
    }
  };

  const handleArchive = async (id) => {
    setError("");
    setSuccess("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:3002/products/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "ARCHIVED" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to archive product");
      setSuccess("Product archived!");
      setProducts((prev) => prev.filter((p) => p.id !== id));
      if (editingProduct && editingProduct.id === id) {
        setEditingProduct(null);
        setEditForm({});
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const startEdit = (product) => {
    setError("");
    setSuccess("");
    setEditingProduct(product);
    setEditForm({
      name: product.name || "",
      description: product.description || "",
      ingredients: product.ingredients || "",
      price: product.price != null ? product.price : "",
      imageUrl: product.imageUrl || "",
      category: product.category || "",
      stock: product.stock != null ? product.stock : "",
      status: product.status || "ACTIVE",
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const cancelEdit = () => {
    setEditingProduct(null);
    setEditForm({});
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSavingEdit(true);
    setError("");
    setSuccess("");
    try {
      const token = localStorage.getItem("token");
      const body = {
        ...editForm,
        price: parseFloat(editForm.price),
        stock: parseInt(editForm.stock, 10),
        ingredients: editForm.ingredients.trim() || null,
      };
      const res = await fetch(
        `http://localhost:3002/products/${editingProduct.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update product");
      setSuccess("Product updated successfully!");
      setProducts((prev) =>
        prev.map((p) => (p.id === editingProduct.id ? { ...p, ...data } : p))
      );
      setEditingProduct(null);
      setEditForm({});
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="manage-products-page container">
      <h2>Manage Product Status</h2>
      {loading ? (
        <p>Loading products...</p>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <>
          <table className="manage-products-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Change Status</th>
                <th>Edit</th>
                <th>Archive</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr
                  key={product.id}
                  className={
                    editingProduct?.id === product.id
                      ? "editing-row"
                      : undefined
                  }
                >
                  <td>{product.name}</td>
                  <td>{product.status}</td>
                  <td>
                    <select
                      value={product.status}
                      onChange={(e) =>
                        handleStatusChange(product.id, e.target.value)
                      }
                    >
                      {STATUS_OPTIONS.filter((s) => s !== "ARCHIVED").map(
                        (status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        )
                      )}
                    </select>
                  </td>
                  <td>
                    <button
                      className="btn btn-primary"
                      onClick={() => startEdit(product)}
                      disabled={
                        editingProduct && editingProduct.id !== product.id
                      }
                    >
                      Edit
                    </button>
                  </td>
                  <td>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleArchive(product.id)}
                    >
                      Archive
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {editingProduct && (
            <div className="edit-panel">
              <h3>Edit Product: {editingProduct.name}</h3>
              <form onSubmit={submitEdit} className="edit-form">
                <label className="field-group">
                  <span className="field-label">Name</span>
                  <input
                    name="name"
                    value={editForm.name}
                    onChange={handleEditChange}
                    required
                  />
                </label>
                <label className="field-group">
                  <span className="field-label">Description</span>
                  <textarea
                    name="description"
                    value={editForm.description}
                    onChange={handleEditChange}
                    rows={3}
                  />
                </label>
                <label className="field-group">
                  <span className="field-label">Ingredients</span>
                  <textarea
                    name="ingredients"
                    value={editForm.ingredients}
                    onChange={handleEditChange}
                    placeholder="Flour, Water, Yeast..."
                    rows={4}
                  />
                </label>
                <label className="field-group">
                  <span className="field-label">Price</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="price"
                    value={editForm.price}
                    onChange={handleEditChange}
                    required
                  />
                </label>
                <label className="field-group">
                  <span className="field-label">Image URL</span>
                  <input
                    name="imageUrl"
                    value={editForm.imageUrl}
                    onChange={handleEditChange}
                  />
                </label>
                <label className="field-group">
                  <span className="field-label">Category</span>
                  <select
                    name="category"
                    value={editForm.category}
                    onChange={handleEditChange}
                    required
                    disabled={!categories.length}
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-group">
                  <span className="field-label">Stock</span>
                  <input
                    type="number"
                    min="0"
                    name="stock"
                    value={editForm.stock}
                    onChange={handleEditChange}
                    required
                  />
                </label>
                <label className="field-group">
                  <span className="field-label">Status</span>
                  <select
                    name="status"
                    value={editForm.status}
                    onChange={handleEditChange}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={savingEdit}
                  >
                    {savingEdit ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={cancelEdit}
                    disabled={savingEdit}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}
      {success && <div className="success-message">{success}</div>}
    </div>
  );
};

export default ManageProductsPage;
