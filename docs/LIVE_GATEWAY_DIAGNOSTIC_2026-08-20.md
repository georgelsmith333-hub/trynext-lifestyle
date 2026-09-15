
## Checkout surface verification

At 22:22:34 UTC, the persistent Cart control opened a cart drawer showing the selected Birthday Celebration Tee, size M, quantity 1, subtotal ৳450, and Checkout Now / View & Edit Full Cart controls.

At 22:22:42 UTC, Checkout Now opened `/checkout` at Step 1 Delivery. The page rendered Sign in, Create account, Continue as Guest, required first name, last name, email, phone, address, delivery area, optional order notes, Continue to Payment, order summary, advance/payment-on-delivery split, and no-submit state. No personal data was entered, no payment was initiated, and no order mutation was submitted. Checkout routing and guard surface are **PARTIALLY VERIFIED**; end-to-end order creation remains intentionally unexecuted because it would create a real customer order.
