import { getUncachableStripeClient } from "../server/stripeClient";

async function createProducts() {
  try {
    const stripe = await getUncachableStripeClient();

    console.log("Creating Casa dos 20 Premium products...");

    const existingProducts = await stripe.products.search({
      query: "name:'Casa dos 20 Premium' AND active:'true'",
    });

    if (existingProducts.data.length > 0) {
      console.log("Product already exists. Skipping creation.");
      console.log(`Existing product ID: ${existingProducts.data[0].id}`);
      const prices = await stripe.prices.list({ product: existingProducts.data[0].id, active: true });
      for (const price of prices.data) {
        const interval = (price.recurring as any)?.interval || "one-time";
        console.log(`  Price: ${price.id} - ${price.unit_amount! / 100} ${price.currency.toUpperCase()}/${interval}`);
      }
      return;
    }

    const product = await stripe.products.create({
      name: "Casa dos 20 Premium",
      description: "Acesso completo a todas as jornadas, perguntas ilimitadas, e conteúdo exclusivo da Casa dos 20.",
      metadata: {
        app: "casa-dos-20",
        type: "subscription",
      },
    });
    console.log(`Created product: ${product.name} (${product.id})`);

    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: 990,
      currency: "brl",
      recurring: { interval: "month" },
      metadata: { plan: "monthly" },
    });
    console.log(`Created monthly price: R$9,90/mês (${monthlyPrice.id})`);

    const yearlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: 7990,
      currency: "brl",
      recurring: { interval: "year" },
      metadata: { plan: "yearly" },
    });
    console.log(`Created yearly price: R$79,90/ano (${yearlyPrice.id})`);

    console.log("Products and prices created successfully!");
    console.log("Webhooks will sync this data to your database automatically.");
  } catch (error: any) {
    console.error("Error creating products:", error.message);
    process.exit(1);
  }
}

createProducts();
