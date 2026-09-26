/*
 * Copyright (c) Ali Shakiba
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Middleware } from "polymatic";

import {
  type MainContext,
  G,
  POCKETS,
  COLORS,
  DECEL,
  MAX_SPEED,
  MIN_SPEED,
  baseY,
  clamp,
  coinsOnBoard,
  isCpuTurn,
  overlaps,
  remaining,
  segDist,
} from "../model";
import { FrameUpdate, type FrameLoopEvent } from "./FrameLoop";
import { NewBoard, Shoot, TurnStart } from "./events";

interface Plan {
  x: number;
  angle: number;
  power: number;
  /** seconds since the turn started */
  t: number;
  x0: number;
  a0: number;
  p0: number;
}

const smooth = (u: number) => {
  u = clamp(u, 0, 1);
  return u * u * (3 - 2 * u);
};

/**
 * The computer player, black. On its turn it picks a shot, then slides the
 * striker and swings the aim over to it where you can see, and shoots.
 */
export class Computer extends Middleware<MainContext> {
  plan: Plan | null = null;

  constructor() {
    super();
    this.on(NewBoard, this.handleNewBoard);
    this.on(TurnStart, this.handleTurnStart);
    this.on(FrameUpdate, this.handleFrameUpdate);
  }

  handleNewBoard = () => {
    this.plan = null;
  };

  handleTurnStart = () => {
    const ctx = this.context;
    this.plan = isCpuTurn(ctx)
      ? { ...this.think(ctx), t: 0, x0: ctx.striker.x, a0: ctx.aim.angle, p0: ctx.aim.power }
      : null;
  };

  handleFrameUpdate = (ev: FrameLoopEvent) => {
    const ctx = this.context,
      plan = this.plan;
    if (!plan) return;
    if (!isCpuTurn(ctx) || ctx.phase !== "place") {
      this.plan = null;
      return;
    }
    plan.t += ev.dt / 1000;
    const u1 = smooth((plan.t - 0.35) / 0.6),
      u2 = smooth((plan.t - 0.9) / 0.6);
    ctx.striker.x = plan.x0 + (plan.x - plan.x0) * u1;
    let da = plan.angle - plan.a0;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    ctx.aim.angle = plan.a0 + da * u2;
    // slides the striker first, then shows its aim as it swings it round
    ctx.aiming = u2 > 0;
    ctx.aim.power = plan.p0 + (plan.power - plan.p0) * u2;
    if (plan.t > 1.9) {
      this.plan = null;
      ctx.striker.x = plan.x;
      this.emit(Shoot, { angle: plan.angle, power: plan.power });
    }
  };

  /**
   * Try every spot on the line against every own coin and pocket, keep the
   * clear cut shots, and pick the straightest and shortest. Breaks hard, and
   * when nothing is clear, knocks the nearest own coin loose.
   */
  think(ctx: MainContext): { x: number; angle: number; power: number } {
    const y = baseY(1),
      own = COLORS[1];
    const pieces = coinsOnBoard(ctx);
    if (ctx.shotsThisBoard === 0) {
      return { x: (Math.random() - 0.5) * 0.3, angle: Math.PI / 2 + (Math.random() - 0.5) * 0.03, power: 1 };
    }
    const targets = pieces.filter((p) => p.kind === own || (p.kind === "queen" && remaining(ctx, own) > 1));
    let best: { score: number; x: number; gx: number; gy: number; vLen: number; cpLen: number; cos: number } | null =
      null;
    for (let i = 0; i <= 30; i++) {
      const x = -G.BX + (2 * G.BX * i) / 30;
      if (overlaps(ctx, x, y, G.RS)) continue;
      for (const c of targets) {
        for (const [px, py] of POCKETS) {
          const cpx = px - c.x,
            cpy = py - c.y;
          const cpLen = Math.hypot(cpx, cpy);
          const ux = cpx / cpLen,
            uy = cpy / cpLen;
          // where the striker has to be when it touches the coin
          const gx = c.x - ux * (G.RC + G.RS),
            gy = c.y - uy * (G.RC + G.RS);
          if (Math.abs(gx) > G.H - G.RS || Math.abs(gy) > G.H - G.RS) continue;
          const vx = gx - x,
            vy = gy - y;
          const vLen = Math.hypot(vx, vy);
          if (vLen < 0.05) continue;
          const cos = (vx * ux + vy * uy) / vLen;
          if (cos < 0.3) continue;
          let clear = true;
          for (const o of pieces) {
            if (o === c) continue;
            if (segDist(o.x, o.y, x, y, gx, gy) < G.RS + G.RC + 0.01) {
              clear = false;
              break;
            }
            if (segDist(o.x, o.y, c.x, c.y, px, py) < 2 * G.RC + 0.01) {
              clear = false;
              break;
            }
          }
          if (!clear) continue;
          const score = (cos * cos * (c.kind === "queen" ? 1.15 : 1)) / (1 + 0.12 * (vLen + cpLen));
          if (!best || score > best.score) best = { score, x, gx, gy, vLen, cpLen, cos };
        }
      }
    }
    if (!best) {
      const c = targets.sort((a, b) => Math.abs(a.y - y) - Math.abs(b.y - y))[0] || pieces[0];
      const x = clamp(c ? c.x : 0, -G.BX, G.BX);
      const ok = !overlaps(ctx, x, y, G.RS) ? x : 0;
      const angle = c ? Math.atan2(c.y - y, c.x - ok) : Math.PI / 2;
      return { x: ok, angle, power: 0.65 };
    }
    // enough speed for the coin to reach the pocket, then for the striker to deliver it
    const need = Math.sqrt(2 * DECEL * best.cpLen) * 1.25 + 1.2;
    const atImpact = need / (1.4 * best.cos);
    const v0 = Math.sqrt(atImpact * atImpact + 2 * DECEL * best.vLen) * 1.12;
    const power = clamp((v0 - MIN_SPEED) / (MAX_SPEED - MIN_SPEED), 0.12, 1);
    const angle = Math.atan2(best.gy - y, best.gx - best.x) + (Math.random() - 0.5) * 0.06;
    return { x: best.x, angle, power };
  }
}
