import { google } from 'googleapis';
import type { slides_v1 } from 'googleapis';
import { config } from '../config.js';
import { fetchPRDContent, fetchFirstImageUrl, type PRDContent } from './confluenceService.js';

// google-auth-library reads GOOGLE_CLOUD_QUOTA_PROJECT and injects x-goog-user-project on every ADC request
process.env.GOOGLE_CLOUD_QUOTA_PROJECT = config.googleQuotaProject || 'google-mpf-pm05ow6g0l2l';

// ── Template & layout IDs ─────────────────────────────────────────────────────
// User's CC deck template: Prisma SD-WAN 7.1 Concept Commit
const TEMPLATE_ID     = '1uTJub_XyWGbM-rhML2TasZoHzGu1wTHHvOpO17Sge_I';
const LAYOUT_TITLE    = 'g2b35f857ef5_0_2242';   // Prisma Title Slide - light
const LAYOUT_BLANK    = 'g2b35f857ef5_0_2419';   // Prisma Blank - light (no placeholder conflicts)

// Slide canvas: 9144000 x 5143500 EMU = 720 x 405 pt (standard 16:9)
const SW = 9144000;
const SH = 5143500;
const M  = 457200;   // 36 pt margin

// ── Colors ────────────────────────────────────────────────────────────────────
function rgb(r: number, g: number, b: number) {
  return { rgbColor: { red: r, green: g, blue: b } };
}

const C = {
  prismaDark:  rgb(0,    0.239, 0.475),   // Prisma brand dark blue #003D79
  tableHeader: rgb(0,    0.239, 0.475),
  rowEven:     rgb(0.937, 0.957, 0.988),
  rowOdd:      rgb(1,    1,     1),
  titleText:   rgb(0.07, 0.07,  0.07),
  bodyText:    rgb(0.25, 0.25,  0.25),
  metaText:    rgb(0.45, 0.45,  0.45),
  white:       rgb(1,    1,     1),
  psBg:        rgb(1.0,  0.92,  0.91),
  psHead:      rgb(0.70, 0.13,  0.08),
  solBg:       rgb(0.86, 0.92,  0.98),
  solHead:     rgb(0.06, 0.24,  0.51),
  benBg:       rgb(0.84, 0.96,  0.87),
  benHead:     rgb(0.06, 0.45,  0.27),
  placeholder: rgb(0.93, 0.93,  0.93),
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function rect(x: number, y: number, w: number, h: number) {
  return {
    size: {
      width:  { magnitude: w, unit: 'EMU' as const },
      height: { magnitude: h, unit: 'EMU' as const },
    },
    transform: { scaleX: 1, scaleY: 1, translateX: x, translateY: y, unit: 'EMU' as const },
  };
}

function cap(text: string, max: number): string {
  if (!text || text.trim() === '') return '—';
  const t = text.trim();
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}

// Convert a Confluence download URL to the server-side proxy URL that the
// Google Slides API can fetch without Confluence credentials.
// Returns null if SERVER_PUBLIC_URL is not configured (e.g. local dev).
function confluenceUrlToProxy(confluenceUrl: string): string | null {
  const publicBase = config.serverPublicUrl;
  if (!publicBase || publicBase.includes('localhost') || publicBase.includes('127.0.0.1')) return null;
  const m = /\/download\/attachments\/(\d+)\/([^?/]+)/.exec(confluenceUrl);
  if (!m) return null;
  const [, pageId, rawFilename] = m;
  const filename = decodeURIComponent(rawFilename);
  return `${publicBase}/api/proxy/confluence-image?pageId=${pageId}&filename=${encodeURIComponent(filename)}`;
}

type SlideRequest = slides_v1.Schema$Request;


function getAuth() {
  const scopes = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/presentations',
  ];
  if (config.googleServiceAccountJson) {
    const credentials = JSON.parse(config.googleServiceAccountJson);
    return new google.auth.GoogleAuth({ credentials, scopes });
  }
  return new google.auth.GoogleAuth({ scopes });
}

// ── Feature data ──────────────────────────────────────────────────────────────
export interface FeatureData {
  title:            string;
  jiraKey:          string;
  pmOwner:          string;
  pillar:           string;
  productComponent: string;
  customerProblem:  string;
  summary:          string;
  businessValue:    string;
  releases:         string[];
  requirementsUrl?: string;
  priority:         number;
}

// ── Title slide ───────────────────────────────────────────────────────────────
function buildTitleSlideRequests(
  slideId: string,
  release: string,
  insertionIndex: number,
): SlideRequest[] {
  const rqs: SlideRequest[] = [
    { createSlide: { objectId: slideId, insertionIndex, slideLayoutReference: { layoutId: LAYOUT_TITLE } } },
  ];

  const titleId = `${slideId}_t`;
  const tX = Math.round(SW * 0.08);
  const tY = Math.round(SH * 0.35);
  const tW = Math.round(SW * 0.84);
  const tH = Math.round(SH * 0.25);

  rqs.push(
    { createShape: { objectId: titleId, shapeType: 'TEXT_BOX', elementProperties: { pageObjectId: slideId, ...rect(tX, tY, tW, tH) } } },
    { insertText: { objectId: titleId, text: `Prisma SD-WAN v${release}\nConcept Commit` } },
    { updateTextStyle: { objectId: titleId, textRange: { type: 'ALL' }, style: { bold: true, fontSize: { magnitude: 36, unit: 'PT' }, foregroundColor: { opaqueColor: C.titleText } }, fields: 'bold,fontSize,foregroundColor' } },
  );

  return rqs;
}

// ── Pillar table slide ────────────────────────────────────────────────────────
// 8 columns matching the CC deck template format
const TABLE_HEADERS = [
  'Rank',
  'Product Category',
  'Feature List',
  'Customer Benefit Summary and Business Justification',
  'PRD Link',
  'Desired Release Date',
  'IT/Hub/SCM Dependencies',
  'Eng\nReviewed',
];
// Column widths (EMU) that sum to SW - 2*M = 8229600
const COL_WIDTHS = [411480, 905256, 1645920, 1975104, 493776, 822960, 1069848, 905256];

