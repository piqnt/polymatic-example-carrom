/*
 * Copyright (c) Ali Shakiba
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Runtime } from "polymatic";
import "polymatic/devtools-install";

import { HudData } from "./model";
import { LobbyClient } from "./lobby-client/LobbyClient";
import { runtime } from "./async-signals";

const lobby = new LobbyClient();
// one hud for the whole session: the lobby hands it to every game it starts
const hud = new HudData();
Runtime.activate(lobby, { hud });

runtime.value = { hud, emit: lobby.emit.bind(lobby) };

// for debugging
if (typeof window !== "undefined") {
  window["runtime"] = runtime.value;
}

// deactivate runtime on hot module reloading
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    Runtime.deactivate(lobby);
    runtime.value = null;
  });
}
