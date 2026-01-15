import Razorpay from "razorpay";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // ⚠️ CRA env variables start with REACT_APP_ but in Vercel functions, use process.env.<YOUR_KEY>
    // Make sure you set these in Vercel dashboard under Project Settings → Environment Variables
    const razorpay = new Razorpay({
      key_id: process.env.REACT_APP_RAZORPAY_KEY_ID,
      key_secret: process.env.REACT_APP_RAZORPAY_KEY_SECRET,
    });

    const { amount } = req.body;

    if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amount * 100, // Convert ₹ to paise
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
    });

    res.status(200).json(order);
  } catch (err) {
    console.error("Razorpay order creation error:", err);
    res.status(500).json({ error: "Order creation failed" });
  }
}
