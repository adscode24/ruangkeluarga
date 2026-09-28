import { requireMember, ok, fail, readBody, withCors } from '../../_lib/auth.js';

async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, Object.assign(new Error('Method tidak didukung'), { status: 405 }));
  try {
    const { user, member, admin } = await requireMember(req);
    const body = await readBody(req);
    const plan = body.plan;
    const priceMap = { premium_monthly: process.env.STRIPE_PRICE_MONTHLY, premium_yearly: process.env.STRIPE_PRICE_YEARLY };
    if (!priceMap[plan]) return fail(res, Object.assign(new Error('Paket tidak valid'), { status: 400 }));
    if (!process.env.STRIPE_SECRET_KEY) return fail(res, Object.assign(new Error('Stripe belum dikonfigurasi'), { status: 500 }));

    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const { data: ex } = await admin.from('subscriptions').select('*').eq('family_id', member.family_id).limit(1);
    let customerId = ex?.[0]?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { family_id: member.family_id } });
      customerId = customer.id;
    }
    const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, '') || process.env.VITE_APP_URL || 'https://ruangkeluarga.vercel.app';
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceMap[plan], quantity: 1 }],
      mode: 'subscription',
      success_url: `${origin}/premium?status=success`,
      cancel_url: `${origin}/premium?status=canceled`,
      metadata: { family_id: member.family_id, plan },
    });
    return ok(res, { url: session.url });
  } catch (e) { return fail(res, e); }
}
export default withCors(handler);
