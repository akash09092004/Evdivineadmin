import { Platform } from "react-native";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";

const RINGTONE_SOURCE = require("../../assets/sounds/audio .mp3");

let ringtonePlayer = null;
let audioModePromise = null;
let webUnlockListenerAttached = false;
let webAutoplayBlocked = false;
let ringtoneOperation = null;
let ringtoneStopRequested = false;

function logRingtoneError(message, error) {
  console.error(`[Ringtone] ${message}`, error);
}

function ignoreAbortError(error) {
  return error?.name === "AbortError" || /interrupted by a call to pause/i.test(error?.message || "");
}

async function ensureAudioMode() {
  if (!audioModePromise) {
    audioModePromise = setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "mixWithOthers",
      allowsRecording: false,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    }).catch((error) => {
      logRingtoneError("Audio mode configuration failed.", error);
    });
  }

  await audioModePromise;
}

function detachWebUnlockListener() {
  if (
    Platform.OS !== "web" ||
    typeof window === "undefined" ||
    !webUnlockListenerAttached
  ) {
    return;
  }

  window.removeEventListener("pointerdown", tryResumeAfterUserGesture);
  window.removeEventListener("touchstart", tryResumeAfterUserGesture);
  window.removeEventListener("keydown", tryResumeAfterUserGesture);
  webUnlockListenerAttached = false;
}

function attachWebUnlockListener() {
  if (
    Platform.OS !== "web" ||
    typeof window === "undefined" ||
    webUnlockListenerAttached
  ) {
    return;
  }

  window.addEventListener("pointerdown", tryResumeAfterUserGesture, {
    passive: true,
  });
  window.addEventListener("touchstart", tryResumeAfterUserGesture, {
    passive: true,
  });
  window.addEventListener("keydown", tryResumeAfterUserGesture);
  webUnlockListenerAttached = true;
}

async function tryResumeAfterUserGesture() {
  if (!ringtonePlayer || !webAutoplayBlocked) {
    return;
  }

  try {
    await ringtonePlayer.play();
    webAutoplayBlocked = false;
    detachWebUnlockListener();
  } catch (error) {
    logRingtoneError(
      "Web autoplay is still blocked. Waiting for another user gesture.",
      error
    );
  }
}

export async function startRingtone() {
  if (ringtoneOperation) {
    return ringtoneOperation;
  }

  ringtoneStopRequested = false;

  ringtoneOperation = (async () => {
    try {
      await ensureAudioMode();

      if (ringtoneStopRequested) {
        return null;
      }

      if (ringtonePlayer) {
        ringtonePlayer.loop = true;

        if (!ringtonePlayer.playing && !ringtoneStopRequested) {
          await ringtonePlayer.play();
        }

        return ringtoneStopRequested ? null : ringtonePlayer;
      }

      const player = createAudioPlayer(RINGTONE_SOURCE, {
        downloadFirst: true,
        keepAudioSessionActive: true,
        updateInterval: 250,
      });

      player.loop = true;
      player.volume = 1;
      ringtonePlayer = player;

      try {
        if (!ringtoneStopRequested) {
          await player.play();
        }
        webAutoplayBlocked = false;
        detachWebUnlockListener();
      } catch (error) {
        if (Platform.OS === "web") {
          webAutoplayBlocked = true;
          attachWebUnlockListener();
          console.warn(
            "[Ringtone] Web autoplay blocked. Sound will start after the next user interaction."
          );
        } else {
          logRingtoneError("Failed to start ringtone.", error);
        }
      }

      return ringtoneStopRequested ? null : ringtonePlayer;
    } catch (error) {
      if (!ignoreAbortError(error)) {
        logRingtoneError("Unexpected start failure.", error);
      }
      return null;
    } finally {
      ringtoneOperation = null;
    }
  })();

  return ringtoneOperation;
}

export function stopRingtone() {
  try {
    ringtoneStopRequested = true;
    detachWebUnlockListener();
    webAutoplayBlocked = false;

    if (!ringtonePlayer) {
      return;
    }

    try {
      const pauseResult = ringtonePlayer.pause();
      if (pauseResult && typeof pauseResult.then === "function") {
        pauseResult.catch((error) => {
          if (!ignoreAbortError(error)) {
            logRingtoneError("Pause failed while stopping ringtone.", error);
          }
        });
      }
    } catch (error) {
      if (!ignoreAbortError(error)) {
        logRingtoneError("Pause failed while stopping ringtone.", error);
      }
    }

    if (Platform.OS !== "web") {
      try {
        const removeResult = ringtonePlayer.remove();
        if (removeResult && typeof removeResult.then === "function") {
          removeResult.catch((error) => {
            if (!ignoreAbortError(error)) {
              logRingtoneError("Unload failed while stopping ringtone.", error);
            }
          });
        }
      } catch (error) {
        if (!ignoreAbortError(error)) {
          logRingtoneError("Unload failed while stopping ringtone.", error);
        }
      }
    }
  } catch (error) {
    logRingtoneError("Unexpected stop failure.", error);
  } finally {
    ringtonePlayer = null;
    ringtoneOperation = null;
  }
}
