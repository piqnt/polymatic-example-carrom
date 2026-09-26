/*
 * Copyright (c) Ali Shakiba
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { type Signal, signal } from "@preact/signals";

import { type PlayMode, type BoardResult } from "./Context";

export type QueenBadge = "none" | "pending" | "covered";

export class PlayerHud {
  points: Signal<number>;
  wins: Signal<number>;
  /** own coins sunk, out of 9 */
  sunk: Signal<number>;
  queen: Signal<QueenBadge>;

  constructor() {
    this.points = signal(0);
    this.wins = signal(0);
    this.sunk = signal(0);
    this.queen = signal("none");
  }
}

/**
 * What the hud draws, mirrored out of the context once per frame by
 * runtime/HudManager. The shell reads only these - it never reaches into the
 * pieces or the rules.
 */
export class HudData {
  mode: Signal<PlayMode>;
  /** whose turn it is, or -1 between boards */
  turn: Signal<number>;
  message: Signal<string>;
  /** set when a board is won, until the next one starts */
  result: Signal<BoardResult | null>;
  players: [PlayerHud, PlayerHud];

  constructor() {
    this.mode = signal("cpu");
    this.turn = signal(0);
    this.message = signal("");
    this.result = signal(null);
    this.players = [new PlayerHud(), new PlayerHud()];
  }
}
