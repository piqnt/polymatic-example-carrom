/*
 * Copyright (c) Ali Shakiba
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { G, POCKETS, type CoinColor } from "./Config";
import { type MainContext } from "./Context";
import { type Piece } from "./Piece";

// Geometry the rules, the computer, the input and the view share.

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** the y of a player's striker line */
export const baseY = (turn: number) => (turn === 0 ? G.BY : -G.BY);

/** straight up the board for the bottom player, down for the top one */
export const homeAngle = (turn: number) => (turn === 0 ? -Math.PI / 2 : Math.PI / 2);

export const coinsOnBoard = (ctx: MainContext) => ctx.pieces.filter((p) => p.onBoard);

export const remaining = (ctx: MainContext, kind: CoinColor) =>
  ctx.pieces.filter((p) => p.kind === kind && p.onBoard).length;

export const isCpuTurn = (ctx: MainContext) => ctx.mode === "cpu" && ctx.turn === 1;

export function overlaps(ctx: MainContext, x: number, y: number, r: number, ignore?: Piece) {
  for (const p of ctx.pieces) {
    if (!p.onBoard || p === ignore) continue;
    const rr = r + G.RC + 0.004;
    if ((p.x - x) ** 2 + (p.y - y) ** 2 < rr * rr) return true;
  }
  return false;
}

export function strikerValid(ctx: MainContext) {
  const s = ctx.striker;
  return !overlaps(ctx, s.x, s.y, G.RS, s);
}

/** nearest free spot to the centre, used when coins come back to the board */
function freeSpot(ctx: MainContext) {
  for (let rad = 0; rad < 3; rad += 0.04) {
    const n = rad === 0 ? 1 : Math.ceil((2 * Math.PI * rad) / 0.05);
    const start = Math.random() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const a = start + (i / n) * Math.PI * 2;
      const x = rad * Math.cos(a),
        y = rad * Math.sin(a);
      if (!overlaps(ctx, x, y, G.RC)) return { x, y };
    }
  }
  return { x: 0, y: 0 };
}

export function returnToCentre(ctx: MainContext, piece: Piece) {
  const spot = freeSpot(ctx);
  piece.x = spot.x;
  piece.y = spot.y;
  piece.onBoard = true;
}

/** the pocket a point is over, if any: a piece falls when its centre is over a hole */
export function pocketUnder(x: number, y: number) {
  for (const [px, py] of POCKETS) {
    if ((x - px) ** 2 + (y - py) ** 2 < G.PR * G.PR) return { x: px, y: py };
  }
  return null;
}

/** distance from a point to a segment */
export function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax,
    dy = by - ay;
  const len2 = dx * dx + dy * dy || 1e-9;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1);
  return Math.hypot(ax + t * dx - px, ay + t * dy - py);
}

/** Sweep the striker along the aim and find what it touches first: a piece, or the frame. */
export function predict(ctx: MainContext): { t: number; hit: Piece | null } {
  const s = ctx.striker,
    a = ctx.aim.angle;
  const dx = Math.cos(a),
    dy = Math.sin(a);
  let best = Infinity,
    hit: Piece | null = null;
  for (const p of ctx.pieces) {
    if (!p.onBoard) continue;
    const r = G.RS + G.RC;
    const fx = s.x - p.x,
      fy = s.y - p.y;
    const b = fx * dx + fy * dy,
      c = fx * fx + fy * fy - r * r;
    const disc = b * b - c;
    if (disc < 0) continue;
    const t = -b - Math.sqrt(disc);
    if (t > 0.001 && t < best) {
      best = t;
      hit = p;
    }
  }
  const lim = G.H - G.RS;
  const tx = dx > 0 ? (lim - s.x) / dx : dx < 0 ? (-lim - s.x) / dx : Infinity;
  const ty = dy > 0 ? (lim - s.y) / dy : dy < 0 ? (-lim - s.y) / dy : Infinity;
  const tw = Math.min(tx, ty);
  if (tw < best) return { t: tw, hit: null };
  return { t: best, hit };
}
