/*
 * Copyright (c) Ali Shakiba
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { type PlayMode } from "../model";
import { type GameRuntime } from "./context";

// Everything a control can do, in one file. Components call these; they never
// emit an event or set a signal inline. Events are sent by name to the lobby
// (see lobby-client/LobbyClient), so the shell doesn't import the runtime.

/** Rack a fresh board; the match score carries on. Online, the next board once this one is won. */
/** @action */
export function newBoard({ emit }: GameRuntime) {
  emit("new-board");
}

/** Play the computer, or two players on one screen. Starts a new match, and leaves a room. */
/** @action */
export function setMode({ emit }: GameRuntime, mode: PlayMode) {
  emit("set-mode", mode);
}

/** @action */
export function openHelp({ hud }: GameRuntime) {
  hud.helpOpen.value = true;
}

/** @action */
export function closeHelp({ hud }: GameRuntime) {
  hud.helpOpen.value = false;
}

/** The card to create or join a room. */
/** @action */
export function openOnline({ hud }: GameRuntime) {
  hud.joinError.value = null;
  hud.onlineOpen.value = true;
}

/** @action */
export function closeOnline({ hud }: GameRuntime) {
  hud.onlineOpen.value = false;
  hud.joinError.value = null;
}

/** @action */
export function createRoom({ emit }: GameRuntime) {
  emit("create-room");
}

/** The lobby is what decides whether this is a room id - see LobbyClient. */
/** @action */
export function joinRoom({ emit }: GameRuntime, id: string) {
  emit("join-room", id);
}

/** @action */
export function rejoinRoom({ emit }: GameRuntime) {
  emit("rejoin-room");
}

/** @action */
export function declineRejoin({ emit }: GameRuntime) {
  emit("decline-rejoin");
}

/** @action */
export function closeNotice({ hud }: GameRuntime) {
  hud.notice.value = null;
}
