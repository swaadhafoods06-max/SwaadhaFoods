import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import type { Order } from './admin';

// Standard PDF fonts only cover Latin-1, so swap out characters they can't draw.
const safe = (text: string) =>
  text
    .replace(/₹/g, 'Rs. ')
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, '?');

const rupees = (n: number) => 'Rs. ' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const day = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

const W = 595.28,
  H = 841.89,
  M = 40,
  CW = W - M * 2;
const C = {
  burgundy: rgb(0.494, 0.055, 0.082),
  red: rgb(0.784, 0.125, 0.165),
  gold: rgb(0.722, 0.529, 0.173),
  goldSoft: rgb(0.965, 0.89, 0.651),
  cream: rgb(0.98, 0.945, 0.871),
  ivory: rgb(1, 0.984, 0.949),
  line: rgb(0.9, 0.85, 0.75),
  ink: rgb(0.165, 0.024, 0.027),
  muted: rgb(0.45, 0.38, 0.36),
  white: rgb(1, 1, 1),
  green: rgb(0.122, 0.42, 0.227),
  greenSoft: rgb(0.91, 0.965, 0.925),
};

const PAYMENT = {
  paid: { label: 'PAID', color: C.green, fill: C.greenSoft },
  rejected: { label: 'PAYMENT REJECTED', color: C.red, fill: rgb(0.988, 0.945, 0.937) },
  unpaid: { label: 'PAYMENT PENDING', color: C.gold, fill: rgb(0.992, 0.965, 0.89) },
} as const;

