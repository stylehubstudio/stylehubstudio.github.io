import Razorpay from "razorpay";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { amount } = req.body;

  // Validate amount
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  // Check environment variables
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    console.error("Razorpay keys missing on server");
    return res.status(500).json({ error: "Razorpay keys missing on server" });
  }

  try {
    const razorpay = new Razorpay({
      key_id,
      key_secret,
    });

    const order = await razorpay.orders.create({
      amount: amount * 100, // ₹ → paise
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
    });

    res.status(200).json(order);
  } catch (err) {
    console.error("Razorpay order creation failed:", err);
    res.status(500).json({ error: "Order creation failed" });
  }
}
