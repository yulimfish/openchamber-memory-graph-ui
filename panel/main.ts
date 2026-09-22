import { connectHost } from "@openchamber/sdk";
import { applyHostReady } from "@openchamber/sdk/ui";

const host = connectHost();
const stopReady = host.onReady((context) => {
  applyHostReady(context, document.documentElement);
});

window.addEventListener(
  "unload",
  () => {
    stopReady();
    host.dispose();
  },
  { once: true },
);
