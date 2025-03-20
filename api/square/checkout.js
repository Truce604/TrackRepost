const { Client, Environment } = require("square");

const squareClient = new Client({
    environment: Environment.Production,
    accessToken: process.env.SQUARE_ACCESS_TOKEN
});

const checkoutApi = squareClient.checkoutApi;

const { result } = await checkoutApi.createPaymentLink({
    idempotencyKey: `trackrepost-${userId}-${Date.now()}`,
    quickPay: {
        name: `${credits} Credits`,
        priceMoney: {
            amount: amountInCents,
            currency: "CAD" // Ensure currency matches Square settings
        },
        locationId: process.env.SQUARE_LOCATION_ID
    },
    redirectUrl: `https://www.trackrepost.com/payment-success?credits=${credits}&userId=${userId}`
});
