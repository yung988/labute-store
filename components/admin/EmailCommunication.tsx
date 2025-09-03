'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import {
  Search,
  Filter,
  RefreshCw,
  Mail,
  Eye,
  CheckCircle,
  AlertCircle,
  Send,
  Download,
  Calendar,
  User,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type EmailLog = {
  id: string;
  order_id: string | null;
  customer_email: string;
  email_type: string;
  subject: string;
  status: 'sent' | 'delivered' | 'opened' | 'failed';
  sent_at: string;
  delivered_at: string | null;
  opened_at: string | null;
  failed_reason: string | null;
  email_content: string | null;
  metadata: Record<string, unknown>;
};

type EmailDetail = EmailLog & {
  order_details?: {
    id: string;
    customer_name: string | null;
    status: string;
    amount_total: number | null;
  };
};

interface EmailCommunicationProps {
  onOrderClick?: (orderId: string) => void;
}

export default function EmailCommunication({ onOrderClick }: EmailCommunicationProps = {}) {
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedEmail, setSelectedEmail] = useState<EmailDetail | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Compose dialog state
  // (defined once here at the top of the component)
  const [showCompose, setShowCompose] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeOrderId, setComposeOrderId] = useState('');
  const [composeSending, setComposeSending] = useState(false);


  // Mock data fallback (when API not available)
  const mockEmails: EmailLog[] = useMemo(() => [
    {
      id: '1',
      order_id: 'ord_12345',
      customer_email: 'john@example.com',
      email_type: 'order_confirmation',
      subject: 'Potvrzení objednávky #12345',
      status: 'delivered',
      sent_at: new Date().toISOString(),
      delivered_at: new Date().toISOString(),
      opened_at: new Date().toISOString(),
      failed_reason: null,
      email_content: '<h1>Potvrzení objednávky</h1><p>Děkujeme za vaši objednávku...</p>',
      metadata: { template: 'order_confirmation_v1' },
    },
    {
      id: '2',
      order_id: 'ord_12346',
      customer_email: 'jane@example.com',
      email_type: 'shipping_notification',
      subject: 'Vaše objednávka byla odeslána',
      status: 'sent',
      sent_at: new Date(Date.now() - 86400000).toISOString(),
      delivered_at: null,
      opened_at: null,
      failed_reason: null,
      email_content: '<h1>Vaše objednávka byla odeslána</h1><p>Tracking číslo: 123456789</p>',
      metadata: { template: 'shipping_notification_v1', tracking_number: '123456789' },
    },
    {
      id: '3',
      order_id: null,
      customer_email: 'newsletter@example.com',
      email_type: 'newsletter',
      subject: 'Nové produkty v našem e-shopu',
      status: 'failed',
      sent_at: new Date(Date.now() - 172800000).toISOString(),
      delivered_at: null,
      opened_at: null,
      failed_reason: 'Email address not found',
      email_content: '<h1>Newsletter</h1><p>Podívejte se na naše nové produkty...</p>',
      metadata: { template: 'newsletter_v1' },
    },
  ], []);

  const loadEmails = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/emails');
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails || []);
      } else {
        // Fallback to mock data
        await new Promise((resolve) => setTimeout(resolve, 300));
        setEmails(mockEmails);
      }
    } catch (e: unknown) {
      console.error('Load emails error:', e);
      setError(e instanceof Error ? e.message : 'Failed to load emails');
    } finally {
      setLoading(false);
    }
  }, [mockEmails]);

  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

  const sendComposedEmail = useCallback(async () => {
    try {
      setComposeSending(true);
      const res = await fetch('/api/admin/emails/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: composeTo,
          subject: composeSubject,
          html: composeBody,
          email_type: 'support_reply',
          order_id: composeOrderId || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      setShowCompose(false);
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
      setComposeOrderId('');

      await loadEmails();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to send email');
    } finally {
      setComposeSending(false);
    }
  }, [composeTo, composeSubject, composeBody, composeOrderId, loadEmails]);

  const filteredEmails = useMemo(() => {
    let filtered = emails;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (email) =>
          email.customer_email.toLowerCase().includes(query) ||
          email.subject.toLowerCase().includes(query) ||
          email.order_id?.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((email) => email.email_type === typeFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((email) => email.status === statusFilter);
    }

    return filtered.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());
  }, [emails, searchQuery, typeFilter, statusFilter]);

  const showEmailDetail = async (email: EmailLog) => {
    setLoading(true);
    try {
      // Load order details if order_id exists
      const emailWithDetails: EmailDetail = { ...email };

      if (email.order_id) {
        const supabase = createClient();
        const { data: orderData } = await supabase
          .from('orders')
          .select('id, customer_name, status, amount_total')
          .eq('id', email.order_id)
          .single();

        if (orderData) {
          emailWithDetails.order_details = orderData;
        }
      }

      setSelectedEmail(emailWithDetails);
      setShowDetail(true);
    } catch (error) {
      console.error('Error loading email details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      sent: { className: 'bg-blue-100 text-blue-800', label: 'Odesláno', icon: Send },
      delivered: { className: 'bg-green-100 text-green-800', label: 'Doručeno', icon: CheckCircle },
      opened: { className: 'bg-purple-100 text-purple-800', label: 'Otevřeno', icon: Eye },
      failed: { className: 'bg-red-100 text-red-800', label: 'Chyba', icon: AlertCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.sent;
    const Icon = config.icon;

    return (
      <Badge className={`${config.className} border-0`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getTypeLabel = (type: string) => {
    const typeLabels: Record<string, string> = {
      order_confirmation: 'Potvrzení objednávky',
      shipping_notification: 'Oznámení o odeslání',
      delivery_confirmation: 'Potvrzení doručení',
      newsletter: 'Newsletter',
      support_reply: 'Odpověď podpory',
      password_reset: 'Reset hesla',
    };

    return typeLabels[type] || type;
  };

  const emailTypes = useMemo(
    () => [
      'order_confirmation',
      'shipping_notification',
      'delivery_confirmation',
      'newsletter',
      'support_reply',
    ],
    []
  );
  const emailStatuses = useMemo(() => ['sent', 'delivered', 'opened', 'failed'], []);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: emails.length };

    emailStatuses.forEach((status) => {
      counts[status] = emails.filter((e) => e.status === status).length;
    });

    emailTypes.forEach((type) => {
      counts[type] = emails.filter((e) => e.email_type === type).length;
    });

    return counts;
  }, [emails, emailStatuses, emailTypes]);

  // (removed duplicate state declaration)
  // const [showCompose, setShowCompose] = useState(false);

  if (loading && emails.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p>Načítání emailové komunikace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{statusCounts.all}</div>
            <div className="text-sm text-muted-foreground">Celkem emailů</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{statusCounts.delivered}</div>
            <div className="text-sm text-muted-foreground">Doručeno</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{statusCounts.opened}</div>
            <div className="text-sm text-muted-foreground">Otevřeno</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{statusCounts.failed}</div>
            <div className="text-sm text-muted-foreground">Chyby</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Emailová komunikace ({filteredEmails.length})</span>
            <div className="flex gap-2">
              <Button onClick={loadEmails} variant="outline" size="sm" disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Obnovit
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowCompose(true)}>
                <Send className="w-4 h-4 mr-2" />
                Napsat email
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Hledat podle emailu, předmětu, objednávky..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Typ emailu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny typy ({statusCounts.all})</SelectItem>
                {emailTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {getTypeLabel(type)} ({statusCounts[type] || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny stavy ({statusCounts.all})</SelectItem>
                {emailStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status === 'sent'
                      ? 'Odesláno'
                      : status === 'delivered'
                        ? 'Doručeno'
                        : status === 'opened'
                          ? 'Otevřeno'
                          : status === 'failed'
                            ? 'Chyba'
                            : status}{' '}
                    ({statusCounts[status] || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md mb-4">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              {error}
            </div>
          )}

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold">Předmět</TableHead>
                  <TableHead className="font-semibold">Typ</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Objednávka</TableHead>
                  <TableHead className="font-semibold">Odesláno</TableHead>
                  <TableHead className="font-semibold">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmails.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                        ? 'Žádné emaily nenalezeny pro zadané filtry'
                        : 'Zatím žádné emaily'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmails.map((email) => (
                    <TableRow key={email.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span>{email.customer_email}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="font-medium">{email.subject}</div>
                        {email.failed_reason && (
                          <div className="text-xs text-red-600 mt-1">{email.failed_reason}</div>
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline">{getTypeLabel(email.email_type)}</Badge>
                      </TableCell>

                      <TableCell>{getStatusBadge(email.status)}</TableCell>

                      <TableCell>
                        {email.order_id ? (
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => onOrderClick?.(email.order_id!)}
                            className="p-0 h-auto"
                          >
                            #{email.order_id.substring(0, 8).toUpperCase()}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(email.sent_at).toLocaleDateString()}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(email.sent_at).toLocaleTimeString()}
                          </div>
                          {email.opened_at && (
                            <div className="text-xs text-purple-600">
                              Otevřeno: {new Date(email.opened_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => showEmailDetail(email)}>
                          <Eye className="w-4 h-4 mr-1" />
                          Detail
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Compose Email Dialog */}
      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Napsat email</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Příjemce (email)" value={composeTo} onChange={(e) => setComposeTo(e.target.value)} />
            <Input placeholder="Objednávka (volitelné, číslo)" value={composeOrderId} onChange={(e) => setComposeOrderId(e.target.value)} />
            <Input placeholder="Předmět" value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} />
            <textarea rows={10} placeholder="HTML obsah emailu" value={composeBody} onChange={(e) => setComposeBody(e.target.value)} className="w-full border rounded-md p-2" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCompose(false)} disabled={composeSending}>Zavřít</Button>
              <Button onClick={sendComposedEmail} disabled={composeSending || !composeTo || !composeSubject || !composeBody}>
                {composeSending ? 'Odesílám...' : 'Odeslat'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Detail emailu
            </DialogTitle>
          </DialogHeader>

          {selectedEmail && (
            <div className="space-y-6">
              {/* Email Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Základní informace</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Příjemce</label>
                      <div className="flex items-center gap-2 mt-1">
                        <User className="w-4 h-4 text-muted-foreground" />
                        {selectedEmail.customer_email}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Předmět</label>
                      <div className="mt-1">{selectedEmail.subject}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Typ</label>
                      <div className="mt-1">
                        <Badge variant="outline">{getTypeLabel(selectedEmail.email_type)}</Badge>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Status</label>
                      <div className="mt-1">{getStatusBadge(selectedEmail.status)}</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Časová razítka</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Odesláno</label>
                      <div className="mt-1">{new Date(selectedEmail.sent_at).toLocaleString()}</div>
                    </div>
                    {selectedEmail.delivered_at && (
                      <div>
                        <label className="text-sm font-medium">Doručeno</label>
                        <div className="mt-1">
                          {new Date(selectedEmail.delivered_at).toLocaleString()}
                        </div>
                      </div>
                    )}
                    {selectedEmail.opened_at && (
                      <div>
                        <label className="text-sm font-medium">Otevřeno</label>
                        <div className="mt-1">
                          {new Date(selectedEmail.opened_at).toLocaleString()}
                        </div>
                      </div>
                    )}
                    {selectedEmail.failed_reason && (
                      <div>
                        <label className="text-sm font-medium text-red-600">Důvod chyby</label>
                        <div className="mt-1 text-red-600">{selectedEmail.failed_reason}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Order Details */}
              {selectedEmail.order_details && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Související objednávka</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Objednávka:</span>
                          <span className="font-mono">
                            #{selectedEmail.order_details.id.substring(0, 8).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Zákazník:</span>
                          <span>{selectedEmail.order_details.customer_name || 'Nezadáno'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Částka:</span>
                          <span>
                            {selectedEmail.order_details.amount_total
                              ? `${(selectedEmail.order_details.amount_total / 100).toFixed(2)} Kč`
                              : '-'}
                          </span>
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          onOrderClick?.(selectedEmail.order_id!);
                          setShowDetail(false);
                        }}
                      >
                        Zobrazit objednávku
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Email Content */}
              {selectedEmail.email_content && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Obsah emailu</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="prose max-w-none border rounded-lg p-4 bg-muted/20"
                      dangerouslySetInnerHTML={{ __html: selectedEmail.email_content }}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
