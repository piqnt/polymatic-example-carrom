/*
 * Copyright (c) Ali Shakiba
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { TbHelp, TbRefresh, TbRobot, TbUsers, TbWorld, TbX } from "react-icons/tb";

import { COLORS, type PlayMode } from "../model";
import { useRuntime } from "./context";
import { closeHelp, newBoard, openHelp, openOnline, setMode } from "./actions";
import { NoticeCard, OnlineCard, RejoinCard } from "./RoomCards";
import styles from "./Shell.module.css";

const NAMES = ["White", "Black"];

/**
 * Black's plaque and the controls above the board, white's plaque and the
 * status line below it: each plaque on its player's side. Over the board, the
 * card when a board is won, the help, and the lobby's cards.
 *
 * The plaques and the board's card wait for the first board, the rest is
 * there from the start: a room that can not be reached never has a board.
 */
export function Hud() {
  const { hud } = useRuntime();
  const ready = hud.ready.value;
  return (
    <>
      {ready && <Plaque turn={1} />}
      <Controls />
      {ready && <Plaque turn={0} />}
      <RoomBadge />
      <HelpButton />
      <Status />
      {ready && <BoardWon />}
      <Help />
      {hud.onlineOpen.value && <OnlineCard />}
      {hud.rejoinRoom.value && <RejoinCard />}
      {hud.notice.value && !hud.rejoinRoom.value && <NoticeCard />}
    </>
  );
}

function who(mode: PlayMode, seat: number, turn: number) {
  if (mode === "cpu") return turn === 0 ? "you" : "computer";
  if (mode === "online") return seat < 0 ? "" : turn === seat ? "you" : "opponent";
  return turn === 0 ? "bottom" : "top";
}

/** A player's name, points and the tray of the coins they have sunk, lit on their turn */
function Plaque({ turn }: { turn: number }) {
  const { hud } = useRuntime();
  const player = hud.players[turn];
  const color = COLORS[turn];
  const sunk = player.sunk.value;
  const queen = player.queen.value;
  const points = player.points.value;
  const wins = player.wins.value;

  const slots = [];
  for (let i = 0; i < 9; i++) {
    slots.push(<span key={i} class={`${styles.slot} ${i < sunk ? styles[color] : ""}`} />);
  }

  return (
    <div
      class={`${styles.plaque} ${turn === 1 ? styles.top : styles.bottom} ${hud.turn.value === turn ? styles.active : ""}`}
    >
      <div class={styles.plaqueRow}>
        <span class={styles.name}>
          <span class={`${styles.chip} ${styles[color]}`} />
          {NAMES[turn]}
          <span class={styles.who}>{who(hud.mode.value, hud.seat.value, turn)}</span>
        </span>
        <span class={styles.points}>
          {points} {points === 1 ? "pt" : "pts"}
          {wins > 0 && ` · ${wins} ${wins === 1 ? "board" : "boards"}`}
        </span>
      </div>
      <div class={styles.tray} aria-label={`${sunk} of 9 ${color} coins sunk`}>
        {slots}
        {queen !== "none" && (
          <span
            class={`${styles.slot} ${styles.queen} ${queen === "pending" ? styles.pending : ""}`}
            title={queen === "covered" ? "Queen covered" : "Queen waiting to be covered"}
          />
        )}
      </div>
    </div>
  );
}

/** Who you play, and a new board */
function Controls() {
  const runtime = useRuntime();
  const mode = runtime.hud.mode.value;
  return (
    <div class={styles.controls}>
      <div class={styles.seg} role="group" aria-label="Opponent">
        <button
          type="button"
          aria-pressed={mode === "cpu"}
          aria-label="Play the computer"
          title="Play the computer"
          onClick={() => setMode(runtime, "cpu")}
        >
          <TbRobot aria-hidden />
        </button>
        <button
          type="button"
          aria-pressed={mode === "pvp"}
          aria-label="Two players"
          title="Two players"
          onClick={() => setMode(runtime, "pvp")}
        >
          <TbUsers aria-hidden />
        </button>
        <button
          type="button"
          aria-pressed={mode === "online"}
          aria-label="Play online"
          title="Play online"
          onClick={() => openOnline(runtime)}
        >
          <TbWorld aria-hidden />
        </button>
      </div>
      {/* online, a board is played out: the next one comes from the card when it is won */}
      {mode !== "online" && (
        <button
          type="button"
          class={styles.round}
          aria-label="New board"
          title="New board"
          onClick={() => newBoard(runtime)}
        >
          <TbRefresh aria-hidden />
        </button>
      )}
    </div>
  );
}

