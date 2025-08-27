// Test create-shipment API endpoint
// Spusťte: node test-create-shipment.js

const ORDER_ID = '0d9c7c09-eec0-4460-b1e5-ca8299c166f1'; // Testovací objednávka

async function testCreateShipment() {
  console.log('🚀 Test create-shipment API');
  console.log('Order ID:', ORDER_ID);
  console.log('');

  try {
    const response = await fetch('http://localhost:3000/api/admin/packeta/create-shipment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ orderId: ORDER_ID })
    });

    const result = await response.json();

    console.log('📥 API Response:');
    console.log('Status:', response.status);
    console.log('Result:', JSON.stringify(result, null, 2));

    if (response.ok && result.success) {
      console.log('');
      console.log('✅ Úspěch!');
      console.log('📦 Packeta ID:', result.packetaId);
      console.log('📦 Barcode:', result.packetaBarcode);
      console.log('🔗 Tracking URL:', result.trackingUrl);
    } else {
      console.log('');
      console.log('❌ Chyba:', result.error || result.message);
    }

  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

// Spusť test
testCreateShipment();