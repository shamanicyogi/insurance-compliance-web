import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";
import { withErrorHandling } from "@/lib/api-error-handler";

async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "You must be logged in to create a checkout session" },
        { status: 401 }
      );
    }

    // Get the price ID from the request or use the default one
    const { priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID } =
      await req.json();

    if (!priceId) {
      return NextResponse.json(
        { error: "Price ID is required" },
        { status: 400 }
      );
    }

    // Check if user already has a subscription
    const { data: existingSubscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    // If the user already has an active subscription, redirect to the customer portal
    if (
      existingSubscription?.status === "active" ||
      existingSubscription?.status === "trialing"
    ) {
      return NextResponse.json(
        { error: "You already have an active subscription" },
        { status: 400 }
      );
    }

    // First, see if the user already has a Stripe customer ID
    const { data: user } = await supabase
      .from("users")
      .select("stripe_customer_id")
      .eq("id", session.user.id)
      .single();

    let customerId = user?.stripe_customer_id;

    // If not, create a new customer in Stripe
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email!,
        name: session.user.name || session.user.displayName || undefined,
        metadata: {
          userId: session.user.id,
        },
      });

      customerId = customer.id;

      // Update the user with the Stripe customer ID
      await supabase
        .from("users")
        .update({ stripe_customer_id: customerId })
        .eq("id", session.user.id);
    }

    // Create a checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXTAUTH_URL}/dashboard?checkoutSuccess=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/dashboard?checkoutCanceled=true`,
      metadata: {
        userId: session.user.id,
      },
    });

    return NextResponse.json({ sessionId: checkoutSession.id });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

// Export with error handling
const POSTHandler = withErrorHandling(POST);

export { POSTHandler as POST };
