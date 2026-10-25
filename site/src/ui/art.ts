import type { ArtId } from '../shop/catalogue.ts';

/**
 * Original inline SVG product art (R-12). Simple shapes only, built with
 * createElementNS; no raster images and no external SVG. The product name is
 * always shown as text beside the art, so the SVG is aria-hidden.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const STROKE = '#3b4a6b';
const FILL = '#f2e9e4';
const ACCENT = '#b5482f';
const DETAIL = '#8a91a5';

function el(name: string, attrs: Record<string, string>): SVGElement {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, value);
  }
  return node;
}

function newSvg(label?: string): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 64 64');
  svg.setAttribute('aria-hidden', 'true');
  if (label !== undefined) {
    const title = el('title', {});
    title.textContent = label;
    svg.append(title);
  }
  return svg;
}

function drawMug(svg: SVGSVGElement): void {
  svg.append(
    el('path', {
      d: 'M26 17c-3-3 3-4 1-7',
      fill: 'none',
      stroke: STROKE,
      'stroke-width': '2.5',
      'stroke-linecap': 'round',
    }),
    el('path', {
      d: 'M36 17c-3-3 3-4 1-7',
      fill: 'none',
      stroke: STROKE,
      'stroke-width': '2.5',
      'stroke-linecap': 'round',
    }),
    el('path', {
      d: 'M48 30h3a6 6 0 0 1 0 12h-3',
      fill: 'none',
      stroke: STROKE,
      'stroke-width': '3',
    }),
    el('rect', {
      x: '16',
      y: '24',
      width: '32',
      height: '24',
      rx: '4',
      fill: FILL,
      stroke: STROKE,
      'stroke-width': '3',
    }),
  );
}

function drawNotebook(svg: SVGSVGElement): void {
  svg.append(
    el('rect', {
      x: '18',
      y: '12',
      width: '28',
      height: '40',
      rx: '3',
      fill: FILL,
      stroke: STROKE,
      'stroke-width': '3',
    }),
    el('circle', { cx: '23', cy: '18', r: '2', fill: STROKE }),
    el('circle', { cx: '23', cy: '32', r: '2', fill: STROKE }),
    el('circle', { cx: '23', cy: '46', r: '2', fill: STROKE }),
    el('path', {
      d: 'M29 22h10M29 30h10M29 38h10',
      fill: 'none',
      stroke: DETAIL,
      'stroke-width': '2',
      'stroke-linecap': 'round',
    }),
  );
}

function drawCandle(svg: SVGSVGElement): void {
  svg.append(
    el('path', { d: 'M32 30V24', stroke: STROKE, 'stroke-width': '2' }),
    el('ellipse', { cx: '32', cy: '19', rx: '4', ry: '6', fill: ACCENT }),
    el('ellipse', { cx: '32', cy: '21', rx: '1.6', ry: '2.8', fill: '#f6d88a' }),
    el('rect', {
      x: '27',
      y: '30',
      width: '10',
      height: '22',
      fill: FILL,
      stroke: STROKE,
      'stroke-width': '3',
    }),
  );
}

function drawTote(svg: SVGSVGElement): void {
  svg.append(
    el('path', {
      d: 'M22 24c0-9 4-12 10-12s10 3 10 12',
      fill: 'none',
      stroke: STROKE,
      'stroke-width': '3',
    }),
    el('path', {
      d: 'M14 24h36l-3 28H17z',
      fill: FILL,
      stroke: STROKE,
      'stroke-width': '3',
    }),
  );
}

export function renderArt(id: ArtId, label?: string): SVGSVGElement {
  const svg = newSvg(label);
  switch (id) {
    case 'mug':
      drawMug(svg);
      break;
    case 'notebook':
      drawNotebook(svg);
      break;
    case 'candle':
      drawCandle(svg);
      break;
    case 'tote':
      drawTote(svg);
      break;
  }
  return svg;
}
