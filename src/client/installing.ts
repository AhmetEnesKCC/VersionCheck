import { ipcRenderer } from "electron";
import $ from "jquery";

$(function () {
  ipcRenderer.send("installing:ready");
  const message = $("span.message");
  const package_name = $("span.package_name");
  ipcRenderer.on("package:installing:package", (e, pckg) => {
    message.text("Installing package:   ");
    package_name.text(pckg);
  });
  ipcRenderer.on("package:installing:success", (e, pckg) => {
    message.text("Installed succesfully:   ");
  });
  ipcRenderer.on("package:installing:error", (e, err) => {
    message.text("Error when installing package:   ");
  });
  ipcRenderer.on("package:installing:end", () => {
    setTimeout(() => {
      ipcRenderer.send("installing:destroy");
    }, 5000);
  });
});
