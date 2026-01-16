import Razorpay from "razorpay";

export default async function handler(req, res) {
  console.log("🟢 API HIT");
  console.log("➡️ Method:", req.method);

  if (req.method !== "POST") {
    console.log("❌ Wrong method");
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.log("🟡 ENV CHECK");
  console.log("KEY ID:", process.env.RAZORPAY_KEY_ID ? "FOUND" : "MISSING");
  console.log("KEY SECRET:", process.env.RAZORPAY_KEY_SECRET ? "FOUND" : "MISSING");

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.log("❌ ENV MISSING");
    return res.status(500).json({
      error: "Razorpay keys missing on server",
    });
  }

  try {
    const { amount } = req.body;
    console.log("🟣 Amount received:", amount);

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
    });

    console.log("✅ ORDER CREATED:", order.id);

    res.status(200).json(order);
  } catch (err) {
    console.error("🔥 RAZORPAY ERROR:", err);
    res.status(500).json({ error: "Order creation failed" });
  }
}