function buildPillarTableSlideRequests(
  slideId: string,
  pillar: string,
  features: FeatureData[],
  insertionIndex: number,
): SlideRequest[] {
  const rqs: SlideRequest[] = [];
  const tableId = `${slideId}_tbl`;
  const titleId = `${slideId}_ttl`;

  rqs.push({ createSlide: { objectId: slideId, insertionIndex, slideLayoutReference: { layoutId: LAYOUT_BLANK } } });

  // Slide title
  const titleH = 572000;
  const titleY = Math.round(M * 0.65);
  rqs.push(
    { createShape: { objectId: titleId, shapeType: 'TEXT_BOX', elementProperties: { pageObjectId: slideId, ...rect(M, titleY, SW - 2 * M, titleH) } } },
    { insertText: { objectId: titleId, text: `${pillar}  —  Feature Request Summary` } },
    { updateTextStyle: { objectId: titleId, textRange: { type: 'ALL' }, style: { bold: true, fontSize: { magnitude: 16, unit: 'PT' }, foregroundColor: { opaqueColor: C.prismaDark } }, fields: 'bold,fontSize,foregroundColor' } },
  );

  // Table geometry — height scales to features, capped at slide bottom
  const nRows      = features.length + 1;  // 1 header + N data
  const tableX     = M;
  const tableY     = titleY + titleH + Math.round(M * 0.25);
  const tableW     = SW - 2 * M;
  const tableH     = Math.min(SH - tableY - M, 381000 + features.length * 264000);

  rqs.push({
    createTable: {
      objectId: tableId,
      elementProperties: { pageObjectId: slideId, ...rect(tableX, tableY, tableW, tableH) },
      rows: nRows,
      columns: 8,
    },
  });

  // Set column widths
  for (let c = 0; c < 8; c++) {
    rqs.push({
      updateTableColumnProperties: {
        objectId: tableId,
        columnIndices: [c],
        tableColumnProperties: { columnWidth: { magnitude: COL_WIDTHS[c], unit: 'EMU' } },
        fields: 'columnWidth',
      },
    });
  }

  // Insert header text
  for (let c = 0; c < 8; c++) {
    rqs.push({ insertText: { objectId: tableId, cellLocation: { rowIndex: 0, columnIndex: c }, text: TABLE_HEADERS[c] } });
  }

  // Header row: dark blue background
  rqs.push({
    updateTableCellProperties: {
      objectId: tableId,
      tableRange: { location: { rowIndex: 0, columnIndex: 0 }, rowSpan: 1, columnSpan: 8 },
      tableCellProperties: {
        tableCellBackgroundFill: { solidFill: { color: C.tableHeader } },
        contentAlignment: 'MIDDLE',
      },
      fields: 'tableCellBackgroundFill,contentAlignment',
    },
  });

  // Header text style: white bold per cell (API requires per-cell for text styles)
  for (let c = 0; c < 8; c++) {
    rqs.push({
      updateTextStyle: {
        objectId: tableId,
        cellLocation: { rowIndex: 0, columnIndex: c },
        textRange: { type: 'ALL' },
        style: { bold: true, fontSize: { magnitude: 6.5, unit: 'PT' }, foregroundColor: { opaqueColor: C.white } },
        fields: 'bold,fontSize,foregroundColor',
      },
    });
  }

  // Data rows
  features.forEach((f, i) => {
    const row = i + 1;
    type Cell = { text: string; url?: string };
    const cells: Cell[] = [
      { text: String(i + 1) },
      { text: cap(f.productComponent, 28) },
      { text: cap(f.title, 75) },
      { text: cap(f.businessValue || f.customerProblem, 130) },
      f.requirementsUrl ? { text: 'PRD', url: f.requirementsUrl } : { text: '' },
      { text: f.releases.map(r => `v${r}`).join(', ') },
      { text: '' },  // IT/Hub/SCM — manual
      { text: '' },  // Eng Reviewed — manual
    ];

    for (let c = 0; c < 8; c++) {
      if (cells[c].text) {
        rqs.push({ insertText: { objectId: tableId, cellLocation: { rowIndex: row, columnIndex: c }, text: cells[c].text } });
      }
    }

    // Alternating row background
    rqs.push({
      updateTableCellProperties: {
        objectId: tableId,
        tableRange: { location: { rowIndex: row, columnIndex: 0 }, rowSpan: 1, columnSpan: 8 },
        tableCellProperties: {
          tableCellBackgroundFill: { solidFill: { color: i % 2 === 0 ? C.rowEven : C.rowOdd } },
          contentAlignment: 'MIDDLE',
        },
        fields: 'tableCellBackgroundFill,contentAlignment',
      },
    });

    // Data text style — only on cells that received text (empty cells have no text node)
    for (let c = 0; c < 8; c++) {
      if (cells[c].text) {
        rqs.push({
          updateTextStyle: {
            objectId: tableId,
            cellLocation: { rowIndex: row, columnIndex: c },
            textRange: { type: 'ALL' },
            style: { fontSize: { magnitude: 6.5, unit: 'PT' }, foregroundColor: { opaqueColor: C.bodyText } },
            fields: 'fontSize,foregroundColor',
          },
        });
        // Apply hyperlink for PRD cell
        if (cells[c].url) {
          rqs.push({
            updateTextStyle: {
              objectId: tableId,
              cellLocation: { rowIndex: row, columnIndex: c },
              textRange: { type: 'ALL' },
              style: { link: { url: cells[c].url }, foregroundColor: { opaqueColor: rgb(0.20, 0.40, 0.78) }, underline: true },
              fields: 'link,foregroundColor,underline',
            },
          });
        }
      }
    }
  });

  return rqs;
}

// ── Diagram helper primitives ─────────────────────────────────────────────────
function diagramNode(
  slideId: string, id: string,
  nx: number, ny: number, nw: number, nh: number,
  shape: string, text: string, bg: ReturnType<typeof rgb>, fg: ReturnType<typeof rgb>,
  fsize = 7, bold = true,
): SlideRequest[] {
  return [
    { createShape: { objectId: id, shapeType: shape, elementProperties: { pageObjectId: slideId,
        size: { width: { magnitude: nw, unit: 'EMU' }, height: { magnitude: nh, unit: 'EMU' } },
        transform: { scaleX: 1, scaleY: 1, translateX: nx, translateY: ny, unit: 'EMU' },
    }}},
    { insertText: { objectId: id, text } },
    { updateShapeProperties: { objectId: id, shapeProperties: {
        shapeBackgroundFill: { solidFill: { color: bg } },
        outline: { outlineFill: { solidFill: { color: bg } } },
      }, fields: 'shapeBackgroundFill,outline' }},
    { updateTextStyle: { objectId: id, textRange: { type: 'ALL' },
        style: { bold, fontSize: { magnitude: fsize, unit: 'PT' }, foregroundColor: { opaqueColor: fg } },
        fields: 'bold,fontSize,foregroundColor' }},
    { updateParagraphStyle: { objectId: id, textRange: { type: 'ALL' },
        style: { alignment: 'CENTER', spaceAbove: { magnitude: 2, unit: 'PT' } },
        fields: 'alignment,spaceAbove' }},
  ];
}

