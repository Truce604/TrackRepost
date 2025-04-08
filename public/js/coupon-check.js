// /js/coupon-check.js

export function applyCouponCode(code) {
  if (!code || typeof code !== "string") return 0;

  const normalized = code.trim().toUpperCase();

  const validCoupons = {
    "LAUNCH100": 100,
    // Add future codes here
    // "SPRING50": 50,
    // "VIP250": 250
  };

  return validCoupons[normalized] || 0;
}
