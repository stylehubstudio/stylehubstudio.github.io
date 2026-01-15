import { useEffect, useState, useCallback } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useCart } from "../context/CartContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "../styles/home.css";

const categories = ["all", "men", "women", "kids"];

function Home() {
  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [loading, setLoading] = useState(true);

  const { addToCart } = useCart();
  const navigate = useNavigate();

  // ---------------- FETCH PRODUCTS ----------------
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const baseRef = collection(db, "products");
        const q =
          activeCategory === "all"
            ? baseRef
            : query(baseRef, where("category", "==", activeCategory));

        const snapshot = await getDocs(q);
        const list = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            price: data.price,
            description: data.discription || data.description || "",
            images: Array.isArray(data.images) ? data.images : [data.image || ""],
            variants: data.variants || [],
            category: data.category,
            subCategory: data.subCategory || "",
          };
        });

        setProducts(list);
      } catch (err) {
        console.error("Error loading products", err);
        toast.error("Failed to load products");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [activeCategory]);

  // ---------------- ADD TO CART ----------------
  const handleAddToCart = useCallback(
    (product) => {
      if (!product.variants || product.variants.length === 0) {
        toast.warning("Product has no variants available");
        return;
      }

      // Pick first variant with stock
      const variant = product.variants.find((v) =>
        Object.values(v.sizes).some((stock) => stock > 0)
      );

      if (!variant) {
        toast.error("Product is out of stock");
        return;
      }

      // Pick first size with stock
      const firstSize = Object.entries(variant.sizes).find(
        ([, stock]) => stock > 0
      )?.[0];

      if (!firstSize) {
        toast.error("Product is out of stock");
        return;
      }

      addToCart({
        product,
        selectedColor: variant.color,
        selectedSize: firstSize,
        quantity: 1,
      });
    },
    [addToCart]
  );

  return (
    <div className="home">
      {/* Categories */}
      <div className="category-bar">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`category-btn ${activeCategory === cat ? "active" : ""}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Products */}
      {loading ? (
        <p className="center-text">Loading...</p>
      ) : products.length === 0 ? (
        <p className="center-text">No products available</p>
      ) : (
        <div className="product-grid">
          {products.map((product) => {
            // Pick first variant & size for display
            const variant = product.variants.find((v) =>
              Object.values(v.sizes).some((stock) => stock > 0)
            );
            const firstSize =
              variant && Object.entries(variant.sizes).find(([, stock]) => stock > 0)?.[0];

            return (
              <div key={product.id} className="product-card">
                <div
                  className="product-click-area"
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  <div className="image-wrapper">
                    <img src={product.images[0]} alt={product.name} />
                  </div>
                  <div className="product-info">
                    <p className="product-name">{product.name}</p>
                    <p className="product-price">₹{product.price}</p>
                  </div>
                </div>

                <button
                  className="add-to-cart-btn"
                  onClick={(e) => {
                    e.stopPropagation(); // prevent navigation
                    handleAddToCart(product);
                  }}
                  disabled={!variant || !firstSize} // disable if out of stock
                >
                  ADD TO CART
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Home;
