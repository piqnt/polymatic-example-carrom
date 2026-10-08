/*
 * Copyright (c) Ali Shakiba
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Middleware } from "polymatic";

import { type MainContext, COLORS } from "../model";
import { FrameRender } from "./FrameLoop";

/**
 * The one place the runtime talks to the shell.
 *
 * The rules keep writing the context as shots play out; once a frame this
 * copies what the hud shows onto `context.hud`'s signals. Signals only notify
 * on a real change, so a frame that changes nothing shown re-renders nothing.
 */
export class HudManager extends Middleware<MainContext> {
  constructor() {
    super();
    this.on(FrameRender, this.handleFrameRender);
  }

  handleFrameRender = () => {
    const ctx = this.context;
    const hud = ctx.hud;
    const waiting = ctx.mode === "online" && !ctx.started;
    hud.mode.value = ctx.mode;
    hud.seat.value = ctx.mode === "online" ? ctx.seat : -1;
    hud.turn.value = ctx.phase === "over" || waiting ? -1 : ctx.turn;
    hud.message.value = waiting ? "Waiting for an opponent. Share the room id with them." : ctx.message;
    hud.result.value = ctx.result;
    hud.players.forEach((player, t) => {
      player.points.value = ctx.players[t].points;
      player.wins.value = ctx.players[t].wins;
      player.sunk.value = ctx.pieces.filter((p) => p.kind === COLORS[t] && !p.onBoard).length;
      player.queen.value = ctx.queen.by === t && ctx.queen.state !== "board" ? ctx.queen.state : "none";
    });
  };
}
