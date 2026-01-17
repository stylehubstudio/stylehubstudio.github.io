import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "../styles/checkout.css";

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

  /* ================= LOAD SAVED ADDRESS ================= */
  useEffect(() => {
    if (!user) return;

    const fetchAddress = async () => {
      try {
        console.log("🟡 Fetching saved address");

        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists() && snap.data()?.address) {
          console.log("🟢 Address loaded");
          setAddress(snap.data().address);
        }
      } catch (err) {
        console.error("❌ Address load error:", err);
      }
    };

    fetchAddress();
  }, [user]);

  /* ================= PAYMENT FLOW ================= */
  const handlePayment = async () => {
    console.log("🟢 STEP 0: Pay button clicked");

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

    console.log("🟢 STEP 1: Validation passed");
    console.log("➡️ Total amount:", total);

    setPlacing(true);

    try {
      /* ---------- CREATE ORDER ---------- */
      console.log("🟡 STEP 2: Creating order on server");

      const res = await fetch("/api/createorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: total }),
      });

      console.log("⬅️ STEP 3: Server status:", res.status);

      const text = await res.text();
      console.log("⬅️ Raw response:", text);

      let order;
      try {
        order = JSON.parse(text);
      } catch {
        throw new Error("Server returned invalid JSON");
      }

      console.log("📦 STEP 4: Parsed order:", order);

      if (!res.ok || !order?.id) {
        throw new Error(order?.error?discription || "Order creation failed");
      }

      console.log("🟢 STEP 5: Order created:", order.id);

      /* ---------- RAZORPAY ---------- */
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID, // PUBLIC KEY ONLY
        amount: order.amount,
        currency: "INR",
        name: "StyleHub",
        description: "Order Payment",
        order_id: order.id,

        handler: async (response) => {
          console.log("🟢 STEP 6: Payment success", response);

          if (!response?.razorpay_order_id) {
            toast.error("Payment verification failed");
            return;
          }

          console.log("🟡 STEP 7: Saving order to Firestore");

          const orderRef = await addDoc(collection(db, "orders"), {
            userId: user.uid,
            items: cartItems,
            total,
            address,
            paymentId: response.razorpay_payment_id,
            orderId: response.razorpay_order_id,
            status: "Paid",
            createdAt: serverTimestamp(),
          });

          await setDoc(
            doc(db, "users", user.uid, "orders", orderRef.id),
            {
              orderId: orderRef.id,
              createdAt: serverTimestamp(),
            }
          );

          console.log("✅ STEP 8: Order saved");

          await clearCart();
          toast.success("Payment successful 🎉");
          navigate("/orders");
        },

        prefill: {
          email: user.email,
        },

        theme: { color: "#000" },
      };

      console.log("🟡 STEP 9: Opening Razorpay");
      new window.Razorpay(options).open();
    } catch (err) {
      console.error("🔥 FINAL ERROR:", err);
      toast.error(err.message || "Payment failed");
    } finally {
      setPlacing(false);
      console.log("🔵 END: placing=false");
    }
  };

  /* ================= UI ================= */
  return (
    <div className="checkout-page">
      <h2>Checkout</h2>

      <div className="checkout-section">
        <h4>Delivery Address</h4>
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>

      <div className="checkout-section">
        <h4>Order Summary</h4>

        {cartItems.map((item) => (
          <div key={item.id} className="checkout-item">
            <span>
              {item.name} ({item.selectedSize}) × {item.quantity}
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
        onClick={handlePayment}
        disabled={placing}
      >
        {placing ? "PROCESSING..." : "PAY NOW"}
      </button>
    </div>
  );
}

export default Checkout;
