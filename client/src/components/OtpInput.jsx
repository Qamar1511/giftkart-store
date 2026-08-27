import React, { useRef } from "react";

// Animated multi-box OTP input (one glowing cell per digit).
//  - value   : the current code as a string (controlled by the parent)
//  - onChange: called with the new string whenever a digit changes
//  - length  : how many boxes (defaults to 6 — matches the backend OTP)
//  - onComplete : called once with the full code the moment every box is filled
//  - disabled : locks all boxes (e.g. while verifying)
//  - autoFocus: focuses the first box on mount
//
// Supports type-to-advance, backspace-to-previous, arrow keys, and pasting the
// whole code into any box. Purely presentational — the parent owns the value
// and does the actual verify call, so no API behaviour changes.
const OtpInput = ({
  value = "",
  onChange,
  length = 6,
  onComplete,
  disabled = false,
  autoFocus = false,
}) => {
  const inputsRef = useRef([]);

  const digits = Array.from({ length }, (_, i) => value[i] || "");

  const focusBox = (i) => {
    const el = inputsRef.current[i];
    if (el) {
      el.focus();
      el.select();
    }
  };

  const emit = (next) => {
    onChange?.(next);
    if (next.length === length && !next.includes(" ") && onComplete) {
      onComplete(next);
    }
  };

  const setDigit = (i, digit) => {
    const arr = Array.from({ length }, (_, k) => value[k] || "");
    arr[i] = digit;
    // Trim trailing empties so `value.length` reflects how many are filled.
    emit(arr.join("").replace(/\s+$/g, ""));
  };

  const handleChange = (i, raw) => {
    const only = raw.replace(/\D/g, "");
    if (!only) {
      setDigit(i, "");
      return;
    }
    // If several digits landed in one box (mobile keyboards, quick typing),
    // spread them across the following boxes.
    if (only.length > 1) {
      const arr = Array.from({ length }, (_, k) => value[k] || "");
      let cursor = i;
      for (const ch of only) {
        if (cursor >= length) break;
        arr[cursor] = ch;
        cursor += 1;
      }
      emit(arr.join("").replace(/\s+$/g, ""));
      focusBox(Math.min(cursor, length - 1));
      return;
    }
    setDigit(i, only);
    if (i < length - 1) focusBox(i + 1);
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[i]) {
        setDigit(i, "");
      } else if (i > 0) {
        setDigit(i - 1, "");
        focusBox(i - 1);
      }
    } else if (e.key === "ArrowLeft" && i > 0) {
      e.preventDefault();
      focusBox(i - 1);
    } else if (e.key === "ArrowRight" && i < length - 1) {
      e.preventDefault();
      focusBox(i + 1);
    }
  };

  const handlePaste = (i, e) => {
    e.preventDefault();
    const pasted = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    const arr = Array.from({ length }, (_, k) => value[k] || "");
    let cursor = i;
    for (const ch of pasted) {
      if (cursor >= length) break;
      arr[cursor] = ch;
      cursor += 1;
    }
    emit(arr.join("").replace(/\s+$/g, ""));
    focusBox(Math.min(cursor, length - 1));
  };

  return (
    <div className="otp-boxes" role="group" aria-label={`${length}-digit verification code`}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => (inputsRef.current[i] = el)}
          className={`otp-box ${digit ? "is-filled" : ""}`}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digit}
          disabled={disabled}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus={autoFocus && i === 0}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => handlePaste(i, e)}
          onFocus={(e) => e.target.select()}
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
};

export default OtpInput;
