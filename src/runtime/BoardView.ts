/*
 * Copyright (c) Ali Shakiba
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Binder, Driver, Middleware } from "polymatic";

import { type MainContext, type Piece, G, VIEWBOX, baseY, pocketUnder, predict, strikerValid } from "../model";
import { FrameRender } from "./FrameLoop";

import boardSvg from "../../media/board.svg?raw";
import piecesSvg from "../../media/pieces.svg?raw";

const SVGNS = "http://www.w3.org/2000/svg";

// media/board.svg is this many units either side of the board's centre
const BOARD_HALF = G.F + 0.4;

/** how long a piece takes to slide into a pocket, in ms */
const FALL_TIME = 280;

function el(name: string, attrs: Record<string, string | number>, parent?: Element) {
  const n = document.createElementNS(SVGNS, name);
  for (const k in attrs) n.setAttribute(k, String(attrs[k]));
  if (parent) parent.appendChild(n);
  return n;
}

function parseSvg(text: string) {
  return document.importNode(new DOMParser().parseFromString(text, "image/svg+xml").documentElement, true);
}

/**
 * Draws the board, the pieces and the aim into the page's svg. The board and
 * the pieces are drawn in media/; each piece on the board is a <use> of its
 * definition there, kept by a binder, and slides into the pocket as it leaves.
 *
 * The svg's viewBox is the whole screen box (model/Config), so the board sits
 * between the hud's two bands.
 */
export class BoardView extends Middleware<MainContext> {
  svg: SVGSVGElement;
  turnMark: SVGElement;
  aimLayer: SVGElement;
  aimLine: SVGElement;
  ghost: SVGElement;
  carry: SVGElement;
  power: SVGElement;
  piecesLayer: SVGElement;

  constructor(svg: SVGSVGElement) {
    super();
    this.svg = svg;
    this.on("activate", this.handleActivate);
    this.on("deactivate", this.handleDeactivate);
    this.on(FrameRender, this.handleFrameRender);
  }

  handleActivate = () => {
    const svg = this.svg;
    svg.setAttribute("viewBox", `${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.width} ${VIEWBOX.height}`);

    const board = parseSvg(boardSvg);
    board.setAttribute("x", String(-BOARD_HALF));
    board.setAttribute("y", String(-BOARD_HALF));
    board.setAttribute("width", String(2 * BOARD_HALF));
    board.setAttribute("height", String(2 * BOARD_HALF));
    svg.appendChild(board);

    // the pieces' definitions, for the <use>s below
    const defs = el("defs", {}, svg);
    defs.append(...parseSvg(piecesSvg).querySelector("defs").children);

    // marigold band showing whose line is live
    this.turnMark = el("g", {}, svg);
    el(
      "rect",
      {
        x: -G.BX - 0.25,
        y: -G.RC - 0.06,
        width: 2 * G.BX + 0.5,
        height: 2 * G.RC + 0.12,
        rx: G.RC + 0.06,
        fill: "rgba(242,177,52,0.22)",
        stroke: "rgba(242,177,52,0.7)",
        "stroke-width": 0.015,
      },
      this.turnMark,
    );

    this.aimLayer = el("g", { "pointer-events": "none", fill: "none", "stroke-linecap": "round" }, svg);
    this.aimLine = el(
      "line",
      { stroke: "rgba(34,26,20,0.55)", "stroke-width": 0.022, "stroke-dasharray": "0.08 0.06" },
      this.aimLayer,
    );
    this.ghost = el(
      "circle",
      { r: G.RS, stroke: "rgba(34,26,20,0.5)", "stroke-width": 0.018, "stroke-dasharray": "0.05 0.04" },
      this.aimLayer,
    );
    this.carry = el("line", { stroke: "rgba(34,26,20,0.45)", "stroke-width": 0.018 }, this.aimLayer);
    this.power = el("path", { stroke: "#f2b134", "stroke-width": 0.05 }, this.aimLayer);

    this.piecesLayer = el("g", { "pointer-events": "none" }, svg);
  };

  handleDeactivate = () => {
    this.binder.setData([]);
    this.svg.textContent = "";
  };

  handleFrameRender = () => {
    const ctx = this.context;
    this.binder.setData([...ctx.pieces, ctx.striker].filter((piece) => piece.onBoard));
    this.drawAim(ctx);
    this.turnMark.setAttribute("transform", `translate(0 ${baseY(ctx.turn)})`);
    this.turnMark.setAttribute("opacity", ctx.phase === "over" ? "0" : "1");
  };

  pieceDriver = Driver.create<Piece, SVGElement>({
    filter: () => true,
    enter: () => el("use", {}, this.piecesLayer),
    update: (piece, use) => {
      use.setAttribute("href", `#${this.spriteOf(piece)}`);
      use.setAttribute("transform", `translate(${piece.x.toFixed(4)} ${piece.y.toFixed(4)})`);
    },
    exit: (piece, use) => {
      // off the board into a pocket: slide to its centre, shrinking and fading, then go.
      // Anything else, like the striker between boards, just goes.
      const pocket = pocketUnder(piece.x, piece.y);
      if (!pocket) return use.remove();
      const fall = use.animate(
        [
          { transform: `translate(${piece.x}px, ${piece.y}px)`, opacity: 1 },
          { transform: `translate(${pocket.x}px, ${pocket.y}px) scale(0.55)`, opacity: 0 },
        ],
        { duration: FALL_TIME, fill: "forwards" },
      );
      fall.onfinish = () => use.remove();
    },
  });

  binder = Binder.create<Piece>({
    key: (piece) => piece.id,
    drivers: [this.pieceDriver],
  });

  /** the striker has a red rim while it sits on a coin and can't be shot */
  spriteOf(piece: Piece) {
    const ctx = this.context;
    if (piece.kind === "striker" && ctx.phase === "place" && !strikerValid(ctx)) return "blocked";
    return piece.kind;
  }

  /** the aim line to the first thing the striker would touch, where that piece would go, and the power arc */
  drawAim(ctx: MainContext) {
    const s = ctx.striker;
    const show = ctx.phase === "place" && s.onBoard && ctx.aiming;
    this.aimLayer.setAttribute("opacity", show ? "1" : "0");
    if (!show) return;
    const a = ctx.aim.angle;
    const { t, hit } = predict(ctx);
    const ex = s.x + Math.cos(a) * t,
      ey = s.y + Math.sin(a) * t;
    setAttributes(this.aimLine, { x1: s.x, y1: s.y, x2: ex, y2: ey });
    setAttributes(this.ghost, { cx: ex, cy: ey });
    if (hit) {
      const ux = hit.x - ex,
        uy = hit.y - ey,
        l = Math.hypot(ux, uy) || 1;
      setAttributes(this.carry, {
        x1: hit.x,
        y1: hit.y,
        x2: hit.x + (ux / l) * 0.9,
        y2: hit.y + (uy / l) * 0.9,
        opacity: 1,
      });
    } else this.carry.setAttribute("opacity", "0");
    // power arc behind the striker
    const r = G.RS + 0.12,
      span = Math.max(0.05, ctx.aim.power) * Math.PI * 0.9;
    const back = a + Math.PI;
    const a1 = back - span / 2,
      a2 = back + span / 2;
    this.power.setAttribute(
      "d",
      `M ${s.x + r * Math.cos(a1)} ${s.y + r * Math.sin(a1)} A ${r} ${r} 0 ${span > Math.PI ? 1 : 0} 1 ${s.x + r * Math.cos(a2)} ${s.y + r * Math.sin(a2)}`,
    );
  }
}

function setAttributes(e: Element, attrs: Record<string, number>) {
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
}
