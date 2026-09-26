/*
 * Copyright (c) Ali Shakiba
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { type PlayMode } from "../model";
import { type GameRuntime } from "./context";

// Everything a control can do, in one file. Components call these; they never
// emit an event or set a signal inline. Events are sent by name, the same names
// as the tokens in runtime/events, so the shell doesn't import the runtime.

/** Rack a fresh board; the match score carries on. */
/** @action */
export function newBoard({ emit }: GameRuntime) {
  emit("new-board", {});
}

/** Play the computer, or two players on one screen. Starts a new match. */
/** @action */
export function setMode({ emit }: GameRuntime, mode: PlayMode) {
  emit("set-mode", mode);
}

/** @action */
export function openHelp({ context }: GameRuntime) {
  context.helpOpen.value = true;
}

/** @action */
export function closeHelp({ context }: GameRuntime) {
  context.helpOpen.value = false;
}
