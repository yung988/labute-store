import { ShippingConfirmation } from '@/emails';

export default function ShippingConfirmationPreview() {
  const sampleProps = {
    orderId: 'YZ-2024-001234',
    customerName: 'Jan Novák',
    customerEmail: 'jan.novak@email.cz',
    trackingUrl:
      'https://www.postaonline.cz/trackandtrace/-/zasilka/cislo?parcelNumbers=DR1234567890CZ',
    trackingNumber: 'DR1234567890CZ',
    shippingMethod: 'Balík do ruky',
    carrierName: 'Česká pošta',
    estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
  };

  return <ShippingConfirmation {...sampleProps} />;
}
