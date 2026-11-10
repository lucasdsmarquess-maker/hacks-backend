const express = require('express');
const cors = require('cors');
const app = express();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_live_SUA_CHAVE_STRIPE_AQUI';
const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || 'APP_USR-SEU_TOKEN_MERCADO_PAGO_AQUI';

const stripe = require('stripe')(STRIPE_SECRET_KEY);
const { MercadoPagoConfig, Preference } = require('mercadopago');

const client = new MercadoPagoConfig({ accessToken: MERCADOPAGO_ACCESS_TOKEN });

app.use(express.json());
app.use(cors());

app.post('/api/create-stripe-checkout', async (req, res) => {
    try {
        const { productTitle, amount, currency } = req.body;
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: currency.toLowerCase(),
                    product_data: { name: productTitle },
                    unit_amount: Math.round(amount * 100),
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `https://seusite.com/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `https://seusite.com/cancel`,
        });
        res.json({ url: session.url });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/create-pix-preference', async (req, res) => {
    try {
        const { productTitle, amount } = req.body;
        const preference = new Preference(client);
        const response = await preference.create({
            body: {
                items: [{
                    title: productTitle,
                    quantity: 1,
                    unit_price: Number(amount),
                    currency_id: 'BRL'
                }],
                payment_methods: {
                    excluded_payment_types: [{ id: 'credit_card' }, { id: 'ticket' }]
                },
                back_urls: {
                    success: 'https://seusite.com/success',
                    pending: 'https://seusite.com/pending',
                },
                auto_return: 'approved',
            }
        });
        res.json({ 
            init_point: response.init_point,
            qr_code: response.point_of_interaction?.transaction_data?.qr_code,
            qr_code_base64: response.point_of_interaction?.transaction_data?.qr_code_base64
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/webhook', (req, res) => {
    const event = req.body;
    res.status(200).json({ received: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando profissionalmente na porta ${PORT}`));
