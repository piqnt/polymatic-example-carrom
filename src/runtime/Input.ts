/*
 * Copyright (c) Ali Shakiba
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Middleware } from "polymatic";

import { type MainContext, G, clamp, isMyTurn, strikerValid } from "../model";
import { Shoot } from "./events";

type Point = { x: number; y: number };

type Drag =
  // pressed on the striker, not yet moved far enough to tell a slide from a pull
  | { mode: "undecided"; start: Point; offset: number }
  | { mode: "move"; start: Point; offset: number }
  | { mode: "aim"; anchor: Point; valid?: boolean };

/**
 * The player's input. Pointer: drag the striker along the line to place it, or
 * pull back anywhere and let go to shoot. Keyboard: arrows place and aim, plus
 * and minus set the power, space shoots.
 */
export class Input extends Middleware<MainContext> {
  svg: SVGSVGElement;
  drag: Drag | null = null;

  constructor(svg: SVGSVGElement) {
    super();
    this.svg = svg;
    this.on("activate", this.handleActivate);
    this.on("deactivate", this.handleDeactivate);
  }

  handleActivate = () => {
    this.svg.addEventListener("pointerdown", this.handlePointerDown);
    this.svg.addEventListener("pointermove", this.handlePointerMove);
    this.svg.addEventListener("pointerup", this.handlePointerUp);
    this.svg.addEventListener("pointercancel", this.handlePointerCancel);
    window.addEventListener("keydown", this.handleKeyDown);
  };

  handleDeactivate = () => {
    this.svg.removeEventListener("pointerdown", this.handlePointerDown);
    this.svg.removeEventListener("pointermove", this.handlePointerMove);
    this.svg.removeEventListener("pointerup", this.handlePointerUp);
    this.svg.removeEventListener("pointercancel", this.handlePointerCancel);
    window.removeEventListener("keydown", this.handleKeyDown);
  };

  toBoard(e: PointerEvent): Point {
    const pt = this.svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const m = this.svg.getScreenCTM();
    const p = m ? pt.matrixTransform(m.inverse()) : pt;
    return { x: p.x, y: p.y };
  }

  canAct() {
    const ctx = this.context;
    return ctx && ctx.phase === "place" && isMyTurn(ctx) && !ctx.hud.helpOpen.value;
  }

  /** aim away from where the pointer is pulled back to, harder the further */
  setAimFrom(anchor: Point, p: Point) {
    const ctx = this.context;
    const vx = anchor.x - p.x,
      vy = anchor.y - p.y;
    const len = Math.hypot(vx, vy);
    ctx.aiming = len >= 0.12;
    if (!ctx.aiming) return false;
    ctx.aim.angle = Math.atan2(vy, vx);
    ctx.aim.power = clamp(len / 2.4, 0.02, 1);
    return true;
  }

  handlePointerDown = (e: PointerEvent) => {
    if (!this.canAct()) return;
    const s = this.context.striker;
    const p = this.toBoard(e);
    this.svg.setPointerCapture(e.pointerId);
    e.preventDefault();
    if (Math.hypot(p.x - s.x, p.y - s.y) < G.RS * 2.2) this.drag = { mode: "undecided", start: p, offset: s.x - p.x };
    else this.drag = { mode: "aim", anchor: p };
  };

  handlePointerMove = (e: PointerEvent) => {
    if (!this.drag || !this.canAct()) return;
    const s = this.context.striker;
    const p = this.toBoard(e);
    let d = this.drag;
    if (d.mode === "undecided") {
      const mx = p.x - d.start.x,
        my = p.y - d.start.y;
      if (Math.hypot(mx, my) < 0.12) return;
      // sideways slides the striker, anything else pulls back from it
      d = this.drag =
        Math.abs(mx) > Math.abs(my) ? { ...d, mode: "move" } : { mode: "aim", anchor: { x: s.x, y: s.y } };
    }
    if (d.mode === "move") {
      s.x = clamp(p.x + d.offset, -G.BX, G.BX);
      this.context.aiming = false;
    } else if (d.mode === "aim") d.valid = this.setAimFrom(d.anchor, p);
  };

  handlePointerUp = () => {
    const d = this.drag;
    this.drag = null;
    if (d && d.mode === "aim" && d.valid && this.canAct()) this.shoot();
    else this.context.aiming = false;
  };

  handlePointerCancel = () => {
    this.drag = null;
    this.context.aiming = false;
  };

  handleKeyDown = (e: KeyboardEvent) => {
    if (!this.canAct()) return;
    // keys on the hud's buttons are theirs
    if (e.target instanceof Element && e.target.closest("button, input, [role=dialog]")) return;
    const ctx = this.context,
      big = e.shiftKey;
    const k = e.key;
    if (k === "ArrowLeft" || k === "ArrowRight") {
      const dir = k === "ArrowLeft" ? -1 : 1;
      ctx.striker.x = clamp(ctx.striker.x + dir * (big ? 0.2 : 0.04), -G.BX, G.BX);
      ctx.aiming = false;
    } else if (k === "ArrowUp" || k === "ArrowDown") {
      // up turns the aim anticlockwise on screen
      const dir = k === "ArrowUp" ? -1 : 1;
      ctx.aim.angle += dir * (big ? 5 : 1) * (Math.PI / 180);
      ctx.aiming = true;
    } else if (k === "+" || k === "=") {
      ctx.aim.power = clamp(ctx.aim.power + 0.05, 0.02, 1);
      ctx.aiming = true;
    } else if (k === "-" || k === "_") {
      ctx.aim.power = clamp(ctx.aim.power - 0.05, 0.02, 1);
      ctx.aiming = true;
    } else if (k === " " || k === "Enter") {
      this.shoot();
    } else return;
    e.preventDefault();
  };

  shoot() {
    const ctx = this.context;
    if (!strikerValid(ctx)) {
      ctx.message = "The striker is touching a coin. Slide it along the line first.";
      return;
    }
    this.emit(Shoot, { angle: ctx.aim.angle, power: ctx.aim.power });
  }
}
