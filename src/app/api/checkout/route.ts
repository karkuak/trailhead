import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { query, queryOne } from "@/lib/db";
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
    const found = await queryOne<OrderRecord>(`SELECT * FROM orders WHERE id = $1`, [
      existingOrderId,
    ]);
    if (!found || found.status !== "pending") {
      return NextResponse.json({ error: "Order is not retryable." }, { status: 409 });
    }
    order = found;
  } else {
    const id = `order_${randomUUID()}`;
    const now = new Date().toISOString();
    await query(
      `INSERT INTO orders (id, user_id, guest_email, status, total_cents, had_failed_attempt, created_at)
       VALUES ($1, $2, $3, 'pending', $4, 0, $5)`,
      [id, userId ?? null, guestEmail, totalCents, now]
    );

    for (const { product, quantity } of resolvedItems) {
      await query(
        `INSERT INTO order_items (id, order_id, product_id, quantity, price_cents)
         VALUES ($1, $2, $3, $4, $5)`,
        [`oi_${randomUUID()}`, id, product.id, quantity, product.priceCents]
      );
    }
    order = (await queryOne<OrderRecord>(`SELECT * FROM orders WHERE id = $1`, [id]))!;
  }

  const priorFailedCount = await queryOne<{ n: string }>(
    `SELECT COUNT(*) as n FROM payment_attempts WHERE order_id = $1 AND status = 'failed'`,
    [order.id]
  );
  const totalAttemptsCount = await queryOne<{ n: string }>(
    `SELECT COUNT(*) as n FROM payment_attempts WHERE order_id = $1`,
    [order.id]
  );
  const priorFailedAttempts = Number(priorFailedCount?.n ?? 0);
  const attemptNumber = Number(totalAttemptsCount?.n ?? 0) + 1;

  const decision = cardDecision(cardNumber, priorFailedAttempts);
  const last4 = cardNumber.slice(-4);

  await query(
    `INSERT INTO payment_attempts (id, order_id, attempt_number, card_last4, status, failure_reason, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      `pay_${randomUUID()}`,
      order.id,
      attemptNumber,
      last4,
      decision.status,
      decision.reason ?? null,
      new Date().toISOString(),
    ]
  );

  if (decision.status === "failed") {
    await query(`UPDATE orders SET had_failed_attempt = 1 WHERE id = $1`, [order.id]);
    return NextResponse.json({
      orderId: order.id,
      status: "failed",
      reason: decision.reason,
      attemptNumber,
      totalCents: order.total_cents,
    });
  }

  const recovered = priorFailedAttempts > 0;
  const completedAt = new Date().toISOString();
  await query(`UPDATE orders SET status = 'paid', completed_at = $1 WHERE id = $2`, [
    completedAt,
    order.id,
  ]);

  return NextResponse.json({
    orderId: order.id,
    status: "paid",
    recovered,
    attemptNumber,
    totalCents: order.total_cents,
    completedAt,
  });
}
