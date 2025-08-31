import { DeliveredConfirmation } from "@/emails";

export default function DeliveredConfirmationPreview() {
  const sampleProps = {
    orderId: "YZ-2024-001234",
    customerName: "Jan Novák",
    customerEmail: "jan.novak@email.cz",
    feedbackUrl: "https://yeezuz2020.com/review/YZ-2024-001234",
    deliveryDate: new Date().toISOString(),
    productNames: [
      "Triko Labuť - Černá",
      "Mikina YEEZUZ2020 - Bílá",
      "Tote Bag - Přírodní"
    ],
  };

  return <DeliveredConfirmation {...sampleProps} />;
}
