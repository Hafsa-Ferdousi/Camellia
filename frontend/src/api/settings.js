import client from "./client";

// Public — used by Checkout to show accurate delivery/VAT estimates.
export const getPricing = () => client.get("/settings/pricing");
