const crypto = require('crypto');

function getRawBody(request) {
    if (Buffer.isBuffer(request.rawBody)) return request.rawBody;
    if (typeof request.rawBody === 'string') return Buffer.from(request.rawBody);
    if (Buffer.isBuffer(request.body)) return request.body;
    return Buffer.from(JSON.stringify(request.body || {}));
}

function validarAssinatura(request, rawBody) {
    const secret = process.env.WEBHOOK_SECRET;
    const signature = String(request.headers?.['x-laranjinha-signature'] || '');
    const timestamp = Number(request.headers?.['x-laranjinha-timestamp']);

    if (!secret || !signature || !Number.isFinite(timestamp)) return false;
    if (Math.abs(Date.now() / 1000 - timestamp) > 300) return false;

    const match = signature.match(/(?:^|,)v1=([^,]+)/);
    if (!match) return false;

    const expected = crypto
        .createHmac('sha256', secret)
        .update(`${timestamp}.${rawBody.toString()}`)
        .digest('hex');
    const received = Buffer.from(match[1], 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');

    return received.length === expectedBuffer.length && crypto.timingSafeEqual(received, expectedBuffer);
}

module.exports = async function handler(request, response) {
    if (request.method !== 'POST') {
        response.status(405).json({ ok: false });
        return;
    }

    const rawBody = getRawBody(request);
    if (!validarAssinatura(request, rawBody)) {
        response.status(401).json({ ok: false, error: 'Assinatura inválida' });
        return;
    }

    let event;
    try {
        event = JSON.parse(rawBody.toString());
    } catch (error) {
        response.status(400).json({ ok: false, error: 'Payload de webhook inválido' });
        return;
    }

    if (event.event !== 'sale.paid' || !event.data || !event.data.intent_id) {
        response.status(400).json({ ok: false, error: 'Payload de webhook inválido' });
        return;
    }

    response.status(200).json({
        ok: true,
        event: event.event,
        transaction_id: event.data.intent_id
    });
};
