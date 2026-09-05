module.exports = async function handler(request, response) {
    if (request.method !== 'POST') {
        response.status(405).json({ ok: false });
        return;
    }

    const event = request.body || {};
    const eventName = event.event && event.event.name;
    const paymentLink = event.data && event.data.paymentLink;

    if (!eventName || !paymentLink) {
        response.status(400).json({ ok: false, error: 'Payload de webhook inválido' });
        return;
    }

    response.status(200).json({
        ok: true,
        event: eventName,
        paymentLinkId: paymentLink.id || (event.event && event.event.contextId)
    });
};
