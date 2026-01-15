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

  // Load saved address
  useEffect(() => {
    if (!user) return;

    const fetchAddress = async () => {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists() && snap.data().address) {
        setAddress(snap.data().address);
      }
    };

    fetchAddress();
  }, [user]);

  // Handle payment
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
      // 1️⃣ Create Razorpay order via serverless function
      const res = await fetch("/api/createorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: total }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create order");
      }

      const order = await res.json();

      // 2️⃣ Razorpay options
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID, // frontend key
        amount: order.amount,
        currency: "INR",
        name: "StyleHub",
        description: "Order Payment",
        order_id: order.id, // use Razorpay order id
        handler: async function (response) {
          if (!response.razorpay_payment_id) {
            toast.error("Payment failed: invalid response");
            return;
          }

          // 3️⃣ Save order in Firebase
          const orderRef = await addDoc(collection(db, "orders"), {
            userId: user.uid,
            items: cartItems,
            total,
            address,
            paymentId: response.razorpay_payment_id,
            orderId: order.id, // ✅ must not be undefined
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
        },
        prefill: {
          email: user.email,
        },
        theme: { color: "#000" },
      };

      // 3️⃣ Open Razorpay checkout
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      console.error("Payment error:", err);
      toast.error("Payment failed: " + err.message);
    } finally {
      setPlacing(false);
    }
  };

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
          <div
            key={`${item.id}-${item.selectedSize}-${item.selectedColor}`}
            className="checkout-item"
          >
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
