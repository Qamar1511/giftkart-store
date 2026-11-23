const axios = require("axios");

// Thin wrapper around 2Factor.in's SMS OTP API. 2Factor generates and
// tracks the actual OTP on their end — we never see or store the code
// itself, only the session ID they hand back, which we present again when
// verifying what the user typed.
//
// Docs: https://2factor.in/API/V1/
const API_KEY = process.env.TWOFACTOR_API_KEY;
const BASE_URL = "https://2factor.in/API/V1";

const isSmsConfigured = () => Boolean(API_KEY);

// Kicks off a fresh OTP SMS to a 10-digit Indian mobile number (no country
// code — 2Factor prepends +91 itself). Returns the session ID that must be
// passed back into verifyPhoneOtp() along with the code the user enters.
const sendPhoneOtp = async (phone) => {
  const { data } = await axios.get(`${BASE_URL}/${API_KEY}/SMS/${phone}/AUTOGEN`);
  if (data.Status !== "Success") {
    throw new Error(data.Details || "Couldn't send the OTP SMS. Please try again.");
  }
  return data.Details; // session id
};

// Checks the code the user typed against the session 2Factor started.
// Returns true/false rather than throwing, since "wrong code" is an
// expected outcome here, not a failure.
const verifyPhoneOtp = async (sessionId, otp) => {
  const { data } = await axios.get(`${BASE_URL}/${API_KEY}/SMS/VERIFY/${sessionId}/${otp}`);
  return data.Status === "Success";
};

module.exports = { isSmsConfigured, sendPhoneOtp, verifyPhoneOtp };
