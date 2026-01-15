import Razorpay from "razorpay";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { amount } = req.body;

    console.log("Server: Received amount:", amount);
    console.log("Server: Razorpay Key:", process.env.RAZORPAY_KEY_ID ? "FOUND" : "MISSING");

    if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ error: "Razorpay keys missing on server" });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // convert ₹ → paise
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
    });

    console.log("Server: Razorpay order created:", order);

    res.status(200).json(order);
  } catch (err) {
    console.error("Server: Razorpay error:", err);
    res.status(500).json({ error: "Order creation failed" });
  }
}
