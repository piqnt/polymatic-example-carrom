/*
 * Copyright (c) Ali Shakiba
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Middleware } from "polymatic";

import {
  type MainContext,
  type PlayMode,
  type CoinColor,
  Piece,
  G,
  COLORS,
  baseY,
  homeAngle,
  isCpuTurn,
  remaining,
  returnToCentre,
  strikerValid,
} from "../model";
import { NewBoard, Pocketed, SetMode, Shoot, ShotSettled, TurnStart } from "./events";

const name = (turn: number) => COLORS[turn][0].toUpperCase() + COLORS[turn].slice(1);

/**
 * The rules of the game: racks the board, keeps whose turn it is, and after
 * each shot applies what went in - fouls, the queen and covering it, and
 * winning a board.
 */
export class Rules extends Middleware<MainContext> {
  constructor() {
    super();
    this.on("activate", this.handleActivate);
    this.on(SetMode, this.handleSetMode);
    this.on(NewBoard, this.handleNewBoard);
    this.on(Shoot, this.handleShoot);
    this.on(Pocketed, this.handlePocketed);
    this.on(ShotSettled, this.handleShotSettled);
  }

  handleActivate = () => {
    this.emit(NewBoard, { resetMatch: true });
  };

  handleSetMode = (mode: PlayMode) => {
    if (mode === this.context.mode) return;
    this.context.mode = mode;
    this.emit(NewBoard, { resetMatch: true });
  };

  handleNewBoard = (ev?: { resetMatch?: boolean }) => {
    const ctx = this.context;
    if (ev?.resetMatch) {
      ctx.players.forEach((p) => {
        p.points = 0;
        p.wins = 0;
      });
      ctx.breaker = 0;
    }
    ctx.pieces = this.rack();
    ctx.queen = { state: "board", by: -1 };
    ctx.result = null;
    ctx.turn = ctx.breaker;
    ctx.shotsThisBoard = 0;
    ctx.strikerX = [0, 0];
    this.startTurn(`${name(ctx.turn)} breaks.`);
  };

  handleShoot = () => {
    const ctx = this.context;
    ctx.phase = "moving";
    ctx.shot = { potted: [], strikerFoul: false };
    ctx.strikerX[ctx.turn] = ctx.striker.x;
    ctx.shotsThisBoard++;
  };

  handlePocketed = ({ piece }: { piece: Piece }) => {
    const shot = this.context.shot;
    if (!shot) return;
    if (piece.kind === "striker") shot.strikerFoul = true;
    else shot.potted.push(piece);
  };

  handleShotSettled = () => {
    this.resolve();
  };

  /** the queen in the centre, a ring of six around it and twelve around those, colours alternating */
  rack() {
    const pieces = [new Piece("queen", "queen")];
    const d = 2 * G.RC + 0.006;
    const counts = { white: 0, black: 0 };
    const add = (kind: CoinColor, x: number, y: number) =>
      pieces.push(new Piece(`${kind}${counts[kind]++}`, kind, x, y));
    const tilt = Math.PI / 2;
    for (let k = 0; k < 6; k++) {
      const a = tilt + (k * Math.PI) / 3;
      const kind = k % 2 ? "black" : "white";
      add(kind, d * Math.cos(a), d * Math.sin(a)); // inner ring
      add(kind, 2 * d * Math.cos(a), 2 * d * Math.sin(a)); // spokes of the outer ring
      const b = a + Math.PI / 6;
      add(k % 2 ? "white" : "black", Math.sqrt(3) * d * Math.cos(b), Math.sqrt(3) * d * Math.sin(b));
    }
    return pieces;
  }

  startTurn(message: string) {
    const ctx = this.context;
    const s = ctx.striker;
    s.onBoard = true;
    s.y = baseY(ctx.turn);
    s.x = ctx.strikerX[ctx.turn];
    if (!strikerValid(ctx)) {
      // slide along the line to the nearest clear spot
      for (let dx = 0.02; dx < 2 * G.BX; dx += 0.02) {
        for (const x of [s.x + dx, s.x - dx]) {
          if (Math.abs(x) > G.BX) continue;
          s.x = x;
          if (strikerValid(ctx)) {
            dx = Infinity;
            break;
          }
        }
      }
    }
    ctx.aim.angle = homeAngle(ctx.turn);
    ctx.aiming = false;
    ctx.phase = "place";
    const who = isCpuTurn(ctx) ? "The computer is thinking." : `${name(ctx.turn)} to play.`;
    ctx.message = message ? `${message} ${who}` : who;
    this.emit(TurnStart, { turn: ctx.turn });
  }

