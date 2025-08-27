// Jednoduchý test script pro Packeta API
// Spusťte: node test-packeta.js

const fs = require('fs');
const path = require('path');

// Načtení údajů z .env.local
function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local soubor nenalezen!');
    return {};
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};

  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').replace(/^["']|["']$/g, '');
      env[key.trim()] = value.trim();
    }
  });

  return env;
}

const env = loadEnv();

const PACKETA_API_KEY = process.env.PACKETA_API_KEY;
const PACKETA_API_URL = process.env.PACKETA_API_URL || 'https://www.zasilkovna.cz/api/rest';
const PACKETA_SENDER_ID = process.env.PACKETA_SENDER_ID;
const PACKETA_ESHOP_ID = process.env.PACKETA_ESHOP_ID;

console.log('🚀 Test Packeta API');
console.log('API URL:', PACKETA_API_URL);
console.log('API Key:', PACKETA_API_KEY ? '✅ Nastaveno' : '❌ Chybí');
console.log('Sender ID:', PACKETA_SENDER_ID);
console.log('Eshop ID:', PACKETA_ESHOP_ID);
console.log('');

// Test XML pro vytvoření zásilky
const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<createPacket>
  <apiPassword>${PACKETA_API_KEY}</apiPassword>
  <packetAttributes>
    <number>TEST-${Date.now()}</number>
    <name>Jan Gajdoš</name>
    <surname></surname>
    <email>test@example.com</email>
    <phone>+420733481280</phone>
    <addressId>35582</addressId>
    <cod>1000</cod>
    <value>1000</value>
    <weight>500</weight>
    <eshop>${PACKETA_ESHOP_ID}</eshop>
  </packetAttributes>
</createPacket>`;

console.log('📦 Test XML:');
console.log(xmlBody);
console.log('');

if (!PACKETA_API_KEY) {
  console.error('❌ PACKETA_API_KEY není nastaveno!');
  process.exit(1);
}

// Ruční curl příkaz pro testování
const curlCommand = `curl -X POST "${PACKETA_API_URL}" \\
  -H "Content-Type: application/xml" \\
  -H "Accept: application/xml" \\
  -d '${xmlBody.replace(/'/g, "\\'")}'`;

console.log('🔧 Curl příkaz pro ruční testování:');
console.log(curlCommand);
console.log('');

// Uložení curl příkazu do souboru
fs.writeFileSync('test-packeta-curl.sh', `#!/bin/bash\n${curlCommand}\n`);
console.log('💾 Curl příkaz uložen do: test-packeta-curl.sh');
console.log('Spusťte: chmod +x test-packeta-curl.sh && ./test-packeta-curl.sh');