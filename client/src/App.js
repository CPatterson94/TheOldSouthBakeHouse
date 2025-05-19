import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import ProductList from "./components/ProductList/ProductList";
import AuthPage from "./pages/AuthPage";
import AccountPage from "./pages/AccountPage";
import AdminDashboard from "./pages/AdminDashboard";
import AddProductPage from "./pages/AddProductPage";
import ManageProductsPage from "./pages/ManageProductsPage";
import ArchivedProductsPage from "./pages/ArchivedProductsPage";
import CartPage from "./pages/CartPage";
import "./App.scss";
import "./styles/main.scss";

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <main className="container">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/products" element={<ProductList />} />
            <Route
              path="/pickup"
              element={
                <div style={{ padding: "2rem", textAlign: "center" }}>
                  <h2>Pickup Locations</h2>
                  <p>Coming soon!</p>
                </div>
              }
            />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            {/* Placeholder route for stats */}
            <Route
              path="/admin/stats"
              element={
                <div style={{ padding: "2rem", textAlign: "center" }}>
                  <h2>Stats</h2>
                  <p>Stats page coming soon!</p>
                </div>
              }
            />
            <Route path="/admin/add-product" element={<AddProductPage />} />
            <Route
              path="/admin/manage-products"
              element={<ManageProductsPage />}
            />
            <Route
              path="/admin/archived-products"
              element={<ArchivedProductsPage />}
            />
            <Route path="/cart" element={<CartPage />} />
          </Routes>
        </main>
        <footer>
          <p>&copy; {new Date().getFullYear()} The Old South Bake House</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
