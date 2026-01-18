/* eslint-disable @typescript-eslint/no-explicit-any */
import { chromePath } from "../config/config";
import { production } from "../constant/constant";

// Use require to mirror existing PDFGenaretor pattern and avoid ESM interop issues
// eslint-disable-next-line @typescript-eslint/no-var-requires
const puppeteer = production ? require("puppeteer-core") : require("puppeteer");

export interface InvoiceItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  amount?: number;
}

export interface GenerateInvoiceOptions {
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate?: Date;
  currency?: string; // e.g., USD
  company: {
    name: string;
    email?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  billTo: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    company?: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  tax?: number; // absolute value
  discount?: number; // absolute value
  total: number;
  notes?: string;
}

function fmtCurrency(value: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

function escapeHtml(str?: string) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHtml(opts: GenerateInvoiceOptions) {
  const c = opts.currency || "USD";
  const addressLines: string[] = [];
  if (opts.company.addressLine1) addressLines.push(escapeHtml(opts.company.addressLine1));
  if (opts.company.addressLine2) addressLines.push(escapeHtml(opts.company.addressLine2));
  const cityLine = [opts.company.city, opts.company.state, opts.company.zip].filter(Boolean).join(", ");
  if (cityLine) addressLines.push(escapeHtml(cityLine));
  const companyAddress = addressLines.join("<br/>");

  const todayStr = opts.invoiceDate.toLocaleDateString();
  //const dueStr = opts.dueDate ? opts.dueDate.toLocaleDateString() : "Due on receipt";

  const itemsRows = opts.items
    .map((it) => {
      const qty = it.quantity ?? 1;
      const unit = it.unitPrice ?? (typeof it.amount === "number" ? it.amount : 0);
      const amount = typeof it.amount === "number" ? it.amount : qty * unit;
      return `
        <tr>
          <td class="desc">${escapeHtml(it.description)}</td>
          <td class="num">${qty}</td>
          <td class="num">${fmtCurrency(unit, c)}</td>
          <td class="num">${fmtCurrency(amount, c)}</td>
        </tr>
      `;
    })
    .join("");

  return `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1"/>
      <style>
        :root {
          --primary: #1f2937;
          --accent: #2563eb;
          --muted: #6b7280;
          --border: #e5e7eb;
          --bg: #ffffff;
        }
        * { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", Arial, sans-serif; margin: 0; padding: 24px; color: var(--primary); background: var(--bg); }
        .container { max-width: 850px; margin: 0 auto; background: white; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
        header { display: flex; justify-content: space-between; align-items: center; padding: 24px; border-bottom: 1px solid var(--border); }
        .brand { font-size: 22px; font-weight: 700; color: var(--accent); }
        .meta { text-align: right; }
        .meta div { font-size: 12px; color: var(--muted); }
        h1 { font-size: 28px; margin: 0; }
        .section { padding: 20px 24px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .card { border: 1px solid var(--border); border-radius: 8px; padding: 16px; }
        .label { font-size: 12px; color: var(--muted); letter-spacing: .04em; text-transform: uppercase; margin-bottom: 6px; }
        .value { font-size: 14px; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { padding: 12px; border-bottom: 1px solid var(--border); font-size: 13px; }
        th { text-align: left; color: var(--muted); font-weight: 600; letter-spacing: .03em; }
        td.num, th.num { text-align: right; }
        td.desc { width: 100%; }
        .totals { margin-top: 12px; width: 350px; margin-left: auto; }
        .totals .row { display: flex; justify-content: space-between; padding: 8px 0; }
        .totals .row.total { border-top: 2px solid var(--border); margin-top: 6px; padding-top: 12px; font-weight: 700; }
        footer { padding: 20px 24px; border-top: 1px solid var(--border); font-size: 12px; color: var(--muted); }
        .badge { display:inline-block; background: #EEF2FF; color:#3730A3; padding: 2px 8px; border-radius: 999px; font-size: 12px; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="container">
        <header>
          <div>
            <div class="brand">${escapeHtml(opts.company.name)}</div>
            ${companyAddress ? `<div style="margin-top:6px; color: var(--muted); font-size: 12px;">${companyAddress}</div>` : ""}
            ${opts.company.email ? `<div style="color: var(--muted); font-size: 12px;">${escapeHtml(opts.company.email)}</div>` : ""}
            ${opts.company.phone ? `<div style="color: var(--muted); font-size: 12px;">${escapeHtml(opts.company.phone)}</div>` : ""}
          </div>
          <div class="meta">
            <h1>Invoice</h1>
            <div>Invoice #: <strong>${escapeHtml(opts.invoiceNumber)}</strong></div>
            <div>Date: <strong>${escapeHtml(todayStr)}</strong></div>
          </div>
        </header>

        <div class="section grid">
          <div class="card">
            <div class="label">Bill To</div>
            <div class="value">${escapeHtml(opts.billTo.name)}</div>
            ${opts.billTo.company ? `<div>${escapeHtml(opts.billTo.company)}</div>` : ""}
            ${opts.billTo.address ? `<div>${escapeHtml(opts.billTo.address)}</div>` : ""}
            ${opts.billTo.email ? `<div style="color: var(--muted);">${escapeHtml(opts.billTo.email)}</div>` : ""}
            ${opts.billTo.phone ? `<div style="color: var(--muted);">${escapeHtml(opts.billTo.phone)}</div>` : ""}
          </div>
          <div class="card">
            <div class="label">Status</div>
            <span class="badge">Paid</span>
            ${opts.notes ? `<div style="margin-top: 10px; font-size: 12px; color: var(--muted);">${escapeHtml(opts.notes)}</div>` : ""}
          </div>
        </div>

        <div class="section">
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="num">Qty</th>
                <th class="num">Unit Price</th>
                <th class="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div class="totals">
            <div class="row"><span>Subtotal</span><span>${fmtCurrency(opts.subtotal, c)}</span></div>
            ${typeof opts.tax === 'number' ? `<div class="row"><span>Tax</span><span>${fmtCurrency(opts.tax, c)}</span></div>` : ''}
            ${typeof opts.discount === 'number' ? `<div class="row"><span>Discount</span><span>- ${fmtCurrency(opts.discount, c)}</span></div>` : ''}
            <div class="row total"><span>Total</span><span>${fmtCurrency(opts.total, c)}</span></div>
          </div>
        </div>

        <footer>
          Thank you for your business. Please remit payment by the due date. If you have any questions about this invoice, contact us at ${escapeHtml(opts.company.email || '')}.
        </footer>
      </div>
    </body>
  </html>`;
}

export async function generateInvoicePdfBuffer(opts: GenerateInvoiceOptions): Promise<{ buffer: Buffer; filename: string }> {
  const html = buildHtml(opts);

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: production ? chromePath : undefined,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.goto("about:blank", { waitUntil: "domcontentloaded" });
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 60000 });
    await page.evaluateHandle("document.fonts.ready");

    const pdf: Buffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" },
    });

    const filename = `Invoice-${opts.invoiceNumber}.pdf`;
    return { buffer: pdf, filename };
  } finally {
    await browser.close();
  }
}

export default {
  generateInvoicePdfBuffer,
};
