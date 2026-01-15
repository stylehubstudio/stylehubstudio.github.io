import { useCart } from "../context/CartContext";

export default function ProductCard({ product, onOpen }) {
  const { addToCart } = useCart();

  return (
    <div className="product-card">
      <img src={product.img} alt={product.name} onClick={onOpen} style={{cursor:"pointer"}}/>
      <h3>{product.name}</h3>
      <p>₹{product.price}</p>
      <button onClick={()=>addToCart(product)}>Quick Add</button>
    </div>
  );
}
