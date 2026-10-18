import { useEffect, useRef, useState } from "react";
import { captureKeys } from "./keyboardInput";

/**
 * Physical-key capture shared by the practice screen and the landing card.
 *
 * The target must be read-only: an editable input wakes a Chinese IME's
 * candidate window. Letters come from `event.code` (KeyA…KeyZ), so a pinyin IME
 * reporting `key="Process"`, `isComposing=true` or `keyCode=229` still types the
 * English letters. Alt/Ctrl/Meta shortcuts are never intercepted.
 */
export interface SlotKeyHandlers {
  onLetter: (letter: string) => void;
  onSpace: () => void;
  onEnter: () => void;
  onBackspace: () => void;
  onArrow: (direction: -1 | 1) => void;
}

export function useSlotKeys(
  inputRef: React.RefObject<HTMLInputElement | null>,
  handlers: SlotKeyHandlers,
  enabled = true,
) {
  // Handlers change every render; keep a ref so the listener stays stable.
  const current = useRef(handlers);
  current.current = handlers;

  useEffect(() => {
    if (!enabled) return;
    const element = inputRef.current;
    if (!element) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.metaKey || event.ctrlKey) return;
      const captured = captureKeys(event);
      if (captured) {
        // No pinyin pre-edit, no browser text insertion either way.
        event.preventDefault();
        current.current.onLetter(captured);
        return;
      }
      if (event.code === "Space" || event.key === " ") {
        event.preventDefault();
        current.current.onSpace();
        return;
      }
      if (event.key === "Enter" || event.code === "NumpadEnter") {
        event.preventDefault();
        current.current.onEnter();
        return;
      }
      if (event.key === "Backspace" || event.code === "Backspace") {
        event.preventDefault();
        current.current.onBackspace();
        return;
      }
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        current.current.onArrow(1);
        return;
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        current.current.onArrow(-1);
      }
    };

    element.addEventListener("keydown", onKeyDown);
    return () => element.removeEventListener("keydown", onKeyDown);
  }, [inputRef, enabled]);
}

/** A touch keyboard that types into the same model, without the system IME. */
export interface SiteKeyboardProps {
  onLetter: (letter: string) => void;
  onBackspace: () => void;
  onSpace: () => void;
  onEnter: () => void;
  shift: boolean;
  onShift: () => void;
  onApostrophe: () => void;
  onHyphen: () => void;
  compact?: boolean;
}

const ROWS = ["qwertyuiop", "asdfghjkl"] as const;

export function SiteKeyboard(props: SiteKeyboardProps) {
  const { onLetter, onBackspace, onSpace, onEnter, shift, onShift, onApostrophe, onHyphen } = props;
  const stop = (event: React.MouseEvent) => event.preventDefault();
  const label = (letter: string) => (shift ? letter.toUpperCase() : letter);
  return (
    <div className="site-english-keyboard" role="group" aria-label="英文直接输入键盘">
      {ROWS.map((row) => (
        <div className="site-key-row" key={row}>
          {[...row].map((letter) => (
            <button type="button" className="site-key" key={letter}
              onMouseDown={stop} onClick={() => onLetter(letter)} aria-label={letter}>
              {label(letter)}
            </button>
          ))}
        </div>
      ))}
      <div className="site-key-row">
        <button type="button" className={`site-key site-key-special ${shift ? "site-key-selected" : ""}`}
          aria-label="大写切换" aria-pressed={shift} onMouseDown={stop} onClick={onShift}>⇧</button>
        {[..."zxcvbnm"].map((letter) => (
          <button type="button" className="site-key" key={letter}
            onMouseDown={stop} onClick={() => onLetter(letter)} aria-label={letter}>
            {label(letter)}
          </button>
        ))}
        <button type="button" className="site-key site-key-special"
          aria-label="删除" onMouseDown={stop} onClick={onBackspace}>⌫</button>
      </div>
      <div className="site-key-row site-key-controls">
        <button type="button" className="site-key site-key-small"
          onMouseDown={stop} onClick={onApostrophe}>{"'"}</button>
        <button type="button" className="site-key site-key-small"
          onMouseDown={stop} onClick={onHyphen}>−</button>
        <button type="button" className="site-key site-key-space"
          onMouseDown={stop} onClick={onSpace}>空格 / 下一词</button>
        <button type="button" className="site-key site-key-enter"
          onMouseDown={stop} onClick={onEnter}>Enter ↵</button>
      </div>
    </div>
  );
}

/** Touch devices default to the on-page keyboard, exactly as the practice page does. */
export function useTouchDevice(): boolean {
  const [touch] = useState(() =>
    typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches);
  return touch;
}
