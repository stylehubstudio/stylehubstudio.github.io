import Razorpay from "razorpay";

export default async function handler(req, res) {
  console.log("🟡 API HIT: /api/createorder");

  if (req.method !== "POST") {
    console.log("❌ METHOD:", req.method);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("📦 BODY RECEIVED:", req.body);

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    console.log("🔧 Razorpay instance created");

    const options = {
      amount: Number(req.body.amount) * 100, // MUST be number
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    };

    console.log("🧾 ORDER OPTIONS:", options);

    const order = await razorpay.orders.create(options);

    console.log("✅ ORDER SUCCESS:", order);

    return res.status(200).json(order);

  } catch (error) {
    console.error("🔥 RAZORPAY FULL ERROR:", error);
    console.error("🔥 ERROR DESCRIPTION:", error?.error?.description);

    return res.status(500).json({
      error: "Order creation failed",
      razorpay: error?.error || error,
    });
  }
}
