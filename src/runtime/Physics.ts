/*
 * Copyright (c) Ali Shakiba
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { World, Circle, Chain, Settings, type Body } from "planck";
import { Binder, Driver, Middleware } from "polymatic";

import { type MainContext, type Piece, G, DAMPING, DECEL, MAX_SPEED, MIN_SPEED, pocketUnder } from "../model";
import { FrameUpdate, type FrameLoopEvent } from "./FrameLoop";
import { Pocketed, Shoot, ShotSettled } from "./events";

/** fixed physics step, in seconds */
const STEP = 1 / 240;

/**
 * Simulates the pieces during a shot. Outside a shot the pieces are the truth:
 * the striker is placed by hand and returned coins are put back by the rules,
 * and the bodies follow them. During a shot the bodies are the truth, and their
 * positions are written back to the pieces, until everything stops.
 */
export class Physics extends Middleware<MainContext> {
  world: World;
  frame: Body;
  bodies = new Map<string, Body>();
  /** simulated time not stepped yet, in seconds */
  acc = 0;
  /** how long nothing has moved, in seconds */
  still = 0;

  constructor() {
    super();
    this.on("activate", this.handleActivate);
    this.on("deactivate", this.handleDeactivate);
    this.on(Shoot, this.handleShoot);
    this.on(FrameUpdate, this.handleFrameUpdate);
  }

  handleActivate = () => {
    Settings.velocityThreshold = 0.05;
    this.world = new World({ gravity: { x: 0, y: 0 } });
    const H = G.H;
    this.frame = this.world.createBody();
    this.frame.createFixture(
      new Chain(
        [
          { x: -H, y: -H },
          { x: H, y: -H },
          { x: H, y: H },
          { x: -H, y: H },
        ],
        true,
      ),
      { friction: 0.1 },
    );
    // the cushions are less lively than the coins
    this.world.on("pre-solve", (contact) => {
      const a = contact.getFixtureA().getBody(),
        b = contact.getFixtureB().getBody();
      if (a === this.frame || b === this.frame) contact.setRestitution(0.68);
    });
  };

  handleDeactivate = () => {
    this.binder.setData([]);
    this.world = null;
    this.bodies.clear();
  };

  handleShoot = ({ angle, power }: { angle: number; power: number }) => {
    const body = this.bodies.get("striker");
    if (!body) return;
    const speed = MIN_SPEED + (MAX_SPEED - MIN_SPEED) * power;
    body.setLinearVelocity({ x: Math.cos(angle) * speed, y: Math.sin(angle) * speed });
    this.acc = 0;
    this.still = 0;
  };

  handleFrameUpdate = (ev: FrameLoopEvent) => {
    const ctx = this.context;
    const dt = ev.dt / 1000;
    const live = [ctx.striker, ...ctx.pieces].filter((p) => p.onBoard);
    this.binder.setData(live);
    if (ctx.phase !== "moving") return;

    this.acc += dt;
    let steps = 0,
      fastest = 0;
    while (this.acc >= STEP && steps < 12) {
      this.acc -= STEP;
      steps++;
      this.world.step(STEP, 8, 3);
      fastest = 0;
      for (const p of live) {
        if (!p.onBoard) continue;
        const body = this.bodies.get(p.id);
        if (!body) continue;
        // sliding friction on the powdered board: constant deceleration
        const v = body.getLinearVelocity();
        const sp = Math.hypot(v.x, v.y),
          dec = DECEL * STEP;
        if (sp <= dec) body.setLinearVelocity({ x: 0, y: 0 });
        else body.setLinearVelocity({ x: (v.x * (sp - dec)) / sp, y: (v.y * (sp - dec)) / sp });
        fastest = Math.max(fastest, sp);
        const pos = body.getPosition();
        p.x = pos.x;
        p.y = pos.y;
        if (pocketUnder(p.x, p.y)) {
          p.onBoard = false;
          body.setActive(false);
          this.emit(Pocketed, { piece: p });
        }
      }
    }
    this.acc = Math.min(this.acc, STEP);
    if (fastest < 0.02) this.still += dt;
    else this.still = 0;
    if (this.still > 0.15) {
      ctx.phase = "resolving";
      this.emit(ShotSettled);
    }
  };

  pieceDriver = Driver.create<Piece, Body>({
    filter: () => true,
    enter: (p) => {
      const striker = p.kind === "striker";
      const body = this.world.createDynamicBody({
        position: { x: p.x, y: p.y },
        bullet: striker,
        linearDamping: DAMPING,
        angularDamping: 3,
      });
      body.createFixture(new Circle(striker ? G.RS : G.RC), {
        density: striker ? 1.63 : 1,
        restitution: 0.92,
        friction: 0.04,
      });
      this.bodies.set(p.id, body);
      return body;
    },
    update: (p, body) => {
      if (this.context.phase === "moving") return;
      if (!body.isActive()) body.setActive(true);
      body.setPosition({ x: p.x, y: p.y });
      body.setLinearVelocity({ x: 0, y: 0 });
      body.setAngularVelocity(0);
    },
    exit: (p, body) => {
      this.world?.destroyBody(body);
      this.bodies.delete(p.id);
    },
  });

  binder = Binder.create<Piece>({
    key: (p) => p.id,
    drivers: [this.pieceDriver],
  });
}
