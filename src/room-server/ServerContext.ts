/*
 * Copyright (c) Ali Shakiba
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { type Namespace } from "socket.io";

import { type Auth, type User, MainContext } from "../model";
import { type Room } from "../lobby-server/LobbyServer";

/** A room's game, run by the server: the rules' context, and who is in the room. */
export class ServerContext extends MainContext {
  io: Namespace | null;

  /** every login that has been in the room, a user must come back with the same secret */
  auths: Auth[] = [];
  users: User[] = [];

  constructor(room: Room, io: Namespace) {
    super();
    this.room = room.id;
    this.io = io;
    this.mode = "online";
    this.started = false;
  }
}
