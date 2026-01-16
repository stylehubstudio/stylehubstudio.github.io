import Razorpay from "razorpay";

export default async function handler(req, res) {
  console.log("KEY_ID =", process.env.RAZORPAY_KEY_ID);
  console.log(
    "KEY_SECRET =",
    process.env.RAZORPAY_KEY_SECRET
      ? process.env.RAZORPAY_KEY_SECRET.length
      : "MISSING"
  );

  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await razorpay.orders.create({
      amount: 100,
      currency: "INR",
      receipt: "test_receipt",
    });

    return res.status(200).json(order);
  } catch (e) {
    console.error("RAZORPAY ERROR:", e);
    return res.status(500).json(e);
  }
}
