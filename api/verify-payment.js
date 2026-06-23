export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { orderId } = req.body;

  const response = await fetch(`https://api.cashfree.com/pg/orders/${orderId}`, {
    method: "GET",
    headers: {
      "x-client-id": process.env.VITE_CASHFREE_APP_ID,
      "x-client-secret": process.env.VITE_CASHFREE_SECRET_KEY,
      "x-api-version": "2023-08-01",
    },
  });

  const data = await response.json();

  if (data.order_status === "PAID") {
    return res.status(200).json({ success: true, status: "PAID" });
  } else {
    return res.status(200).json({ success: false, status: data.order_status });
  }
}
