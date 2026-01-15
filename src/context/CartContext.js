import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./AuthContext";
import { toast } from "react-toastify";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // ---------------- MERGE CARTS ----------------
  const mergeCarts = useCallback((userCart, guestCart) => {
    const merged = [...userCart];

    guestCart.forEach((guestItem) => {
      const index = merged.findIndex(
        (item) =>
          item.id === guestItem.id &&
          item.selectedSize === guestItem.selectedSize &&
          item.selectedColor === guestItem.selectedColor
      );

      const variant = guestItem.variants?.find(v => v.color === guestItem.selectedColor);
      const stock = variant?.sizes?.[guestItem.selectedSize] ?? 0;

      if (index !== -1) {
        merged[index].quantity = Math.min(
          merged[index].quantity + guestItem.quantity,
          stock
        );
      } else {
        merged.push(guestItem);
      }
    });

    return merged;
  }, []);

  // ---------------- PERSIST CART ----------------
  const persistCart = useCallback(
    async (items) => {
      try {
        if (user) {
          await setDoc(doc(db, "carts", user.uid), {
            items,
            updatedAt: serverTimestamp(),
          });
        } else {
          localStorage.setItem("guestCart", JSON.stringify(items));
        }
      } catch (error) {
        console.error("Cart persistence failed:", error);
      }
    },
    [user]
  );

  // ---------------- LOAD CART ----------------
  useEffect(() => {
    const loadCart = async () => {
      setLoading(true);
      try {
        const guestCart = JSON.parse(localStorage.getItem("guestCart")) || [];

        if (!user) {
          setCartItems(guestCart);
          return;
        }

        const snap = await getDoc(doc(db, "carts", user.uid));
        const userCart = snap.exists() ? snap.data().items || [] : [];

        const mergedCart = mergeCarts(userCart, guestCart);
        setCartItems(mergedCart);
        localStorage.removeItem("guestCart");

        await persistCart(mergedCart);
      } catch (err) {
        console.error("Failed to load cart:", err);
      } finally {
        setLoading(false);
      }
    };

    loadCart();
  }, [user, mergeCarts, persistCart]);

  // ---------------- ADD TO CART ----------------
  const addToCart = useCallback(
    ({ product, selectedColor, selectedSize, quantity = 1 }) => {
      if (!product || !selectedColor || !selectedSize || quantity <= 0) {
        toast.warning("Please select color, size, and quantity");
        return;
      }

      const variant = product.variants.find(v => v.color === selectedColor);
      const stock = Number(variant?.sizes?.[selectedSize] ?? 0);

      if (stock <= 0) {
        toast.error("Product out of stock");
        return;
      }

      let toastShown = false;

      setCartItems((prev) => {
        const index = prev.findIndex(
          (item) =>
            item.id === product.id &&
            item.selectedSize === selectedSize &&
            item.selectedColor === selectedColor
        );

        let updatedCart = [...prev];

        if (index !== -1) {
          const newQty = Math.min(prev[index].quantity + quantity, stock);

          if (newQty === prev[index].quantity) {
            if (!toastShown) {
              toastShown = true;
              toast.warning(`Only ${stock} item(s) available`);
            }
            return prev;
          }

          updatedCart[index] = { ...prev[index], quantity: newQty };
        } else {
          updatedCart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.images?.[0] || "",
            quantity,
            selectedSize,
            selectedColor,
            variants: product.variants,
          });
        }

        if (!toastShown) {
          toastShown = true;
          toast.success("Added to cart");
        }

        persistCart(updatedCart);
        return updatedCart;
      });
    },
    [persistCart]
  );

  // ---------------- UPDATE QUANTITY ----------------
  const updateQuantity = (id, size, color, quantity) => {
    if (quantity <= 0) return;

    setCartItems((prev) => {
      const index = prev.findIndex(
        (item) =>
          item.id === id &&
          item.selectedSize === size &&
          item.selectedColor === color
      );

      if (index === -1) return prev;

      const variant = prev[index].variants.find(v => v.color === color);
      const stock = Number(variant?.sizes?.[size] ?? 0);
      const newQty = Math.min(quantity, stock);

      const updatedCart = [...prev];
      updatedCart[index] = { ...prev[index], quantity: newQty };

      persistCart(updatedCart);
      return updatedCart;
    });
  };

  // ---------------- REMOVE ITEM ----------------
  const removeFromCart = (id, size, color) => {
    setCartItems((prev) => {
      const updatedCart = prev.filter(
        (item) =>
          !(item.id === id &&
            item.selectedSize === size &&
            item.selectedColor === color)
      );
      persistCart(updatedCart);
      return updatedCart;
    });
  };

  // ---------------- CLEAR CART ----------------
  const clearCart = async () => {
    setCartItems([]);
    await persistCart([]);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        loading,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
      }}
    >
      {!loading && children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
