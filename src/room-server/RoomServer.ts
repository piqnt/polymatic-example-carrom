/*
 * Copyright (c) Ali Shakiba
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Middleware } from "polymatic";

import { type Auth, type Piece, type User, G, clamp, strikerValid } from "../model";
import { FrameUpdate } from "../runtime/FrameLoop";
import { NewBoard, Shoot, TurnStart } from "../runtime/events";
import { type ServerContext } from "./ServerContext";

// a room nobody has played in for this long is closed, in ms
const ROOM_LEASE = 30 * 60 * 1000;

/**
 * This runs on the server and is responsible for sending the game to the
 * browsers in the room, and taking what the players do from them.
 *
 * The first two users to join play, white and black at random, and anyone after
 * them watches. A user keeps their side when they reconnect with the same auth.
 *
 * The player on turn sends where they put the striker and how they aim as they
 * go, so the others see it, and then the shot. Everything is checked here, and
 * the room is sent the game whenever it has changed.
 */
export class RoomServer extends Middleware<ServerContext> {
  inactiveRoomTimeout: ReturnType<typeof setTimeout>;
  /** the last state sent, to send only when something changed */
  sent = "";
  /** counts turns, so a browser can tell a new turn from its own aiming coming back */
  turnId = 0;

  constructor() {
    super();
    this.on("activate", this.handleActivate);
    this.on("deactivate", this.handleDeactivate);
    this.on(FrameUpdate, this.handleFrameUpdate);
    this.on(TurnStart, this.handleTurnStart);
  }

  handleActivate = () => {
    this.extendRoomLease();

    this.context.io.on("connection", (socket) => {
      const auth = socket.handshake.auth as Auth;
      if (typeof auth?.id !== "string" || typeof auth?.secret !== "string") {
        socket.disconnect();
        return;
      }

      const record = this.context.auths.find((a) => a.id === auth.id);
      if (!record) {
        this.context.auths.push({ id: auth.id, secret: auth.secret });
      } else if (record.secret !== auth.secret) {
        socket.disconnect();
        return;
      }

      let user = this.context.users.find((u) => u.id === auth.id);
      if (!user) {
        user = { id: auth.id };
        this.context.users.push(user);
      }
      this.handleUserEnter();

      socket.on("place", (data) => this.place(user, data));
      socket.on("shoot", (data) => this.handleShoot(user, data));
      socket.on("new-board", () => this.handleNewBoard(user));

      // everyone else hears of the newcomer with the next change
      socket.emit("room-update", this.state());
    });
  };

  handleDeactivate = () => {
    clearTimeout(this.inactiveRoomTimeout);

    const io = this.context.io;
    if (io) {
      this.context.io = null;
      io.removeAllListeners("connection");
      io.local.disconnectSockets();
      io.server._nsps.delete(io.name);
    }
  };

  extendRoomLease = () => {
    clearTimeout(this.inactiveRoomTimeout);
    this.inactiveRoomTimeout = setTimeout(() => this.emit("terminate-room"), ROOM_LEASE);
  };

  /** Once two users are in, they get a side each and the match starts. */
  handleUserEnter = () => {
    const ctx = this.context;
    if (ctx.started) return;
    const players = ctx.users.slice(0, 2);
    if (players.length < 2) return;
    const seats = Math.random() < 0.5 ? [0, 1] : [1, 0];
    players.forEach((user, i) => (user.seat = seats[i]));
    ctx.started = true;
    this.emit(NewBoard, { resetMatch: true });
  };

  handleTurnStart = () => {
    this.turnId++;
  };

  /** The user may place and shoot: it is their side's turn, and nothing is moving. */
  isTurn(user: User) {
    const ctx = this.context;
    return ctx.started && ctx.phase === "place" && user.seat === ctx.turn;
  }

  /** Where the player on turn has the striker, and how they aim; false if they may not, or it makes no sense. */
  place(user: User, data: any) {
    if (!this.isTurn(user)) return false;
    const ctx = this.context;
    const x = Number(data?.x);
    const angle = Number(data?.angle);
    const power = Number(data?.power);
    if (!Number.isFinite(x) || !Number.isFinite(angle) || !Number.isFinite(power)) return false;
    ctx.striker.x = clamp(x, -G.BX, G.BX);
    ctx.aim.angle = angle;
    ctx.aim.power = clamp(power, 0.02, 1);
    ctx.aiming = !!data.aiming;
    return true;
  }

  handleShoot = (user: User, data: any) => {
    if (!this.place(user, { ...data, aiming: true })) return;
    const ctx = this.context;
    if (!strikerValid(ctx)) return;
    this.emit(Shoot, { angle: ctx.aim.angle, power: ctx.aim.power });
    this.extendRoomLease();
  };

  /** The next board, once this one is won. */
  handleNewBoard = (user: User) => {
    if (user.seat === undefined || this.context.phase !== "over") return;
    this.emit(NewBoard, {});
  };

  handleFrameUpdate = () => {
    const state = this.state();
    const json = JSON.stringify(state);
    if (json === this.sent) return;
    this.sent = json;
    this.context.io?.emit("room-update", state);
  };

  state = () => {
    const { started, phase, turn, players, pieces, striker, queen, aim, aiming, message, result, users } = this.context;
    return {
      started,
      phase,
      turn,
      turnId: this.turnId,
      players,
      pieces: pieces.map(round),
      striker: round(striker),
      queen,
      aim,
      aiming,
      message,
      result,
      users,
    };
  };
}

/** Browsers only need positions to a hundredth of a millimetre. */
function round(piece: Piece): Piece {
  return { ...piece, x: Math.round(piece.x * 1e4) / 1e4, y: Math.round(piece.y * 1e4) / 1e4 };
}
