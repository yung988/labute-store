'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Send, Mail, Package, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Checkbox } from '@/components/ui/checkbox';

interface TicketReply {
  id: string;
  sender_email: string;
  sender_type: 'customer' | 'staff';
  message: string;
  is_internal_note: boolean;
  created_at: string;
}

interface Ticket {
  id: string;
  ticket_number: number;
  customer_email: string;
  customer_name?: string;
  subject: string;
  message: string;
  order_id?: string;
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  replies?: TicketReply[];
}

interface Props {
  ticketId: string;
  onBack?: () => void;
  onNavigateToOrder?: (orderId: string) => void;
}

export default function TicketDetail({ ticketId, onBack }: Props) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchTicket = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/tickets/${ticketId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch ticket');

      const data = await response.json();
      setTicket(data.ticket);
      setOrder(data.order);
    } catch (error) {
      console.error('Error fetching ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
  }, [ticketId]);

  const handleSendReply = async () => {
    if (!replyMessage.trim() || !ticket) return;

    setSending(true);
    try {
      const response = await fetch(`/api/admin/tickets/${ticketId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          message: replyMessage,
          is_internal_note: isInternalNote,
          sender_email: 'admin@yeezuz2020.cz', // TODO: Get from auth
        }),
      });

      if (!response.ok) throw new Error('Failed to send reply');

      setReplyMessage('');
      setIsInternalNote(false);
      await fetchTicket(); // Refresh
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('Nepodařilo se odeslat odpověď');
    } finally {
      setSending(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!ticket) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      await fetchTicket(); // Refresh
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Nepodařilo se změnit status');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdatePriority = async (newPriority: string) => {
    if (!ticket) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ priority: newPriority }),
      });

      if (!response.ok) throw new Error('Failed to update priority');

      await fetchTicket(); // Refresh
    } catch (error) {
      console.error('Error updating priority:', error);
      alert('Nepodařilo se změnit prioritu');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-500 text-white';
      case 'in_progress': return 'bg-yellow-500 text-white';
      case 'waiting_customer': return 'bg-orange-500 text-white';
      case 'resolved': return 'bg-green-500 text-white';
      case 'closed': return 'bg-gray-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <Mail className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'waiting_customer': return <Clock className="h-4 w-4" />;
      case 'resolved': return <CheckCircle className="h-4 w-4" />;
      case 'closed': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Načítání...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Ticket nenalezen</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zpět
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold">Ticket #{ticket.ticket_number}</h1>
            <p className="text-sm text-gray-500">
              Vytvořeno {format(new Date(ticket.created_at), 'PPp', { locale: cs })}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Ticket info */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{ticket.subject}</CardTitle>
                  <CardDescription className="mt-2 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {ticket.customer_email}
                    {ticket.customer_name && ` (${ticket.customer_name})`}
                  </CardDescription>
                </div>
                <Badge className={getStatusColor(ticket.status)}>
                  {getStatusIcon(ticket.status)}
                  <span className="ml-1">{getStatusLabel(ticket.status)}</span>
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="whitespace-pre-wrap">{ticket.message}</p>
              </div>
            </CardContent>
          </Card>

          {/* Conversation */}
          {ticket.replies && ticket.replies.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Konverzace</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ticket.replies.map((reply) => (
                  <div
                    key={reply.id}
                    className={`flex gap-3 ${reply.sender_type === 'staff' ? 'flex-row-reverse' : ''}`}
                  >
                    <Avatar>
                      <AvatarFallback>
                        {reply.sender_type === 'staff' ? 'A' : 'Z'}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`flex-1 ${reply.sender_type === 'staff' ? 'text-right' : ''}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{reply.sender_email}</span>
                        {reply.is_internal_note && (
                          <Badge variant="outline" className="text-xs">
                            Interní poznámka
                          </Badge>
                        )}
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(reply.created_at), {
                            addSuffix: true,
                            locale: cs,
                          })}
                        </span>
                      </div>
                      <div
                        className={`p-3 rounded-lg ${
                          reply.sender_type === 'staff'
                            ? reply.is_internal_note
                              ? 'bg-yellow-50 border border-yellow-200'
                              : 'bg-blue-50'
                            : 'bg-gray-50'
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm">{reply.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Reply form */}
          <Card>
            <CardHeader>
              <CardTitle>Odpovědět</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Napište odpověď..."
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                rows={6}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="internal"
                    checked={isInternalNote}
                    onCheckedChange={(checked) => setIsInternalNote(checked as boolean)}
                  />
                  <label htmlFor="internal" className="text-sm cursor-pointer">
                    Interní poznámka (zákazník neuvidí)
                  </label>
                </div>
                <Button onClick={handleSendReply} disabled={sending || !replyMessage.trim()}>
                  <Send className="h-4 w-4 mr-2" />
                  {sending ? 'Odesílání...' : 'Odeslat'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status & Priority */}
          <Card>
            <CardHeader>
              <CardTitle>Správa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={ticket.status} onValueChange={handleUpdateStatus} disabled={updating}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Nový</SelectItem>
                    <SelectItem value="in_progress">Probíhá</SelectItem>
                    <SelectItem value="waiting_customer">Čeká na zákazníka</SelectItem>
                    <SelectItem value="resolved">Vyřešeno</SelectItem>
                    <SelectItem value="closed">Uzavřeno</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Priorita</label>
                <Select value={ticket.priority} onValueChange={handleUpdatePriority} disabled={updating}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Nízká</SelectItem>
                    <SelectItem value="normal">Normální</SelectItem>
                    <SelectItem value="high">Vysoká</SelectItem>
                    <SelectItem value="urgent">Urgentní</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Order info */}
          {order && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Propojená objednávka
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-gray-500">Číslo objednávky</p>
                  <p className="font-mono">#{order.id as string}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Zákazník</p>
                  <p>{order.customer_name as string}</p>
                  <p className="text-sm">{order.customer_email as string}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Celkem</p>
                  <p className="font-semibold">{order.total as number} Kč</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge>{order.status as string}</Badge>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                  <a href={`/admin/orders/${order.id}`}>
                    Zobrazit objednávku
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Quick actions */}
          <Card>
            <CardHeader>
              <CardTitle>Rychlé akce</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ticket.status !== 'resolved' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleUpdateStatus('resolved')}
                  disabled={updating}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Označit jako vyřešeno
                </Button>
              )}
              {ticket.status !== 'closed' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleUpdateStatus('closed')}
                  disabled={updating}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Uzavřít ticket
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
