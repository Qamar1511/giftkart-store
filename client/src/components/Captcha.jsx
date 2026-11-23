import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { getCaptcha } from "../services/captchaService";
import "../styles/Captcha.css";

// A "type the characters you see" box. Drop it inside any form and keep a ref
// to it:
//
//   const captchaRef = useRef(null);
//   <Captcha ref={captchaRef} />
//
//   // on submit:
//   const captcha = captchaRef.current.getValue(); // { captchaId, captchaAnswer }
//   if (!captcha.captchaAnswer) → ask the person to fill it in
//   await doRequest({ ...fields, ...captcha });
//
//   // if the request failed (for ANY reason):
//   captchaRef.current.reload();
//
// Reloading after a failed request matters: the server throws a captcha away
// the moment it checks it, right or wrong, so the one on screen is already
// used up. (A form that never reached the server — e.g. a "fill in every
// field" message — hasn't used it, so no reload is needed then.)
const Captcha = forwardRef(function Captcha({ label = "Type the characters you see" }, ref) {
  const [captchaId, setCaptchaId] = useState("");
  const [image, setImage] = useState("");
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState("loading"); // loading | ready | error

  const load = useCallback(async () => {
    setStatus("loading");
    setAnswer("");
    try {
      const data = await getCaptcha();
      setCaptchaId(data.captchaId);
      setImage(data.image);
      setStatus("ready");
    } catch (err) {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useImperativeHandle(
    ref,
    () => ({
      getValue: () => ({ captchaId, captchaAnswer: answer.trim() }),
      reload: load,
    }),
    [captchaId, answer, load]
  );

  return (
    <div className="captcha-box">
      <span className="captcha-label">{label}</span>
      <div className="captcha-row">
        {/* Fixed size so the form doesn't jump when the image arrives. */}
        <div className="captcha-image-wrap">
          {status === "ready" ? (
            <img src={image} alt="Captcha — type the letters and numbers shown" width="210" height="70" draggable="false" />
          ) : (
            <span className="captcha-placeholder">{status === "error" ? "Couldn't load" : "Loading…"}</span>
          )}
        </div>
        <button
          type="button"
          className="captcha-refresh"
          onClick={load}
          disabled={status === "loading"}
          aria-label="Show a different captcha"
          title="Show a different captcha"
        >
          ↻
        </button>
      </div>
      <input
        className="captcha-input"
        type="text"
        value={answer}
        onChange={(e) => setAnswer(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
        placeholder="Enter the characters"
        aria-label="Captcha answer"
        autoComplete="off"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        maxLength={8}
        disabled={status !== "ready"}
      />
      {status === "error" && (
        <button type="button" className="captcha-retry" onClick={load}>
          Couldn't load the captcha — tap to try again
        </button>
      )}
    </div>
  );
});

export default Captcha;
