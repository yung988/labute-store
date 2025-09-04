'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  RefreshCw,
  Mail,
  Send,
  Edit3,
  Archive,
  Reply,
  Forward,
  Paperclip,
  CheckCircle,
  AlertCircle,
  Clock,
  Eye,
  Settings,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import RichTextEditor from './RichTextEditor';
import EmailTemplates from './EmailTemplates';

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
  created_at: string;
};

type EmailThread = {
  id: string;
  customer_email: string;
  subject: string;
  last_message_at: string;
  message_count: number;
  unread_count: number;
  emails: EmailLog[];
};

type EmailView = 'inbox' | 'sent' | 'compose' | 'drafts' | 'templates';

interface EmailClientContentProps {
  onOrderClick?: (orderId: string) => void;
  initialOrderId?: string;
  initialEmail?: string;
}

export default function EmailClientContent({
  onOrderClick,
  initialOrderId,
  initialEmail,
}: EmailClientContentProps = {}) {
  const [currentView, setCurrentView] = useState<EmailView>('inbox');
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Compose state
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeOrderId, setComposeOrderId] = useState('');
  const [composeSending, setComposeSending] = useState(false);

  // Mock data for development
  const mockEmails: EmailLog[] = useMemo(
    () => [
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
        created_at: new Date().toISOString(),
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
        created_at: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: '3',
        order_id: null,
        customer_email: 'support@example.com',
        email_type: 'support_reply',
        subject: 'Re: Problém s objednávkou',
        status: 'opened',
        sent_at: new Date(Date.now() - 172800000).toISOString(),
        delivered_at: new Date(Date.now() - 172800000).toISOString(),
        opened_at: new Date(Date.now() - 86400000).toISOString(),
        failed_reason: null,
        email_content: '<p>Dobrý den,</p><p>děkujeme za váš dotaz. Problém jsme vyřešili...</p>',
        metadata: { template: 'support_reply_v1' },
        created_at: new Date(Date.now() - 172800000).toISOString(),
      },
    ],
    []
  );

  const loadEmails = useCallback(async () => {
    setLoading(true);
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
    } catch (error) {
      console.error('Load emails error:', error);
      setEmails(mockEmails);
    } finally {
      setLoading(false);
    }
  }, [mockEmails]);

  // Group emails into threads
  const groupEmailsIntoThreads = useCallback((emailList: EmailLog[]): EmailThread[] => {
    const threadMap = new Map<string, EmailThread>();

    emailList.forEach((email) => {
      const threadKey = `${email.customer_email}-${email.subject.replace(/^(Re:|Fwd?:)\s*/i, '')}`;

      if (!threadMap.has(threadKey)) {
        threadMap.set(threadKey, {
          id: threadKey,
          customer_email: email.customer_email,
          subject: email.subject.replace(/^(Re:|Fwd?:)\s*/i, ''),
          last_message_at: email.sent_at,
          message_count: 0,
          unread_count: 0,
          emails: [],
        });
      }

      const thread = threadMap.get(threadKey)!;
      thread.emails.push(email);
      thread.message_count++;

      if (email.status === 'sent' && !email.opened_at) {
        thread.unread_count++;
      }

      if (new Date(email.sent_at) > new Date(thread.last_message_at)) {
        thread.last_message_at = email.sent_at;
      }
    });

    return Array.from(threadMap.values()).sort(
      (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    );
  }, []);

  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

  // Initialize based on props
  useEffect(() => {
    if (initialEmail) {
      setCurrentView('compose');
      setComposeTo(initialEmail);
      setComposeSubject('');
      setComposeBody('');
      setComposeOrderId(initialOrderId || '');
    } else if (initialOrderId) {
      setSearchQuery(initialOrderId);
      setCurrentView('inbox');
    }
  }, [initialEmail, initialOrderId]);

  useEffect(() => {
    const emailThreads = groupEmailsIntoThreads(emails);
    setThreads(emailThreads);
  }, [emails, groupEmailsIntoThreads]);

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

      // Reset compose form
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
      setComposeOrderId('');
      setCurrentView('sent');

      await loadEmails();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to send email');
    } finally {
      setComposeSending(false);
    }
  }, [composeTo, composeSubject, composeBody, composeOrderId, loadEmails]);

  const handleTemplateSelect = (template: any) => {
    setComposeSubject(template.subject);
    setComposeBody(template.content);
    setCurrentView('compose');
  };

  const filteredThreads = useMemo(() => {
    let filtered = threads;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (thread) =>
          thread.customer_email.toLowerCase().includes(query) ||
          thread.subject.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [threads, searchQuery]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Send className="w-4 h-4 text-blue-500" />;
      case 'delivered':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'opened':
        return <Eye className="w-4 h-4 text-purple-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      sent: { className: 'bg-blue-100 text-blue-800', label: 'Odesláno' },
      delivered: { className: 'bg-green-100 text-green-800', label: 'Doručeno' },
      opened: { className: 'bg-purple-100 text-purple-800', label: 'Otevřeno' },
      failed: { className: 'bg-red-100 text-red-800', label: 'Chyba' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.sent;

    return <Badge className={`${config.className} border-0 text-xs`}>{config.label}</Badge>;
  };

  if (loading && emails.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p>Načítání emailů...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with navigation tabs */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Emailová komunikace</h2>
          <p className="text-muted-foreground">Spravujte emailovou komunikaci se zákazníky</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadEmails} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Obnovit
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as EmailView)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="inbox" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Přijaté ({threads.filter((t) => t.unread_count > 0).length})
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            Odeslané
          </TabsTrigger>
          <TabsTrigger value="compose" className="flex items-center gap-2">
            <Edit3 className="w-4 h-4" />
            Napsat
          </TabsTrigger>
          <TabsTrigger value="drafts" className="flex items-center gap-2">
            <Archive className="w-4 h-4" />
            Koncepty
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Šablony
          </TabsTrigger>
        </TabsList>

        {/* Search */}
        {currentView !== 'compose' && currentView !== 'templates' && (
          <div className="mt-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Hledat emaily..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}

        {/* Inbox/Sent Content */}
        {(currentView === 'inbox' || currentView === 'sent') && (
          <TabsContent value={currentView} className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Thread List */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {currentView === 'inbox' ? 'Konverzace' : 'Odeslané emaily'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[600px]">
                      <div className="p-4 space-y-2">
                        {filteredThreads.map((thread) => (
                          <div
                            key={thread.id}
                            className={`p-3 rounded-lg cursor-pointer transition-colors ${
                              selectedThread?.id === thread.id
                                ? 'bg-primary/10 border border-primary/20'
                                : 'hover:bg-muted/50'
                            }`}
                            onClick={() => setSelectedThread(thread)}
                          >
                            <div className="flex items-start gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="text-xs">
                                  {thread.customer_email.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-sm font-medium truncate">
                                    {thread.customer_email}
                                  </p>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(thread.last_message_at).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground truncate mb-1">
                                  {thread.subject}
                                </p>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground">
                                    {thread.message_count} zpráv
                                  </span>
                                  {thread.unread_count > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      {thread.unread_count}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* Email Content */}
              <div className="lg:col-span-2">
                {selectedThread ? (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">{selectedThread.subject}</h3>
                          <p className="text-muted-foreground">{selectedThread.customer_email}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Reply className="w-4 h-4 mr-2" />
                            Odpovědět
                          </Button>
                          <Button variant="outline" size="sm">
                            <Forward className="w-4 h-4 mr-2" />
                            Přeposlat
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[500px]">
                        <div className="space-y-4">
                          {selectedThread.emails
                            .sort(
                              (a, b) =>
                                new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
                            )
                            .map((email) => (
                              <div key={email.id} className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="w-8 h-8">
                                      <AvatarFallback className="text-xs">
                                        {email.customer_email.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="font-medium">{email.customer_email}</p>
                                      <p className="text-sm text-muted-foreground">
                                        {new Date(email.sent_at).toLocaleString()}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {getStatusBadge(email.status)}
                                    {getStatusIcon(email.status)}
                                  </div>
                                </div>

                                {email.order_id && (
                                  <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">Objednávka:</span>
                                      <Button
                                        variant="link"
                                        size="sm"
                                        onClick={() => onOrderClick?.(email.order_id!)}
                                        className="p-0 h-auto"
                                      >
                                        #{email.order_id.substring(0, 8).toUpperCase()}
                                      </Button>
                                    </div>
                                  </div>
                                )}

                                {email.email_content ? (
                                  <div
                                    className="prose max-w-none"
                                    dangerouslySetInnerHTML={{ __html: email.email_content }}
                                  />
                                ) : (
                                  <p className="text-muted-foreground italic">
                                    Obsah emailu není dostupný
                                  </p>
                                )}

                                {email.failed_reason && (
                                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm text-red-600">
                                      <AlertCircle className="w-4 h-4 inline mr-2" />
                                      Chyba: {email.failed_reason}
                                    </p>
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="flex items-center justify-center h-[600px]">
                    <div className="text-center text-muted-foreground">
                      <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Vyberte konverzaci pro zobrazení emailů</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        )}

        {/* Compose Content */}
        <TabsContent value="compose" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Napsat nový email</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Příjemce *</label>
                    <Input
                      placeholder="email@example.com"
                      value={composeTo}
                      onChange={(e) => setComposeTo(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Objednávka (volitelné)</label>
                    <Input
                      placeholder="ord_12345"
                      value={composeOrderId}
                      onChange={(e) => setComposeOrderId(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Předmět *</label>
                  <Input
                    placeholder="Předmět emailu"
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Obsah *</label>
                  <RichTextEditor
                    value={composeBody}
                    onChange={setComposeBody}
                    placeholder="Napište svou zprávu..."
                    className="mt-2"
                  />
                </div>
                <div className="flex justify-between">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Paperclip className="w-4 h-4 mr-2" />
                      Příloha
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentView('templates')}>
                      <Settings className="w-4 h-4 mr-2" />
                      Šablona
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentView('inbox')}
                      disabled={composeSending}
                    >
                      Zrušit
                    </Button>
                    <Button
                      onClick={sendComposedEmail}
                      disabled={composeSending || !composeTo || !composeSubject || !composeBody}
                    >
                      {composeSending ? 'Odesílám...' : 'Odeslat'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Content */}
        <TabsContent value="templates" className="mt-6">
          <EmailTemplates
            onSelectTemplate={handleTemplateSelect}
            onClose={() => setCurrentView('compose')}
          />
        </TabsContent>

        {/* Drafts Content */}
        <TabsContent value="drafts" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Koncepty emailů</CardTitle>
              <p className="text-sm text-muted-foreground">
                Rozpracované emaily, které můžete dokončit později
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Archive className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Žádné koncepty</h3>
                <p className="text-muted-foreground mb-4">
                  Začněte psát email a uložte ho jako koncept
                </p>
                <Button onClick={() => setCurrentView('compose')}>
                  <Edit3 className="w-4 h-4 mr-2" />
                  Napsat email
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
