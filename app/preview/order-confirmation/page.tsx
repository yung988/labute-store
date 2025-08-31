import { OrderConfirmation } from "@/emails";

export default function OrderConfirmationPreview() {
  const sampleProps = {
    orderId: "YZ-2024-001234",
    customerName: "Jan Novák",
    customerEmail: "jan.novak@email.cz",
    orderDate: new Date().toISOString(),
    items: [
      {
        name: "Triko Labuť - Černá",
        qty: 2,
        price: "1,200 Kč",
      },
      {
        name: "Mikina YEEZUZ2020 - Bílá",
        qty: 1,
        price: "2,500 Kč",
      },
      {
        name: "Tote Bag - Přírodní",
        qty: 1,
        price: "450 Kč",
      },
    ],
    total: "4,150 Kč",
    shippingAddress: {
      street: "Wenceslas Square 1",
      city: "Praha",
      postalCode: "110 00",
      country: "Česká republika",
    },
  };

  return <OrderConfirmation {...sampleProps} />;
}
