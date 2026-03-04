import { Injectable, Logger, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.config';
import { ContractBlockDto } from './dto';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  constructor(@Inject(SUPABASE_CLIENT) private supabase: SupabaseClient) {}

  async generateForContract(
    contractId: string,
    blocks: ContractBlockDto[],
    resolvedVariables: Record<string, string>,
    contractName?: string,
  ): Promise<string> {
    try {
      const html = this.buildHtml(blocks, resolvedVariables, contractName);

      // Dynamic import to avoid issues when puppeteer isn't installed
      const puppeteer = await import('puppeteer');
      const browser = await puppeteer.default.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true,
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
      });
      await browser.close();

      const storagePath = `contracts/${contractId}/contract.pdf`;
      const { error } = await this.supabase.storage
        .from('contracts')
        .upload(storagePath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (error) {
        this.logger.error(`Failed to upload PDF for contract ${contractId}: ${error.message}`);
        throw new Error(`PDF upload failed: ${error.message}`);
      }

      this.logger.log(`PDF generated and stored at ${storagePath}`);
      return storagePath;
    } catch (err) {
      this.logger.error(`PDF generation failed for contract ${contractId}`, err);
      throw err;
    }
  }

  async getSignedUrl(storagePath: string, expiresInSeconds = 3600): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from('contracts')
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      throw new Error(`Failed to create signed URL: ${error?.message ?? 'unknown error'}`);
    }
    return data.signedUrl;
  }

  private replaceVariables(
    content: string,
    resolvedVariables: Record<string, string>,
  ): string {
    return content.replace(/\{\{(\w+)\}\}/g, (match, token) => {
      return resolvedVariables[token] ?? match;
    });
  }

  private buildHtml(
    blocks: ContractBlockDto[],
    resolvedVariables: Record<string, string>,
    contractName?: string,
  ): string {
    const bodyHtml = blocks
      .map((block) => {
        const content = this.replaceVariables(block.content || '', resolvedVariables);
        const escaped = this.escapeHtml(content);

        switch (block.type) {
          case 'heading':
            return `<h2 class="section-heading">${escaped}</h2>`;
          case 'clause': {
            const titleContent = block.title ? this.replaceVariables(block.title, resolvedVariables) : '';
            const escapedTitle = titleContent ? this.escapeHtml(titleContent) : '';
            const cBold = block.metadata?.bold ? 'font-weight: bold;' : '';
            const cItalic = block.metadata?.italic ? 'font-style: italic;' : '';
            const cStyle = cBold || cItalic ? ` style="${cBold}${cItalic}"` : '';
            let html = '';
            if (escapedTitle) html += `<h2 class="section-heading">${escapedTitle}</h2>`;
            if (escaped) html += `<p class="body-text"${cStyle}>${escaped.replace(/\n/g, '<br/>')}</p>`;
            return html;
          }
          case 'paragraph':
            const bold = block.metadata?.bold ? 'font-weight: bold;' : '';
            const italic = block.metadata?.italic ? 'font-style: italic;' : '';
            const style = bold || italic ? ` style="${bold}${italic}"` : '';
            return `<p class="body-text"${style}>${escaped.replace(/\n/g, '<br/>')}</p>`;
          case 'divider':
            return `<hr class="divider"/>`;
          default:
            return `<p class="body-text">${escaped}</p>`;
        }
      })
      .join('\n');

    const title = contractName ?? 'Employment Agreement';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${this.escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.6;
      color: #1a1a1a;
      background: #ffffff;
    }
    .header {
      border-bottom: 2px solid #1a1a1a;
      padding-bottom: 12px;
      margin-bottom: 24px;
    }
    .header-brand {
      font-size: 18pt;
      font-weight: 700;
      color: #1a1a1a;
      letter-spacing: -0.5px;
    }
    .header-subtitle {
      font-size: 8pt;
      color: #666;
      margin-top: 2px;
    }
    .doc-title {
      text-align: center;
      font-size: 16pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }
    .doc-subtitle {
      text-align: center;
      font-size: 9pt;
      color: #888;
      margin-bottom: 32px;
    }
    .section-heading {
      font-size: 11pt;
      font-weight: 700;
      margin-top: 20px;
      margin-bottom: 8px;
      color: #1a1a1a;
    }
    .body-text {
      margin-bottom: 12px;
      text-align: justify;
    }
    .divider {
      border: none;
      border-top: 1px solid #ddd;
      margin: 20px 0;
    }
    .signature-section {
      margin-top: 48px;
      page-break-inside: avoid;
    }
    .signature-row {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
    }
    .signature-block {
      width: 45%;
    }
    .signature-line {
      border-bottom: 1px solid #1a1a1a;
      margin-bottom: 6px;
      height: 32px;
    }
    .signature-label {
      font-size: 8pt;
      color: #666;
    }
    .footer {
      position: fixed;
      bottom: 10mm;
      left: 20mm;
      right: 20mm;
      font-size: 7pt;
      color: #aaa;
      text-align: center;
      border-top: 1px solid #eee;
      padding-top: 4px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-brand">CrewLink</div>
    <div class="header-subtitle">Workforce Management Platform</div>
  </div>

  <div class="doc-title">${this.escapeHtml(title)}</div>
  <div class="doc-subtitle">Generated by CrewLink on ${new Date().toLocaleDateString('en-NZ', { year: 'numeric', month: 'long', day: 'numeric' })}</div>

  ${bodyHtml}

  <div class="signature-section">
    <h2 class="section-heading">Signatures</h2>
    <div class="signature-row">
      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-label">Organisation Representative — Signature</div>
      </div>
      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-label">Worker — Electronic Signature (Click-to-Sign)</div>
      </div>
    </div>
    <div class="signature-row">
      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-label">Name &amp; Date</div>
      </div>
      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-label">Name &amp; Date</div>
      </div>
    </div>
  </div>

  <div class="footer">
    This document was generated electronically by CrewLink. Electronic signatures are legally valid under applicable e-signature legislation.
  </div>
</body>
</html>`;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
