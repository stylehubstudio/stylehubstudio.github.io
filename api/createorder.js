const Razorpay = require("razorpay");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return res.status(500).json({ error: "Razorpay keys missing on server" });
  }

  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const { amount } = req.body;

    if (!amount || amount < 1) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // ₹ → paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    return res.status(200).json(order);
  } catch (err) {
    console.error("Razorpay error:", err);
    return res.status(500).json({ error: "Order creation failed" });
  }
};
