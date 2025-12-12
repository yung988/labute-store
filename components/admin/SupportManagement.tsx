'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import SupportTicketsList from '@/components/admin/SupportTicketsList';
import TicketDetail from '@/components/admin/TicketDetail';
import ReturnRequestsList from '@/components/admin/ReturnRequestsList';
import { Mail, Package2 } from 'lucide-react';

interface Props {
  initialTicketId?: string;
  onNavigateToOrder?: (orderId: string) => void;
}

export default function SupportManagement({ initialTicketId, onNavigateToOrder }: Props) {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(initialTicketId || null);
  const [activeTab, setActiveTab] = useState('tickets');

  const handleTicketClick = (ticketId: string) => {
    setSelectedTicketId(ticketId);
  };

  const handleBackToList = () => {
    setSelectedTicketId(null);
  };

  if (selectedTicketId) {
    return (
      <TicketDetail
        ticketId={selectedTicketId}
        onBack={handleBackToList}
        onNavigateToOrder={onNavigateToOrder}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="tickets" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Support Tickety
          </TabsTrigger>
          <TabsTrigger value="returns" className="flex items-center gap-2">
            <Package2 className="h-4 w-4" />
            Reklamace
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="mt-6">
          <SupportTicketsList onTicketClick={handleTicketClick} />
        </TabsContent>

        <TabsContent value="returns" className="mt-6">
          <ReturnRequestsList />
        </TabsContent>
      </Tabs>

      {/* Info card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Jak funguje email receiving?
          </CardTitle>
          <CardDescription>
            Automatické zpracování emailů od zákazníků
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>Support tickety:</strong> Zákazníci pošlou email na{' '}
            <code className="bg-gray-100 px-2 py-1 rounded">help@support.yeezuz2020.cz</code>
            {' '}→ automaticky se vytvoří ticket
          </p>
          <p>
            <strong>Reklamace:</strong> Email na{' '}
            <code className="bg-gray-100 px-2 py-1 rounded">returns@support.yeezuz2020.cz</code>
            {' '}→ vytvoří se return request
          </p>
          <p>
            <strong>Odpovědi:</strong> Když odpovíte na ticket, email se automaticky pošle zákazníkovi
          </p>
          <p className="text-gray-500 text-xs mt-4">
            ℹ️ Všechny emaily jsou automaticky propojeny s objednávkami podle čísla v předmětu (#123)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
