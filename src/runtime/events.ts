/*
 * Copyright (c) Ali Shakiba
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { EventType } from "polymatic";

import { type PlayMode, type Piece } from "../model";

// The game's own events. The shell sends the first two by name (see
// shell/actions), so it doesn't pull the runtime into the first chunk.

/** Rack a new board, and with `resetMatch` also clear the points and wins */
export const NewBoard = EventType.create<{ resetMatch?: boolean }>("new-board");

/** Switch between playing the computer and two players; starts a new match */
export const SetMode = EventType.create<PlayMode>("set-mode");

/** From the player's input or the computer: send the striker off */
export const Shoot = EventType.create<{ angle: number; power: number }>("shoot");

/** From physics: a piece fell into a pocket */
export const Pocketed = EventType.create<{ piece: Piece }>("pocketed");

/** From physics: everything has stopped after a shot */
export const ShotSettled = EventType.create("shot-settled");

/** From the rules: a player is to place the striker and shoot */
export const TurnStart = EventType.create<{ turn: number }>("turn-start");
