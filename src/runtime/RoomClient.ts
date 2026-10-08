/*
 * Copyright (c) Ali Shakiba
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Middleware } from "polymatic";
import { io, type Socket } from "socket.io-client";

import { type MainContext, type User, Piece, isMyTurn } from "../model";
import { FrameUpdate, type FrameLoopEvent } from "./FrameLoop";
import { NewBoard, Shoot } from "./events";

// how quickly shown positions catch up with the server's, in ms
const SMOOTHING = 40;
// how often the striker and the aim are sent while the player moves them, in ms
const PLACE_INTERVAL = 50;

/**
 * This runs in the browser in a room, in place of the physics and the rules:
 * it takes the game from the server, and sends the player's turn to it.
 *
 * The server sends positions many times a second, and they are eased toward on
 * every frame rather than jumped to. While it is this player's turn their own
 * striker and aim are theirs, and what the server sends back of them is only
 * an echo, so it is not applied until the turn changes.
 */
export class RoomClient extends Middleware<MainContext> {
  io: Socket;
  connectionError: string | null = null;

  /** latest positions from the server, by piece id */
  targets = new Map<string, { x: number; y: number }>();
  /** the server's count of turns when it last sent the game */
  turnId = -1;
  /** what was last sent of the striker and the aim, and when */
  placed = "";
  placedTime = 0;

  constructor() {
    super();
    this.on("activate", this.handleActivate);
    this.on("deactivate", this.handleDeactivate);
    this.on(FrameUpdate, this.handleFrameUpdate);
    this.on(Shoot, this.handleShoot);
    this.on(NewBoard, this.handleNewBoard);
  }

  handleActivate = () => {
    this.printRoomStatus();

    // the login is picked by the lobby, see RoomStore
    this.io = io("/room/" + this.context.room, { auth: this.context.auth });

    this.io.on("connect_error", (err) => {
      if (err.message === "Invalid namespace") {
        this.connectionError = "Room not found!";
        this.context.onRoomNotFound?.();
      } else {
        this.connectionError = "Connection error: " + err.message;
      }
      this.printRoomStatus();
    });

    this.io.on("connect", () => {
      this.connectionError = null;
      this.printRoomStatus();
    });

    this.io.on("room-update", this.handleServerRoomState);
  };

  handleDeactivate = () => {
    this.context.hud.roomError.value = null;
    this.io?.disconnect();
  };

  printRoomStatus = () => {
    this.context.hud.roomError.value = this.connectionError;
  };

  handleServerRoomState = (data: any) => {
    const ctx = this.context;
    const { pieces, striker, aim, aiming, users, turnId, ...rest } = data;
    Object.assign(ctx, rest);
    ctx.seat = (users as User[]).find((user) => user.id === ctx.auth?.id)?.seat ?? -1;

    const current = new Map(ctx.pieces.map((p) => [p.id, p]));
    ctx.pieces = pieces.map((p: Piece) => this.merge(current.get(p.id), p));

    const newTurn = turnId !== this.turnId;
    const echo = !newTurn && ctx.phase === "place" && isMyTurn(ctx);
    this.turnId = turnId;
    if (!echo) {
      this.merge(ctx.striker, striker);
      // a turn starts with the striker put on the line
      if (newTurn) Object.assign(ctx.striker, { x: striker.x, y: striker.y });
      ctx.aim = aim;
      ctx.aiming = aiming;
    }

    ctx.hud.ready.value = true;
  };

  /** Takes everything but the position from the server, the position is eased toward. */
  merge(current: Piece | undefined, next: Piece): Piece {
    this.targets.set(next.id, { x: next.x, y: next.y });
    if (!current) return Object.assign(new Piece(next.id, next.kind, next.x, next.y), { onBoard: next.onBoard });
    // falls into the pocket from where it went in, and comes back where it is put
    if (current.onBoard !== next.onBoard) {
      current.x = next.x;
      current.y = next.y;
    }
    current.kind = next.kind;
    current.onBoard = next.onBoard;
    return current;
  }

  handleFrameUpdate = (ev: FrameLoopEvent) => {
    const ctx = this.context;
    // pieces glide while a shot plays out, and are put in place between shots
    const t = ctx.phase === "moving" ? 1 - Math.exp(-ev.dt / SMOOTHING) : 1;
    for (const piece of ctx.pieces) this.ease(piece, t);

    if (ctx.phase === "place" && isMyTurn(ctx)) {
      // the striker is the player's to move, and the others are told where
      this.targets.set(ctx.striker.id, { x: ctx.striker.x, y: ctx.striker.y });
      this.sendPlace(ev.now);
    } else {
      // the striker always glides, so the other player is seen sliding it along the line
      this.ease(ctx.striker, 1 - Math.exp(-ev.dt / SMOOTHING));
    }
  };

  ease(piece: Piece, t: number) {
    const target = this.targets.get(piece.id);
    if (!target) return;
    piece.x += (target.x - piece.x) * t;
    piece.y += (target.y - piece.y) * t;
  }

  /** The striker and the aim as the player moves them, for the others to see. */
  sendPlace(now: number) {
    const { striker, aim, aiming } = this.context;
    const placed = [striker.x, aim.angle, aim.power, aiming].join();
    if (placed === this.placed || now - this.placedTime < PLACE_INTERVAL) return;
    this.placed = placed;
    this.placedTime = now;
    this.io?.emit("place", { x: striker.x, angle: aim.angle, power: aim.power, aiming });
  }

  handleShoot = ({ angle, power }: { angle: number; power: number }) => {
    this.io?.emit("shoot", { x: this.context.striker.x, angle, power });
  };

  handleNewBoard = () => {
    this.io?.emit("new-board");
  };
}
