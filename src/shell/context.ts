/*
 * Copyright (c) Ali Shakiba
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createContext } from "preact";
import { useContext } from "preact/hooks";

import { type HudData } from "../model";

/**
 * What a component is handed: the hud signals to read, and the lobby's own
 * emit to send events back into it. Nothing else of the game is exposed - the
 * shell never holds a middleware.
 */
export interface GameRuntime {
  hud: HudData;
  emit: (type: string, ev?: any) => void;
}

export const GameContext = createContext<GameRuntime | null>(null);

export function useRuntime(): GameRuntime {
  const runtime = useContext(GameContext);
  if (!runtime) throw new Error("useRuntime must be used within a GameContext.Provider");
  return runtime;
}
