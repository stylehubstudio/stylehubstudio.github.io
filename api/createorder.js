import Razorpay from "razorpay";

export default async function handler(req, res) {
  console.log("==================================");
  console.log("🟢 /api/createorder HIT");
  console.log("➡️ Method:", req.method);
  console.log("➡️ Headers:", req.headers);
  console.log("➡️ Body:", req.body);
  console.log("==================================");

  // Method check
  if (req.method !== "POST") {
    console.log("❌ METHOD NOT POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ENV check
  console.log("🔑 ENV CHECK START");
  console.log(
    "RAZORPAY_KEY_ID:",
    process.env.RAZORPAY_KEY_ID ? "FOUND ✅" : "MISSING ❌"
  );
  console.log(
    "RAZORPAY_KEY_SECRET:",
    process.env.RAZORPAY_KEY_SECRET ? "FOUND ✅" : "MISSING ❌"
  );

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.log("🔥 ENV VARIABLES MISSING — EXITING");
    return res.status(500).json({
      error: "Razorpay keys missing on server",
    });
  }

  try {
    const { amount } = req.body;

    console.log("💰 Amount received:", amount);

    if (!amount) {
      console.log("❌ AMOUNT NOT RECEIVED");
      return res.status(400).json({ error: "Amount missing" });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    console.log("🟡 Razorpay instance created");

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: "test_receipt_" + Date.now(),
    });

    console.log("✅ ORDER CREATED SUCCESSFULLY");
    console.log("📦 Order:", order);

    return res.status(200).json(order);
  } catch (err) {
    console.log("🔥 ERROR INSIDE TRY BLOCK");
    console.error(err);

    return res.status(500).json({
      error: "Order creation failed",
      details: err.message,
    });
  }
}
