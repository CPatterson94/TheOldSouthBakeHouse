import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/main.scss";
import "../styles/admin.scss";

const AdminDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="admin-dashboard container">
      <h2>Admin Dashboard</h2>
      <div className="admin-tiles">
        <div
          className="admin-tile"
          onClick={() => navigate("/admin/stats")}
          style={{ cursor: "pointer" }}
        >
          <h3>View Stats</h3>
          <p>See sales and product statistics</p>
        </div>
        <div
          className="admin-tile"
          onClick={() => navigate("/admin/add-product")}
          style={{ cursor: "pointer" }}
        >
          <h3>Add Product</h3>
          <p>Add a new product to the store</p>
        </div>
        <div
          className="admin-tile"
          onClick={() => navigate("/admin/manage-products")}
          style={{ cursor: "pointer" }}
        >
          <h3>Manage Product Status</h3>
          <p>Move products between Active and Inactive</p>
        </div>
        <div
          className="admin-tile"
          onClick={() => navigate("/admin/archived-products")}
          style={{ cursor: "pointer" }}
        >
          <h3>Archived Products</h3>
          <p>View and restore archived products</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
