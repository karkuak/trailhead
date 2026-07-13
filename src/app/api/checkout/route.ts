import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { PRODUCTS } from "@/lib/products";
import { getSessionUserId } from "@/lib/auth";
import type { OrderRecord } from "@/lib/types";

interface CartItemInput {
  productId: string;
  quantity: number;
}

// Deterministic test cards so payment outcomes are reproducible in tests and
// previews without a real payment processor.
const ALWAYS_SUCCEEDS = "4242424242424242";
const FAILS_ONCE_THEN_SUCCEEDS = "4000000000000002";

function cardDecision(cardNumber: string, priorFailedAttempts: number): {
  status: "succeeded" | "failed";
  reason?: string;
} {
  if (cardNumber === ALWAYS_SUCCEEDS) return { status: "succeeded" };
  if (cardNumber === FAILS_ONCE_THEN_SUCCEEDS) {
    if (priorFailedAttempts === 0) return { status: "failed", reason: "card_declined" };
    return { status: "succeeded" };
  }
  return { status: "failed", reason: "card_declined" };
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  const body = await request.json().catch(() => null);
  const items: CartItemInput[] = Array.isArray(body?.items) ? body.items : [];
  const cardNumber = typeof body?.cardNumber === "string" ? body.cardNumber.replace(/\s/g, "") : "";
  const guestEmail = typeof body?.guestEmail === "string" ? body.guestEmail : null;
  const existingOrderId = typeof body?.orderId === "string" ? body.orderId : null;

  if (items.length === 0 || !cardNumber) {
    return NextResponse.json({ error: "Cart items and card number are required." }, { status: 400 });
  }
  if (!userId && !guestEmail) {
    return NextResponse.json({ error: "Guest checkout requires an email." }, { status: 400 });
  }

  const productById = new Map(PRODUCTS.map((p) => [p.id, p]));
  let totalCents = 0;
  const resolvedItems = items.map((item) => {
    const product = productById.get(item.productId);
    if (!product) throw new Error(`Unknown product: ${item.productId}`);
    const quantity = Math.max(1, Math.floor(item.quantity));
    totalCents += product.priceCents * quantity;
    return { product, quantity };
  });

  let order: OrderRecord;
  if (existingOrderId) {
    const found = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(existingOrderId) as
      | OrderRecord
      | undefined;
    if (!found || found.status !== "pending") {
      return NextResponse.json({ error: "Order is not retryable." }, { status: 409 });
    }
    order = found;
  } else {
    const id = `order_${randomUUID()}`;
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO orders (id, user_id, guest_email, status, total_cents, had_failed_attempt, created_at)
       VALUES (@id, @user_id, @guest_email, 'pending', @total_cents, 0, @created_at)`
    ).run({ id, user_id: userId ?? null, guest_email: guestEmail, total_cents: totalCents, created_at: now });

    const insertItem = db.prepare(
      `INSERT INTO order_items (id, order_id, product_id, quantity, price_cents)
       VALUES (@id, @order_id, @product_id, @quantity, @price_cents)`
    );
    for (const { product, quantity } of resolvedItems) {
      insertItem.run({
        id: `oi_${randomUUID()}`,
        order_id: id,
        product_id: product.id,
        quantity,
        price_cents: product.priceCents,
      });
    }
    order = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(id) as OrderRecord;
  }

  const priorFailedAttempts = db
    .prepare(`SELECT COUNT(*) as n FROM payment_attempts WHERE order_id = ? AND status = 'failed'`)
    .get(order.id) as { n: number };
  const attemptNumber =
    (db
      .prepare(`SELECT COUNT(*) as n FROM payment_attempts WHERE order_id = ?`)
      .get(order.id) as { n: number }).n + 1;

  const decision = cardDecision(cardNumber, priorFailedAttempts.n);
  const last4 = cardNumber.slice(-4);

  db.prepare(
    `INSERT INTO payment_attempts (id, order_id, attempt_number, card_last4, status, failure_reason, created_at)
     VALUES (@id, @order_id, @attempt_number, @card_last4, @status, @failure_reason, @created_at)`
  ).run({
    id: `pay_${randomUUID()}`,
    order_id: order.id,
    attempt_number: attemptNumber,
    card_last4: last4,
    status: decision.status,
    failure_reason: decision.reason ?? null,
    created_at: new Date().toISOString(),
  });

  if (decision.status === "failed") {
    db.prepare(`UPDATE orders SET had_failed_attempt = 1 WHERE id = ?`).run(order.id);
    return NextResponse.json({
      orderId: order.id,
      status: "failed",
      reason: decision.reason,
      attemptNumber,
      totalCents: order.total_cents,
    });
  }

  const recovered = priorFailedAttempts.n > 0;
  const completedAt = new Date().toISOString();
  db.prepare(
    `UPDATE orders SET status = 'paid', completed_at = @completed_at WHERE id = @id`
  ).run({ id: order.id, completed_at: completedAt });

  return NextResponse.json({
    orderId: order.id,
    status: "paid",
    recovered,
    attemptNumber,
    totalCents: order.total_cents,
    completedAt,
  });
}
