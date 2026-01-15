import Razorpay from "razorpay";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const razorpay = new Razorpay({
      key_id: process.env.REACT_APP_RAZORPAY_KEY_ID,
      key_secret: process.env.REACT_APP_RAZORPAY_KEY_SECRET,
    });

    const { amount } = req.body;

    const order = await razorpay.orders.create({
      amount: amount * 100, // ₹ → paise
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
    });

    res.status(200).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Order creation failed" });
  }
}
