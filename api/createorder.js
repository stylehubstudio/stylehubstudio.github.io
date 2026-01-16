export const config = {
  runtime: "nodejs",
};

import Razorpay from "razorpay";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await razorpay.orders.create({
      amount: Number(req.body.amount) * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    return res.status(200).json(order);
  } catch (error) {
    console.error("RAZORPAY ERROR:", error);
    return res.status(500).json({
      statusCode: error.statusCode,
      error: error.error,
    });
  }
}
