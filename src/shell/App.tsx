/*
 * Copyright (c) Ali Shakiba
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { GameContext } from "./context";
import { runtime } from "../async-signals";
import { Hud } from "./Hud";
import styles from "./Shell.module.css";

/**
 * The shell. It mounts before the lobby exists (see index.tsx), so the read
 * below is guarded: `runtime` fills in once the lobby has been activated. The
 * hud waits for the first board itself, see Hud.
 */
export function App() {
  const lobby = runtime.value;

  return (
    <GameContext.Provider value={lobby}>
      <div class={styles.frame}>{lobby && <Hud />}</div>
    </GameContext.Provider>
  );
}
