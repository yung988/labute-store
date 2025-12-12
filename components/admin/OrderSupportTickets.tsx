'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Headset, Mail, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';

interface Ticket {
  id: string;
  ticket_number: number;
  subject: string;
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
}

interface Props {
  orderId: string;
  onTicketClick?: (ticketId: string) => void;
}

export default function OrderSupportTickets({ orderId, onTicketClick }: Props) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/tickets?orderId=${orderId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setTickets(data.tickets || []);
        }
      } catch (error) {
        console.error('Error fetching tickets:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [orderId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-500';
      case 'in_progress': return 'bg-yellow-500';
      case 'waiting_customer': return 'bg-orange-500';
      case 'resolved': return 'bg-green-500';
      case 'closed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'open': 'Nový',
      'in_progress': 'Probíhá',
      'waiting_customer': 'Čeká na zákazníka',
      'resolved': 'Vyřešeno',
      'closed': 'Uzavřeno',
    };
    return labels[status] || status;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Headset className="h-5 w-5" />
            <CardTitle>Support Tickety</CardTitle>
          </div>
          {tickets.length > 0 && (
            <Badge variant="outline">{tickets.length}</Badge>
          )}
        </div>
        <CardDescription>
          Dotazy a komunikace zákazníka k této objednávce
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Mail className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>Žádné support tickety k této objednávce</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => onTicketClick?.(ticket.id)}
                className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="font-mono text-xs">
                        #{ticket.ticket_number}
                      </Badge>
                      <Badge className={`${getStatusColor(ticket.status)} text-white text-xs`}>
                        {getStatusLabel(ticket.status)}
                      </Badge>
                      {ticket.priority !== 'normal' && (
                        <Badge variant="outline" className={`text-xs ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium truncate mb-1">{ticket.subject}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(ticket.created_at), {
                        addSuffix: true,
                        locale: cs,
                      })}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" className="shrink-0">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
