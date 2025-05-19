import React, { useEffect, useState } from "react";

const ArchivedProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchArchivedProducts();
  }, []);

  const fetchArchivedProducts = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:3002/admin/archived-products", {
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

  const handleRestore = async (id) => {
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
        body: JSON.stringify({ status: "INACTIVE" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to restore product");
      setSuccess("Product restored to Manage Product Status!");
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="archived-products-page container">
      <h2>Archived Products</h2>
      {loading ? (
        <p>Loading archived products...</p>
      ) : error ? (
        <div style={{ color: "red" }}>{error}</div>
      ) : products.length === 0 ? (
        <p>No archived products.</p>
      ) : (
        <table style={{ width: "100%", marginTop: 20 }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Restore</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>{product.status}</td>
                <td>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleRestore(product.id)}
                  >
                    Restore to Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {success && (
        <div style={{ color: "green", marginTop: 10 }}>{success}</div>
      )}
    </div>
  );
};

export default ArchivedProductsPage;
