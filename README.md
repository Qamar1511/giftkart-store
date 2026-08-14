# GIFTKART — Multi-brand Gift Card Store

Full-stack store: React frontend + Node/Express/MongoDB backend. Sells digital
gift cards / wallet top-ups across 10 brands (PlayStation, Steam, Xbox,
Amazon, Flipkart, Google Play, Netflix, Swiggy, Domino's, PayPal) in 5
categories (Gaming, Shopping, Entertainment, Food, Payments), with cart +
quantity, Razorpay (cards, UPI, netbanking), PayPal (USD), USDT (crypto), and
manual UPI (QR + UTR) as payment options, auto-delivery of gift card codes
after payment, invoices, order history, and cancel/refund.

> Brands, categories and denominations all live in one place:
> `server/config/catalog.js` (backend) and its display-only mirror
> `client/src/data/catalog.js` (frontend, for names/colors). Add or edit a
> brand there, then re-run the seed script to stock it. We don't ship real
> brand logos (licensing) — each brand shows as a colored initials badge
> (`BrandBadge.jsx`); swap in real logo images later if you have the rights.

## Shopping flow

1. Browse the homepage, add gift cards to your cart (with quantity)
2. Go to `/cart` → "Proceed to checkout" — if you're not logged in, you're
   sent to log in first, then continue straight to checkout
3. Fill in your delivery address
4. Pick a payment method:
   - **Razorpay / Card / Debit Card** → opens Razorpay Checkout
   - **UPI (Scan QR)** → shows your UPI ID + a QR code + a UTR input box;
     customer pays via any UPI app and submits the UTR — you verify it
     manually against your bank statement (see below)
   - **USDT** → shows a crypto address, polls until confirmed on-chain
   - **PayPal** → redirects to PayPal, comes back to confirm
5. Order confirmation page — invoice download, reorder, back to home
6. `/orders` — full order history, cancel + refund, invoice download

## 1. Configure environment variables

Copy `server/.env.example` to `server/.env` and fill in:

```
MONGO_URI=...              # your MongoDB Atlas connection string
JWT_SECRET=...             # any long random string

RAZORPAY_KEY_ID=...        # Razorpay Dashboard > Settings > API Keys (test mode is fine)
RAZORPAY_KEY_SECRET=...

PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=...       # developer.paypal.com > My Apps & Credentials (sandbox app)
PAYPAL_CLIENT_SECRET=...

NOWPAYMENTS_API_KEY=...    # nowpayments.io dashboard (for USDT)
NOWPAYMENTS_IPN_SECRET=...

UPI_ID=yourname@okhdfcbank # your own UPI ID — no gateway needed for this one
UPI_PAYEE_NAME=GIFTKART
```

You can leave Razorpay/PayPal/NOWPayments as placeholder strings and use the
🧪 **Test mode** button on the payment page to exercise the whole flow
without any real gateway account.

## 2. Install & run

```
# Backend
cd server
npm install
npm run seed        # adds 10 test gift card codes per brand+denomination
npm run dev          # http://localhost:5000

# Frontend (new terminal)
cd client
npm install
npm start             # http://localhost:3000
```

## 3. Verifying a manual UPI payment

Since manual UPI has no gateway, nobody marks it "paid" automatically. Once
a customer submits their UTR (visible on their order / in your database),
check it against your actual bank/UPI statement, then run:

```
cd server
npm run verify-payment -- <orderId>
```

This marks the order as paid and triggers auto-delivery, same as a real
gateway webhook would. (A proper admin panel to do this from a UI is a
later section.)

## Notes / things to decide before going live

- **Razorpay** already handles cards, debit cards, UPI, and netbanking inside
  its one checkout widget.
- **PayPal (USD)** and **USDT** conversion from INR uses a fixed placeholder
  rate in `server/config/catalog.js` (`INR_TO_USD_RATE`) — swap this for a
  live forex rate lookup before launch.
- **Refunds**: Razorpay and PayPal refunds are automatic on cancel. USDT and
  manual UPI can't be auto-reversed, so cancelling a paid order there is
  flagged `manual_review` instead — refund those manually.
- Compliance (RBI/FEMA for PayPal, crypto tax rules for USDT, Razorpay KYC
  for gift-card resale, and using a personal/business UPI ID for commercial
  sales) — get this checked by a CA/lawyer before launch.
