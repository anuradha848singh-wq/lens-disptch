import { Router } from "express";
import Stripe from "stripe";
import { storage } from "../storage";
import { logError, logInfo } from "../logger";

const router = Router();

// Initialize Stripe conditionally (supports developer mock flow if key is missing)
const stripeKey = process.env.STRIPE_API_KEY || "";
const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: "2024-06-20" as any }) : null;

// Mock session store for sandbox checkout fallback
const mockCheckoutSessions = new Map<string, string>(); // sessionId -> userId

// Create a Checkout Session
router.post("/create-checkout", async (req: any, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized. Please sign in." });
    }

    const userId = req.user.id;
    const userEmail = req.user.email;
    const returnUrl = `${req.protocol}://${req.get("host")}/settings?checkout=success`;
    const cancelUrl = `${req.protocol}://${req.get("host")}/pricing?checkout=cancel`;

    if (!stripe) {
      // Mock Sandbox Checkout Flow (Runs at startup if keys are not set yet)
      const mockSessionId = `mock_cs_${Math.random().toString(36).substring(2, 15)}`;
      mockCheckoutSessions.set(mockSessionId, userId);
      
      logInfo("api", "Created Mock Checkout Session", { userId, mockSessionId });
      
      // Simulate Stripe checkout redirection to a mock success url
      const mockRedirectUrl = `${req.protocol}://${req.get("host")}/api/stripe/mock-checkout-success?session_id=${mockSessionId}`;
      return res.json({ id: mockSessionId, url: mockRedirectUrl });
    }

    // Real Stripe Checkout Flow
    let customerId = req.user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { userId },
      });
      customerId = customer.id;
      await storage.updateUser(userId, { stripeCustomerId: customerId });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "The Lens Dispatch - Premium Pro Plan",
              description: "Access to Grok Executive briefings, Sarvam AI Translation, and narrative divergence analytics.",
            },
            unit_amount: 999, // $9.99
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${returnUrl}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: { userId },
    });

    res.json({ id: session.id, url: session.url });
  } catch (error: any) {
    logError("api", "Create checkout session failed", { error: error.message });
    res.status(500).json({ message: error.message });
  }
});

// Mock Success Redirection endpoint to simulate webhook locally
router.get("/mock-checkout-success", async (req, res) => {
  const { session_id } = req.query;
  if (!session_id || typeof session_id !== "string") {
    return res.status(400).send("Invalid session ID");
  }

  const userId = mockCheckoutSessions.get(session_id);
  if (!userId) {
    return res.status(404).send("Checkout session not found or already processed");
  }

  try {
    // Update user to premium
    await storage.updateUser(userId, {
      isPremium: true,
      subscriptionStatus: "active",
      stripeSubscriptionId: `mock_sub_${Math.random().toString(36).substring(2, 10)}`,
    });

    logInfo("api", "Mock subscription activated successfully", { userId, session_id });
    mockCheckoutSessions.delete(session_id);

    // Redirect user back to settings with success notification
    res.redirect("/settings?checkout=success");
  } catch (err: any) {
    logError("api", "Mock checkout activation failed", { error: err.message });
    res.status(500).send("Internal Server Error during mock activation.");
  }
});

// Create Billing Portal Session
router.post("/portal", async (req: any, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const customerId = req.user.stripeCustomerId;
    if (!customerId && stripe) {
      return res.status(400).json({ message: "No billing profile found for this user." });
    }

    const returnUrl = `${req.protocol}://${req.get("host")}/settings`;

    if (!stripe) {
      // Mock Billing Portal
      return res.json({ url: returnUrl });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    res.json({ url: portalSession.url });
  } catch (error: any) {
    logError("api", "Create portal session failed", { error: error.message });
    res.status(500).json({ message: error.message });
  }
});

// Stripe Webhook Endpoint (Production webhook)
router.post("/webhook", async (req: any, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !sig || !webhookSecret) {
    // Webhook not configured, or running mock setup
    return res.status(400).send("Webhook configurations missing.");
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody as any, sig, webhookSecret);
  } catch (err: any) {
    logError("api", "Webhook signature verification failed", { error: err.message });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const subscriptionId = session.subscription as string;
        
        if (userId) {
          await storage.updateUser(userId, {
            isPremium: true,
            subscriptionStatus: "active",
            stripeSubscriptionId: subscriptionId,
          });
          logInfo("api", "Webhook: Premium subscription activated", { userId, subscriptionId });
        }
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as any; // Cast as any to prevent subscription typing errors
        const subscriptionId = invoice.subscription as string;
        if (subscriptionId) {
          logInfo("api", "Webhook: Subscription payment succeeded", { subscriptionId });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;
        logInfo("api", "Webhook: Subscription deleted", { subscriptionId });
        break;
      }
      default:
        logInfo("api", "Webhook: Unhandled event type", { type: event.type });
    }

    res.json({ received: true });
  } catch (err: any) {
    logError("api", "Webhook event handling error", { error: err.message });
    res.status(500).json({ error: "Webhook handler failed" });
  }
});

// Developer Quick Mock Upgrade (Forces isPremium = true in dev)
router.post("/mock-upgrade", async (req: any, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized." });
    }
    const updatedUser = await storage.updateUser(req.user.id, {
      isPremium: true,
      subscriptionStatus: "active",
    });
    logInfo("api", "Developer mock upgrade triggered", { userId: req.user.id });
    res.json({ message: "Mock upgrade successful!", user: updatedUser });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Developer Quick Mock Downgrade (Forces isPremium = false)
router.post("/mock-downgrade", async (req: any, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized." });
    }
    const updatedUser = await storage.updateUser(req.user.id, {
      isPremium: false,
      subscriptionStatus: "inactive",
    });
    logInfo("api", "Developer mock downgrade triggered", { userId: req.user.id });
    res.json({ message: "Mock downgrade successful!", user: updatedUser });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
