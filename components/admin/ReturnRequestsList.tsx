'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Package, Clock, CheckCircle, XCircle, RefreshCw, Search, Euro, Image as ImageIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';

interface ReturnRequest {
  id: string;
  return_number: number;
  customer_email: string;
  customer_name?: string;
  order_id: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'received' | 'refunded';
  refund_amount?: number;
  refund_method?: string;
  photos?: Record<string, unknown>[];
  admin_notes?: string;
  created_at: string;
  order?: { total?: number; status?: string };
}

export default function ReturnRequestsList() {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [refundAmount, setRefundAmount] = useState('');

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.append('status', filter);
      }

      const response = await fetch(`/api/admin/returns?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch returns');

      const data = await response.json();
      setReturns(data.returns || []);
    } catch (error) {
      console.error('Error fetching returns:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  const handleOpenDetail = (returnReq: ReturnRequest) => {
    setSelectedReturn(returnReq);
    setAdminNotes(returnReq.admin_notes || '');
    setRefundAmount(returnReq.refund_amount?.toString() || returnReq.order?.total?.toString() || '');
    setDetailOpen(true);
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedReturn) return;

    setUpdating(true);
    try {
      const body: Record<string, unknown> = {
        status: newStatus,
        admin_notes: adminNotes,
      };

      if (newStatus === 'approved' || newStatus === 'refunded') {
        body.refund_amount = parseFloat(refundAmount);
        body.refund_method = 'original_payment';
      }

      const response = await fetch(`/api/admin/returns/${selectedReturn.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error('Failed to update return');

      setDetailOpen(false);
      await fetchReturns();
    } catch (error) {
      console.error('Error updating return:', error);
      alert('Nepodařilo se aktualizovat reklamaci');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'approved': return 'bg-blue-500';
      case 'rejected': return 'bg-red-500';
      case 'received': return 'bg-purple-500';
      case 'refunded': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'pending': 'Čeká na schválení',
      'approved': 'Schváleno',
      'rejected': 'Zamítnuto',
      'received': 'Zboží přijato',
      'refunded': 'Vráceno',
    };
    return labels[status] || status;
  };

  const filteredReturns = returns.filter(ret =>
    searchQuery === '' ||
    ret.order_id.includes(searchQuery) ||
    ret.customer_email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    pending: returns.filter(r => r.status === 'pending').length,
    approved: returns.filter(r => r.status === 'approved').length,
    total: returns.length,
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Čekající reklamace</CardDescription>
            <CardTitle className="text-3xl">{stats.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Schválené</CardDescription>
            <CardTitle className="text-3xl">{stats.approved}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Celkem reklamací</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div>
              <CardTitle>Reklamace a vrácení</CardTitle>
              <CardDescription>Správa return requests</CardDescription>
            </div>
            <Button onClick={fetchReturns} variant="outline" size="sm">
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
                placeholder="Hledat podle čísla objednávky nebo emailu..."
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
                <SelectItem value="pending">Čekající</SelectItem>
                <SelectItem value="approved">Schválené</SelectItem>
                <SelectItem value="rejected">Zamítnuté</SelectItem>
                <SelectItem value="received">Přijaté</SelectItem>
                <SelectItem value="refunded">Vrácené</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Načítání...</div>
          ) : filteredReturns.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Žádné reklamace k zobrazení
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReturns.map((returnReq) => (
                <div
                  key={returnReq.id}
                  onClick={() => handleOpenDetail(returnReq)}
                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="font-mono">
                          #{returnReq.return_number}
                        </Badge>
                        <Badge className={`${getStatusColor(returnReq.status)} text-white`}>
                          {getStatusLabel(returnReq.status)}
                        </Badge>
                        <Badge variant="outline">
                          Obj. #{returnReq.order_id}
                        </Badge>
                        {returnReq.photos && returnReq.photos.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <ImageIcon className="h-3 w-3 mr-1" />
                            {returnReq.photos.length} foto
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {returnReq.reason}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{returnReq.customer_email}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(returnReq.created_at), {
                            addSuffix: true,
                            locale: cs,
                          })}
                        </span>
                        {returnReq.order && (
                          <span className="flex items-center gap-1">
                            <Euro className="h-3 w-3" />
                            {returnReq.order.total} Kč
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

      {/* Detail Dialog */}
      {selectedReturn && (
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Reklamace #{selectedReturn.return_number}</DialogTitle>
              <DialogDescription>
                Objednávka #{selectedReturn.order_id}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Status */}
              <div>
                <Badge className={`${getStatusColor(selectedReturn.status)} text-white`}>
                  {getStatusLabel(selectedReturn.status)}
                </Badge>
              </div>

              {/* Customer info */}
              <div>
                <h4 className="font-semibold mb-2">Zákazník</h4>
                <p>{selectedReturn.customer_email}</p>
                {selectedReturn.customer_name && <p>{selectedReturn.customer_name}</p>}
              </div>

              {/* Reason */}
              <div>
                <h4 className="font-semibold mb-2">Důvod reklamace</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedReturn.reason}</p>
              </div>

              {/* Photos */}
              {selectedReturn.photos && selectedReturn.photos.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Fotografie ({selectedReturn.photos.length})</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedReturn.photos.map((photo: Record<string, unknown>, idx: number) => (
                      <div key={idx} className="border rounded p-2 text-xs">
                        <ImageIcon className="h-4 w-4 mb-1" />
                        <p>{photo.filename as string}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Order info */}
              {selectedReturn.order && (
                <div>
                  <h4 className="font-semibold mb-2">Objednávka</h4>
                  <div className="bg-gray-50 p-3 rounded space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Celkem:</span>
                      <span className="font-semibold">{selectedReturn.order.total} Kč</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <Badge variant="outline">{selectedReturn.order.status}</Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Refund amount */}
              {(selectedReturn.status === 'pending' || selectedReturn.status === 'approved') && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Částka k vrácení (Kč)</label>
                  <Input
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    placeholder="0"
                  />
                </div>
              )}

              {/* Admin notes */}
              <div>
                <label className="text-sm font-medium mb-2 block">Poznámka pro zákazníka</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Volitelná poznámka, která bude zaslána zákazníkovi..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              {selectedReturn.status === 'pending' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateStatus('rejected')}
                    disabled={updating}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Zamítnout
                  </Button>
                  <Button
                    onClick={() => handleUpdateStatus('approved')}
                    disabled={updating || !refundAmount}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Schválit
                  </Button>
                </>
              )}
              {selectedReturn.status === 'approved' && (
                <Button
                  onClick={() => handleUpdateStatus('received')}
                  disabled={updating}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Označit jako přijaté
                </Button>
              )}
              {selectedReturn.status === 'received' && (
                <Button
                  onClick={() => handleUpdateStatus('refunded')}
                  disabled={updating}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Euro className="h-4 w-4 mr-2" />
                  Vrátit peníze
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
