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
 * Everything the shell shows, as signals. The shell reads only these - it
 * never reaches into the pieces or the rules.
 *
 * One is made when the page loads and handed to every game the lobby starts,
 * so the hud carries on when switching between offline and a room. The game's
 * part is mirrored out of its context once per frame by runtime/HudManager;
 * the lobby's part is written by lobby-client/LobbyClient and runtime/RoomClient
 * as rooms come and go.
 */
export class HudData {
  /** the first board is set up; the shell draws no plaques before this */
  ready: Signal<boolean>;
  helpOpen: Signal<boolean>;

  mode: Signal<PlayMode>;
  /** online, the side this screen plays, 0 white or 1 black; -1 for a spectator and offline */
  seat: Signal<number>;
  /** whose turn it is, or -1 between boards */
  turn: Signal<number>;
  message: Signal<string>;
  /** set when a board is won, until the next one starts */
  result: Signal<BoardResult | null>;
  players: [PlayerHud, PlayerHud];

  /** the room being played in, for the player to read out and share */
  room: Signal<string | null>;
  /** trouble reaching the room, rather than anything about the game */
  roomError: Signal<string | null>;
  /** the card to create or join a room, and what is wrong with the id typed into it */
  onlineOpen: Signal<boolean>;
  joinError: Signal<string | null>;
  /** a room this browser was in and is still running, to ask whether to rejoin */
  rejoinRoom: Signal<string | null>;
  /** something to tell the player once, like a room they were in having closed */
  notice: Signal<string | null>;

  constructor() {
    this.ready = signal(false);
    this.helpOpen = signal(false);
    this.mode = signal("cpu");
    this.seat = signal(-1);
    this.turn = signal(0);
    this.message = signal("");
    this.result = signal(null);
    this.players = [new PlayerHud(), new PlayerHud()];
    this.room = signal(null);
    this.roomError = signal(null);
    this.onlineOpen = signal(false);
    this.joinError = signal(null);
    this.rejoinRoom = signal(null);
    this.notice = signal(null);
  }
}
