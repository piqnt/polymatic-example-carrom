/*
 * Copyright (c) Ali Shakiba
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { EventType, Middleware } from "polymatic";

export interface FrameLoopEvent {
  /** time since the last frame, in ms */
  dt: number;
  now: number;
}

/** Each frame: advance the game by `dt` */
export const FrameUpdate = EventType.create<FrameLoopEvent>("frame-update");

/** Each frame, after FrameUpdate: draw */
export const FrameRender = EventType.create<FrameLoopEvent>("frame-render");

/**
 * The longest frame. Physics takes at most 12 of its 1/240 s steps a frame, so
 * a longer one would only be dropped there; and the browser sends no frames to
 * hidden tabs, so the first one back can be long after the last.
 */
const MAX_DT = 50;

/**
 * Implements variable length game loop. Sends frame-update and frame-render event to all middlewares.
 */
export class FrameLoop extends Middleware {
  private request = 0;
  private last = 0;

  constructor() {
    super();
    this.on("activate", this.handleActivate);
    this.on("deactivate", this.handleDeactivate);
  }

  handleActivate = () => {
    this.last = performance.now();
    this.request = requestAnimationFrame(this.frame);
  };

  handleDeactivate = () => {
    cancelAnimationFrame(this.request);
  };

  frame = (now: number) => {
    const ev = { dt: Math.min(now - this.last, MAX_DT), now };
    this.last = now;
    this.emit(FrameUpdate, ev);
    this.emit(FrameRender, ev);
    this.request = requestAnimationFrame(this.frame);
  };
}
