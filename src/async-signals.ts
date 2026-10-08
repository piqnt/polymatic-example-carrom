/*
 * Copyright (c) Ali Shakiba
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { signal } from "@preact/signals";

import { type GameRuntime } from "./shell/context";

/**
 * The handle the shell gets on the lobby, set once it is activated. Kept in its
 * own module so the shell can import it without pulling the game, planck and
 * socket.io into the first chunk.
 */
export const runtime = signal<GameRuntime | null>(null);
