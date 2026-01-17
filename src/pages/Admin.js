import { useState, useEffect } from "react";
import { collection, addDoc, Timestamp, doc, getDoc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "../styles/admin.css";

const CATEGORIES = {
  men: ["tshirt", "shirt", "jeans"],
  women: ["dress", "top", "jeans"],
  kids: ["tshirt", "shorts"]
};

const DELIVERY_STATUSES = [
  "Order Placed",
  "Ready for Pickup",
  "Picked Up",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Cancelled"
];

function AdminPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);

  const [activeTab, setActiveTab] = useState("products"); // 'products' or 'orders'

  /* ---------------- PRODUCT STATES ---------------- */
  const [name, setName] = useState("");
  const [discription, setdiscription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("men");
  const [subCategory, setSubCategory] = useState("tshirt");
  const [images, setImages] = useState("");
  const [variants, setVariants] = useState([{ color: "", sizes: [{ size: "", stock: "" }] }]);
  const [productLoading, setProductLoading] = useState(false);

  /* ---------------- ORDERS STATES ---------------- */
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);

  /* ---------------- CHECK ADMIN ROLE ---------------- */
  useEffect(() => {
    if (!user) {
      toast.error("You must be logged in");
      navigate("/auth");
      return;
    }

    const checkAdmin = async () => {
      try {
        const docRef = doc(db, "users", user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists() && snap.data()?.role === "admin") {
          setIsAdmin(true);
        } else {
          toast.error("You are not authorized to access this page");
          navigate("/");
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to verify user role");
        navigate("/");
      } finally {
        setCheckingRole(false);
      }
    };

    checkAdmin();
  }, [user, navigate]);

  /* ---------------- FETCH ORDERS ---------------- */
  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const snap = await getDocs(collection(db, "orders"));
      const fetchedOrders = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(fetchedOrders);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch orders");
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin && activeTab === "orders") fetchOrders();
  }, [isAdmin, activeTab]);

  /* ---------------- PRODUCT HANDLERS ---------------- */
  const addColor = () => setVariants([...variants, { color: "", sizes: [{ size: "", stock: "" }] }]);
  const removeColor = (index) => setVariants(variants.filter((_, i) => i !== index));
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
    updated[colorIndex].sizes = updated[colorIndex].sizes.filter((_, i) => i !== sizeIndex);
    setVariants(updated);
  };
  const updateSize = (colorIndex, sizeIndex, field, value) => {
    const updated = [...variants];
    updated[colorIndex].sizes[sizeIndex][field] = value;
    setVariants(updated);
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setProductLoading(true);

    try {
      const formattedVariants = variants.map(v => {
        const sizeObj = {};
        v.sizes.forEach(s => {
          if (s.size && s.stock !== "") sizeObj[s.size] = Number(s.stock);
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

      setName(""); setdiscription(""); setPrice(""); setImages("");
      setVariants([{ color: "", sizes: [{ size: "", stock: "" }] }]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to add product");
    } finally {
      setProductLoading(false);
    }
  };

  /* ---------------- UPDATE DELIVERY ---------------- */
  const updateDelivery = async (orderId, field, value) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        [`delivery.${field}`]: value,
        updatedAt: Timestamp.now()
      });

      toast.success("Order updated");
      setOrders(prev =>
        prev.map(o =>
          o.id === orderId ? { ...o, delivery: { ...o.delivery, [field]: value } } : o
        )
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to update order");
    }
  };

  /* ---------------- UI ---------------- */
  if (checkingRole) return <p>Checking permissions...</p>;
  if (!isAdmin) return null;

  return (
    <div className="admin-page">
      <h2>Admin Panel</h2>
      <div className="admin-tabs">
        <button
          className={activeTab === "products" ? "active" : ""}
          onClick={() => setActiveTab("products")}
        >
          Products
        </button>
        <button
          className={activeTab === "orders" ? "active" : ""}
          onClick={() => setActiveTab("orders")}
        >
          Orders
        </button>
      </div>

      {activeTab === "products" && (
        <div className="tab-content">
          <h3>Add Product</h3>
          <form className="admin-form" onSubmit={handleProductSubmit}>
            <input placeholder="Product Name" value={name} onChange={e => setName(e.target.value)} required />
            <input placeholder="Product Description" value={discription} onChange={e => setdiscription(e.target.value)} required />
            <input type="number" placeholder="Price" value={price} onChange={e => setPrice(e.target.value)} required />

            <select
              value={category}
              onChange={e => { setCategory(e.target.value); setSubCategory(CATEGORIES[e.target.value][0]); }}
            >
              {Object.keys(CATEGORIES).map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>

            <select value={subCategory} onChange={e => setSubCategory(e.target.value)}>
              {CATEGORIES[category].map(sub => <option key={sub} value={sub}>{sub}</option>)}
            </select>

            <textarea placeholder="Image URLs (one per line)" value={images} onChange={e => setImages(e.target.value)} />

            <h4>Variants</h4>
            {variants.map((variant, colorIndex) => (
              <div key={colorIndex} className="variant-box">
                <input placeholder="Color" value={variant.color} onChange={e => updateColor(colorIndex, e.target.value)} required />
                {variant.sizes.map((s, sizeIndex) => (
                  <div key={sizeIndex} className="size-row">
                    <input placeholder="Size" value={s.size} onChange={e => updateSize(colorIndex, sizeIndex, "size", e.target.value)} required />
                    <input type="number" placeholder="Stock" value={s.stock} onChange={e => updateSize(colorIndex, sizeIndex, "stock", e.target.value)} required />
                    <button type="button" onClick={() => removeSize(colorIndex, sizeIndex)}>✕</button>
                  </div>
                ))}
                <button type="button" onClick={() => addSize(colorIndex)}>+ Add Size</button>
                {variants.length > 1 && <button type="button" onClick={() => removeColor(colorIndex)}>Remove Color</button>}
              </div>
            ))}
            <button type="button" onClick={addColor}>+ Add Color</button>
            <button type="submit" disabled={productLoading}>{productLoading ? "Adding..." : "Add Product"}</button>
          </form>
        </div>
      )}

      {activeTab === "orders" && (
        <div className="tab-content">
          <h3>Orders Dashboard</h3>
          {ordersLoading ? (
            <p>Loading orders...</p>
          ) : orders.length === 0 ? (
            <p>No orders found.</p>
          ) : (
            <div className="orders-list">
              {orders.map(order => (
                <div key={order.id} className="order-card">
                  <div className="order-summary" onClick={() => setExpanded(expanded === order.id ? null : order.id)}>
                    <div><strong>Order ID:</strong> {order.id}</div>
                    <div><strong>User:</strong> {order.userId}</div>
                    <div><strong>Total:</strong> ₹{order.total}</div>
                    <div><strong>Status:</strong> {order.delivery?.status || "Order Placed"}</div>
                    <div className="expand-toggle">{expanded === order.id ? "▲" : "▼"}</div>
                  </div>
                  {expanded === order.id && (
                    <div className="order-details">
                      <h4>Items</h4>
                      <ul>
                        {order.items.map((item, idx) => (
                          <li key={idx}>{item.name} ({item.selectedSize || ""}) × {item.quantity} - ₹{item.price * item.quantity}</li>
                        ))}
                      </ul>

                      <h4>Delivery Info</h4>
                      <p><strong>Address:</strong> {order.address.line1}, {order.address.city}, {order.address.state} - {order.address.pincode}</p>

                      <label>
                        Status:
                        <select value={order.delivery?.status || "Order Placed"} onChange={e => updateDelivery(order.id, "status", e.target.value)}>
                          {DELIVERY_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                        </select>
                      </label>
                      <label>
                        Courier:
                        <input type="text" value={order.delivery?.assignedCourier || ""} onChange={e => updateDelivery(order.id, "assignedCourier", e.target.value)} placeholder="Courier name" />
                      </label>
                      <label>
                        Tracking ID:
                        <input type="text" value={order.delivery?.trackingId || ""} onChange={e => updateDelivery(order.id, "trackingId", e.target.value)} placeholder="Tracking ID" />
                      </label>
                      <label>
                        Estimated Delivery:
                        <input type="date" value={order.delivery?.estimatedDelivery || ""} onChange={e => updateDelivery(order.id, "estimatedDelivery", e.target.value)} />
                      </label>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminPanel;
