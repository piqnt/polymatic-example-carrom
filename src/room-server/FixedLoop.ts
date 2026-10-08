/*
 * Copyright (c) Ali Shakiba
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Middleware } from "polymatic";

import { FrameUpdate } from "../runtime/FrameLoop";

/**
 * Fixed-time game loop for the server, in place of the browser's frames. Physics
 * steps in its own smaller fixed steps, so this only sets how often the room
 * hears what moved.
 */
export class FixedLoop extends Middleware {
  timeStep = 1000 / 30;
  interval: ReturnType<typeof setInterval>;

  constructor() {
    super();
    this.on("activate", this.handleActivate);
    this.on("deactivate", this.handleDeactivate);
  }

  handleActivate = () => {
    this.interval = setInterval(this.handleFrame, this.timeStep);
  };

  handleDeactivate = () => {
    clearInterval(this.interval);
  };

  handleFrame = () => {
    this.emit(FrameUpdate, { dt: this.timeStep, now: Date.now() });
  };
}
