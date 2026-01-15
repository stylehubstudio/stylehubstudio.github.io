import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import "../styles/search.css";

function Search() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryText = searchParams.get("q")?.toLowerCase() || "";

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ---------------- FILTER STATES ---------------- */
  const [category, setCategory] = useState("all");
  const [maxPrice, setMaxPrice] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");

  /* ---------------- FETCH ---------------- */
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const snapshot = await getDocs(collection(db, "products"));
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          images: Array.isArray(doc.data().images)
            ? doc.data().images
            : [doc.data().image || ""],
        }));
        setProducts(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  /* ---------------- FILTER LOGIC ---------------- */
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // search text
      const matchesText =
        !queryText ||
        [p.name, p.category, p.subCategory]
          .filter(Boolean)
          .some((f) => f.toLowerCase().includes(queryText));

      if (!matchesText) return false;

      // category
      if (category !== "all" && p.category !== category) return false;

      // price
      if (maxPrice && p.price > Number(maxPrice)) return false;

      // size & color (variants)
      if (selectedSize || selectedColor) {
        const variantMatch = p.variants?.some((v) => {
          const sizeOk = selectedSize
            ? Number(v.sizes?.[selectedSize] ?? 0) > 0
            : true;
          const colorOk = selectedColor ? v.color === selectedColor : true;
          return sizeOk && colorOk;
        });

        if (!variantMatch) return false;
      }

      return true;
    });
  }, [products, queryText, category, maxPrice, selectedSize, selectedColor]);

  if (loading) return <p className="center-text">Searching...</p>;

  return (
    <div className="search-page">
      <h3 className="search-title">
        Results for "<span>{queryText}</span>"
      </h3>

      {/* ---------------- FILTER BAR ---------------- */}
      <div className="filter-bar">
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All</option>
          <option value="men">Men</option>
          <option value="women">Women</option>
          <option value="kids">Kids</option>
        </select>

        <input
          type="number"
          placeholder="Max price"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
        />

        <select
          value={selectedSize}
          onChange={(e) => setSelectedSize(e.target.value)}
        >
          <option value="">All sizes</option>
          <option value="S">S</option>
          <option value="M">M</option>
          <option value="L">L</option>
          <option value="XL">XL</option>
        </select>

        <select
          value={selectedColor}
          onChange={(e) => setSelectedColor(e.target.value)}
        >
          <option value="">All colors</option>
          <option value="BLACK">Black</option>
          <option value="WHITE">White</option>
          <option value="BLUE">Blue</option>
          <option value="RED">Red</option>
        </select>

        <button
          className="clear-filters"
          onClick={() => {
            setCategory("all");
            setMaxPrice("");
            setSelectedSize("");
            setSelectedColor("");
          }}
        >
          Clear
        </button>
      </div>

      {/* ---------------- RESULTS ---------------- */}
      {filteredProducts.length === 0 ? (
        <p className="center-text">No products found</p>
      ) : (
        <div className="search-grid">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="search-card"
              onClick={() => navigate(`/product/${product.id}`)}
            >
              <img src={product.images[0]} alt={product.name} />
              <p>{product.name}</p>
              <p>₹{product.price}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Search;
