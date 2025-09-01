'use client';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
// import { Textarea } from "@/components/ui/textarea";
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Mail,
  Send,
  Search,
  Filter,
  Users,
  MessageCircle,
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Customer = {
  id: string;
  customer_email: string;
  customer_name: string | null;
  customer_phone: string | null;
  status: string;
  created_at: string;
  amount_total: number | null;
  last_order_date: string;
  order_count: number;
};

type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  content: string;
};

export default function CustomerCommunication() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [emailDialog, setEmailDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerDetailView, setCustomerDetailView] = useState<string | null>(null);
  const [customerOrders, setCustomerOrders] = useState<
    Array<{
      id: string;
      created_at: string;
      amount_total: number | null;
      status: string;
      delivery_method?: string;
    }>
  >([]);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [emailTemplates] = useState<EmailTemplate[]>([
    {
      id: 'order-confirmation',
      name: 'Potvrzení objednávky',
      subject: 'Potvrzení vaší objednávky #{orderId}',
      content:
        'Dobrý den {customerName},\n\nděkujeme za vaši objednávku #{orderId}.\n\nVaše objednávka je momentálně zpracovávána a brzy bude odeslána.\n\nDěkujeme za důvěru.\n\nS pozdravem,\nVáš tým',
    },
    {
      id: 'shipping-notification',
      name: 'Oznámení o odeslání',
      subject: 'Vaše objednávka #{orderId} byla odeslána',
      content:
        'Dobrý den {customerName},\n\nvaše objednávka #{orderId} byla právě odeslána.\n\nMůžete ji sledovat na: {trackingUrl}\n\nOčekávaný čas doručení: 2-3 pracovní dny.\n\nS pozdravem,\nVáš tým',
    },
    {
      id: 'delay-notification',
      name: 'Oznámení o zpoždění',
      subject: 'Informace o zpoždění objednávky #{orderId}',
      content:
        'Dobrý den {customerName},\n\nomlouváme se, ale vaše objednávka #{orderId} se bohužel zpozdí.\n\nNový předpokládaný termín dodání: {newDate}\n\nZa zpoždění se upřímně omlouváme.\n\nS pozdravem,\nVáš tým',
    },
  ]);

  const loadCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();

      // Get unique customers with their order statistics
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select('customer_email, customer_name, customer_phone, status, created_at, amount_total')
        .not('customer_email', 'is', null);

      if (error) throw new Error(error.message);

      // Process data to get unique customers with stats
      const customerMap = new Map<string, Customer>();

      ordersData?.forEach((order) => {
        const email = order.customer_email;
        if (!email) return;

        const existing = customerMap.get(email);
        if (existing) {
          existing.order_count += 1;
          existing.amount_total = (existing.amount_total || 0) + (order.amount_total || 0);
          if (new Date(order.created_at) > new Date(existing.last_order_date)) {
            existing.last_order_date = order.created_at;
            existing.status = order.status;
            existing.customer_name = order.customer_name || existing.customer_name;
            existing.customer_phone = order.customer_phone || existing.customer_phone;
          }
        } else {
          customerMap.set(email, {
            id: email,
            customer_email: email,
            customer_name: order.customer_name,
            customer_phone: order.customer_phone,
            status: order.status,
            created_at: order.created_at,
            amount_total: order.amount_total || 0,
            last_order_date: order.created_at,
            order_count: 1,
          });
        }
      });

      setCustomers(
        Array.from(customerMap.values()).sort(
          (a, b) => new Date(b.last_order_date).getTime() - new Date(a.last_order_date).getTime()
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomerHistory = async (customerEmail: string) => {
    try {
      const supabase = createClient();
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_email', customerEmail)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomerOrders(orders || []);
      setCustomerDetailView(customerEmail);
    } catch (e) {
      console.error('Failed to load customer history:', e);
    }
  };

  const filteredCustomers = useMemo(() => {
    let filtered = customers;

    if (searchQuery) {
      filtered = filtered.filter(
        (customer) =>
          customer.customer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          customer.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          customer.customer_phone?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((customer) => customer.status === statusFilter);
    }

    return filtered;
  }, [customers, searchQuery, statusFilter]);

  const sendEmail = async () => {
    if (!selectedCustomer || !emailSubject || !emailContent) {
      alert('Vyplňte všechna povinná pole');
      return;
    }

    try {
      setLoading(true);

      // Replace placeholders
      const finalSubject = emailSubject
        .replace('{customerName}', selectedCustomer.customer_name || 'Zákazník')
        .replace('{orderId}', 'XXXX'); // Would need actual order ID

      const finalContent = emailContent
        .replace('{customerName}', selectedCustomer.customer_name || 'Zákazník')
        .replace('{orderId}', 'XXXX'); // Would need actual order ID

      const response = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedCustomer.customer_email,
          subject: finalSubject,
          content: finalContent,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      alert('Email byl úspěšně odeslán!');
      setEmailDialog(false);
      setSelectedCustomer(null);
      setEmailSubject('');
      setEmailContent('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  const applyTemplate = (template: EmailTemplate) => {
    setEmailSubject(template.subject);
    setEmailContent(template.content);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Zaplaceno
          </Badge>
        );
      case 'shipped':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Odesláno</Badge>;
      case 'cancelled':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Zrušeno
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const statusCounts = useMemo(() => {
    const statuses = ['new', 'paid', 'processing', 'shipped', 'cancelled', 'refunded'];
    const counts: Record<string, number> = { all: customers.length };
    statuses.forEach((status) => {
      counts[status] = customers.filter((c) => c.status === status).length;
    });
    return counts;
  }, [customers]);

  if (loading && customers.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p>Načítání zákazníků...</p>
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
            <div className="text-2xl font-bold">{statusCounts.all}</div>
            <div className="text-sm text-muted-foreground">Celkem zákazníků</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{statusCounts.paid}</div>
            <div className="text-sm text-muted-foreground">Aktivní zákazníci</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{statusCounts.shipped}</div>
            <div className="text-sm text-muted-foreground">Spokojení zákazníci</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">
              {customers.reduce((sum, c) => sum + (c.amount_total || 0), 0) / 100}
            </div>
            <div className="text-sm text-muted-foreground">Celkový obrat (Kč)</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Zákazníci ({filteredCustomers.length})
            </span>
            <Button onClick={loadCustomers} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Obnovit
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Controls */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Hledat podle jména, emailu nebo telefonu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filtrovat podle statusu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všichni ({statusCounts.all})</SelectItem>
                <SelectItem value="paid">Aktivní ({statusCounts.paid})</SelectItem>
                <SelectItem value="shipped">Spokojení ({statusCounts.shipped})</SelectItem>
                <SelectItem value="cancelled">Problémoví ({statusCounts.cancelled})</SelectItem>
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 text-left font-medium">Zákazník</th>
                    <th className="p-3 text-left font-medium">Kontakt</th>
                    <th className="p-3 text-left font-medium">Poslední status</th>
                    <th className="p-3 text-left font-medium">Objednávky</th>
                    <th className="p-3 text-left font-medium">Celkem utratil</th>
                    <th className="p-3 text-left font-medium">Poslední objednávka</th>
                    <th className="p-3 text-left font-medium">Akce</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        {searchQuery || statusFilter !== 'all'
                          ? 'Žádní zákazníci nenalezeni'
                          : 'Zatím žádní zákazníci'}
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <tr key={customer.id} className="border-t hover:bg-muted/30">
                        <td className="p-3">
                          <div>
                            <div className="font-medium">
                              {customer.customer_name || 'Nezadáno'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {customer.customer_email}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2 text-sm">
                            <a
                              href={`mailto:${customer.customer_email}`}
                              className="text-blue-600 hover:text-blue-800"
                              title="Poslat email"
                            >
                              <Mail className="w-4 h-4" />
                            </a>
                            {customer.customer_phone && (
                              <a
                                href={`tel:${customer.customer_phone}`}
                                className="text-blue-600 hover:text-blue-800"
                                title="Zavolat"
                              >
                                <div className="text-xs">{customer.customer_phone}</div>
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="p-3">{getStatusBadge(customer.status)}</td>
                        <td className="p-3">
                          <div className="text-center">
                            <div className="text-lg font-bold">{customer.order_count}</div>
                            <div className="text-xs text-muted-foreground">objednávek</div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold">
                            {customer.amount_total
                              ? `${(customer.amount_total / 100).toFixed(2)} Kč`
                              : '0 Kč'}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">
                            {new Date(customer.last_order_date).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => loadCustomerHistory(customer.customer_email)}
                            >
                              <Users className="w-4 h-4 mr-2" />
                              Detail
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setEmailDialog(true);
                              }}
                            >
                              <MessageCircle className="w-4 h-4 mr-2" />
                              Kontakt
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Dialog */}
      <Dialog open={emailDialog} onOpenChange={setEmailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Poslat email zákazníkovi:{' '}
              {selectedCustomer?.customer_name || selectedCustomer?.customer_email}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Email Templates */}
            <div>
              <Label>Rychlé šablony</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                {emailTemplates.map((template) => (
                  <Button
                    key={template.id}
                    variant="outline"
                    size="sm"
                    onClick={() => applyTemplate(template)}
                    className="text-left"
                  >
                    {template.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Email Form */}
            <div>
              <Label htmlFor="email-subject">Předmět</Label>
              <Input
                id="email-subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Předmět emailu"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email-content">Obsah</Label>
              <textarea
                id="email-content"
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
                placeholder="Obsah emailu"
                rows={10}
                className="mt-1 w-full border rounded px-3 py-2 min-h-0 resize-y"
              />
              <div className="text-xs text-muted-foreground mt-1">
                Můžete použít: {'{customerName}'}, {'{orderId}'}, {'{trackingUrl}'}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEmailDialog(false)}>
                Zrušit
              </Button>
              <Button onClick={sendEmail} disabled={loading || !emailSubject || !emailContent}>
                <Send className="w-4 h-4 mr-2" />
                {loading ? 'Odesílám...' : 'Odeslat email'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Detail Dialog */}
      <Dialog open={!!customerDetailView} onOpenChange={() => setCustomerDetailView(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Detail zákazníka: {customerDetailView}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Customer Summary */}
            {customerOrders.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Přehled zákazníka</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{customerOrders.length}</div>
                      <div className="text-sm text-muted-foreground">Objednávek</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {(
                          customerOrders.reduce(
                            (sum, order) => sum + (order.amount_total || 0),
                            0
                          ) / 100
                        ).toFixed(0)}{' '}
                        Kč
                      </div>
                      <div className="text-sm text-muted-foreground">Celková hodnota</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {(
                          customerOrders.reduce(
                            (sum, order) => sum + (order.amount_total || 0),
                            0
                          ) /
                          customerOrders.length /
                          100
                        ).toFixed(0)}{' '}
                        Kč
                      </div>
                      <div className="text-sm text-muted-foreground">Průměrná objednávka</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {new Date(customerOrders[0]?.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-muted-foreground">Poslední objednávka</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Order History */}
            <Card>
              <CardHeader>
                <CardTitle>Historie objednávek</CardTitle>
              </CardHeader>
              <CardContent>
                {customerOrders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Žádné objednávky</div>
                ) : (
                  <div className="space-y-3">
                    {customerOrders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="font-medium">Objednávka #{order.id.slice(-8)}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleString()}
                          </div>
                          {order.delivery_method && (
                            <div className="text-xs text-muted-foreground">
                              {order.delivery_method === 'pickup'
                                ? 'Výdejní místo'
                                : 'Doručení domů'}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-semibold">
                              {order.amount_total
                                ? `${(order.amount_total / 100).toFixed(2)} Kč`
                                : '-'}
                            </div>
                          </div>
                          <Badge
                            variant={
                              order.status === 'paid'
                                ? 'default'
                                : order.status === 'shipped'
                                  ? 'secondary'
                                  : order.status === 'cancelled'
                                    ? 'destructive'
                                    : 'outline'
                            }
                          >
                            {order.status === 'paid' && 'Zaplaceno'}
                            {order.status === 'shipped' && 'Odesláno'}
                            {order.status === 'cancelled' && 'Zrušeno'}
                            {order.status === 'processing' && 'Zpracovává se'}
                            {!['paid', 'shipped', 'cancelled', 'processing'].includes(
                              order.status
                            ) && order.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
