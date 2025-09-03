import { StatusUpdate } from '@/emails';

export default function StatusUpdatePreview() {
  const sampleProps = {
    orderId: 'YZ-2024-001234',
    status: 'processing',
    customerName: 'Jan Novák',
    customerEmail: 'jan.novak@email.cz',
    items: [
      { name: 'Triko Labuť - Černá', quantity: 2, size: 'L' },
      { name: 'Mikina YEEZUZ2020 - Bílá', quantity: 1, size: 'M' },
    ],
  };

  return <StatusUpdate {...sampleProps} />;
}

