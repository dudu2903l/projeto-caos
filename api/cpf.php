<?php
header('Content-Type: application/json; charset=utf-8');

$cpf = preg_replace('/\D/', '', $_GET['cpf'] ?? '');

if (strlen($cpf) !== 11) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'CPF inválido']);
    exit;
}

$url = 'https://xpag.net/api/requests?' . http_build_query([
    'route' => 'cpf',
    'cpf' => $cpf,
]);

$curl = curl_init($url);
curl_setopt_array($curl, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 15,
    CURLOPT_HTTPHEADER => ['Accept: application/json'],
]);

$body = curl_exec($curl);
$status = curl_getinfo($curl, CURLINFO_HTTP_CODE);
$error = curl_error($curl);
curl_close($curl);

if ($body === false || $error !== '') {
    http_response_code(502);
    echo json_encode(['ok' => false, 'error' => 'Não foi possível consultar a API']);
    exit;
}

http_response_code($status >= 400 ? $status : 200);
echo $body;