export async function invoiceBytes(order: Order, logo?: Uint8Array) {
  const doc = await PDFDocument.create();
  doc.setTitle(`Swaadha invoice ${order.invoice_number || order.id}`);
  doc.setAuthor('Swaadha');
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const logoImage = logo ? await doc.embedPng(logo).catch(() => null) : null;

  let page: PDFPage = doc.addPage([W, H]);
  let y = 0;

  const text = (value: string, x: number, top: number, size = 10, font: PDFFont = normal, color = C.ink) =>
    page.drawText(safe(value), { x, y: top, size, font, color });
  const right = (value: string, x: number, top: number, size = 10, font: PDFFont = normal, color = C.ink) =>
    text(value, x - font.widthOfTextAtSize(safe(value), size), top, size, font, color);
  // Rounded rectangle; (x, top) is the top-left corner.
  const box = (x: number, top: number, w: number, h: number, r: number, fill: ReturnType<typeof rgb>, border?: ReturnType<typeof rgb>) =>
    page.drawSvgPath(
      `M ${r} 0 H ${w - r} A ${r} ${r} 0 0 1 ${w} ${r} V ${h - r} A ${r} ${r} 0 0 1 ${w - r} ${h} H ${r} A ${r} ${r} 0 0 1 0 ${h - r} V ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`,
      { x, y: top, color: fill, borderColor: border, borderWidth: border ? 0.8 : 0 }
    );
  const wrap = (value: string, width: number, size = 10, font: PDFFont = normal) => {
    const lines: string[] = [];
    for (const paragraph of safe(value).split('\n')) {
      let row = '';
      for (const word of paragraph.split(' ')) {
        const next = row ? row + ' ' + word : word;
        if (font.widthOfTextAtSize(next, size) <= width) {
          row = next;
          continue;
        }
        if (row) lines.push(row);
        row = '';
        for (const char of word) {
          if (font.widthOfTextAtSize(row + char, size) > width) {
            lines.push(row);
            row = '';
          }
          row += char;
        }
      }
      lines.push(row);
    }
    return lines;
  };

  const reference = order.invoice_number || 'SW-' + order.id.replace(/-/g, '').toUpperCase();
  const orderNo = '#' + order.id.slice(0, 8).toUpperCase();
  const status = PAYMENT[(order.payment_status as keyof typeof PAYMENT) in PAYMENT ? (order.payment_status as keyof typeof PAYMENT) : 'unpaid'];
  const method = order.payment_method === 'COD' || !order.payment_method ? 'UPI / QR' : order.payment_method;

  // ---------- Header band ----------
  function header(first: boolean) {
    const bandH = first ? 118 : 70;
    page.drawRectangle({ x: 0, y: H - bandH, width: W, height: bandH, color: C.cream });
    page.drawRectangle({ x: 0, y: H - bandH - 4, width: W, height: 4, color: C.gold });
    const top = H - bandH / 2;
    if (logoImage) {
      const h = first ? 74 : 40;
      const w = (logoImage.width / logoImage.height) * h;
      page.drawImage(logoImage, { x: M, y: top - h / 2, width: w, height: h });
    } else {
      text('Swaadha', M, top - 10, first ? 30 : 20, bold, C.burgundy);
    }
    if (first) {
      right('INVOICE', W - M, H - 52, 28, bold, C.burgundy);
      right(reference, W - M, H - 70, 9, bold, C.gold);
      right('Issued ' + day(order.created_at), W - M, H - 84, 9, normal, C.muted);
    } else {
      right('INVOICE  ·  ' + reference, W - M, top - 4, 10, bold, C.burgundy);
    }
    y = H - bandH - 30;
  }
  header(true);

  // ---------- Billed to / Deliver to / Order details ----------
  const colW = (CW - 24) / 3;
  const columns: { label: string; rows: { value: string; font?: PDFFont; color?: ReturnType<typeof rgb>; size?: number }[] }[] = [
    {
      label: 'BILLED TO',
      rows: [
        { value: order.customer_name, font: bold, size: 11 },
        { value: 'Phone: ' + order.phone },
        ...(order.alt_phone ? [{ value: 'Alt. phone: ' + order.alt_phone }] : []),
        ...(order.email ? [{ value: order.email, color: C.muted }] : []),
      ],
    },
    {
      label: 'DELIVER TO',
      rows: [{ value: order.address }, { value: [order.city, order.state, order.pincode].filter(Boolean).join(', ') }],
    },
    {
      label: 'ORDER DETAILS',
      rows: [
        { value: 'Order ' + orderNo, font: bold, size: 11 },
        { value: 'Placed ' + day(order.created_at) },
        { value: 'Payment: ' + method },
      ],
    },
  ];
  const laidOut = columns.map((col) =>
    col.rows.flatMap((r) => wrap(r.value, colW - 28, r.size ?? 9.5, r.font ?? normal).map((line) => ({ ...r, value: line })))
  );
  const cardH = Math.max(...laidOut.map((rows) => rows.length)) * 14 + 46 + 22; // +22 leaves room for the payment pill
  columns.forEach((col, i) => {
    const x = M + i * (colW + 12);
    box(x, y, colW, cardH, 10, C.ivory, C.line);
    text(col.label, x + 14, y - 22, 8, bold, C.gold);
    page.drawRectangle({ x: x + 14, y: y - 31, width: 18, height: 2, color: C.gold });
    laidOut[i].forEach((r, j) => text(r.value, x + 14, y - 50 - j * 14, r.size ?? 9.5, r.font ?? normal, r.color ?? C.ink));
  });
  // Payment status pill in the order details card
  {
    const x = M + 2 * (colW + 12) + 14;
    const pillW = bold.widthOfTextAtSize(status.label, 8) + 20;
    const top = y - 50 - laidOut[2].length * 14 + 4;
    box(x, top, pillW, 17, 8.5, status.fill, status.color);
    text(status.label, x + 10, top - 12, 8, bold, status.color);
  }
  y -= cardH + 28;

  // ---------- Items table ----------
  const cols = { no: M + 14, item: M + 40, qty: M + 330, price: M + 420, amount: W - M - 14 };
  function tableHeader() {
    box(M, y, CW, 28, 8, C.burgundy);
    const t = y - 18;
    text('#', cols.no, t, 8.5, bold, C.goldSoft);
    text('ITEM', cols.item, t, 8.5, bold, C.goldSoft);
    right('QTY', cols.qty, t, 8.5, bold, C.goldSoft);
    right('PRICE', cols.price, t, 8.5, bold, C.goldSoft);
    right('AMOUNT', cols.amount, t, 8.5, bold, C.goldSoft);
    y -= 32;
  }
  function newPage() {
    page = doc.addPage([W, H]);
    header(false);
    tableHeader();
  }
  tableHeader();

  const FOOTER_SPACE = 80;
  order.items.forEach((item, i) => {
    const nameLines = wrap(item.name, cols.qty - cols.item - 60, 10, bold);
    const rowH = nameLines.length * 13 + (item.weight ? 13 : 0) + 16;
    if (y - rowH < FOOTER_SPACE) newPage();
    if (i % 2 === 0) page.drawRectangle({ x: M, y: y - rowH, width: CW, height: rowH, color: C.ivory });
    const t = y - 18;
    text(String(i + 1).padStart(2, '0'), cols.no, t, 9, bold, C.gold);
    nameLines.forEach((line, j) => text(line, cols.item, t - j * 13, 10, bold));
    if (item.weight) text(item.weight, cols.item, t - nameLines.length * 13, 8.5, normal, C.muted);
    right(String(item.quantity), cols.qty, t, 10);
    right(rupees(item.price), cols.price, t, 10, normal, C.muted);
    right(rupees(Number(item.price) * item.quantity), cols.amount, t, 10, bold);
    y -= rowH;
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.6, color: C.line });
  });

  // ---------- Totals + payment note ----------
  const subtotal = order.items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  const totals: [string, string, ReturnType<typeof rgb>?][] = [['Subtotal', rupees(subtotal)]];
  if (order.coupon_code && order.discount) totals.push([`Coupon (${order.coupon_code})`, '- ' + rupees(order.discount), C.red]);
  totals.push(['Shipping', 'Paid at delivery', C.muted]);
  const totalsH = totals.length * 20 + 56;
  if (y - totalsH - 20 < FOOTER_SPACE) {
    page = doc.addPage([W, H]);
    header(false);
  }
  y -= 22;
  const tx = W - M - 230;
  totals.forEach(([label, value, color], i) => {
    const t = y - 12 - i * 20;
    text(label, tx + 12, t, 9.5, normal, C.muted);
    right(value, W - M - 12, t, 9.5, normal, color ?? C.ink);
  });
  const barTop = y - totals.length * 20 - 6;
  box(tx, barTop, 230, 40, 10, C.burgundy);
  text('TOTAL', tx + 14, barTop - 25, 10, bold, C.goldSoft);
  right(rupees(order.total), W - M - 14, barTop - 26, 15, bold, C.white);

  // Left: payment status and thanks
  const noteW = tx - M - 24;
  box(M, y, noteW, totalsH - 10, 10, status.fill, status.color);
  text(status.label, M + 14, y - 22, 11, bold, status.color);
  wrap(
    status === PAYMENT.paid
      ? `Your ${method} payment has been verified by our kitchen. Thank you!`
      : `Payment by ${method}. Our kitchen confirms each payment manually against the payment received.`,
    noteW - 28,
    8.5
  ).forEach((line, i) => text(line, M + 14, y - 38 - i * 12, 8.5, normal, C.ink));
  y -= totalsH + 18;

  // ---------- Thank you + terms ----------
  const terms = wrap(
    'Shipping charges, if applicable, are paid at delivery and arranged with the kitchen. This is an order invoice, not a GST tax invoice. Freshly prepared in small batches with natural ingredients and no preservatives.',
    CW,
    8
  );
  if (y - 38 - terms.length * 11 < 64) {
    page = doc.addPage([W, H]);
    header(false);
  }
  text('Thank you for choosing Swaadha!', M, y, 13, bold, C.burgundy);
  text('Taste that feels like home.', M, y - 16, 9, normal, C.gold);
  terms.forEach((line, i) => text(line, M, y - 38 - i * 11, 8, normal, C.muted));

  // ---------- Footer on every page ----------
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    page = p;
    page.drawLine({ start: { x: M, y: 52 }, end: { x: W - M, y: 52 }, thickness: 0.8, color: C.gold });
    text('Swaadha  ·  +91 82962 95658  ·  Bangalore, India', M, 34, 8, normal, C.muted);
    right(`Page ${i + 1} of ${pages.length}`, W - M, 34, 8, normal, C.muted);
  });

  return await doc.save();
}

export async function downloadInvoice(order: Order) {
  const response = await fetch('/logo.png');
  const bytes = await invoiceBytes(order, response.ok ? new Uint8Array(await response.arrayBuffer()) : undefined);
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `invoice-${order.invoice_number || order.id}.pdf`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
