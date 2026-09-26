/*
 * Copyright (c) Ali Shakiba
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Failure, Middleware } from "polymatic";

import { type MainContext } from "../model";
import { FrameLoop } from "./FrameLoop";
import { Physics } from "./Physics";
import { Rules } from "./Rules";
import { Computer } from "./Computer";
import { Input } from "./Input";
import { BoardView } from "./BoardView";
import { HudManager } from "./HudManager";

/**
 * The runtime. It owns the board, the pieces, the physics and the computer
 * player; the plaques, the status line and the controls are the shell's (see
 * shell/App), and the two meet at the signals on MainContext.
 *
 * Physics runs before the rules on each frame, so the rules read a finished step.
 */
export class Main extends Middleware<MainContext> {
  constructor() {
    super();
    const svg = document.getElementById("carrom") as unknown as SVGSVGElement;
    this.use(new FrameLoop());
    this.use(new Physics());
    this.use(new Rules());
    this.use(new Computer());
    this.use(new Input(svg));
    this.use(new BoardView(svg));
    this.use(new HudManager());

    this.on("activate", this.handleActivate);
    this.on(Failure, (f) => {
      console.error(`Carrom: a handler for "${f.type}" failed`, f.error);
      return true;
    });
  }

  handleActivate = () => {
    this.context.ready.value = true;
  };
}
