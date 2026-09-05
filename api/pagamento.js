const SHARPIFY_BASE_URL = 'https://sharpify-pay.com';

function sharpifyHeaders() {
    return {
        'x-sharpify-client-id': process.env.SHARPIFY_CLIENT_ID || '',
        'x-sharpify-client-secret': process.env.SHARPIFY_CLIENT_SECRET || '',
        'Content-Type': 'application/json',
        Accept: 'application/json'
    };
}

function getPaymentData(payload) {
    const paymentLink = payload && payload.data ? payload.data : payload;
    const payment = paymentLink && paymentLink.payment;
    const gatewayData = payment && payment.gateway && payment.gateway.data;

    return {
        success: true,
        transaction_id: paymentLink && paymentLink.id,
        pixCode: gatewayData && gatewayData.code,
        qrCodeUrl: gatewayData && gatewayData.qrCode,
        status: paymentLink && paymentLink.status
    };
}

module.exports = async function handler(request, response) {
    if (request.method !== 'POST') {
        response.status(405).json({ success: false, message: 'Método não permitido' });
        return;
    }

    if (!process.env.SHARPIFY_CLIENT_ID || !process.env.SHARPIFY_CLIENT_SECRET) {
        response.status(500).json({ success: false, message: 'Credenciais Sharpify não configuradas' });
        return;
    }

    let input = request.body || {};
    if (typeof input === 'string') {
        try {
            input = JSON.parse(input);
        } catch (error) {
            response.status(400).json({ success: false, message: 'JSON inválido' });
            return;
        }
    }

    const amount = Number(input.amount != null ? input.amount : input.valor);
    if (!Number.isFinite(amount) || amount <= 0) {
        response.status(400).json({ success: false, message: 'Valor inválido' });
        return;
    }

    const payload = {
        name: String(input.name || input.item_title || 'Pagamento PIX').slice(0, 140),
        description: String(input.description || input.item_title || 'Pagamento PIX').slice(0, 500),
        amount,
        gatewayMethod: 'PIX'
    };

    if (process.env.SHARPIFY_WEBHOOK_URL) {
        payload.webhook = {
            callbackURL: process.env.SHARPIFY_WEBHOOK_URL
        };
    }

    try {
        const sharpifyResponse = await fetch(`${SHARPIFY_BASE_URL}/api/v1/gateway/payment/create-paymnet`, {
            method: 'POST',
            headers: sharpifyHeaders(),
            body: JSON.stringify(payload)
        });
        const text = await sharpifyResponse.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (error) {
            data = { message: text };
        }

        if (!sharpifyResponse.ok) {
            response.status(sharpifyResponse.status).json({
                success: false,
                message: data.message || 'A Sharpify recusou a criação do pagamento'
            });
            return;
        }

        const result = getPaymentData(data);
        if (!result.transaction_id || !result.pixCode) {
            response.status(502).json({ success: false, message: 'Resposta PIX incompleta da Sharpify' });
            return;
        }
        response.status(200).json(result);
    } catch (error) {
        response.status(502).json({ success: false, message: 'Não foi possível conectar à Sharpify' });
    }
};
