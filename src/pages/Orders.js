import { useEffect, useState } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "../styles/orders.css";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState({}); // track expanded state

  useEffect(() => {
    if (!user) return;

    const fetchOrders = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "orders"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            items: data.items || [],
            total: data.total || 0,
            status: data.status || "Placed",
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          };
        });

        setOrders(list);
      } catch (err) {
        console.error("Error loading orders", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  const toggleExpand = (orderId) => {
    setExpandedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  if (!user) {
    return <p className="center-text">Please login to view your orders.</p>;
  }

  if (loading) {
    return <p className="center-text">Loading orders...</p>;
  }

  if (orders.length === 0) {
    return <p className="center-text">No orders found.</p>;
  }

  const statusColors = {
    placed: "#3498db",
    shipped: "#f1c40f",
    delivered: "#2ecc71",
    cancelled: "#e74c3c"
  };

  return (
    <div className="orders-page">
      <h2>Your Orders</h2>

      {orders.map(order => {
        const isExpanded = expandedOrders[order.id] || false;

        return (
          <div key={order.id} className="order-card">
            <div className="order-header" onClick={() => toggleExpand(order.id)}>
              <span className="order-id">Order #{order.id.slice(0, 8)}</span>
              <span
                className="status"
                style={{ backgroundColor: statusColors[order.status.toLowerCase()] || "#888" }}
              >
                {order.status}
              </span>
              <span className="order-date">
                {order.createdAt.toLocaleString()}
              </span>
              <span className="expand-icon">
                {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
              </span>
            </div>

            {isExpanded && (
              <div className="order-items">
                {order.items.map((item, idx) => (
                  <div key={idx} className="order-item">
                    <span>{item.name} × {item.quantity}</span>
                    <span>₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="order-footer">
              <span>Total</span>
              <strong>₹{order.total}</strong>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default Orders;
