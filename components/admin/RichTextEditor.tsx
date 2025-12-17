'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Link,
  Image as ImageIcon,
  Code,
  Quote,
  Undo,
  Redo,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Napište svou zprávu...',
  className = '',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');

  const executeCommand = useCallback(
    (command: string, value?: string) => {
      document.execCommand(command, false, value);
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
      }
    },
    [onChange]
  );

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const insertLink = useCallback(() => {
    if (linkUrl && linkText) {
      const linkHtml = `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
      executeCommand('insertHTML', linkHtml);
      setLinkUrl('');
      setLinkText('');
      setShowLinkDialog(false);
    }
  }, [linkUrl, linkText, executeCommand]);

  const insertImage = useCallback(() => {
    if (imageUrl) {
      const imageHtml = `<img src="${imageUrl}" alt="${imageAlt}" style="max-width: 100%; height: auto;" />`;
      executeCommand('insertHTML', imageHtml);
      setImageUrl('');
      setImageAlt('');
      setShowImageDialog(false);
    }
  }, [imageUrl, imageAlt, executeCommand]);

  const formatButtons = [
    {
      command: 'bold',
      icon: Bold,
      title: 'Tučné (Ctrl+B)',
    },
    {
      command: 'italic',
      icon: Italic,
      title: 'Kurzíva (Ctrl+I)',
    },
    {
      command: 'underline',
      icon: Underline,
      title: 'Podtržené (Ctrl+U)',
    },
  ];

  const alignButtons = [
    {
      command: 'justifyLeft',
      icon: AlignLeft,
      title: 'Zarovnat vlevo',
    },
    {
      command: 'justifyCenter',
      icon: AlignCenter,
      title: 'Zarovnat na střed',
    },
    {
      command: 'justifyRight',
      icon: AlignRight,
      title: 'Zarovnat vpravo',
    },
  ];

  const listButtons = [
    {
      command: 'insertUnorderedList',
      icon: List,
      title: 'Odrážky',
    },
    {
      command: 'insertOrderedList',
      icon: ListOrdered,
      title: 'Číslování',
    },
  ];

  const otherButtons = [
    {
      command: 'formatBlock',
      value: 'blockquote',
      icon: Quote,
      title: 'Citace',
    },
    {
      command: 'formatBlock',
      value: 'pre',
      icon: Code,
      title: 'Kód',
    },
  ];

  const historyButtons = [
    {
      command: 'undo',
      icon: Undo,
      title: 'Zpět (Ctrl+Z)',
    },
    {
      command: 'redo',
      icon: Redo,
      title: 'Vpřed (Ctrl+Y)',
    },
  ];

  return (
    <Card className={className}>
      <CardContent className="p-0">
        {/* Toolbar */}
        <div className="border-b p-3">
          <div className="flex flex-wrap items-center gap-1">
            {/* Font Size */}
            <Select onValueChange={(value) => executeCommand('fontSize', value)}>
              <SelectTrigger className="w-20 h-8">
                <SelectValue placeholder="12" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">10px</SelectItem>
                <SelectItem value="2">12px</SelectItem>
                <SelectItem value="3">14px</SelectItem>
                <SelectItem value="4">16px</SelectItem>
                <SelectItem value="5">18px</SelectItem>
                <SelectItem value="6">24px</SelectItem>
                <SelectItem value="7">32px</SelectItem>
              </SelectContent>
            </Select>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Format Buttons */}
            {formatButtons.map((button) => (
              <Button
                key={button.command}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => executeCommand(button.command)}
                title={button.title}
              >
                <button.icon className="w-4 h-4" />
              </Button>
            ))}

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Alignment Buttons */}
            {alignButtons.map((button) => (
              <Button
                key={button.command}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => executeCommand(button.command)}
                title={button.title}
              >
                <button.icon className="w-4 h-4" />
              </Button>
            ))}

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* List Buttons */}
            {listButtons.map((button) => (
              <Button
                key={button.command}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => executeCommand(button.command)}
                title={button.title}
              >
                <button.icon className="w-4 h-4" />
              </Button>
            ))}

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Link Button */}
            <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Vložit odkaz">
                  <Link className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Vložit odkaz</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="link-text">Text odkazu</Label>
                    <Input
                      id="link-text"
                      value={linkText}
                      onChange={(e) => setLinkText(e.target.value)}
                      placeholder="Klikněte zde"
                    />
                  </div>
                  <div>
                    <Label htmlFor="link-url">URL</Label>
                    <Input
                      id="link-url"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://example.com"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
                      Zrušit
                    </Button>
                    <Button onClick={insertLink} disabled={!linkUrl || !linkText}>
                      Vložit
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Image Button */}
            <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Vložit obrázek">
                  <ImageIcon className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Vložit obrázek</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="image-url">URL obrázku</Label>
                    <Input
                      id="image-url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  <div>
                    <Label htmlFor="image-alt">Alternativní text</Label>
                    <Input
                      id="image-alt"
                      value={imageAlt}
                      onChange={(e) => setImageAlt(e.target.value)}
                      placeholder="Popis obrázku"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowImageDialog(false)}>
                      Zrušit
                    </Button>
                    <Button onClick={insertImage} disabled={!imageUrl}>
                      Vložit
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Other Buttons */}
            {otherButtons.map((button) => (
              <Button
                key={`${button.command}-${button.value}`}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => executeCommand(button.command, button.value)}
                title={button.title}
              >
                <button.icon className="w-4 h-4" />
              </Button>
            ))}

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* History Buttons */}
            {historyButtons.map((button) => (
              <Button
                key={button.command}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => executeCommand(button.command)}
                title={button.title}
              >
                <button.icon className="w-4 h-4" />
              </Button>
            ))}

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Text Color */}
            <input
              type="color"
              className="w-8 h-8 rounded border cursor-pointer"
              onChange={(e) => executeCommand('foreColor', e.target.value)}
              title="Barva textu"
            />

            {/* Background Color */}
            <input
              type="color"
              className="w-8 h-8 rounded border cursor-pointer"
              onChange={(e) => executeCommand('hiliteColor', e.target.value)}
              title="Barva pozadí"
            />
          </div>
        </div>

        {/* Editor */}
        <div
          ref={editorRef}
          contentEditable
          className="min-h-[300px] p-4 focus:outline-none prose max-w-none"
          onInput={handleInput}
          dangerouslySetInnerHTML={{ __html: value }}
          data-placeholder={placeholder}
        />

        <style jsx>{`
          [contenteditable]:empty:before {
            content: attr(data-placeholder);
            color: var(--placeholder-color);
            pointer-events: none;
          }
        `}</style>
      </CardContent>
    </Card>
  );
}
