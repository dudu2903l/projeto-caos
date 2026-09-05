module.exports = async function handler(request, response) {
    const cpf = String(request.query?.cpf || '').replace(/\D/g, '');

    if (cpf.length !== 11) {
        response.status(400).json({ ok: false, error: 'CPF inválido' });
        return;
    }

    const apiUrl = new URL('https://xpag.net/api/requests');
    apiUrl.searchParams.set('route', 'cpf');
    apiUrl.searchParams.set('cpf', cpf);

    try {
        const apiResponse = await fetch(apiUrl);
        const body = await apiResponse.text();

        response.status(apiResponse.status);
        response.setHeader('Content-Type', apiResponse.headers.get('content-type') || 'application/json; charset=utf-8');
        response.send(body);
    } catch (error) {
        response.status(502).json({ ok: false, error: 'Não foi possível consultar a API' });
    }
};
