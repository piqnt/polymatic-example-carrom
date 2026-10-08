/*
 * Copyright (c) Ali Shakiba
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { useState } from "preact/hooks";
import { TbDoorEnter, TbPlus, TbX } from "react-icons/tb";

import { useRuntime } from "./context";
import { closeNotice, closeOnline, createRoom, declineRejoin, joinRoom, rejoinRoom } from "./actions";
import styles from "./Shell.module.css";

/**
 * Create a room, or join one by its id. The id is checked by the lobby, and
 * what is wrong with it comes back on `hud.joinError`.
 */
export function OnlineCard() {
  const runtime = useRuntime();
  const [id, setId] = useState("");
  const error = runtime.hud.joinError.value;

  const submit = (ev: Event) => {
    ev.preventDefault();
    joinRoom(runtime, id);
  };

  return (
    <div class={styles.backdrop} onClick={() => closeOnline(runtime)}>
      <div
        class={`${styles.card} ${styles.lobby}`}
        role="dialog"
        aria-modal="true"
        aria-label="Play online"
        onClick={(ev) => ev.stopPropagation()}
      >
        <button type="button" class={styles.close} aria-label="Close" onClick={() => closeOnline(runtime)}>
          <TbX aria-hidden />
        </button>
        <span class={styles.cardTitle}>Play online</span>
        <p>Create a room and give its id to a friend, or join theirs.</p>
        <button type="button" class={styles.cardButton} onClick={() => createRoom(runtime)} autoFocus>
          <TbPlus aria-hidden />
          Create room
        </button>
        <form class={styles.join} onSubmit={submit}>
          <input
            class={styles.input}
            value={id}
            placeholder="xxx-xxx-xxx"
            aria-label="Room id"
            onInput={(ev) => setId((ev.target as HTMLInputElement).value)}
          />
          <button type="submit" class={`${styles.cardButton} ${styles.secondary}`}>
            <TbDoorEnter aria-hidden />
            Join
          </button>
        </form>
        {error && <span class={styles.cardError}>{error}</span>}
      </div>
    </div>
  );
}

/** This browser was in a room that is still running, see LobbyClient. */
export function RejoinCard() {
  const runtime = useRuntime();

  return (
    <div class={styles.backdrop} onClick={() => declineRejoin(runtime)}>
      <div
        class={`${styles.card} ${styles.lobby}`}
        role="dialog"
        aria-modal="true"
        aria-label="Rejoin room"
        onClick={(ev) => ev.stopPropagation()}
      >
        <span class={styles.cardTitle}>Rejoin room {runtime.hud.rejoinRoom.value}?</span>
        <p>Your game there is still running.</p>
        <div class={styles.cardActions}>
          <button
            type="button"
            class={`${styles.cardButton} ${styles.secondary}`}
            onClick={() => declineRejoin(runtime)}
          >
            Stay offline
          </button>
          <button type="button" class={styles.cardButton} onClick={() => rejoinRoom(runtime)} autoFocus>
            Rejoin
          </button>
        </div>
      </div>
    </div>
  );
}

/** A one-time message, like a room the player was in having closed. */
export function NoticeCard() {
  const runtime = useRuntime();

  return (
    <div class={styles.backdrop} onClick={() => closeNotice(runtime)}>
      <div
        class={`${styles.card} ${styles.lobby}`}
        role="alertdialog"
        aria-modal="true"
        aria-label="Notice"
        onClick={(ev) => ev.stopPropagation()}
      >
        <p>{runtime.hud.notice.value}</p>
        <button type="button" class={styles.cardButton} onClick={() => closeNotice(runtime)} autoFocus>
          OK
        </button>
      </div>
    </div>
  );
}