/** The room being played in, to read out to the other player */
function RoomBadge() {
  const room = useRuntime().hud.room.value;
  if (!room) return null;
  return (
    <span class={styles.roomBadge} aria-label="Room id" title="Room id, for the other player to join with">
      {room}
    </span>
  );
}

function HelpButton() {
  const runtime = useRuntime();
  return (
    <button
      type="button"
      class={`${styles.round} ${styles.helpButton}`}
      aria-label="How to play"
      title="How to play"
      onClick={() => openHelp(runtime)}
    >
      <TbHelp aria-hidden />
    </button>
  );
}

/** What just happened and whose turn it is, or trouble reaching the room */
function Status() {
  const { hud } = useRuntime();
  const error = hud.roomError.value;
  return (
    <p class={`${styles.status} ${error ? styles.error : ""}`} aria-live="polite">
      {error ?? hud.message.value}
    </p>
  );
}

/** The card when a side has sunk all their coins, and the way on to the next board */
function BoardWon() {
  const runtime = useRuntime();
  const { hud } = runtime;
  const result = hud.result.value;
  if (!result) return null;

  const mode = hud.mode.value;
  const seat = hud.seat.value;
  // online, someone watching can't start the next board
  const watching = mode === "online" && seat < 0;
  const title =
    mode === "cpu"
      ? result.winner === 0
        ? "You win the board"
        : "The computer wins the board"
      : mode === "online" && !watching
        ? result.winner === seat
          ? "You win the board"
          : "Your opponent wins the board"
        : `${NAMES[result.winner]} wins the board`;
  const [white, black] = hud.players.map((p) => p.points.value);

  return (
    <div class={styles.backdrop}>
      <div class={styles.card} role="dialog" aria-modal="true" aria-label={title}>
        <span class={styles.cardTitle}>{title}</span>
        <span class={styles.cardPoints}>
          +{result.points} {result.points === 1 ? "point" : "points"}
        </span>
        <span class={styles.cardScore}>
          White {white} · Black {black}
        </span>
        {!watching && (
          <button type="button" class={styles.cardButton} onClick={() => newBoard(runtime)} autoFocus>
            <TbRefresh aria-hidden />
            Next board
          </button>
        )}
      </div>
    </div>
  );
}

function Help() {
  const runtime = useRuntime();
  if (!runtime.hud.helpOpen.value) return null;

  return (
    <div class={styles.backdrop} onClick={() => closeHelp(runtime)}>
      <div
        class={`${styles.card} ${styles.help}`}
        role="dialog"
        aria-modal="true"
        aria-label="How to play"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" class={styles.close} aria-label="Close" onClick={() => closeHelp(runtime)} autoFocus>
          <TbX aria-hidden />
        </button>
        <span class={styles.cardTitle}>How to play</span>
        <p>
          Sink all nine of your coins before the other side does. White plays from the bottom line, black from the top.
          Sinking one of yours lets you shoot again.
        </p>
        <p>
          The red queen is worth 3 points, but only once it is covered: sink one of your own coins on the same shot or
          the next, or it goes back to the centre. You can't finish a board before the queen is covered.
        </p>
        <p>If the striker goes in, it's a foul and one of your sunk coins comes back.</p>
        <p>
          Drag the striker along your line to place it. Pull back anywhere on the board and let go to shoot. Keyboard:{" "}
          <kbd>←</kbd>
          <kbd>→</kbd> place, <kbd>↑</kbd>
          <kbd>↓</kbd> aim, <kbd>+</kbd>
          <kbd>−</kbd> power, <kbd>Space</kbd> shoot. Hold <kbd>Shift</kbd> for bigger steps.
        </p>
        <p>
          To play a friend online, choose the globe{" "}
          <span class={styles.inlineIcon}>
            <TbWorld aria-hidden />
          </span>{" "}
          and create a room, then give them its id to join with. You each get a side at random; anyone who joins after
          you two watches.
        </p>
      </div>
    </div>
  );
}
