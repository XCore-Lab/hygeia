/**
 * Landing-page CTAs ("Start anonymous chat") all call openChat(). In the app
 * this navigates to the real triage chat at /check; a listener mounted at the
 * router root performs the navigation so plain components need no hooks.
 */
export const OPEN_CHAT_EVENT = "hygeia:open-check";
export const CHECK_PATH = "/check";
/** Fired by the app header; the chat page listens and starts a fresh conversation. */
export const RESTART_CHAT_EVENT = "hygeia:restart-chat";

export const openChat = () => {
  window.dispatchEvent(new CustomEvent(OPEN_CHAT_EVENT));
};
