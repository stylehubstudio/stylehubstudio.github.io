import { useState } from "react";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "react-toastify";
import "../styles/admin.css";

const CATEGORIES = {
  men: ["tshirt", "shirt", "jeans"],
  women: ["dress", "top", "jeans"],
  kids: ["tshirt", "shorts"]
};

function Admin() {
  /* ---------------- BASIC INFO ---------------- */
  const [name, setName] = useState("");
  const [discription, setdiscription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("men");
  const [subCategory, setSubCategory] = useState("tshirt");
  const [images, setImages] = useState("");

  /* ---------------- VARIANTS ---------------- */
  const [variants, setVariants] = useState([
    {
      color: "",
      sizes: [{ size: "", stock: "" }]
    }
  ]);

  const [loading, setLoading] = useState(false);

  /* ---------------- VARIANT HANDLERS ---------------- */

  const addColor = () => {
    setVariants([...variants, { color: "", sizes: [{ size: "", stock: "" }] }]);
  };

  const removeColor = (index) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const updateColor = (index, value) => {
    const updated = [...variants];
    updated[index].color = value;
    setVariants(updated);
  };

  const addSize = (colorIndex) => {
    const updated = [...variants];
    updated[colorIndex].sizes.push({ size: "", stock: "" });
    setVariants(updated);
  };

  const removeSize = (colorIndex, sizeIndex) => {
    const updated = [...variants];
    updated[colorIndex].sizes = updated[colorIndex].sizes.filter(
      (_, i) => i !== sizeIndex
    );
    setVariants(updated);
  };

  const updateSize = (colorIndex, sizeIndex, field, value) => {
    const updated = [...variants];
    updated[colorIndex].sizes[sizeIndex][field] = value;
    setVariants(updated);
  };

  /* ---------------- SUBMIT ---------------- */

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Convert variants into Firestore-friendly structure
      const formattedVariants = variants.map(v => {
        const sizeObj = {};
        v.sizes.forEach(s => {
          if (s.size && s.stock !== "") {
            sizeObj[s.size] = Number(s.stock);
          }
        });
        return { color: v.color, sizes: sizeObj };
      });

      const product = {
        name,
        discription,
        price: Number(price),
        category,
        subCategory,
        images: images.split("\n").map(i => i.trim()).filter(Boolean),
        variants: formattedVariants,
        createdAt: Timestamp.now()
      };

      await addDoc(collection(db, "products"), product);

      toast.success("Product added successfully!");

      // Reset form
      setName("");
      setdiscription("");
      setPrice("");
      setImages("");
      setVariants([{ color: "", sizes: [{ size: "", stock: "" }] }]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to add product");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="admin-page">
      <h2>Add Product</h2>

      <form className="admin-form" onSubmit={handleSubmit}>
        <input
          placeholder="Product Name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />

        <input
          placeholder="Product Discription"
          value={discription}
          onChange={e => setdiscription(e.target.value)}
          required
        />

        <input
          type="number"
          placeholder="Price"
          value={price}
          onChange={e => setPrice(e.target.value)}
          required
        />

        <select
          value={category}
          onChange={e => {
            setCategory(e.target.value);
            setSubCategory(CATEGORIES[e.target.value][0]);
          }}
        >
          {Object.keys(CATEGORIES).map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <select
          value={subCategory}
          onChange={e => setSubCategory(e.target.value)}
        >
          {CATEGORIES[category].map(sub => (
            <option key={sub} value={sub}>{sub}</option>
          ))}
        </select>

        <textarea
          placeholder="Image URLs (one per line)"
          value={images}
          onChange={e => setImages(e.target.value)}
        />

        {/* ---------------- VARIANTS UI ---------------- */}
        <h3>Variants</h3>

        {variants.map((variant, colorIndex) => (
          <div key={colorIndex} className="variant-box">
            <input
              placeholder="Color"
              value={variant.color}
              onChange={e => updateColor(colorIndex, e.target.value)}
              required
            />

            {variant.sizes.map((s, sizeIndex) => (
              <div key={sizeIndex} className="size-row">
                <input
                  placeholder="Size"
                  value={s.size}
                  onChange={e =>
                    updateSize(colorIndex, sizeIndex, "size", e.target.value)
                  }
                  required
                />
                <input
                  type="number"
                  placeholder="Stock"
                  value={s.stock}
                  onChange={e =>
                    updateSize(colorIndex, sizeIndex, "stock", e.target.value)
                  }
                  required
                />
                <button type="button" onClick={() => removeSize(colorIndex, sizeIndex)}>
                  ✕
                </button>
              </div>
            ))}

            <button type="button" onClick={() => addSize(colorIndex)}>
              + Add Size
            </button>

            {variants.length > 1 && (
              <button type="button" onClick={() => removeColor(colorIndex)}>
                Remove Color
              </button>
            )}
          </div>
        ))}

        <button type="button" onClick={addColor}>
          + Add Color
        </button>

        <button type="submit" disabled={loading}>
          {loading ? "Adding..." : "Add Product"}
        </button>
      </form>
    </div>
  );
}

export default Admin;
