// /api/createorder.js
import Razorpay from "razorpay";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // ✅ Check environment variables
    const { REACT_APP_RAZORPAY_KEY_ID, REACT_APP_RAZORPAY_KEY_SECRET } = process.env;

    if (!REACT_APP_RAZORPAY_KEY_ID || !REACT_APP_RAZORPAY_KEY_SECRET) {
      console.error("Razorpay keys missing on server");
      return res.status(500).json({ error: "Razorpay keys missing on server" });
    }

    const razorpay = new Razorpay({
      key_id: REACT_APP_RAZORPAY_KEY_ID,
      key_secret: REACT_APP_RAZORPAY_KEY_SECRET,
    });

    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    // Convert ₹ → paise
    const options = {
      amount: Math.round(amount * 100), // paise
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json(order);
  } catch (err) {
    console.error("Order creation failed:", err);
    res.status(500).json({ error: "Order creation failed" });
  }
}
