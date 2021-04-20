import { ipcRenderer } from "electron";
import $ from "jquery";
import axios from "axios";

export const check_connection = async (): Promise<boolean> => {
  let result: boolean = true;
  try {
    await axios({ url: "https://google.com" });
  } catch (err) {
    if (err) {
      result = false;
    } else {
      result = true;
    }
  }
  return result;
};

const connection_function = async () => {
  let connection = await check_connection();
  if (connection) {
    ipcRenderer.send("connect");
  }
};

$(function () {
  ipcRenderer.send("loading:ready");
});

ipcRenderer.on("get:interface:theme", (e, data) => {
  if (data === "dark") {
    $(":root").css("--app-color", "var(--app-dark)");
    $(":root").css("--text-color", "var(--text-dark)");
  } else {
    $(":root").css("--app-color", "var(--app-light)");
    $(":root").css("--text-color", "var(--text-light)");
  }
});

const runConnectionInterval = (func: () => void, interval: number): any => {
  func();
  return setInterval(func, interval);
};

var connectionInterval = runConnectionInterval(() => {
  connection_function();
}, 1000);
