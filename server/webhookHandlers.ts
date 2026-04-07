import { getUncachableStripeClient } from "./stripeClient";
import { storage } from "./storage";
import Stripe from "stripe";
import { notifyAdminNewSubscription, notifyAdminCardAdded, notifyAdminRenewal } from "./adminNotify";

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        "STRIPE WEBHOOK ERROR: Payload must be a Buffer. " +
        "Received type: " + typeof payload + ". " +
        "This usually means express.json() parsed the body before reaching this handler. " +
        "FIX: Ensure webhook route is registered BEFORE app.use(express.json())."
      );
    }

    const stripe = await getUncachableStripeClient();
    const event = JSON.parse(payload.toString()) as Stripe.Event;

    try {
      await WebhookHandlers.handleSubscriptionEvent(event, stripe);
    } catch (err: any) {
      console.error(`[stripe webhook] Error handling event ${event.type}:`, err.message);
    }

  }

  static async handleSubscriptionEvent(event: Stripe.Event, stripe: Stripe): Promise<void> {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode === "setup" && session.metadata?.purpose === "trial_bonus") {
          const customerId = session.customer as string;
          const user = await storage.getUserByStripeCustomerId(customerId);
          if (!user) {
            console.log(`[stripe] trial_bonus: No user found for customer ${customerId}`);
            return;
          }
          if (user.trialBonusClaimed) {
            console.log(`[stripe] trial_bonus: User ${user.email} already claimed bonus`);
            return;
          }
          const now = Date.now();
          const baseDate = user.trialEndsAt && new Date(user.trialEndsAt).getTime() > now
            ? new Date(user.trialEndsAt)
            : new Date(now);
          const daysToAdd = user.trialEndsAt ? 16 : 30;
          const newTrialEnd = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
          await storage.updateUser(user.id, { trialEndsAt: newTrialEnd, trialBonusClaimed: true });
          console.log(`[stripe] trial_bonus: User ${user.email} granted +${daysToAdd} days, trial now until ${newTrialEnd.toISOString()}`);
          notifyAdminCardAdded(user.name, user.email).catch(() => {});
          return;
        }

        if (session.mode !== "subscription") return;

        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        const user = await storage.getUserByStripeCustomerId(customerId);
        if (!user) {
          console.log(`[stripe] No user found for customer ${customerId}`);
          return;
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const periodEnd = new Date(subscription.current_period_end * 1000);

        const isTrialBonus = session.metadata?.purpose === "trial_bonus";
        const updates: Record<string, any> = {
          stripeSubscriptionId: subscriptionId,
          isPremium: true,
          premiumUntil: periodEnd,
        };
        if (isTrialBonus) {
          updates.trialBonusClaimed = true;
          updates.trialEndsAt = periodEnd;
        }

        await storage.updateUser(user.id, updates);
        console.log(`[stripe] User ${user.email} activated premium until ${periodEnd.toISOString()}${isTrialBonus ? " (trial_bonus)" : ""}`);
        if (isTrialBonus) {
          notifyAdminCardAdded(user.name, user.email).catch(() => {});
        } else {
          notifyAdminNewSubscription(user.name, user.email).catch(() => {});
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const user = await storage.getUserByStripeCustomerId(customerId);
        if (!user) return;

        const status = subscription.status;
        const periodEnd = new Date(subscription.current_period_end * 1000);

        if (status === "active" || status === "trialing") {
          await storage.updateUser(user.id, {
            stripeSubscriptionId: subscription.id,
            isPremium: true,
            premiumUntil: periodEnd,
          });
          console.log(`[stripe] User ${user.email} subscription ${status}, premium until ${periodEnd.toISOString()}`);
        } else if (status === "past_due" || status === "unpaid") {
          await storage.updateUser(user.id, {
            isPremium: false,
            premiumUntil: null,
          });
          console.log(`[stripe] User ${user.email} subscription ${status}, premium revoked`);
        } else if (status === "canceled") {
          await storage.updateUser(user.id, {
            isPremium: false,
            premiumUntil: periodEnd,
            stripeSubscriptionId: null,
          });
          console.log(`[stripe] User ${user.email} subscription canceled, access until ${periodEnd.toISOString()}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const user = await storage.getUserByStripeCustomerId(customerId);
        if (!user) return;

        await storage.updateUser(user.id, {
          isPremium: false,
          premiumUntil: null,
          stripeSubscriptionId: null,
        });
        console.log(`[stripe] User ${user.email} subscription deleted, premium revoked`);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if (!invoice.subscription) return;
        const customerId = invoice.customer as string;

        const user = await storage.getUserByStripeCustomerId(customerId);
        if (!user) return;

        const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
        const periodEnd = new Date(subscription.current_period_end * 1000);

        await storage.updateUser(user.id, {
          isPremium: true,
          premiumUntil: periodEnd,
        });
        console.log(`[stripe] User ${user.email} invoice paid, premium renewed until ${periodEnd.toISOString()}`);

        if ((invoice as any).billing_reason === "subscription_cycle") {
          notifyAdminRenewal(user.name, user.email).catch(() => {});
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const user = await storage.getUserByStripeCustomerId(customerId);
        if (!user) return;

        console.log(`[stripe] User ${user.email} payment failed`);
        break;
      }
    }
  }
}
