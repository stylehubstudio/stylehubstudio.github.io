import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import "../styles/navbar.css";

function Navbar() {
  const { cartItems = [] } = useCart();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  // Cart count
  const cartCount = Array.isArray(cartItems)
    ? cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0)
    : 0;

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (err) {
      console.error(err);
      alert("Logout failed!");
    }
  };

  // Search on Enter
  const handleSearch = (e) => {
    if (e.key === "Enter" && search.trim()) {
      navigate(`/search?q=${encodeURIComponent(search.trim())}`);
      setSearch("");
    }
  };

  return (
    <header className="navbar">
      {/* Left */}
      <div className="navbar-left">
        <h2>
          <Link to="/" className="logo">StyleHub</Link>
        </h2>
      </div>

      {/* Center */}
      <div className="navbar-center">
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleSearch}
        />
      </div>

      {/* Right */}
      <nav className="navbar-right">
        <Link to="/">Home</Link>

        <Link to="/cart" className="cart-link">
          Cart 🛒
          {cartCount > 0 && (
            <span className="cart-count">{cartCount}</span>
          )}
        </Link>

        {user ? (
          <>
            <Link to="/orders">Orders</Link>
            <Link to="/profile">Profile</Link>
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <Link to="/auth">Login</Link>
        )}
      </nav>
    </header>
  );
}

export default Navbar;
