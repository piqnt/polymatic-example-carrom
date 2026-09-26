/*
 * Copyright (c) Ali Shakiba
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { type Signal, signal } from "@preact/signals";

import { G } from "./Config";
import { HudData } from "./Hud";
import { Piece } from "./Piece";

/** against the computer, which plays black, or two players on one screen */
export type PlayMode = "cpu" | "pvp";

/** placing the striker and aiming, pieces moving, the rules applying a shot, or the board won */
export type Phase = "place" | "moving" | "resolving" | "over";

export interface Queen {
  state: "board" | "pending" | "covered";
  /** the player who sank it, or -1 */
  by: number;
}

export interface Shot {
  potted: Piece[];
  strikerFoul: boolean;
}

export interface BoardResult {
  winner: number;
  points: number;
}

export class Player {
  points = 0;
  wins = 0;
}

/**
 * Global context, shared between the runtime and the shell.
 *
 * The plain fields belong to the runtime and are written many times a frame.
 * The signals are the bridge: what the hud shows is mirrored onto `hud` once a
 * frame (runtime/HudManager), and `ready` and `helpOpen` are set by one side
 * and read by the other.
 */
export class MainContext {
  mode: PlayMode = "cpu";
  phase: Phase = "place";
  turn = 0;
  /** who breaks the next board; the winner of a board breaks second */
  breaker = 0;
  shotsThisBoard = 0;
  players: [Player, Player] = [new Player(), new Player()];
  /** the coins and the queen */
  pieces: Piece[] = [];
  striker = new Piece("striker", "striker", 0, G.BY);
  /** where each player last shot from, so the striker comes back there */
  strikerX: [number, number] = [0, 0];
  queen: Queen = { state: "board", by: -1 };
  /** what went in during the shot in progress */
  shot: Shot | null = null;
  aim = { angle: -Math.PI / 2, power: 0.55 };
  /** the player is aiming, not placing the striker; the aim is shown only then */
  aiming = false;
  message = "";
  result: BoardResult | null = null;

  // --- shell facing state ---

  /** the first board is set up; the shell draws nothing before this */
  ready: Signal<boolean>;

  helpOpen: Signal<boolean>;

  hud: HudData;

  constructor() {
    this.ready = signal(false);
    this.helpOpen = signal(false);
    this.hud = new HudData();
  }
}
