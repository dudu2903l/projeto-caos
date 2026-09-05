const SHARPIFY_BASE_URL = 'https://sharpify-pay.com';

module.exports = async function handler(request, response) {
    if (request.method !== 'GET') {
        response.status(405).json({ success: false, message: 'Método não permitido' });
        return;
    }

    const paymentLinkId = String(request.query?.transaction_id || '').trim();
    if (!paymentLinkId) {
        response.status(400).json({ success: false, message: 'ID do pagamento ausente' });
        return;
    }

    if (!process.env.SHARPIFY_CLIENT_ID || !process.env.SHARPIFY_CLIENT_SECRET) {
        response.status(500).json({ success: false, message: 'Credenciais Sharpify não configuradas' });
        return;
    }

    const url = new URL(`${SHARPIFY_BASE_URL}/api/v1/gateway/payment/get-payment`);
    url.searchParams.set('paymentLinkId', paymentLinkId);

    try {
        const sharpifyResponse = await fetch(url, {
            headers: {
                'x-sharpify-client-id': process.env.SHARPIFY_CLIENT_ID,
                'x-sharpify-client-secret': process.env.SHARPIFY_CLIENT_SECRET,
                Accept: 'application/json'
            }
        });
        const text = await sharpifyResponse.text();
        let payload;
        try {
            payload = JSON.parse(text);
        } catch (error) {
            payload = { message: text };
        }

        if (!sharpifyResponse.ok) {
            response.status(sharpifyResponse.status).json({
                success: false,
                message: payload.message || 'Não foi possível consultar o pagamento'
            });
            return;
        }

        const paymentLink = payload.data || payload;
        response.status(200).json({
            success: true,
            paid: paymentLink.status === 'APPROVED',
            status: paymentLink.status,
            transaction_id: paymentLink.id
        });
    } catch (error) {
        response.status(502).json({ success: false, message: 'Não foi possível conectar à Sharpify' });
    }
};