function diagramLine(
  slideId: string, id: string,
  lx: number, ly: number, lw: number, lh: number,
): SlideRequest[] {
  return [
    { createShape: { objectId: id, shapeType: 'RECTANGLE', elementProperties: { pageObjectId: slideId,
        size: { width: { magnitude: lw, unit: 'EMU' }, height: { magnitude: lh, unit: 'EMU' } },
        transform: { scaleX: 1, scaleY: 1, translateX: lx, translateY: ly, unit: 'EMU' },
    }}},
    { updateShapeProperties: { objectId: id, shapeProperties: {
        shapeBackgroundFill: { solidFill: { color: rgb(0.60, 0.65, 0.72) } },
        outline: { outlineFill: { solidFill: { color: rgb(0.60, 0.65, 0.72) } } },
      }, fields: 'shapeBackgroundFill,outline' }},
  ];
}

// ── Diagram 1: Segmentation (micro-seg, VRF, proxy ARP, firewall, ACL) ────────
// Internet → ION with Micro-Seg → 3 VRF segments side-by-side
function buildSegmentationDiagram(slideId: string, px: number, py: number, pw: number, ph: number): SlideRequest[] {
  const rqs: SlideRequest[] = [];
  const cx   = px + Math.round(pw / 2);
  const nW   = Math.round(pw * 0.80);
  const nH   = Math.round(ph * 0.14);
  const lW   = Math.round(pw * 0.012);

  const inetY = py + Math.round(ph * 0.03);
  const ionY  = py + Math.round(ph * 0.30);
  const barY  = ionY + nH + Math.round(ph * 0.04);
  const vrfY  = barY + Math.round(ph * 0.06);
  const vrfW  = Math.round(pw * 0.26);
  const vrfH  = Math.round(ph * 0.20);
  const barH  = Math.round(ph * 0.008);

  // Internet → ION vertical line
  const l1y = inetY + nH;
  rqs.push(...diagramNode(slideId, `${slideId}_d0`, cx - Math.round(nW/2), inetY, nW, nH, 'ELLIPSE', 'Internet / WAN', rgb(0.82, 0.88, 0.96), C.bodyText, 7.5));
  rqs.push(...diagramLine(slideId, `${slideId}_d1`, cx - Math.round(lW/2), l1y, lW, ionY - l1y));
  rqs.push(...diagramNode(slideId, `${slideId}_d2`, cx - Math.round(nW/2), ionY, nW, nH, 'ROUND_RECTANGLE', 'ION + Micro-Segmentation', C.prismaDark, C.white, 7));

  // Horizontal connector bar
  rqs.push(...diagramLine(slideId, `${slideId}_d3`, px, barY, pw, barH));

  // 3 VRF boxes
  const vrfGap = Math.round((pw - 3 * vrfW) / 4);
  const vrfs = [
    { id: `${slideId}_v0`, x: px + vrfGap,                       label: 'VRF-CORP', bg: rgb(0.22, 0.52, 0.82) },
    { id: `${slideId}_v1`, x: px + vrfGap * 2 + vrfW,            label: 'VRF-VOICE', bg: rgb(0.13, 0.57, 0.42) },
    { id: `${slideId}_v2`, x: px + vrfGap * 3 + vrfW * 2,        label: 'VRF-GUEST', bg: rgb(0.75, 0.35, 0.12) },
  ];
  for (const v of vrfs) {
    const vcx = v.x + Math.round(vrfW / 2);
    rqs.push(...diagramLine(slideId, `${v.id}_l`, vcx - Math.round(lW/2), barY + barH, lW, vrfY - barY - barH));
    rqs.push(...diagramNode(slideId, v.id, v.x, vrfY, vrfW, vrfH, 'RECTANGLE', v.label, v.bg, C.white, 6.5));
  }

  // Label: "Segment Isolation"
  const lblW = Math.round(nW * 0.9); const lblH = Math.round(ph * 0.07);
  const lblY = vrfY + vrfH + Math.round(ph * 0.02);
  rqs.push(
    { createShape: { objectId: `${slideId}_dlbl`, shapeType: 'TEXT_BOX', elementProperties: { pageObjectId: slideId,
        size: { width: { magnitude: lblW, unit: 'EMU' }, height: { magnitude: lblH, unit: 'EMU' } },
        transform: { scaleX: 1, scaleY: 1, translateX: cx - Math.round(lblW/2), translateY: lblY, unit: 'EMU' },
    }}},
    { insertText: { objectId: `${slideId}_dlbl`, text: 'Traffic isolated per segment' } },
    { updateTextStyle: { objectId: `${slideId}_dlbl`, textRange: { type: 'ALL' },
        style: { italic: true, fontSize: { magnitude: 6, unit: 'PT' }, foregroundColor: { opaqueColor: rgb(0.45, 0.50, 0.58) } },
        fields: 'italic,fontSize,foregroundColor' }},
    { updateParagraphStyle: { objectId: `${slideId}_dlbl`, textRange: { type: 'ALL' },
        style: { alignment: 'CENTER' }, fields: 'alignment' }},
  );
  return rqs;
}

