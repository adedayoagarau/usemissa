'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface EmailTemplateDefinition {
  key: string;
  label: string;
  category: string;
  subject: string;
  html: string;
  text: string;
  description: string;
}

export function EmailPreviewStudioClient({
  templates,
  adminEmail,
}: {
  templates: EmailTemplateDefinition[];
  adminEmail: string;
}) {
  const [selectedKey, setSelectedKey] = useState(templates[0]?.key || '');
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [format, setFormat] = useState<'html' | 'text'>('html');
  const [testEmail, setTestEmail] = useState(adminEmail);
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSending, startSending] = useTransition();

  const currentTemplate = templates.find((t) => t.key === selectedKey) || templates[0];

  const handleSendTest = () => {
    if (!testEmail || !testEmail.includes('@') || !currentTemplate) return;

    setTestStatus(null);
    startSending(async () => {
      try {
        const response = await fetch('/api/admin/email-previews/send-test', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            templateKey: currentTemplate.key,
            recipientEmail: testEmail.trim(),
          }),
        });

        const body = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (response.ok && body.ok) {
          setTestStatus({
            type: 'success',
            message: `Test email dispatched to ${testEmail}!`,
          });
        } else {
          setTestStatus({
            type: 'error',
            message: body.error || 'Failed to dispatch test email.',
          });
        }
      } catch {
        setTestStatus({
          type: 'error',
          message: 'Network error occurred while sending test email.',
        });
      }
    });
  };

  if (!currentTemplate) {
    return <div className="p-8 text-center text-muted-foreground">No email templates available.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card">
        {/* Template Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="template-selector" className="text-xs font-medium text-muted-foreground">
            Template:
          </label>
          <select
            id="template-selector"
            value={selectedKey}
            onChange={(e) => {
              setSelectedKey(e.target.value);
              setTestStatus(null);
            }}
            className="h-9 rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary"
          >
            {templates.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label} ({t.category})
              </option>
            ))}
          </select>
        </div>

        {/* Device & Format Toggles */}
        <div className="flex items-center gap-3">
          {/* Device Toggle */}
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => setDevice('desktop')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                device === 'desktop'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Desktop (600px)
            </button>
            <button
              type="button"
              onClick={() => setDevice('mobile')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                device === 'mobile'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Mobile (390px)
            </button>
          </div>

          {/* Format Toggle */}
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => setFormat('html')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                format === 'html'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              HTML
            </button>
            <button
              type="button"
              onClick={() => setFormat('text')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                format === 'text'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Plain text
            </button>
          </div>
        </div>
      </div>

      {/* Template Metadata & Subject */}
      <div className="p-4 rounded-xl border border-border bg-card flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium">
              {currentTemplate.key}
            </span>
            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
              {currentTemplate.category}
            </span>
          </div>
          <p className="text-sm font-medium text-foreground">
            Subject: <span className="font-normal text-muted-foreground">{currentTemplate.subject}</span>
          </p>
          <p className="text-xs text-muted-foreground">{currentTemplate.description}</p>
        </div>

        {/* Send Test Email Action */}
        <div className="flex items-center gap-2">
          <Input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="test@example.com"
            className="h-9 w-52 text-xs"
          />
          <Button
            type="button"
            size="sm"
            onClick={handleSendTest}
            disabled={isSending || !testEmail}
            className="h-9 text-xs"
          >
            {isSending ? 'Sending…' : 'Send test'}
          </Button>
        </div>
      </div>

      {testStatus && (
        <div
          className={`p-3 text-xs rounded-lg border ${
            testStatus.type === 'success'
              ? 'bg-primary/10 border-primary/20 text-primary'
              : 'bg-destructive/10 border-destructive/20 text-destructive'
          }`}
        >
          {testStatus.message}
        </div>
      )}

      {/* Frame Container */}
      <div className="flex justify-center p-6 bg-muted/20 border border-border rounded-xl min-h-[680px]">
        {format === 'html' ? (
          <div
            className="transition-all duration-200 bg-white border border-border rounded-lg shadow-sm overflow-hidden"
            style={{ width: device === 'mobile' ? '390px' : '640px' }}
          >
            <iframe
              title={`Preview of ${currentTemplate.label}`}
              srcDoc={currentTemplate.html}
              className="w-full h-[760px] border-0"
              sandbox="allow-same-origin"
            />
          </div>
        ) : (
          <div
            className="transition-all duration-200 bg-background border border-border rounded-lg p-6 font-mono text-xs text-foreground whitespace-pre-wrap leading-relaxed shadow-sm overflow-y-auto max-h-[760px]"
            style={{ width: device === 'mobile' ? '390px' : '640px' }}
          >
            {currentTemplate.text}
          </div>
        )}
      </div>
    </div>
  );
}
