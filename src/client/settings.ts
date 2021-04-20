import { ipcRenderer } from "electron";

$(function () {
  ipcRenderer.send("settings:ready");
  const timeout = $(".notification_settings");
  const runOnStartup = $(".runOnStartup_settings");
  const hideOnClose = $(".hideOnClose_settings");
  const confirm_settings = $(".confirm_settings");
  confirm_settings.on("click", (e) => {
    e.preventDefault();
    const settings: any = {};
    settings.timeout = timeout.val();
    settings.runOnStartup = runOnStartup.is(":checked");
    settings.hideOnClose = hideOnClose.is(":checked");
    console.log(settings);
    ipcRenderer.send("settings:new", settings);
  });
});

ipcRenderer.on("set:theme", (e, theme) => {
  console.log(theme);
  if (theme === "dark") {
    $(":root").css({
      "--app-color": "var(--app-dark)",
      "--text-color": "var(--text-dark)",
      "--hover-color": "white",
    });
  } else if (theme === "light") {
    $(":root").css({
      "--app-color": "var(--app-light)",
      "--text-color": "var(--text-light)",
      "--hover-color": "black",
    });
  }

  const close = $(".appbar .close");
  close.on("click", () => {
    ipcRenderer.send("settings:close");
  });
});

ipcRenderer.on("settings:get", (e, settings) => {
  console.log(settings);
  const timeout = $(".notification_settings");
  const runOnStartup = $(".runOnStartup_settings");
  const hideOnClose = $(".hideOnClose_settings");

  timeout.val(settings.timeout / 1000);
  runOnStartup.prop("checked", settings.runOnStartup == "true");
  hideOnClose.prop("checked", settings.hideOnClose == "true");
});
