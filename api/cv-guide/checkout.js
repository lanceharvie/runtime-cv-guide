const PRODUCT_PRICE_ID = "price_1TeTaSRxkZxECNpdCCzzDYJ9";
const SUCCESS_URL = "https://cv.runtimerec.com/thank-you";
const CANCEL_URL = "https://cv.runtimerec.com";

function setCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", "https://cv.runtimerec.com");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(request, response) {
  setCorsHeaders(response);

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || process.env.PIPELINE_STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    response.status(500).json({ error: "Stripe is not configured" });
    return;
  }

  const form = new URLSearchParams();
  form.set("mode", "payment");
  form.set("line_items[0][price]", PRODUCT_PRICE_ID);
  form.set("line_items[0][quantity]", "1");
  form.set("success_url", SUCCESS_URL);
  form.set("cancel_url", CANCEL_URL);
  form.set("customer_creation", "always");
  form.set("billing_address_collection", "auto");
  form.set("metadata[product]", "cv-guide");
  form.set("payment_intent_data[metadata][product]", "cv-guide");

  try {
    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    });
    const data = await stripeResponse.json();

    if (!stripeResponse.ok || !data.url) {
      response.status(stripeResponse.status || 502).json({
        error: data.error?.message || "Checkout failed",
      });
      return;
    }

    response.status(200).json({ url: data.url });
  } catch (error) {
    response.status(500).json({ error: "Checkout request failed" });
  }
}
