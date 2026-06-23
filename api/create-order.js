export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { amount, orderId, customerName, customerEmail } = req.body;

  const response = await fetch("https://api.cashfree.com/pg/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": process.env.VITE_CASHFREE_APP_ID,
      "x-client-secret": process.env.VITE_CASHFREE_SECRET_KEY,
      "x-api-version": "2023-08-01",
    },
    body: JSON.stringify({
      order_id: orderId,
      order_amount: amount,
      order_currency: "INR",
      customer_details: {
        customer_id: orderId,
        customer_name: customerName || "CrushDrop User",
        customer_email: customerEmail || "user@crushdrop.in",
        customer_phone: "9999999999",
      },
      order_meta: {
        return_url: `https://crushdrop.vercel.app/r/payment-success?order_id={order_id}`,
      },
    }),
  });

  const data = await response.json();
  return res.status(200).json(data);
}
