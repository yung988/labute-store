'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Edit, Trash2, Copy, Search, FileText, Mail, Settings, Eye } from 'lucide-react';
import RichTextEditor from './RichTextEditor';

type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  content: string;
  category: 'support' | 'order' | 'marketing' | 'system';
  variables: string[];
  created_at: string;
  updated_at: string;
  usage_count: number;
};

interface EmailTemplatesProps {
  onSelectTemplate?: (template: EmailTemplate) => void;
  onClose?: () => void;
}

export default function EmailTemplates({ onSelectTemplate, onClose }: EmailTemplatesProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState<EmailTemplate['category']>('support');

  // Mock templates
  const mockTemplates: EmailTemplate[] = [
    {
      id: '1',
      name: 'Potvrzení objednávky',
      subject: 'Potvrzení objednávky #{ORDER_ID}',
      content: `
        <h2>Děkujeme za vaši objednávku!</h2>
        <p>Dobrý den {CUSTOMER_NAME},</p>
        <p>vaše objednávka <strong>#{ORDER_ID}</strong> byla úspěšně přijata a je nyní zpracovávána.</p>
        
        <h3>Detaily objednávky:</h3>
        <ul>
          <li>Číslo objednávky: {ORDER_ID}</li>
          <li>Celková částka: {TOTAL_AMOUNT} Kč</li>
          <li>Datum objednávky: {ORDER_DATE}</li>
        </ul>
        
        <p>O dalším postupu vás budeme informovat emailem.</p>
        <p>S pozdravem,<br>Tým Labute Store</p>
      `,
      category: 'order',
      variables: ['CUSTOMER_NAME', 'ORDER_ID', 'TOTAL_AMOUNT', 'ORDER_DATE'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      usage_count: 45,
    },
    {
      id: '2',
      name: 'Odpověď na dotaz',
      subject: 'Re: {ORIGINAL_SUBJECT}',
      content: `
        <p>Dobrý den {CUSTOMER_NAME},</p>
        <p>děkujeme za váš dotaz. Rádi vám pomůžeme.</p>
        
        <p>{RESPONSE_CONTENT}</p>
        
        <p>Pokud máte další otázky, neváhejte nás kontaktovat.</p>
        <p>S pozdravem,<br>{AGENT_NAME}<br>Zákaznická podpora</p>
      `,
      category: 'support',
      variables: ['CUSTOMER_NAME', 'ORIGINAL_SUBJECT', 'RESPONSE_CONTENT', 'AGENT_NAME'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      usage_count: 23,
    },
    {
      id: '3',
      name: 'Oznámení o odeslání',
      subject: 'Vaše objednávka #{ORDER_ID} byla odeslána',
      content: `
        <h2>Vaše objednávka je na cestě!</h2>
        <p>Dobrý den {CUSTOMER_NAME},</p>
        <p>vaše objednávka <strong>#{ORDER_ID}</strong> byla odeslána a je na cestě k vám.</p>
        
        <h3>Informace o zásilce:</h3>
        <ul>
          <li>Tracking číslo: <strong>{TRACKING_NUMBER}</strong></li>
          <li>Dopravce: {CARRIER}</li>
          <li>Očekávané doručení: {DELIVERY_DATE}</li>
        </ul>
        
        <p>Zásilku můžete sledovat na: <a href="{TRACKING_URL}">{TRACKING_URL}</a></p>
        <p>S pozdravem,<br>Tým Labute Store</p>
      `,
      category: 'order',
      variables: [
        'CUSTOMER_NAME',
        'ORDER_ID',
        'TRACKING_NUMBER',
        'CARRIER',
        'DELIVERY_DATE',
        'TRACKING_URL',
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      usage_count: 38,
    },
    {
      id: '4',
      name: 'Newsletter',
      subject: 'Nové produkty v našem e-shopu',
      content: `
        <h1>Objevte naše novinky!</h1>
        <p>Dobrý den {CUSTOMER_NAME},</p>
        <p>máme pro vás skvělé novinky! V našem e-shopu najdete nové produkty, které vás určitě zaujmou.</p>
        
        <h3>Nejnovější produkty:</h3>
        <p>{FEATURED_PRODUCTS}</p>
        
        <p>Navštivte náš e-shop a objevte všechny novinky: <a href="{SHOP_URL}">Labute Store</a></p>
        
        <p>S pozdravem,<br>Tým Labute Store</p>
        
        <hr>
        <p><small>Pokud si nepřejete dostávat tyto emaily, můžete se <a href="{UNSUBSCRIBE_URL}">odhlásit</a>.</small></p>
      `,
      category: 'marketing',
      variables: ['CUSTOMER_NAME', 'FEATURED_PRODUCTS', 'SHOP_URL', 'UNSUBSCRIBE_URL'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      usage_count: 12,
    },
  ];

  useEffect(() => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setTemplates(mockTemplates);
      setLoading(false);
    }, 300);
  }, []);

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getCategoryLabel = (category: string) => {
    const labels = {
      support: 'Podpora',
      order: 'Objednávky',
      marketing: 'Marketing',
      system: 'Systém',
    };
    return labels[category as keyof typeof labels] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      support: 'bg-blue-100 text-blue-800',
      order: 'bg-green-100 text-green-800',
      marketing: 'bg-purple-100 text-purple-800',
      system: 'bg-gray-100 text-gray-800',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const handleCreateTemplate = () => {
    const newTemplate: EmailTemplate = {
      id: Date.now().toString(),
      name: formName,
      subject: formSubject,
      content: formContent,
      category: formCategory,
      variables: extractVariables(formContent + ' ' + formSubject),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      usage_count: 0,
    };

    setTemplates([newTemplate, ...templates]);
    resetForm();
    setShowCreateDialog(false);
  };

  const handleEditTemplate = () => {
    if (!selectedTemplate) return;

    const updatedTemplate: EmailTemplate = {
      ...selectedTemplate,
      name: formName,
      subject: formSubject,
      content: formContent,
      category: formCategory,
      variables: extractVariables(formContent + ' ' + formSubject),
      updated_at: new Date().toISOString(),
    };

    setTemplates(templates.map((t) => (t.id === selectedTemplate.id ? updatedTemplate : t)));
    resetForm();
    setShowEditDialog(false);
    setSelectedTemplate(null);
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (confirm('Opravdu chcete smazat tuto šablonu?')) {
      setTemplates(templates.filter((t) => t.id !== templateId));
    }
  };

  const handleUseTemplate = (template: EmailTemplate) => {
    onSelectTemplate?.(template);
    onClose?.();
  };

  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{([^}]+)\}/g);
    return matches ? [...new Set(matches.map((match) => match.slice(1, -1)))] : [];
  };

  const resetForm = () => {
    setFormName('');
    setFormSubject('');
    setFormContent('');
    setFormCategory('support');
  };

  const openEditDialog = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setFormName(template.name);
    setFormSubject(template.subject);
    setFormContent(template.content);
    setFormCategory(template.category);
    setShowEditDialog(true);
  };

  const openPreviewDialog = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setShowPreviewDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p>Načítání šablon...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Email šablony</h2>
          <p className="text-muted-foreground">Spravujte šablony pro rychlé odpovědi</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nová šablona
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Hledat šablony..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Kategorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny kategorie</SelectItem>
            <SelectItem value="support">Podpora</SelectItem>
            <SelectItem value="order">Objednávky</SelectItem>
            <SelectItem value="marketing">Marketing</SelectItem>
            <SelectItem value="system">Systém</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{template.subject}</p>
                </div>
                <Badge className={getCategoryColor(template.category)}>
                  {getCategoryLabel(template.category)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>Použito {template.usage_count}×</span>
                  </div>
                  {template.variables.length > 0 && (
                    <div className="mt-2">
                      <span className="font-medium">Proměnné:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {template.variables.slice(0, 3).map((variable) => (
                          <Badge key={variable} variant="outline" className="text-xs">
                            {variable}
                          </Badge>
                        ))}
                        {template.variables.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{template.variables.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleUseTemplate(template)} className="flex-1">
                    <Mail className="w-4 h-4 mr-2" />
                    Použít
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openPreviewDialog(template)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEditDialog(template)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteTemplate(template.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Žádné šablony nenalezeny</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || categoryFilter !== 'all'
              ? 'Zkuste změnit filtry nebo vytvořte novou šablonu.'
              : 'Vytvořte svou první email šablonu.'}
          </p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Vytvořit šablonu
          </Button>
        </div>
      )}

      {/* Create Template Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vytvořit novou šablonu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="template-name">Název šablony *</Label>
                <Input
                  id="template-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Název šablony"
                />
              </div>
              <div>
                <Label htmlFor="template-category">Kategorie *</Label>
                <Select
                  value={formCategory}
                  onValueChange={(value) => setFormCategory(value as EmailTemplate['category'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="support">Podpora</SelectItem>
                    <SelectItem value="order">Objednávky</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="system">Systém</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="template-subject">Předmět *</Label>
              <Input
                id="template-subject"
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                placeholder="Předmět emailu (můžete použít {PROMĚNNÉ})"
              />
            </div>
            <div>
              <Label htmlFor="template-content">Obsah *</Label>
              <RichTextEditor
                value={formContent}
                onChange={setFormContent}
                placeholder="Obsah šablony (můžete použít {PROMĚNNÉ} pro dynamický obsah)"
                className="mt-2"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Zrušit
              </Button>
              <Button
                onClick={handleCreateTemplate}
                disabled={!formName || !formSubject || !formContent}
              >
                Vytvořit šablonu
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upravit šablonu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-template-name">Název šablony *</Label>
                <Input
                  id="edit-template-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Název šablony"
                />
              </div>
              <div>
                <Label htmlFor="edit-template-category">Kategorie *</Label>
                <Select
                  value={formCategory}
                  onValueChange={(value) => setFormCategory(value as EmailTemplate['category'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="support">Podpora</SelectItem>
                    <SelectItem value="order">Objednávky</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="system">Systém</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-template-subject">Předmět *</Label>
              <Input
                id="edit-template-subject"
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                placeholder="Předmět emailu (můžete použít {PROMĚNNÉ})"
              />
            </div>
            <div>
              <Label htmlFor="edit-template-content">Obsah *</Label>
              <RichTextEditor
                value={formContent}
                onChange={setFormContent}
                placeholder="Obsah šablony (můžete použít {PROMĚNNÉ} pro dynamický obsah)"
                className="mt-2"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Zrušit
              </Button>
              <Button
                onClick={handleEditTemplate}
                disabled={!formName || !formSubject || !formContent}
              >
                Uložit změny
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Template Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Náhled šablony</DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Název</Label>
                  <p className="font-medium">{selectedTemplate.name}</p>
                </div>
                <div>
                  <Label>Kategorie</Label>
                  <Badge className={getCategoryColor(selectedTemplate.category)}>
                    {getCategoryLabel(selectedTemplate.category)}
                  </Badge>
                </div>
              </div>
              <div>
                <Label>Předmět</Label>
                <p className="font-medium">{selectedTemplate.subject}</p>
              </div>
              {selectedTemplate.variables.length > 0 && (
                <div>
                  <Label>Dostupné proměnné</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedTemplate.variables.map((variable) => (
                      <Badge key={variable} variant="outline">
                        {variable}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <Label>Obsah</Label>
                <div
                  className="mt-2 p-4 border rounded-lg prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedTemplate.content }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
                  Zavřít
                </Button>
                <Button onClick={() => handleUseTemplate(selectedTemplate)}>
                  <Mail className="w-4 h-4 mr-2" />
                  Použít šablonu
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
