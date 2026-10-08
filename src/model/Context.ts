/*
 * Copyright (c) Ali Shakiba
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { G } from "./Config";
import { HudData } from "./Hud";
import { Piece } from "./Piece";

/** against the computer, which plays black, two players on one screen, or a room on the game server */
export type PlayMode = "cpu" | "pvp" | "online";

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

/** A login for a room: the id is shown to the other players, the secret is not */
export interface Auth {
  id: string;
  secret: string;
}

/** Someone in a room: the first two to join play a side each, anyone after them watches */
export interface User {
  id: string;
  seat?: number;
}

/**
 * A game's context. The offline game runs the rules on it; online the room
 * server does, and runtime/RoomClient copies what it sends onto the context of
 * each browser in the room.
 *
 * The plain fields are written many times a frame. The shell sees none of
 * them: what the hud shows is mirrored onto `hud` once a frame
 * (runtime/HudManager).
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

  // --- online ---

  /** both players are in the room; offline, always */
  started = true;
  /** the side this screen plays, 0 white or 1 black; -1 for a spectator, and offline where it plays both */
  seat = -1;
  /** the room, and the login this screen uses there, see lobby-client/RoomStore */
  room: string | null = null;
  auth: Auth | null = null;
  /** called by the room client when the server has no such room */
  onRoomNotFound?: () => void;

  /** the bridge to the shell, made by the lobby and shared by every game it starts */
  hud: HudData;

  constructor(hud = new HudData()) {
    this.hud = hud;
  }
}
