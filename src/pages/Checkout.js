import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "../styles/checkout.css";
import { toast } from "react-toastify";

function Checkout() {
  const { cartItems, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [address, setAddress] = useState("");
  const [placing, setPlacing] = useState(false);

  const total = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  /* ---------------- LOAD SAVED ADDRESS ---------------- */
  useEffect(() => {
    const fetchUserAddress = async () => {
      if (!user) return;

      try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (userSnap.exists()) {
          const data = userSnap.data();
          if (data.address) setAddress(data.address);
        }
      } catch (err) {
        console.error("Failed to fetch address:", err);
      }
    };

    fetchUserAddress();
  }, [user]);

  /* ---------------- PLACE ORDER ---------------- */
  const placeOrder = async () => {
    if (!user) {
      toast.error("Please login to place order");
      navigate("/auth");
      return;
    }

    if (!address.trim()) {
      toast.error("Please enter delivery address");
      return;
    }

    if (cartItems.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    // ✅ Final stock validation
    const invalidStock = cartItems.some(
      (item) =>
        Number(item.sizes?.[item.selectedSize] ?? 0) < item.quantity
    );

    if (invalidStock) {
      toast.error("Some items are out of stock");
      return;
    }

    setPlacing(true);

    try {
      /* 1️⃣ SAVE ORDER */
      const orderRef = await addDoc(collection(db, "orders"), {
        userId: user.uid,
        items: cartItems,
        total,
        address,
        status: "Placed",
        createdAt: serverTimestamp(),
      });

      /* 2️⃣ LINK ORDER TO USER (FAST FETCH LATER) */
      await setDoc(
        doc(db, "users", user.uid, "orders", orderRef.id),
        {
          orderId: orderRef.id,
          createdAt: serverTimestamp(),
        }
      );

      /* 3️⃣ CLEAR CART */
      await clearCart();

      toast.success("Order placed successfully 🎉");
      navigate("/orders");
    } catch (err) {
      console.error(err);
      toast.error("Order failed, please try again");
    } finally {
      setPlacing(false);
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="checkout-page">
      <h2>Checkout</h2>

      <div className="checkout-section">
        <h4>Delivery Address</h4>
        <textarea
          placeholder="Enter full address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>

      <div className="checkout-section">
        <h4>Order Summary</h4>

        {cartItems.map((item) => (
          <div
            key={`${item.id}-${item.selectedSize}-${item.selectedColor}`}
            className="checkout-item"
          >
            <span>
              {item.name} ({item.selectedColor}, {item.selectedSize}) ×{" "}
              {item.quantity}
            </span>
            <span>₹{item.price * item.quantity}</span>
          </div>
        ))}

        <div className="checkout-total">
          <strong>Total</strong>
          <strong>₹{total}</strong>
        </div>
      </div>

      <button
        className="place-order-btn"
        onClick={placeOrder}
        disabled={placing}
      >
        {placing ? "PLACING ORDER..." : "PLACE ORDER"}
      </button>
    </div>
  );
}

export default Checkout;