// ── Diagram 2: Multi-branch hub-spoke (routing, BGP, mesh, overlay, WAN) ─────
// Prisma SASE at top, 3 branch ION devices below in fan-out
function buildMultiBranchDiagram(slideId: string, px: number, py: number, pw: number, ph: number): SlideRequest[] {
  const rqs: SlideRequest[] = [];
  const cx  = px + Math.round(pw / 2);
  const nW  = Math.round(pw * 0.80);
  const nH  = Math.round(ph * 0.13);
  const lW  = Math.round(pw * 0.012);

  const saaseY  = py + Math.round(ph * 0.03);
  const barY    = saaseY + nH + Math.round(ph * 0.06);
  const barH    = Math.round(ph * 0.008);
  const branchY = barY + Math.round(ph * 0.06);
  const brW     = Math.round(pw * 0.26);
  const brH     = Math.round(ph * 0.18);
  const lanY    = branchY + brH + Math.round(ph * 0.04);
  const lanH    = Math.round(ph * 0.12);

  rqs.push(...diagramNode(slideId, `${slideId}_d0`, cx - Math.round(nW/2), saaseY, nW, nH, 'ROUND_RECTANGLE', 'Prisma SASE', C.prismaDark, C.white, 7.5));
  rqs.push(...diagramLine(slideId, `${slideId}_d1`, px, barY, pw, barH));

  const branchGap = Math.round((pw - 3 * brW) / 4);
  const branches = [
    { id: `${slideId}_b0`, x: px + branchGap,              label: 'Branch A\nION 1000' },
    { id: `${slideId}_b1`, x: px + branchGap*2 + brW,      label: 'Branch B\nION 1000' },
    { id: `${slideId}_b2`, x: px + branchGap*3 + brW*2,    label: 'Data Center\nION 7000' },
  ];
  for (const b of branches) {
    const bcx = b.x + Math.round(brW / 2);
    rqs.push(...diagramLine(slideId, `${b.id}_l`, bcx - Math.round(lW/2), barY + barH, lW, branchY - barY - barH));
    rqs.push(...diagramNode(slideId, b.id, b.x, branchY, brW, brH, 'RECTANGLE', b.label, rgb(0.12, 0.44, 0.72), C.white, 6));

    // LAN under each branch
    const lanId = `${b.id}_lan`;
    const lanW  = Math.round(brW * 0.78);
    rqs.push(...diagramLine(slideId, `${lanId}_l`, bcx - Math.round(lW/2), branchY + brH, lW, lanY - branchY - brH));
    rqs.push(...diagramNode(slideId, lanId, bcx - Math.round(lanW/2), lanY, lanW, lanH, 'RECTANGLE', 'LAN', rgb(0.90, 0.93, 0.97), C.bodyText, 6, false));
  }

  const lblW = Math.round(nW * 0.9); const lblH = Math.round(ph * 0.07);
  rqs.push(
    { createShape: { objectId: `${slideId}_dlbl`, shapeType: 'TEXT_BOX', elementProperties: { pageObjectId: slideId,
        size: { width: { magnitude: lblW, unit: 'EMU' }, height: { magnitude: lblH, unit: 'EMU' } },
        transform: { scaleX: 1, scaleY: 1, translateX: cx - Math.round(lblW/2), translateY: lanY + lanH + Math.round(ph*0.01), unit: 'EMU' },
    }}},
    { insertText: { objectId: `${slideId}_dlbl`, text: 'SD-WAN Secure Overlay Tunnels' } },
    { updateTextStyle: { objectId: `${slideId}_dlbl`, textRange: { type: 'ALL' },
        style: { italic: true, fontSize: { magnitude: 6, unit: 'PT' }, foregroundColor: { opaqueColor: rgb(0.45, 0.50, 0.58) } },
        fields: 'italic,fontSize,foregroundColor' }},
    { updateParagraphStyle: { objectId: `${slideId}_dlbl`, textRange: { type: 'ALL' },
        style: { alignment: 'CENTER' }, fields: 'alignment' }},
  );
  return rqs;
}

// ── Diagram 3: Cloud/SaaS breakout (DIA, cloud, SaaS, Azure, AWS, GCP) ───────
// Branch → ION with dual path: DIA to SaaS + private to DC
function buildCloudDiagram(slideId: string, px: number, py: number, pw: number, ph: number): SlideRequest[] {
  const rqs: SlideRequest[] = [];
  const cx  = px + Math.round(pw / 2);
  const nW  = Math.round(pw * 0.80);
  const nH  = Math.round(ph * 0.13);
  const lW  = Math.round(pw * 0.012);

  const branchY = py + Math.round(ph * 0.03);
  const ionY    = py + Math.round(ph * 0.27);
  const leftX   = px;
  const rightX  = cx + Math.round(pw * 0.10);
  const halfW   = Math.round(pw * 0.40);
  const rowH    = Math.round(ph * 0.13);
  const row2Y   = ionY + nH + Math.round(ph * 0.14);
  const row3Y   = row2Y + rowH + Math.round(ph * 0.08);

  // Branch at top center
  rqs.push(...diagramNode(slideId, `${slideId}_d0`, cx - Math.round(nW/2), branchY, nW, nH, 'RECTANGLE', 'Branch / Campus', rgb(0.90, 0.93, 0.97), C.bodyText, 7.5));

  // Line to ION
  const l0y = branchY + nH;
  rqs.push(...diagramLine(slideId, `${slideId}_dl0`, cx - Math.round(lW/2), l0y, lW, ionY - l0y));

  // ION center
  rqs.push(...diagramNode(slideId, `${slideId}_d1`, cx - Math.round(nW/2), ionY, nW, nH, 'ROUND_RECTANGLE', 'ION Device', C.prismaDark, C.white, 7.5));

  // Left branch: DIA → SaaS
  const diaX  = leftX;
  const saasY = row2Y;
  rqs.push(
    ...diagramLine(slideId, `${slideId}_dl1`, cx - Math.round(lW/2), ionY + nH, lW, Math.round(ph * 0.06)),
    ...diagramLine(slideId, `${slideId}_dl1h`, diaX, ionY + nH + Math.round(ph * 0.06), cx - diaX, lW),
    ...diagramLine(slideId, `${slideId}_dl1v`, diaX, ionY + nH + Math.round(ph * 0.06), lW, saasY - ionY - nH - Math.round(ph * 0.06)),
  );
  rqs.push(...diagramNode(slideId, `${slideId}_d2`, diaX, saasY, halfW, rowH, 'ELLIPSE', 'Internet / SaaS\n(Direct IA)', rgb(0.06, 0.62, 0.52), C.white, 6.5));

  // Right branch: MPLS → DC
  const mpls2Y = row2Y;
  const dcY    = row3Y;
  rqs.push(
    ...diagramLine(slideId, `${slideId}_dl2h`, cx + Math.round(lW/2), ionY + nH + Math.round(ph * 0.06), rightX - cx, lW),
    ...diagramLine(slideId, `${slideId}_dl2v`, rightX, ionY + nH + Math.round(ph * 0.06), lW, mpls2Y - ionY - nH - Math.round(ph * 0.06)),
    ...diagramNode(slideId, `${slideId}_d3`, rightX, mpls2Y, halfW, rowH, 'RECTANGLE', 'MPLS / Private WAN', rgb(0.80, 0.45, 0.05), C.white, 6.5),
    ...diagramLine(slideId, `${slideId}_dl3`, rightX + Math.round(halfW/2) - Math.round(lW/2), mpls2Y + rowH, lW, dcY - mpls2Y - rowH),
    ...diagramNode(slideId, `${slideId}_d4`, rightX, dcY, halfW, rowH, 'RECTANGLE', 'Data Center', rgb(0.12, 0.44, 0.72), C.white, 6.5),
  );

  return rqs;
}

