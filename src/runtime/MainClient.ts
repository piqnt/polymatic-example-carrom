/*
 * Copyright (c) Ali Shakiba
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Failure, Middleware } from "polymatic";

import { type MainContext } from "../model";
import { FrameLoop } from "./FrameLoop";
import { RoomClient } from "./RoomClient";
import { Input } from "./Input";
import { BoardView } from "./BoardView";
import { HudManager } from "./HudManager";

/**
 * The online game, in a room on the game server. The server runs the physics
 * and the rules; this draws what it sends, and sends it the player's turn.
 */
export class MainClient extends Middleware<MainContext> {
  constructor() {
    super();
    const svg = document.getElementById("carrom") as unknown as SVGSVGElement;
    this.use(new FrameLoop());
    this.use(new RoomClient());
    this.use(new Input(svg));
    this.use(new BoardView(svg));
    this.use(new HudManager());

    this.on(Failure, (f) => {
      console.error(`Carrom: a handler for "${f.type}" failed`, f.error);
      return true;
    });
  }
}
