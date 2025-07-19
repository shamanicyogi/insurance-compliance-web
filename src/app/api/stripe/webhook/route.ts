import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";
import Stripe from "stripe";
import { withErrorHandling } from "@/lib/api-error-handler";

async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature") as string;

  if (!signature) {
    return NextResponse.json(
      { error: "No signature provided" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`Webhook signature verification failed: ${error.message}`);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;

        if (userId && session.subscription) {
          // Get subscription details from Stripe
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          // Create subscription in Supabase
          await supabase.from("subscriptions").insert({
            id: subscription.id,
            user_id: userId,
            status: subscription.status,
            price_id: subscription.items.data[0].price.id,
            current_period_start: new Date(
              subscription.items.data[0].current_period_start * 1000
            ).toISOString(),
            current_period_end: new Date(
              subscription.items.data[0].current_period_end * 1000
            ).toISOString(),
            created_at: new Date(subscription.created * 1000).toISOString(),
            updated_at: new Date().toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            trial_start: subscription.trial_start
              ? new Date(subscription.trial_start * 1000).toISOString()
              : null,
            trial_end: subscription.trial_end
              ? new Date(subscription.trial_end * 1000).toISOString()
              : null,
          });

          // Update user subscription status
          await supabase
            .from("users")
            .update({
              subscription_status: subscription.status,
            })
            .eq("id", userId);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = await getUserIdFromSubscription(subscription.id);

        if (userId) {
          // Update subscription in Supabase
          await supabase
            .from("subscriptions")
            .update({
              status: subscription.status,
              current_period_start: new Date(
                subscription.items.data[0].current_period_start * 1000
              ).toISOString(),
              current_period_end: new Date(
                subscription.items.data[0].current_period_end * 1000
              ).toISOString(),
              updated_at: new Date().toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
              canceled_at: subscription.canceled_at
                ? new Date(subscription.canceled_at * 1000).toISOString()
                : null,
            })
            .eq("id", subscription.id);

          // Update user subscription status
          await supabase
            .from("users")
            .update({
              subscription_status: subscription.status,
            })
            .eq("id", userId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = await getUserIdFromSubscription(subscription.id);

        if (userId) {
          // Update subscription in Supabase
          await supabase
            .from("subscriptions")
            .update({
              status: subscription.status,
              updated_at: new Date().toISOString(),
              canceled_at: subscription.canceled_at
                ? new Date(subscription.canceled_at * 1000).toISOString()
                : new Date().toISOString(),
            })
            .eq("id", subscription.id);

          // Update user subscription status
          await supabase
            .from("users")
            .update({
              subscription_status: "canceled",
            })
            .eq("id", userId);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Error processing webhook" },
      { status: 500 }
    );
  }
}

// Helper function to get user ID from subscription ID
async function getUserIdFromSubscription(
  subscriptionId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("id", subscriptionId)
    .single();

  return data?.user_id || null;
}

// Export with error handling
const POSTHandler = withErrorHandling(POST);

export { POSTHandler as POST };