// ── Diagram 4: Monitoring / Analytics / Ops (AI/ML, visibility, telemetry) ───
// Prisma Analytics platform at top → Telemetry hub → sites sending metrics
function buildMonitoringDiagram(slideId: string, px: number, py: number, pw: number, ph: number): SlideRequest[] {
  const rqs: SlideRequest[] = [];
  const cx  = px + Math.round(pw / 2);
  const nW  = Math.round(pw * 0.80);
  const nH  = Math.round(ph * 0.13);
  const lW  = Math.round(pw * 0.012);

  const analyticsY = py + Math.round(ph * 0.03);
  const hubY       = py + Math.round(ph * 0.32);
  const barY       = hubY + nH + Math.round(ph * 0.05);
  const barH       = Math.round(ph * 0.008);
  const siteY      = barY + Math.round(ph * 0.05);
  const siteW      = Math.round(pw * 0.26);
  const siteH      = Math.round(ph * 0.17);

  rqs.push(...diagramNode(slideId, `${slideId}_d0`, cx - Math.round(nW/2), analyticsY, nW, nH, 'ROUND_RECTANGLE', 'Prisma Analytics\n& AI/ML Engine', C.prismaDark, C.white, 7));

  const l0y = analyticsY + nH;
  rqs.push(...diagramLine(slideId, `${slideId}_dl0`, cx - Math.round(lW/2), l0y, lW, hubY - l0y));
  rqs.push(...diagramNode(slideId, `${slideId}_d1`, cx - Math.round(nW/2), hubY, nW, nH, 'RECTANGLE', 'Telemetry Collector', rgb(0.12, 0.44, 0.72), C.white, 7.5));
  rqs.push(...diagramLine(slideId, `${slideId}_dbar`, px, barY, pw, barH));

  const siteGap = Math.round((pw - 3 * siteW) / 4);
  const sites = [
    { id: `${slideId}_s0`, x: px + siteGap,              label: 'Site Metrics\n& Events' },
    { id: `${slideId}_s1`, x: px + siteGap*2 + siteW,    label: 'Path Quality\n& SLA' },
    { id: `${slideId}_s2`, x: px + siteGap*3 + siteW*2,  label: 'App Performance\n& Alerts' },
  ];
  for (const s of sites) {
    const scx = s.x + Math.round(siteW / 2);
    rqs.push(...diagramLine(slideId, `${s.id}_l`, scx - Math.round(lW/2), barY + barH, lW, siteY - barY - barH));
    rqs.push(...diagramNode(slideId, s.id, s.x, siteY, siteW, siteH, 'ROUND_RECTANGLE', s.label, rgb(0.22, 0.52, 0.82), C.white, 6));
  }

  const lblW = Math.round(nW * 0.9); const lblH = Math.round(ph * 0.07);
  rqs.push(
    { createShape: { objectId: `${slideId}_dlbl`, shapeType: 'TEXT_BOX', elementProperties: { pageObjectId: slideId,
        size: { width: { magnitude: lblW, unit: 'EMU' }, height: { magnitude: lblH, unit: 'EMU' } },
        transform: { scaleX: 1, scaleY: 1, translateX: cx - Math.round(lblW/2), translateY: siteY + siteH + Math.round(ph*0.01), unit: 'EMU' },
    }}},
    { insertText: { objectId: `${slideId}_dlbl`, text: 'Real-time telemetry across all sites' } },
    { updateTextStyle: { objectId: `${slideId}_dlbl`, textRange: { type: 'ALL' },
        style: { italic: true, fontSize: { magnitude: 6, unit: 'PT' }, foregroundColor: { opaqueColor: rgb(0.45, 0.50, 0.58) } },
        fields: 'italic,fontSize,foregroundColor' }},
    { updateParagraphStyle: { objectId: `${slideId}_dlbl`, textRange: { type: 'ALL' },
        style: { alignment: 'CENTER' }, fields: 'alignment' }},
  );
  return rqs;
}

// ── Diagram 5: Default SD-WAN topology (Internet → Prisma Access → ION → Branch) ─
function buildDefaultDiagram(slideId: string, px: number, py: number, pw: number, ph: number): SlideRequest[] {
  const rqs: SlideRequest[] = [];
  const cx    = px + Math.round(pw / 2);
  const nodeW = Math.round(pw * 0.72);
  const nodeH = Math.round(ph * 0.13);
  const lineW = Math.round(pw * 0.012);

  const inetY = py + Math.round(ph * 0.06);
  const paY   = py + Math.round(ph * 0.34);
  const ionY  = py + Math.round(ph * 0.62);
  const lanY  = py + Math.round(ph * 0.82);

  const nLeft = cx - Math.round(nodeW / 2);

  rqs.push(...diagramNode(slideId, `${slideId}_dn0`, nLeft, inetY, nodeW, nodeH, 'ELLIPSE', 'Internet / WAN', rgb(0.82, 0.88, 0.96), C.bodyText, 7.5));
  rqs.push(...diagramLine(slideId, `${slideId}_dl1`, cx - Math.round(lineW/2), inetY + nodeH, lineW, paY - inetY - nodeH));
  rqs.push(...diagramNode(slideId, `${slideId}_dn1`, nLeft, paY, nodeW, nodeH, 'ROUND_RECTANGLE', 'Prisma Access', C.prismaDark, C.white, 7.5));
  rqs.push(...diagramLine(slideId, `${slideId}_dl2`, cx - Math.round(lineW/2), paY + nodeH, lineW, ionY - paY - nodeH));
  rqs.push(...diagramNode(slideId, `${slideId}_dn2`, nLeft, ionY, nodeW, nodeH, 'RECTANGLE', 'ION Device', rgb(0.12, 0.44, 0.72), C.white, 7.5));
  rqs.push(...diagramLine(slideId, `${slideId}_dl3`, cx - Math.round(lineW/2), ionY + nodeH, lineW, lanY - ionY - nodeH));
  rqs.push(...diagramNode(slideId, `${slideId}_dn3`, nLeft, lanY, nodeW, Math.round(nodeH * 0.75), 'RECTANGLE', 'Branch / LAN', rgb(0.90, 0.93, 0.97), C.bodyText, 7));

  const lblW = Math.round(nodeW * 0.88); const lblH = Math.round(ph * 0.06);
  const l2y  = paY + nodeH;
  rqs.push(
    { createShape: { objectId: `${slideId}_dlbl`, shapeType: 'TEXT_BOX', elementProperties: { pageObjectId: slideId,
        size: { width: { magnitude: lblW, unit: 'EMU' }, height: { magnitude: lblH, unit: 'EMU' } },
        transform: { scaleX: 1, scaleY: 1, translateX: cx - Math.round(lblW/2), translateY: l2y + Math.round((ionY - l2y) * 0.25), unit: 'EMU' },
    }}},
    { insertText: { objectId: `${slideId}_dlbl`, text: 'SD-WAN Tunnel' } },
    { updateTextStyle: { objectId: `${slideId}_dlbl`, textRange: { type: 'ALL' },
        style: { italic: true, fontSize: { magnitude: 6, unit: 'PT' }, foregroundColor: { opaqueColor: rgb(0.50, 0.55, 0.62) } },
        fields: 'italic,fontSize,foregroundColor' }},
    { updateParagraphStyle: { objectId: `${slideId}_dlbl`, textRange: { type: 'ALL' },
        style: { alignment: 'CENTER' }, fields: 'alignment' }},
  );
  return rqs;
}

