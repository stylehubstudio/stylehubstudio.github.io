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
    if (!user) return;

    const fetchAddress = async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists() && snap.data().address) {
          setAddress(snap.data().address);
        }
      } catch (err) {
        console.error("Failed to fetch address:", err);
      }
    };

    fetchAddress();
  }, [user]);

  /* ---------------- RAZORPAY PAYMENT ---------------- */
  const handlePayment = async () => {
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

    setPlacing(true);

    try {
      // 1️⃣ Create Razorpay order on backend
      const res = await fetch("/api/createorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: total }),
      });

      if (!res.ok) {
        throw new Error("Failed to create order");
      }

      const order = await res.json();
      console.log("Order from backend:", order);

      if (!order.id) {
        throw new Error("Backend did not return order ID");
      }

      // 2️⃣ Razorpay options
      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID, // CRA env variable
        amount: order.amount,
        currency: "INR",
        name: "StyleHub",
        description: "Order Payment",
        order_id: order.id,
        handler: async function (response) {
          console.log("Razorpay response:", response);

          if (!response.razorpay_order_id || !response.razorpay_payment_id) {
            toast.error("Payment failed: missing payment details");
            return;
          }

          try {
            // 3️⃣ Save order after payment success
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

            // 4️⃣ Link order to user for faster fetch
            await setDoc(doc(db, "users", user.uid, "orders", orderRef.id), {
              orderId: orderRef.id,
              createdAt: serverTimestamp(),
            });

            // 5️⃣ Clear cart
            await clearCart();
            toast.success("Payment successful 🎉");
            navigate("/orders");
          } catch (err) {
            console.error("Failed to save order:", err);
            toast.error("Failed to save order after payment");
          }
        },
        prefill: { email: user.email },
        theme: { color: "#000" },
      };

      if (!window.Razorpay) {
        throw new Error("Razorpay script not loaded");
      }

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      console.error("Payment error:", err);
      toast.error(err.message || "Payment failed");
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
        onClick={handlePayment}
        disabled={placing}
      >
        {placing ? "PROCESSING..." : "PAY NOW"}
      </button>
    </div>
  );
}

export default Checkout;
