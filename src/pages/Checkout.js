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

  /* ================= LOAD RAZORPAY SCRIPT ================= */
  useEffect(() => {
    if (window.Razorpay) return;

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => console.log("🟢 Razorpay SDK loaded");
    script.onerror = () => console.error("❌ Razorpay SDK failed to load");

    document.body.appendChild(script);
  }, []);

  /* ================= LOAD SAVED ADDRESS ================= */
  useEffect(() => {
    if (!user) return;

    const fetchAddress = async () => {
      try {
        console.log("🟡 Fetching saved address");
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists() && snap.data()?.address) {
          setAddress(snap.data().address);
          console.log("🟢 Address loaded");
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
      toast.error("Please login to continue");
      return navigate("/auth");
    }

    if (!address.trim()) {
      return toast.error("Please enter delivery address");
    }

    if (cartItems.length === 0) {
      return toast.error("Cart is empty");
    }

    if (!window.Razorpay) {
      return toast.error("Payment SDK not loaded");
    }

    setPlacing(true);

    try {
      console.log("🟡 STEP 1: Creating Razorpay order");

      const res = await fetch("/api/createorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: total }),
      });

      const data = await res.json();
      console.log("⬅️ Server response:", data);

      if (!res.ok || !data?.id) {
        throw new Error(data?.error || "Order creation failed");
      }

      console.log("🟢 STEP 2: Order created:", data.id);

      const options = {
        key: import.meta.env.REACT_APP_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: "INR",
        name: "StyleHub",
        description: "Order Payment",
        order_id: data.id,

        handler: async (response) => {
          console.log("🟢 STEP 3: Payment success", response);

          try {
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

            await clearCart();
            toast.success("Payment successful 🎉");
            navigate("/orders");
          } catch (err) {
            console.error("❌ Firestore save failed:", err);
            toast.error("Payment saved failed");
          }
        },

        prefill: {
          email: user.email || "",
        },

        theme: { color: "#000000" },
      };

      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", (res) => {
        console.error("❌ Payment failed:", res.error);
        toast.error(res.error.description || "Payment failed");
      });

      console.log("🟡 STEP 4: Opening Razorpay");
      rzp.open();

    } catch (err) {
      console.error("🔥 FINAL ERROR:", err);
      toast.error(err.message || "Payment failed");
    } finally {
      setPlacing(false);
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
