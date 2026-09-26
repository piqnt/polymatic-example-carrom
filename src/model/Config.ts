/*
 * Copyright (c) Ali Shakiba
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// Board units are decimetres of a standard 74 cm board, centred on the board's
// centre. y grows downwards, as in svg.
export const G = {
  /** half of the playing surface */
  H: 3.7,
  /** half of the board including the wooden frame */
  F: 4.35,
  /** coin radius */
  RC: 0.159,
  /** striker radius */
  RS: 0.206,
  /** pocket radius */
  PR: 0.2225,
  /** distance from the centre to the striker line */
  BY: 2.526,
  /** striker line half length */
  BX: 2.35,
  /** pocket centre offset */
  PC: 3.7 - 0.2225,
};

export const POCKETS: [number, number][] = [
  [-G.PC, -G.PC],
  [G.PC, -G.PC],
  [G.PC, G.PC],
  [-G.PC, G.PC],
];

/** player 0 plays white from the bottom, player 1 black from the top */
export const COLORS = ["white", "black"] as const;
export type CoinColor = (typeof COLORS)[number];

/** striker speed at no and at full power, in units per second */
export const MAX_SPEED = 40;
export const MIN_SPEED = 2.5;
/** sliding friction on the powdered board, a constant deceleration in units per second squared */
export const DECEL = 6;
export const DAMPING = 0.35;

/**
 * The whole screen is this box, the board with a band above it for black's
 * plaque and the controls, and one below it for white's plaque and the status
 * line. It is fitted to the window and centred (runtime/BoardView), and the
 * hud (shell/Shell.module.css) reproduces it, so the numbers there must match.
 */
export const TOP_BAND = 1.6;
export const BOTTOM_BAND = 2.4;
export const VIEWBOX = {
  x: -G.F,
  y: -G.F - TOP_BAND,
  width: 2 * G.F,
  height: 2 * G.F + TOP_BAND + BOTTOM_BAND,
};
