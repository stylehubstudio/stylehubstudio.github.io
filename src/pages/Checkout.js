import { useEffect, useState } from "react";
import { collection, addDoc, doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
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

  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  useEffect(() => {
    if (!user) return;
    const fetchAddress = async () => {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists() && snap.data().address) setAddress(snap.data().address);
    };
    fetchAddress();
  }, [user]);

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
      // 1️⃣ Create order on server
      const res = await fetch("/api/createorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: total }),
      });

      if (!res.ok) throw new Error("Failed to create order");
      const order = await res.json();

      // 2️⃣ Razorpay options
      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "StyleHub",
        description: "Order Payment",
        order_id: order.id,
        prefill: {
          email: user.email,
          name: user.displayName || "Customer",
        },
        theme: { color: "#000" },
        handler: async function (response) {
          // 3️⃣ Save order in Firestore
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

          await setDoc(doc(db, "users", user.uid, "orders", orderRef.id), {
            orderId: orderRef.id,
            createdAt: serverTimestamp(),
          });

          await clearCart();
          toast.success("Payment successful 🎉");
          navigate("/orders");
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
      rzp.on("payment.failed", function (response) {
        toast.error(`Payment failed: ${response.error.description}`);
      });
    } catch (err) {
      console.error("Payment error:", err);
      toast.error(err.message || "Payment failed");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="checkout-page">
      <h2>Checkout</h2>

      <div className="checkout-section">
        <h4>Delivery Address</h4>
        <textarea value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>

      <div className="checkout-section">
        <h4>Order Summary</h4>
        {cartItems.map((item) => (
          <div key={item.id} className="checkout-item">
            <span>{item.name} ({item.selectedSize}) × {item.quantity}</span>
            <span>₹{item.price * item.quantity}</span>
          </div>
        ))}
        <div className="checkout-total">
          <strong>Total</strong>
          <strong>₹{total}</strong>
        </div>
      </div>

      <button className="place-order-btn" onClick={handlePayment} disabled={placing}>
        {placing ? "PROCESSING..." : "PAY NOW"}
      </button>
    </div>
  );
}

export default Checkout;
