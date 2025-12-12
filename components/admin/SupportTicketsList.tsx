'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Clock, CheckCircle, XCircle, AlertCircle, Search, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';

interface SupportTicket {
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
  replies?: Record<string, unknown>[];
}

interface Props {
  onTicketClick?: (ticketId: string) => void;
}

export default function SupportTicketsList({ onTicketClick }: Props) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.append('status', filter);
      }

      const response = await fetch(`/api/admin/tickets?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch tickets');

      const data = await response.json();
      setTickets(data.tickets || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [filter]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Mail className="h-4 w-4" />;
      case 'in_progress':
        return <Clock className="h-4 w-4" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4" />;
      case 'closed':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-500';
      case 'in_progress':
        return 'bg-yellow-500';
      case 'waiting_customer':
        return 'bg-orange-500';
      case 'resolved':
        return 'bg-green-500';
      case 'closed':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'normal':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
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

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      'urgent': 'Urgentní',
      'high': 'Vysoká',
      'normal': 'Normální',
      'low': 'Nízká',
    };
    return labels[priority] || priority;
  };

  const filteredTickets = tickets.filter(ticket =>
    searchQuery === '' ||
    ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.customer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.order_id?.includes(searchQuery)
  );

  const stats = {
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    total: tickets.length,
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Nové tickety</CardDescription>
            <CardTitle className="text-3xl">{stats.open}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Probíhající</CardDescription>
            <CardTitle className="text-3xl">{stats.in_progress}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Celkem ticketů</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div>
              <CardTitle>Support Tickety</CardTitle>
              <CardDescription>Správa dotazů zákazníků</CardDescription>
            </div>
            <Button onClick={fetchTickets} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Obnovit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Hledat podle předmětu, emailu nebo čísla objednávky..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filtrovat podle statusu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Vše</SelectItem>
                <SelectItem value="open">Nové</SelectItem>
                <SelectItem value="in_progress">Probíhající</SelectItem>
                <SelectItem value="waiting_customer">Čeká na zákazníka</SelectItem>
                <SelectItem value="resolved">Vyřešeno</SelectItem>
                <SelectItem value="closed">Uzavřeno</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Načítání...</div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Žádné tickety k zobrazení
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => onTicketClick?.(ticket.id)}
                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="font-mono">
                          #{ticket.ticket_number}
                        </Badge>
                        <Badge className={`${getStatusColor(ticket.status)} text-white`}>
                          <span className="mr-1">{getStatusIcon(ticket.status)}</span>
                          {getStatusLabel(ticket.status)}
                        </Badge>
                        <Badge variant="outline" className={getPriorityColor(ticket.priority)}>
                          {getPriorityLabel(ticket.priority)}
                        </Badge>
                        {ticket.order_id && (
                          <Badge variant="outline">
                            Obj. #{ticket.order_id}
                          </Badge>
                        )}
                      </div>

                      <h3 className="font-semibold text-lg mb-1 truncate">
                        {ticket.subject}
                      </h3>

                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {ticket.message}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {ticket.customer_email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(ticket.created_at), {
                            addSuffix: true,
                            locale: cs,
                          })}
                        </span>
                        {ticket.replies && ticket.replies.length > 0 && (
                          <span>
                            {ticket.replies.length} odpověď{ticket.replies.length !== 1 ? 'í' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
