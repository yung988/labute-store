// Test debug create-shipment API endpoint
// Spusťte: node test-debug-create-shipment.js

async function testDebugCreateShipment() {
  console.log('🚀 Test debug create-shipment API');
  console.log('Using exact same data as working test-working-example.sh');
  console.log('');

  try {
    const response = await fetch('http://localhost:3000/api/admin/packeta/debug-create-shipment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const result = await response.json();

    console.log('📥 API Response:');
    console.log('Status:', response.status);
    console.log('Result:', JSON.stringify(result, null, 2));

    if (response.ok && result.success) {
      console.log('');
      console.log('✅ Úspěch!');
      console.log('📦 Packeta ID:', result.packetaId);
      console.log('📦 Barcode:', result.barcode);
      console.log('🔗 Tracking URL:', result.trackingUrl);
    } else {
      console.log('');
      console.log('❌ Chyba:', result.error);
    }

  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

// Spusť test
testDebugCreateShipment();