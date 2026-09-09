import { createApp } from "vue";
import App from "./App.vue";
import "./styles/fonts.css";
import "./styles/app.css";

createApp(App).mount("#app");

if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
  addEventListener("load", () => {
    void navigator.serviceWorker.register("sw.js").catch(() => {
      /* nevadí */
    });
  });
}