  /** bring one of a colour's sunk coins back to the centre */
  takeBack(kind: CoinColor) {
    const ctx = this.context;
    const piece = ctx.pieces.find((p) => p.kind === kind && !p.onBoard);
    if (piece) returnToCentre(ctx, piece);
    return !!piece;
  }

  resolve() {
    const ctx = this.context;
    const shot = ctx.shot || { potted: [], strikerFoul: false };
    ctx.shot = null;
    const me = ctx.turn,
      own = COLORS[me],
      opp = COLORS[1 - me];
    const ownPotted = shot.potted.filter((p) => p.kind === own).length;
    const oppPotted = shot.potted.filter((p) => p.kind === opp).length;
    const queenPotted = shot.potted.some((p) => p.kind === "queen");
    const queen = ctx.pieces.find((p) => p.kind === "queen");
    const notes: string[] = [];
    let keepTurn = false;

    if (shot.strikerFoul) {
      notes.push("Foul, the striker went in.");
      if (queenPotted || (ctx.queen.state === "pending" && ctx.queen.by === me)) {
        returnToCentre(ctx, queen);
        ctx.queen = { state: "board", by: -1 };
        notes.push("The queen goes back to the centre.");
      }
      for (const p of shot.potted) if (p.kind === own) returnToCentre(ctx, p);
      if (this.takeBack(own)) notes.push(`A ${own} coin comes back as the penalty.`);
      else if (ownPotted) notes.push(`Your ${own} coins come back.`);
      if (oppPotted) notes.push(`${name(1 - me)} keeps the ${oppPotted === 1 ? "coin" : "coins"} you sank.`);
    } else {
      if (queenPotted) {
        if (ownPotted) {
          ctx.queen = { state: "covered", by: me };
          notes.push(`${name(me)} sank and covered the queen.`);
        } else {
          ctx.queen = { state: "pending", by: me };
          notes.push(`Queen in. Sink a ${own} coin next shot to cover it.`);
        }
        keepTurn = true;
      } else if (ctx.queen.state === "pending" && ctx.queen.by === me) {
        if (ownPotted) {
          ctx.queen = { state: "covered", by: me };
          notes.push(`${name(me)} covered the queen.`);
        } else {
          returnToCentre(ctx, queen);
          ctx.queen = { state: "board", by: -1 };
          notes.push("Queen not covered, so it goes back to the centre.");
        }
      }
      if (ownPotted) {
        keepTurn = true;
        if (ctx.queen.state !== "covered" || ctx.queen.by !== me || !notes.length)
          notes.push(`${name(me)} sank ${ownPotted}.`);
      }
      if (oppPotted) notes.push(`That sank ${oppPotted} for ${name(1 - me)}.`);
    }

    // a side can't finish before the queen is covered
    if (ctx.queen.state !== "covered") {
      for (const kind of COLORS) {
        if (remaining(ctx, kind) === 0 && this.takeBack(kind)) {
          notes.push(`The queen must be covered first, so a ${kind} coin comes back.`);
          if (kind === own) keepTurn = false;
        }
      }
    }

    // board won?
    for (let t = 0; t < 2; t++) {
      if (remaining(ctx, COLORS[t]) === 0) {
        const points = remaining(ctx, COLORS[1 - t]) + (ctx.queen.by === t ? 3 : 0);
        ctx.players[t].points += points;
        ctx.players[t].wins += 1;
        ctx.phase = "over";
        ctx.breaker = 1 - ctx.breaker;
        ctx.striker.onBoard = false;
        ctx.result = { winner: t, points };
        ctx.message = `${name(t)} wins the board for ${points} ${points === 1 ? "point" : "points"}.`;
        return;
      }
    }

    if (!keepTurn) ctx.turn = 1 - ctx.turn;
    else notes.push("Shoot again.");
    this.startTurn(notes.join(" "));
  }
}
