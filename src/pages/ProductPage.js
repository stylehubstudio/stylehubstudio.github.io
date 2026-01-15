import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useCart } from "../context/CartContext";
import "../styles/product.css";

function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);

  const [showReviews, setShowReviews] = useState(false);
  const [similarProducts, setSimilarProducts] = useState([]);

  // Fetch product
  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "products", id));
        if (!snap.exists()) {
          setProduct(null);
          return;
        }

        const data = snap.data();
        setProduct({
          id: snap.id,
          name: data.name,
          description: data.discription || data.description || "",
          price: data.price,
          images: data.images || [data.image || ""],
          variants: data.variants || [],
          category: data.category || "all",
        });

        // Default selection
        if (data.variants?.length > 0) {
          setSelectedColor(data.variants[0].color);
          const firstSizeWithStock = Object.entries(data.variants[0].sizes)
            .filter(([_, stock]) => stock > 0)
            .map(([size]) => size)[0] || "";
          setSelectedSize(firstSizeWithStock);
        }

        setQuantity(1);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  // Fetch similar products
  useEffect(() => {
    const fetchSimilar = async () => {
      if (!product) return;
      try {
        const baseRef = collection(db, "products");
        const q = query(baseRef, where("category", "==", product.category));
        const snapshot = await getDocs(q);
        const list = snapshot.docs
          .filter(doc => doc.id !== product.id)
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name,
              price: data.price,
              images: Array.isArray(data.images) ? data.images : [data.image || ""],
            };
          });
        setSimilarProducts(list);
      } catch (err) {
        console.error(err);
      }
    };
    fetchSimilar();
  }, [product]);

  const currentVariant = useMemo(() => {
    if (!product) return null;
    return product.variants.find(v => v.color === selectedColor);
  }, [product, selectedColor]);

  const stockAvailable = currentVariant?.sizes[selectedSize] ?? 0;

  const handleColorSelect = useCallback((color) => {
    setSelectedColor(color);
    const variant = product.variants.find(v => v.color === color);
    if (!variant) return;
    const firstSizeWithStock = Object.entries(variant.sizes)
      .filter(([_, stock]) => stock > 0)
      .map(([size]) => size)[0] || "";
    setSelectedSize(firstSizeWithStock);
    setQuantity(1);
  }, [product]);

  const handleSizeSelect = useCallback((size) => {
    setSelectedSize(size);
    setQuantity(1);
  }, []);

  const incrementQuantity = () => {
    if (quantity < stockAvailable) setQuantity(quantity + 1);
  };

  const decrementQuantity = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const handleAddToCart = () => {
    if (!selectedSize || !selectedColor || quantity <= 0 || stockAvailable <= 0) return;

    addToCart({
      product,
      selectedColor,
      selectedSize,
      quantity,
    });

    setQuantity(1);
  };

  if (loading) return <p className="center-text">Loading...</p>;
  if (!product) return <p className="center-text">Product not found.</p>;

  return (
    <div className="product-page">
      {/* Images */}
      <div className="images-section">
        <div className="main-image-container">
          <img
            src={product.images[activeImage]}
            alt={product.name}
            className="main-image"
          />
        </div>
        <div className="image-thumbnails">
          {product.images.map((img, idx) => (
            <img
              key={idx}
              src={img}
              alt=""
              className={activeImage === idx ? "active" : ""}
              onClick={() => setActiveImage(idx)}
            />
          ))}
        </div>
      </div>

      {/* Product info */}
      <div className="product-info">
        <h2>{product.name}</h2>
        <p className="price">₹{product.price}</p>
        <p className="description">{product.description}</p>

        {/* View reviews link */}
        <p className="view-reviews-link" onClick={() => setShowReviews(true)}>
          View reviews (12)
        </p>

        {/* Color selection */}
        <div className="option-group">
          <span>Color:</span>
          {product.variants.map(v => (
            <button
              key={v.color}
              className={selectedColor === v.color ? "active" : ""}
              onClick={() => handleColorSelect(v.color)}
            >
              {v.color}
            </button>
          ))}
        </div>

        {/* Size selection */}
        <div className="option-group">
          <span>Size:</span>
          {currentVariant &&
            Object.entries(currentVariant.sizes)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([size, stock]) => (
                <button
                  key={size}
                  className={selectedSize === size ? "active" : ""}
                  onClick={() => handleSizeSelect(size)}
                  disabled={stock <= 0}
                >
                  {size} {stock <= 0 ? "(Out of stock)" : ""}
                </button>
              ))}
        </div>

        {/* Quantity */}
        <div className="option-group quantity-group">
          <span>Quantity:</span>
          <button onClick={decrementQuantity} disabled={quantity <= 1}>
            -
          </button>
          <input type="number" value={quantity} readOnly />
          <button onClick={incrementQuantity} disabled={quantity >= stockAvailable}>
            +
          </button>
          <span className="stock-text">Stock: {stockAvailable}</span>
        </div>

        {/* Add to cart */}
        <button className="add-to-cart-btn" onClick={handleAddToCart} disabled={stockAvailable <= 0}>
          ADD TO CART
        </button>
      </div>

      {/* Reviews section */}
      {showReviews && (
        <>
          <div className="section-divider" />

          <div className="reviews-section">
            <h3>Customer Reviews</h3>

            <div className="review">
              <strong>Rahul</strong>
              <span>★★★★★</span>
              <p>Quality is very good. Fits perfectly.</p>
            </div>

            <div className="review">
              <strong>Ananya</strong>
              <span>★★★★☆</span>
              <p>Nice fabric but delivery was slow.</p>
            </div>

            <button className="hide-reviews-btn" onClick={() => setShowReviews(false)}>
              Hide reviews
            </button>
          </div>
        </>
      )}

      {/* Similar products */}
      {similarProducts.length > 0 && (
        <>
          <div className="section-divider" />
          <div className="similar-products">
            <h3>You may also like</h3>
            <div className="similar-grid">
              {similarProducts.map(p => (
                <div
                  key={p.id}
                  className="similar-card"
                  onClick={() => navigate(`/product/${p.id}`)}
                >
                  <img src={p.images[0]} alt={p.name} />
                  <p>{p.name}</p>
                  <span>₹{p.price}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ProductPage;
