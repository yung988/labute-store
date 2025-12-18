'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Package, Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type OrderData = {
  id: string;
  customerName: string;
  items: Array<{ description?: string; quantity?: number; size?: string }>;
  amountTotal: number;
  status: string;
  createdAt: string;
};

type ReturnRequest = {
  id: string;
  status: string;
  reason: string;
  description: string | null;
  created_at: string;
  admin_notes: string | null;
};

type EligibilityData = {
  isEligible: boolean;
  daysRemaining: number;
  message: string;
};

const RETURN_REASONS = [
  { value: 'wrong_size', label: 'Špatná velikost' },
  { value: 'not_as_expected', label: 'Zboží neodpovídá očekávání' },
  { value: 'damaged', label: 'Poškozené zboží' },
  { value: 'wrong_item', label: 'Chybný produkt' },
  { value: 'changed_mind', label: 'Rozmyslel/a jsem si to' },
  { value: 'other', label: 'Jiný důvod' },
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Čeká na schválení', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Schváleno', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Zamítnuto', color: 'bg-red-100 text-red-800' },
  received: { label: 'Zboží přijato', color: 'bg-blue-100 text-blue-800' },
  refunded: { label: 'Vráceno', color: 'bg-purple-100 text-purple-800' },
};

export default function ReturnsPage() {
  const [step, setStep] = useState<'lookup' | 'details' | 'form' | 'success'>('lookup');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lookup form
  const [orderId, setOrderId] = useState('');
  const [email, setEmail] = useState('');

  // Order data
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [returnRequest, setReturnRequest] = useState<ReturnRequest | null>(null);
  const [eligibility, setEligibility] = useState<EligibilityData | null>(null);

  // Return form
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');

  const lookupOrder = async () => {
    if (!orderId.trim() || !email.trim()) {
      setError('Vyplňte prosím číslo objednávky i email');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/returns?orderId=${encodeURIComponent(orderId)}&email=${encodeURIComponent(email)}`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Nepodařilo se načíst objednávku');
      }

      setOrderData(data.order);
      setReturnRequest(data.returnRequest);
      setEligibility(data.eligibility);
      setStep('details');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nastala chyba');
    } finally {
      setLoading(false);
    }
  };

  const submitReturn = async () => {
    if (!reason) {
      setError('Vyberte prosím důvod vrácení');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          email,
          reason: RETURN_REASONS.find((r) => r.value === reason)?.label || reason,
          description: description.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Nepodařilo se odeslat žádost');
      }

      setStep('success');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nastala chyba');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep('lookup');
    setOrderId('');
    setEmail('');
    setOrderData(null);
    setReturnRequest(null);
    setEligibility(null);
    setReason('');
    setDescription('');
    setError(null);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 font-sans">
      <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Zpět na hlavní stránku
      </Link>

      <h1 className="text-2xl font-bold mb-2">Vrácení zboží</h1>
      <p className="text-muted-foreground mb-8">
        Máte 14 dní na vrácení zboží bez udání důvodu. Vyplňte formulář níže pro zahájení procesu vrácení.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Step 1: Order Lookup */}
      {step === 'lookup' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Vyhledat objednávku
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Číslo objednávky *</label>
              <Input
                placeholder="např. YZ-20241218-001"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Email použitý při objednávce *</label>
              <Input
                type="email"
                placeholder="vas@email.cz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button onClick={lookupOrder} disabled={loading} className="w-full">
              {loading ? 'Vyhledávám...' : 'Vyhledat objednávku'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Order Details */}
      {step === 'details' && orderData && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Objednávka #{orderData.id}</span>
                <Badge variant="outline">{orderData.status}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Zákazník</p>
                  <p className="font-medium">{orderData.customerName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Datum objednávky</p>
                  <p className="font-medium">
                    {new Date(orderData.createdAt).toLocaleDateString('cs-CZ')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Položky</p>
                  <ul className="mt-1 space-y-1">
                    {orderData.items?.map((item, idx) => (
                      <li key={idx} className="text-sm">
                        {item.quantity}× {item.description || 'Produkt'}
                        {item.size && ` (${item.size})`}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Celkem</p>
                  <p className="font-bold text-lg">
                    {((orderData.amountTotal || 0) / 100).toFixed(0)} Kč
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Eligibility status */}
          {eligibility && (
            <Card className={eligibility.isEligible ? 'border-green-200' : 'border-red-200'}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  {eligibility.isEligible ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  )}
                  <div>
                    <p className="font-medium">{eligibility.message}</p>
                    {eligibility.isEligible && (
                      <p className="text-sm text-muted-foreground">
                        Do konce lhůty zbývá {eligibility.daysRemaining} dní
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Existing return request */}
          {returnRequest && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Existující žádost o vrácení
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Stav</span>
                    <Badge className={STATUS_LABELS[returnRequest.status]?.color}>
                      {STATUS_LABELS[returnRequest.status]?.label || returnRequest.status}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Důvod</span>
                    <p>{returnRequest.reason}</p>
                  </div>
                  {returnRequest.description && (
                    <div>
                      <span className="text-sm text-muted-foreground">Popis</span>
                      <p>{returnRequest.description}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-sm text-muted-foreground">Podáno</span>
                    <p>{new Date(returnRequest.created_at).toLocaleString('cs-CZ')}</p>
                  </div>
                  {returnRequest.admin_notes && (
                    <div className="bg-muted p-3 rounded-lg">
                      <span className="text-sm text-muted-foreground">Poznámka od prodejce</span>
                      <p>{returnRequest.admin_notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={reset}>
              Zpět
            </Button>
            {eligibility?.isEligible && !returnRequest && (
              <Button onClick={() => setStep('form')} className="flex-1">
                Požádat o vrácení
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Return Form */}
      {step === 'form' && (
        <Card>
          <CardHeader>
            <CardTitle>Žádost o vrácení zboží</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Důvod vrácení *</label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte důvod" />
                </SelectTrigger>
                <SelectContent>
                  {RETURN_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Popis (volitelné)</label>
              <Textarea
                placeholder="Popište prosím důvod vrácení podrobněji..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="bg-muted p-4 rounded-lg text-sm">
              <p className="font-medium mb-2">Jak postupovat:</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Odešlete tuto žádost</li>
                <li>Počkejte na email s potvrzením a adresou pro zaslání</li>
                <li>Zboží zabalte a odešlete na uvedenou adresu</li>
                <li>Po obdržení zboží provedeme kontrolu a vrátíme peníze</li>
              </ol>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('details')}>
                Zpět
              </Button>
              <Button onClick={submitReturn} disabled={loading} className="flex-1">
                {loading ? 'Odesílám...' : 'Odeslat žádost'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Success */}
      {step === 'success' && (
        <Card className="border-green-200">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Žádost byla odeslána</h2>
            <p className="text-muted-foreground mb-6">
              Vaši žádost o vrácení zboží jsme přijali. Na váš email {email} vám brzy zašleme další instrukce.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={reset}>
                Odeslat další žádost
              </Button>
              <Link href="/">
                <Button>Zpět do obchodu</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help section */}
      <div className="mt-12 p-6 bg-muted/50 rounded-lg">
        <h3 className="font-medium mb-2">Potřebujete pomoc?</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Pokud máte jakékoliv dotazy ohledně vrácení zboží, neváhejte nás kontaktovat.
        </p>
        <p className="text-sm">
          Email:{' '}
          <a href="mailto:info@yeezuz2020.cz" className="text-primary hover:underline">
            info@yeezuz2020.cz
          </a>
        </p>
      </div>
    </div>
  );
}
