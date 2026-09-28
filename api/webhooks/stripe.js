import { send } from '../_lib/auth.js';
import { adminClient } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Method tidak didukung' }));
  }
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'Stripe belum dikonfigurasi' }));
    }
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Baca raw body untuk verifikasi signature
    const raw = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', (c) => { data += c; });
      req.on('end', () => resolve(data));
      req.on('error', reject);
    });
    const sig = req.headers['stripe-signature'];
    let event;
    try {
      event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: `Webhook Error: ${err.message}` }));
    }

    const admin = adminClient();
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const familyId = session.metadata?.family_id;
      const plan = session.metadata?.plan;
      if (familyId && plan) {
        const { data: ex } = await admin.from('subscriptions').select('*').eq('family_id', familyId).limit(1);
        const sub = await stripe.subscriptions.retrieve(session.subscription);
        const periodEnd = new Date(sub.current_period_end * 1000).toISOString();
        if (ex?.[0]) {
          await admin.from('subscriptions').update({
            plan, status: 'active', stripe_subscription_id: session.subscription,
            stripe_customer_id: session.customer, current_period_end: periodEnd,
          }).eq('id', ex[0].id);
        } else {
          await admin.from('subscriptions').insert({
            family_id: familyId, plan, status: 'active',
            stripe_customer_id: session.customer, stripe_subscription_id: session.subscription,
            current_period_end: periodEnd,
          });
        }
      }
    } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const { data: ex } = await admin.from('subscriptions').select('*').eq('stripe_subscription_id', sub.id).limit(1);
      if (ex?.[0]) {
        const patch = {
          status: sub.status,
          current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : ex[0].current_period_end,
        };
        if (event.type === 'customer.subscription.deleted') { patch.plan = 'free'; patch.status = 'canceled'; }
        await admin.from('subscriptions').update(patch).eq('id', ex[0].id);
      }
    }
    return send(res, 200, { received: true });
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: e.message || 'Terjadi kesalahan' }));
  }
}

export const config = { api: { bodyParser: false } };
