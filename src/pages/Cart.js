import { useEffect, useState } from "react";
import { useCart } from "../context/CartContext";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import "../styles/cart.css";
import { toast } from "react-toastify";

function Cart() {
  const { cartItems, removeFromCart, clearCart, updateQuantity } = useCart();
  const navigate = useNavigate();

  const [stockMap, setStockMap] = useState({}); // 🔥 LIVE STOCK

  /* ---------------- FETCH LIVE STOCK ---------------- */
  useEffect(() => {
    const fetchStock = async () => {
      const map = {};

      for (const item of cartItems) {
        const ref = doc(db, "products", item.id);
        const snap = await getDoc(ref);

        if (!snap.exists()) continue;

        const product = snap.data();
        const variant = product.variants?.find(
          (v) => v.color === item.selectedColor
        );

        const stock =
          Number(variant?.sizes?.[item.selectedSize] ?? 0);

        map[`${item.id}_${item.selectedColor}_${item.selectedSize}`] = stock;
      }

      setStockMap(map);
    };

    if (cartItems.length > 0) fetchStock();
  }, [cartItems]);

  /* ---------------- TOTALS ---------------- */
  const totalPrice = cartItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  const totalItems = cartItems.reduce(
    (acc, item) => acc + item.quantity,
    0
  );

  /* ---------------- CHECKOUT ---------------- */
  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast.warning("Cart is empty!");
      return;
    }

    const invalid = cartItems.some((item) => {
      const key = `${item.id}_${item.selectedColor}_${item.selectedSize}`;
      const stock = stockMap[key] ?? 0;
      return item.quantity > stock;
    });

    if (invalid) {
      toast.error("Some items exceed available stock");
      return;
    }

    navigate("/checkout");
  };

  if (cartItems.length === 0) {
    return <p className="center-text">Your cart is empty</p>;
  }

  return (
    <div className="cart-page">
      <h2>Shopping Cart</h2>

      <div className="cart-items">
        {cartItems.map((item) => {
          const key = `${item.id}_${item.selectedColor}_${item.selectedSize}`;
          const stock = stockMap[key] ?? 0;
          const outOfStock = stock <= 0;

          return (
            <div
              key={key}
              className={`cart-item ${outOfStock ? "out-stock" : ""}`}
            >
              <img src={item.image} alt={item.name} className="cart-item-img" />

              <div className="cart-item-info">
                <p className="cart-item-name">{item.name}</p>
                <p>Price: ₹{item.price}</p>
                <p>Color: {item.selectedColor}</p>
                <p>Size: {item.selectedSize}</p>

                <div className="cart-item-qty">
                  <label>Qty:</label>
                  <div className="qty-controls">
                    <button
                      onClick={() =>
                        updateQuantity(
                          item.id,
                          item.selectedSize,
                          item.selectedColor,
                          item.quantity - 1
                        )
                      }
                      disabled={item.quantity <= 1 || outOfStock}
                    >
                      -
                    </button>

                    <span>{item.quantity}</span>

                    <button
                      onClick={() =>
                        updateQuantity(
                          item.id,
                          item.selectedSize,
                          item.selectedColor,
                          item.quantity + 1
                        )
                      }
                      disabled={item.quantity >= stock || outOfStock}
                    >
                      +
                    </button>
                  </div>

                  {outOfStock ? (
                    <span className="out-of-stock-text">Out of stock</span>
                  ) : (
                    <span className="stock-text">Stock: {stock}</span>
                  )}
                </div>

                <p className="item-total">
                  Total: ₹{item.price * item.quantity}
                </p>
              </div>

              <button
                className="remove-btn"
                onClick={() => {
                  removeFromCart(
                    item.id,
                    item.selectedSize,
                    item.selectedColor
                  );
                  toast.info(`${item.name} removed`);
                }}
              >
                Remove
              </button>
            </div>
          );
        })}
      </div>

      <div className="cart-summary">
        <p>Items: {totalItems}</p>
        <p>Total: ₹{totalPrice}</p>
      </div>

      <div className="cart-actions">
        <button
          onClick={() => {
            clearCart();
            toast.info("Cart cleared");
          }}
          className="clear-cart-btn"
        >
          Clear Cart
        </button>

        <button
          onClick={handleCheckout}
          className="checkout-btn"
        >
          Proceed to Checkout
        </button>
      </div>
    </div>
  );
}

export default Cart;