// ── Feature diagram dispatcher ────────────────────────────────────────────────
// Categorises a feature by keywords and routes to the matching diagram builder.
type DiagramType = 'segmentation' | 'multibranch' | 'cloud' | 'monitoring' | 'default';

function categorizeFeature(feature: FeatureData): DiagramType {
  const corpus = `${feature.title} ${feature.pillar} ${feature.productComponent} ${feature.summary}`.toLowerCase();

  const segKeywords  = ['segment', 'micro', 'proxy arp', 'proxyarp', 'vrf', 'zone', 'firewall', 'acl', 'nat', 'qos', 'policy', 'isolat', 'zscaler'];
  const branchKeywords = ['mesh', 'hub', 'spoke', 'bgp', 'routing', 'route', ' wan', 'overlay', 'aggregat', 'prefix', 'topology', 'peer', 'isis', 'ospf'];
  const cloudKeywords  = ['cloud', 'saas', 'azure', ' aws ', ' gcp', 'internet access', 'dia', 'direct access', 'breakout', 'tenant', 'sase'];
  const monitorKeywords = ['monitor', 'visib', 'analytic', 'telemetry', ' ai ', 'machine learning', 'ml ', 'aiot', ' iot', 'alert', 'troubleshoot', 'observ', 'diagnos', 'insight'];

  const match = (kws: string[]) => kws.some(k => corpus.includes(k));

  if (match(segKeywords))   return 'segmentation';
  if (match(cloudKeywords)) return 'cloud';
  if (match(monitorKeywords)) return 'monitoring';
  if (match(branchKeywords)) return 'multibranch';
  return 'default';
}

function buildFeatureDiagram(slideId: string, feature: FeatureData, px: number, py: number, pw: number, ph: number): SlideRequest[] {
  const type = categorizeFeature(feature);
  console.log(`[diagram] ${feature.jiraKey} "${feature.title}" → type=${type}`);
  switch (type) {
    case 'segmentation': return buildSegmentationDiagram(slideId, px, py, pw, ph);
    case 'cloud':        return buildCloudDiagram(slideId, px, py, pw, ph);
    case 'monitoring':   return buildMonitoringDiagram(slideId, px, py, pw, ph);
    case 'multibranch':  return buildMultiBranchDiagram(slideId, px, py, pw, ph);
    default:             return buildDefaultDiagram(slideId, px, py, pw, ph);
  }
}

// Shared slide geometry — used by both the slide builder and the post-build image inserter.
function featureSlideGeometry() {
  const titleY   = Math.round(M * 0.52);
  const titleH   = 609600;
  const contentY = titleY + titleH + Math.round(M * 0.22);
  const contentH = SH - contentY - Math.round(M * 0.80);
  const leftW    = Math.round(SW * 0.560);
  const gapW     = Math.round(M * 0.28);
  const rightX   = M + leftW + gapW;
  const rightW   = SW - rightX - M;
  return { contentY, contentH, rightX, rightW };
}

