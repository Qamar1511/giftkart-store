import apiClient from "./apiClient";

// Returns { captchaId, image } — `image` is a data: URI to show in an <img>.
// The answer is never sent to the browser; see server/utils/captcha.js.
export const getCaptcha = async () => {
  const { data } = await apiClient.get("/captcha");
  return data;
};
