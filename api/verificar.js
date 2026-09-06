const LARANJINHA_BASE_URL = process.env.LARANJINHA_BASE_URL || 'https://mqvdjjbkjglaimbnpcer.supabase.co/functions/v1/api-proxy';

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

    if (!process.env.LARANJINHA_API_KEY) {
        response.status(500).json({ success: false, message: 'Credencial da API PIX não configurada' });
        return;
    }

    const url = new URL(`${LARANJINHA_BASE_URL}/charges/${encodeURIComponent(paymentLinkId)}`);

    try {
        const laranjinhaResponse = await fetch(url, {
            headers: {
                'X-API-Key': process.env.LARANJINHA_API_KEY,
                Accept: 'application/json'
            }
        });
        const text = await laranjinhaResponse.text();
        let payload;
        try {
            payload = JSON.parse(text);
        } catch (error) {
            payload = { message: text };
        }

        if (!laranjinhaResponse.ok) {
            response.status(laranjinhaResponse.status).json({
                success: false,
                message: payload.message || 'Não foi possível consultar o pagamento'
            });
            return;
        }

        const charge = payload.charge || payload;
        response.status(200).json({
            success: true,
            paid: charge.status === 'paid',
            status: charge.status,
            transaction_id: charge.id
        });
    } catch (error) {
        response.status(502).json({ success: false, message: 'Não foi possível conectar à API PIX' });
    }
};
