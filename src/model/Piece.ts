/*
 * Copyright (c) Ali Shakiba
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { type CoinColor } from "./Config";

export type PieceKind = CoinColor | "queen" | "striker";

/** A coin, the queen or the striker */
export class Piece {
  id: string;
  kind: PieceKind;
  x: number;
  y: number;
  onBoard = true;

  constructor(id: string, kind: PieceKind, x = 0, y = 0) {
    this.id = id;
    this.kind = kind;
    this.x = x;
    this.y = y;
  }
}
