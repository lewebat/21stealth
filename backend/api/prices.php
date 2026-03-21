<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$cache_file = sys_get_temp_dir() . '/21stealth_prices.json';
$cache_ttl  = 60; // 1 minute

// Return cached prices if still fresh
if (file_exists($cache_file) && time() - filemtime($cache_file) < $cache_ttl) {
    echo file_get_contents($cache_file);
    exit;
}

// Fetch USD prices from CryptoCompare
$ccResponse = @file_get_contents(
    'https://min-api.cryptocompare.com/data/pricemulti?fsyms=BTC,ETH,SOL,LTC,DOGE,TRX&tsyms=USD',
    false,
    stream_context_create(['http' => ['timeout' => 10]])
);

if ($ccResponse === false) {
    http_response_code(502);
    echo json_encode(['error' => 'Failed to fetch prices']);
    exit;
}

$cc = json_decode($ccResponse, true);

// Fetch 24h change from CoinGecko (best-effort — null if unavailable)
$geckoResponse = @file_get_contents(
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,litecoin,dogecoin,tron&vs_currencies=usd&include_24hr_change=true',
    false,
    stream_context_create(['http' => ['timeout' => 10]])
);
$gecko = $geckoResponse !== false ? json_decode($geckoResponse, true) : [];

$result = json_encode([
    'bitcoin'  => ['usd' => $cc['BTC']['USD'], 'change24h' => $gecko['bitcoin']['usd_24h_change']  ?? null],
    'ethereum' => ['usd' => $cc['ETH']['USD'], 'change24h' => $gecko['ethereum']['usd_24h_change'] ?? null],
    'solana'   => ['usd' => $cc['SOL']['USD'], 'change24h' => $gecko['solana']['usd_24h_change']   ?? null],
    'litecoin' => ['usd' => $cc['LTC']['USD'], 'change24h' => $gecko['litecoin']['usd_24h_change'] ?? null],
    'dogecoin' => ['usd' => $cc['DOGE']['USD'], 'change24h' => $gecko['dogecoin']['usd_24h_change'] ?? null],
    'tron'     => ['usd' => $cc['TRX']['USD'], 'change24h' => $gecko['tron']['usd_24h_change']     ?? null],
]);

file_put_contents($cache_file, $result);
echo $result;
