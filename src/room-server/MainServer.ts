/*
 * Copyright (c) Ali Shakiba
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Middleware, Runtime } from "polymatic";

import { Physics } from "../runtime/Physics";
import { Rules } from "../runtime/Rules";
import { FixedLoop } from "./FixedLoop";
import { RoomServer } from "./RoomServer";
import { type ServerContext } from "./ServerContext";

/**
 * Game server for one room: runs the same physics and rules as the offline
 * game, and syncs them with the browsers in the room.
 */
export class MainServer extends Middleware<ServerContext> {
  constructor() {
    super();
    this.use(new FixedLoop());
    this.use(new Physics());
    this.use(new Rules());
    this.use(new RoomServer());

    this.on("terminate-room", this.handleTerminateRoom);
  }

  handleTerminateRoom = () => {
    Runtime.deactivate(this);
  };
}