// ── Feature detail slide ──────────────────────────────────────────────────────
// Layout matches reference slide #60: large title + orange GA badge at top,
// three colored rounded-card sections (Problem Statement / Solution / Benefits)
// on the left, and a network diagram on the right.
function buildFeatureSlideRequests(
  slideId: string,
  feature: FeatureData,
  prd: PRDContent | null,
  insertionIndex: number,
  diagramUrl: string | null = null,
): SlideRequest[] {
  const rqs: SlideRequest[] = [];
  rqs.push({ createSlide: { objectId: slideId, insertionIndex, slideLayoutReference: { layoutId: LAYOUT_BLANK } } });

  // ── Element IDs ────────────────────────────────────────────────────
  const titleId = `${slideId}_ti`;
  const psId     = `${slideId}_ps`;   // Problem Statement card (single ROUND_RECTANGLE)
  const solId    = `${slideId}_so`;   // Solution card
  const benId    = `${slideId}_be`;   // Benefits card
  const psAccId  = `${slideId}_pa`;   // Problem Statement left accent bar
  const solAccId = `${slideId}_sa`;   // Solution left accent bar
  const benAccId = `${slideId}_ba`;   // Benefits left accent bar

  // ── Geometry ───────────────────────────────────────────────────────
  const { contentY, contentH, rightX, rightW } = featureSlideGeometry();

  const titleY = Math.round(M * 0.52);
  const titleH = 609600;   // 48 pt — fits 2-line titles at ~26pt
  const titleW = SW - 2 * M;

  // Left column ~56% (derived from featureSlideGeometry constants, kept for clarity)
  const leftW  = Math.round(SW * 0.560);

  // Three equal cards with small gaps
  const cardGap = Math.round(M * 0.10);
  const cardH   = Math.round((contentH - 2 * cardGap) / 3);
  const psY    = contentY;
  const solY   = psY  + cardH + cardGap;
  const benY   = solY + cardH + cardGap;
  const accentW      = 25400;  // 2pt wide
  const accentInset  = 177800; // 14pt inset from top/bottom so rounded card corners are exposed

  // ── Section card colors (heading accent + light bg) ──────────────
  const psHeadColor  = C.psHead;                         // dark red
  const psBgColor    = rgb(1.0,  0.965, 0.965);          // almost-white pink tint

  const solHeadColor  = C.solHead;                       // dark blue
  const solBgColor   = rgb(0.958, 0.966, 0.996);         // almost-white blue tint

  const benHeadColor  = C.benHead;                       // dark green
  const benBgColor   = rgb(0.958, 0.996, 0.966);         // almost-white green tint

  // ── Content text ───────────────────────────────────────────────────
  // Section text: "Heading\nBody text" — heading styled differently than body
  const psHead  = 'Problem Statement';
  const solHead = 'Solution';
  const benHead = 'Benefits';
  const psText  = cap(prd?.problemStatement || feature.customerProblem, 480);
  const solText = cap(prd?.solution         || feature.summary,         480);
  const benText = cap(prd?.benefits         || feature.businessValue,   480);
  const psFull  = `${psHead}\n${psText}`;
  const solFull = `${solHead}\n${solText}`;
  const benFull = `${benHead}\n${benText}`;

  // ── Create shapes ──────────────────────────────────────────────────
  rqs.push(
    { createShape: { objectId: titleId, shapeType: 'TEXT_BOX', elementProperties: { pageObjectId: slideId, ...rect(M, titleY, titleW, titleH) } } },
    // Section cards (ROUND_RECTANGLE — rounded corners on all sides)
    { createShape: { objectId: psId,     shapeType: 'ROUND_RECTANGLE', elementProperties: { pageObjectId: slideId, ...rect(M,    psY,    leftW,   cardH ) } } },
    { createShape: { objectId: solId,    shapeType: 'ROUND_RECTANGLE', elementProperties: { pageObjectId: slideId, ...rect(M,    solY,   leftW,   cardH ) } } },
    { createShape: { objectId: benId,    shapeType: 'ROUND_RECTANGLE', elementProperties: { pageObjectId: slideId, ...rect(M,    benY,   leftW,   cardH ) } } },
    // Accent bars — inset vertically so the card's rounded corners remain visible
    { createShape: { objectId: psAccId,  shapeType: 'RECTANGLE', elementProperties: { pageObjectId: slideId, ...rect(M, psY  + accentInset, accentW, cardH - 2 * accentInset) } } },
    { createShape: { objectId: solAccId, shapeType: 'RECTANGLE', elementProperties: { pageObjectId: slideId, ...rect(M, solY + accentInset, accentW, cardH - 2 * accentInset) } } },
    { createShape: { objectId: benAccId, shapeType: 'RECTANGLE', elementProperties: { pageObjectId: slideId, ...rect(M, benY + accentInset, accentW, cardH - 2 * accentInset) } } },
  );

  // ── Insert text ────────────────────────────────────────────────────
  rqs.push(
    { insertText: { objectId: titleId, text: feature.title } },
    { insertText: { objectId: psId,    text: psFull        } },
    { insertText: { objectId: solId,   text: solFull       } },
    { insertText: { objectId: benId,   text: benFull       } },
  );

  // ── Card backgrounds + borders ─────────────────────────────────────
  // Section cards: tinted bg, invisible border (bg-matching), text pinned to top
  for (const { id, bg } of [
    { id: psId,  bg: psBgColor  },
    { id: solId, bg: solBgColor },
    { id: benId, bg: benBgColor },
  ]) {
    rqs.push({
      updateShapeProperties: {
        objectId: id,
        shapeProperties: {
          shapeBackgroundFill: { solidFill: { color: bg } },
          outline: { outlineFill: { solidFill: { color: bg } } },
          contentAlignment: 'TOP',
        },
        fields: 'shapeBackgroundFill,outline,contentAlignment',
      },
    });
  }

  // Accent bars: solid colored left-edge strips (no text, no visible border)
  for (const { id, color } of [
    { id: psAccId,  color: C.psHead  },
    { id: solAccId, color: C.solHead },
    { id: benAccId, color: C.benHead },
  ]) {
    rqs.push({
      updateShapeProperties: {
        objectId: id,
        shapeProperties: {
          shapeBackgroundFill: { solidFill: { color } },
          outline: { outlineFill: { solidFill: { color } } },
        },
        fields: 'shapeBackgroundFill,outline',
      },
    });
  }

  // ── Text styles ────────────────────────────────────────────────────
  // Title: large, bold, near-black
  rqs.push({
    updateTextStyle: {
      objectId: titleId, textRange: { type: 'ALL' },
      style: { bold: true, fontSize: { magnitude: 26, unit: 'PT' }, foregroundColor: { opaqueColor: C.titleText } },
      fields: 'bold,fontSize,foregroundColor',
    },
  });

  // Section cards: LEFT alignment + uniform indent for all text.
  // Do NOT set indentFirstLine — the Slides API treats it as an absolute
  // position for line 1 (separate from indentStart), which creates a hanging
  // indent where wrapped lines appear further right than the first line.
  // Omitting it lets indentStart govern all lines equally.
  for (const id of [psId, solId, benId]) {
    rqs.push({
      updateParagraphStyle: {
        objectId: id, textRange: { type: 'ALL' },
        style: {
          alignment:   'JUSTIFIED',
          indentStart: { magnitude: 0, unit: 'PT' },
          indentEnd:   { magnitude: 0, unit: 'PT' },
          spaceAbove:  { magnitude: 0, unit: 'PT' },
        },
        fields: 'alignment,indentStart,indentEnd,spaceAbove',
      },
    });
  }

  // Section headings: colored, bold, larger — applied by character range
  for (const { id, heading, headColor } of [
    { id: psId,  heading: psHead,  headColor: psHeadColor  },
    { id: solId, heading: solHead, headColor: solHeadColor },
    { id: benId, heading: benHead, headColor: benHeadColor },
  ]) {
    const hl = heading.length;
    rqs.push(
      {
        updateTextStyle: {
          objectId: id, textRange: { type: 'FIXED_RANGE', startIndex: 0, endIndex: hl },
          style: { bold: true, fontSize: { magnitude: 10, unit: 'PT' }, foregroundColor: { opaqueColor: headColor } },
          fields: 'bold,fontSize,foregroundColor',
        },
      },
      {
        // Body text (after heading + single newline)
        updateTextStyle: {
          objectId: id, textRange: { type: 'FROM_START_INDEX', startIndex: hl + 1 },
          style: { bold: false, fontSize: { magnitude: 8, unit: 'PT' }, foregroundColor: { opaqueColor: C.bodyText } },
          fields: 'bold,fontSize,foregroundColor',
        },
      },
      {
        // Heading: top padding + minimal space below (no blank line gap)
        updateParagraphStyle: {
          objectId: id, textRange: { type: 'FIXED_RANGE', startIndex: 0, endIndex: hl },
          style: { spaceBelow: { magnitude: 2, unit: 'PT' }, spaceAbove: { magnitude: 6, unit: 'PT' } },
          fields: 'spaceBelow,spaceAbove',
        },
      },
      {
        updateParagraphStyle: {
          objectId: id, textRange: { type: 'FROM_START_INDEX', startIndex: hl + 1 },
          style: { lineSpacing: 118, spaceAbove: { magnitude: 0, unit: 'PT' } },
          fields: 'lineSpacing,spaceAbove',
        },
      },
    );
  }

  // ── Right-side: PRD image inserted post-batch, empty if none ────────
  // No shape diagram generated. If a diagramUrl exists it is added as a
  // separate createImage call after the main batch so failures don't block
  // the deck. If no image was found, the right panel stays empty.

  // PRD link: small text box below title (if PRD URL exists)
  if (feature.requirementsUrl) {
    const prdLinkId = `${slideId}_pr`;
    const prdLinkH  = 209550;   // ~16.5pt
    const prdLinkY  = titleY + titleH + Math.round(M * 0.04);
    const prdLabel  = `${feature.jiraKey}  ·  View PRD →`;
    rqs.push(
      { createShape: { objectId: prdLinkId, shapeType: 'TEXT_BOX',
          elementProperties: { pageObjectId: slideId, ...rect(M, prdLinkY, titleW, prdLinkH) } } },
      { insertText: { objectId: prdLinkId, text: prdLabel } },
      { updateTextStyle: { objectId: prdLinkId, textRange: { type: 'ALL' },
          style: { fontSize: { magnitude: 7.5, unit: 'PT' }, foregroundColor: { opaqueColor: C.metaText } },
          fields: 'fontSize,foregroundColor' } },
      { updateTextStyle: { objectId: prdLinkId,
          textRange: { type: 'FROM_START_INDEX', startIndex: feature.jiraKey.length + 5 },
          style: {
            link: { url: feature.requirementsUrl },
            foregroundColor: { opaqueColor: rgb(0.06, 0.24, 0.51) },
            underline: true,
          },
          fields: 'link,foregroundColor,underline' } },
    );
  }

  return rqs;
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function generateCCDeck(
  release: string,
  features: FeatureData[],
): Promise<{ url: string; title: string }> {
  const auth  = getAuth();
  const drive  = google.drive({ version: 'v3', auth });
  const slides = google.slides({ version: 'v1', auth });

  const date     = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const deckTitle = `Prisma SD-WAN v${release} Concept Commit - ${date}`;

  // 1. Copy the CC deck template
  const copyRes = await drive.files.copy({
    fileId: TEMPLATE_ID,
    requestBody: { name: deckTitle },
    fields: 'id,webViewLink',
    supportsAllDrives: true,
  });
  const newId = copyRes.data.id!;
  const url   = copyRes.data.webViewLink!;

  // 2. Fetch PRD content and first diagram image for all features in parallel
  const [prdResults, imageResults] = await Promise.all([
    Promise.all(features.map(f => fetchPRDContent(f.requirementsUrl ?? '').catch(() => null))),
    Promise.all(features.map(f => fetchFirstImageUrl(f.requirementsUrl ?? '').catch(() => null))),
  ]);

  // Convert Confluence image URLs to server proxy URLs (accessible to Slides API)
  const diagramUrls = imageResults.map(url => (url ? confluenceUrlToProxy(url) : null));
  console.log(`[slides] diagram URLs: ${diagramUrls.map((u, i) => `${features[i].jiraKey}=${u ? 'proxy' : 'shape'}`).join(', ')}`);

  // 3. Get existing template slide IDs to delete
  const presRes = await slides.presentations.get({ presentationId: newId });
  const existingSlideIds = (presRes.data.slides ?? []).map(s => s.objectId!);

  // 4. Build all batch requests
  const allRequests: SlideRequest[] = [];
  const imageJobs: { slideId: string; diagramUrl: string }[] = [];

  // Delete all template slides
  for (const sid of existingSlideIds) {
    allRequests.push({ deleteObject: { objectId: sid } });
  }

  // Title slide at index 0
  const titleSlideId = 'slide_title_0';
  allRequests.push(...buildTitleSlideRequests(titleSlideId, release, 0));

  // Group features by pillar (in original order)
  const pillarOrder: string[] = [];
  const byPillar = new Map<string, FeatureData[]>();
  for (const f of features) {
    if (!byPillar.has(f.pillar)) {
      byPillar.set(f.pillar, []);
      pillarOrder.push(f.pillar);
    }
    byPillar.get(f.pillar)!.push(f);
  }

  // Build feature index map for PRD / diagram lookup
  const featureIndex = new Map(features.map((f, i) => [f.jiraKey, i]));

  let slideIndex = 1;  // next insertionIndex

  for (const pillar of pillarOrder) {
    const pillarFeatures = byPillar.get(pillar)!;

    // Pillar table slide
    const tableSlideId = `slide_table_${slideIndex}`;
    allRequests.push(...buildPillarTableSlideRequests(tableSlideId, pillar, pillarFeatures, slideIndex));
    slideIndex++;

    // Per-feature detail slides
    for (const f of pillarFeatures) {
      const idx = featureIndex.get(f.jiraKey) ?? -1;
      const featureSlideId = `slide_feat_${slideIndex}`;
      const prd        = prdResults[idx]  ?? null;
      const diagramUrl = diagramUrls[idx] ?? null;
      allRequests.push(...buildFeatureSlideRequests(featureSlideId, f, prd, slideIndex, diagramUrl));
      if (diagramUrl) imageJobs.push({ slideId: featureSlideId, diagramUrl });
      slideIndex++;
    }
  }

  // 5. Execute main batch (slides + text + shapes — no createImage)
  await slides.presentations.batchUpdate({
    presentationId: newId,
    requestBody: { requests: allRequests },
  });

  // 6. Insert PRD images — each as a separate batch call so one failure
  //    never kills the rest. Placeholder is deleted before inserting image.
  if (imageJobs.length > 0) {
    const { contentY, contentH, rightX, rightW } = featureSlideGeometry();
    for (const job of imageJobs) {
      try {
        await slides.presentations.batchUpdate({
          presentationId: newId,
          requestBody: {
            requests: [
              {
                createImage: {
                  objectId: `${job.slideId}_img`,
                  url: job.diagramUrl,
                  elementProperties: {
                    pageObjectId: job.slideId,
                    size: {
                      width:  { magnitude: rightW, unit: 'EMU' },
                      height: { magnitude: contentH, unit: 'EMU' },
                    },
                    transform: { scaleX: 1, scaleY: 1, translateX: rightX, translateY: contentY, unit: 'EMU' },
                  },
                },
              },
            ],
          },
        });
        console.log(`[slides] image inserted for ${job.slideId}`);
      } catch (e) {
        console.warn(`[slides] image insert failed for ${job.slideId} (proxy unreachable?), placeholder kept`);
      }
    }
  }

  return { url, title: deckTitle };
}
