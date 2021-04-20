import Store from "./store";
import electron, {
  BrowserWindow,
  app as electron_app,
  ipcMain,
  dialog,
  shell,
  Notification,
  Tray,
  Menu,
  nativeTheme,
  remote,
  webContents,
} from "electron";
import path from "path";
import ch_process from "child_process";
import AutoLauncher from "auto-launch";

//   add auto launch
type BrowserWO = electron.BrowserWindowConstructorOptions;

var main_dir = path.join(__dirname, "..", "..");
var site_path = path.join(__dirname, "..", "..", "site-content");

const isDev = process.env.NODE_ENV === "development";
const isMac = process.platform === "darwin";

var app = electron_app;
let autoLauncher = new AutoLauncher({
  name: "Version Check",
  path: app.getPath("exe"),
});

nativeTheme.themeSource = "dark";

if (handleSquirrelEvent(app)) {
  // squirrel event handled and app will exit in 1000ms, so don't do anything else
  return;
}
var mainWindow: BrowserWindow;
var loadingWindow: BrowserWindow;
let installingWindow: BrowserWindow;
let settingsWindow: BrowserWindow;
let tray;
// Stores

const user_store = new Store({
  configName: "user-settings",
  defaults: {
    run_on_startup: false,
    minimize_on_close: false,
    nav: "node",
    notification_timeout: 1000 * 30 * 60,
    versions: {
      node: {
        installed: "",
        stable: "",
        latest: "",
      },
      npm: {
        installed: "",
        latest: "",
      },
      yarn: {
        latest: "",
      },
    },
    notifications: {
      node: {
        stable: {
          value: false,
          element: "node-1",
          latest_notification: Date.now(),
        },
        latest: {
          value: false,
          element: "node-2",
          latest_notification: Date.now(),
        },
      },
      npm: {
        latest: {
          value: false,
          element: "npm-1",

          latest_notification: Date.now(),
        },
      },
      yarn: {
        latest: {
          value: false,
          element: "yarn-1",

          latest_notification: Date.now(),
        },
      },
    },
  },
});

const interface_store = new Store({
  configName: "interface-settings",
  defaults: {
    theme: "dark",
  },
});

const createLoadingWindow = () => {
  var loadingWindowOptions: BrowserWO = {
    width: 300,
    height: 200,
    center: true,
    movable: false,
    alwaysOnTop: true,
    frame: false,
    resizable: false,
    transparent: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      devTools: isDev,
    },
  };

  loadingWindow = new BrowserWindow(loadingWindowOptions);
  loadingWindow.loadFile(path.join(site_path, "loading.html"));
  isDev && loadingWindow.webContents.openDevTools();
};

const createMainWindow = () => {
  var mainWindowOptions: BrowserWO = {
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      devTools: isDev,
    },
    transparent: false,
    frame: false,
    width: 500,
    height: 570,
    alwaysOnTop: true,
    resizable: false,
    maxWidth: 500,
    maxHeight: 570,
    minWidth: 500,
    minHeight: 570,
  };
  mainWindow = new BrowserWindow(mainWindowOptions);
  mainWindow.loadFile(path.join(site_path, "index.html"));
  isDev && mainWindow.webContents.openDevTools();
  mainWindow.on("minimize", (e) => {
    e.preventDefault();
    mainWindow.minimize();
  });
  mainWindow.on("close", (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    } else {
      app.quit();
    }
  });
};

const createSettingsWindow = () => {
  settingsWindow = new BrowserWindow({
    width: 400,
    height: 550,
    alwaysOnTop: true,
    frame: false,
    transparent: false,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  settingsWindow.loadFile(path.join(site_path, "settings.html"));
  settingsWindow.show();
};

app.whenReady().then(() => {
  tray = new Tray(
    path.join(__dirname, "..", "..", "build-contents", "favicon.ico")
  );
  const checked_ros = user_store.get("run_on_startup");
  const checked_moc = user_store.get("minimize_on_close");
  console.log(checked_moc);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Quit",
      type: "normal",

      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
    // {
    //   label: "Run on startup",
    //   type: "checkbox",
    //   checked: checked_ros === true || checked_ros === "true",
    //   click: (e) => {
    //     user_store.set("run_on_startup", String(e.checked));
    //     if (e.checked == true) {
    //       autoLauncher.enable();
    //     } else {
    //       autoLauncher.disable();
    //     }
    //   },
    // },
    // {
    //   label: "Hide on close",
    //   type: "checkbox",
    //   checked: checked_moc === "true" || checked_moc === true,
    //   click: (e) => {
    //     user_store.set("minimize_on_close", String(e.checked));
    //     app.isQuitting = !e.checked;
    //   },
    // },
    {
      label: "Settings",
      type: "normal",
      click: () => {
        if (
          !settingsWindow ||
          (settingsWindow && settingsWindow.isDestroyed())
        ) {
          createSettingsWindow();
        }
      },
    },
  ]);

  tray.setToolTip("Version Check");
  tray.setContextMenu(contextMenu);
});

app.on("ready", () => {
  // createSettingsWindow();
  createLoadingWindow();
  loadingWindow.webContents.once("dom-ready", () => {
    const theme = interface_store.get("theme");
    loadingWindow.webContents.send("get:theme", theme);
  });
});

app.on("window-all-closed", () => {
  if (isMac) {
    app.quit();
  }
});

ipcMain.on("connect", () => {
  loadingWindow.destroy();
  createMainWindow();
});

ipcMain.on("disconnect", () => {
  mainWindow.destroy();
  createLoadingWindow();
});

ipcMain.on("loading:ready", () => {
  const theme = interface_store.get("theme");
  loadingWindow.webContents.send("get:interface:theme", theme);
});

ipcMain.on("main:ready", () => {
  tray.on("click", () => {
    mainWindow.show();
  });
  setInterval(() => {
    ch_process.exec("yarn --version", (err, res) => {
      if (!err) {
        const settings = user_store.get("versions");
        settings.yarn.installed = res.trim();
        user_store.set("versions", settings);
      } else {
        const settings = user_store.get("versions");
        settings.yarn.installed = "";
        user_store.set("versions", settings);
        mainWindow.webContents.send("notinstalled:package", "yarn");
      }
    });
    ch_process.exec("npm --version", (err, res) => {
      if (!err) {
        const settings = user_store.get("versions");
        settings.npm.installed = res.trim();
        user_store.set("versions", settings);
      } else {
        const settings = user_store.get("versions");
        settings.npm.installed = "";
        user_store.set("versions", settings);
        mainWindow.webContents.send("notinstalled:package", "npm");
      }
    });
    ch_process.exec("node --version", (err, res) => {
      if (!err) {
        const settings = user_store.get("versions");
        settings.node.installed = res.trim();
        user_store.set("versions", settings);
      } else {
        const settings = user_store.get("versions");
        settings.node.installed = "";
        user_store.set("versions", settings);
        mainWindow.webContents.send("notinstalled:package", "node");
      }
    });
  }, 5000);
  const theme = interface_store.get("theme");
  const nav = user_store.get("nav");
  const notifications = user_store.get("notifications");
  mainWindow.webContents.send("get:interface:theme", theme);
  mainWindow.webContents.send("get:mode", nav);
  mainWindow.webContents.send("get:notifications", notifications);
});

ipcMain.on("nav:changed", (e, nav) => {
  const nav_ = user_store.get("nav");
  user_store.set("nav", nav);
});

ipcMain.on("theme:changed", (e) => {
  const theme = interface_store.get("theme");

  const theme_switch = {
    dark: "light",
    light: "dark",
  };

  interface_store.set("theme", theme_switch[theme]);
  mainWindow.webContents.send("get:interface:theme", theme_switch[theme]);

  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send("set:theme", theme_switch[theme]);
  }
});

ipcMain.on("settings:new", (e, settings) => {
  user_store.set("notification_timeout", String(settings.timeout * 1000));
  user_store.set("run_on_startup", String(settings.runOnStartup));
  user_store.set("minimize_on_close", String(settings.hideOnClose));
  if (settings.runOnStartup == true) {
    autoLauncher.enable();
  } else {
    autoLauncher.disable();
  }
  app.isQuitting = !settings.hideOnClose;
  console.log(settings);
});

ipcMain.on("set:notification", (e, id) => {
  const splitted_name = id.split("-");
  const name = splitted_name[0];
  const number = splitted_name[1];
  const notifications = user_store.get("notifications");
  Object.keys(notifications[name]).forEach((val: any, index) => {
    if (val != "version") {
      if (notifications[name][val].element === id) {
        notifications[name][val].value = !notifications[name][val].value;
      }
    }
  });

  user_store.set("notifications", notifications);
});

ipcMain.on("open:externalLink", (e, link) => {
  dialog
    .showMessageBox(new BrowserWindow({ show: false, alwaysOnTop: true }), {
      buttons: ["Yes", "No"],
      message: `Do you want to open url for ${link.name}?`,
      title: "Version Check",
    })
    .then((data) => {
      if (data.response == 0) {
        shell.openExternal(link.url);
      }
    });
});

ipcMain.on("dialog:version", (e, vers) => {
  const current_package = user_store.get("nav");
  let message;
  let is_installed: boolean = true;
  ch_process.exec(current_package + " --version", (err, res) => {
    if (err) {
      message = "You did not install that package";
      is_installed = false;
    } else {
      message = `Your ${current_package} version is: ${res.trim()}`;
    }

    dialog
      .showMessageBox(new BrowserWindow({ show: false, alwaysOnTop: true }), {
        buttons: is_installed === false ? ["Install now", "Close"] : ["Got It"],
        message: message,
        defaultId: 0,
        cancelId: 1,
      })
      .then((res) => {
        if (!is_installed && res.response == 0) {
          installingWindow = new BrowserWindow({
            frame: false,
            width: 300,
            height: 200,
            alwaysOnTop: true,
            transparent: false,
            webPreferences: {
              nodeIntegration: true,
              contextIsolation: false,
              devTools: isDev,
            },
          });
          installingWindow.loadFile(path.join(site_path, "installing.html"));
          installingWindow.show();
        }
      });
  });
});

ipcMain.on("installing:ready", (e) => {
  const current_package = user_store.get("nav");
  let commands = {
    node: "choco install node",
    npm: "choco install node",
    yarn: "npm install yarn -g",
  };
  let command = commands[current_package];
  installingWindow.webContents.send(
    "package:installing:package",
    current_package
  );
  ch_process
    .exec(command)
    .stdout?.on("error", () => {
      installingWindow.webContents.send(
        "package:installing:error",
        current_package
      );
    })
    .on("close", () => {
      installingWindow.webContents.send(
        "package:installing:success",
        current_package
      );
    })
    .on("end", () => {
      installingWindow.webContents.send("package:installing:end");
    });
});

ipcMain.on("installing:destroy", () => {
  installingWindow.destroy();
});

ipcMain.on("version:package", (e, ver) => {
  let notification = new Notification();
  notification.title = "New version available!";
  let versions = user_store.get("versions");
  let notifications = user_store.get("notifications");
  let timeout = user_store.get("notification_timeout");
  let package_name = ver[0];
  let package_versions = ver[1];
  Object.keys(package_versions).forEach((key) => {
    if (
      notifications[package_name][key].latest_notification <=
        Date.now() - timeout &&
      notifications[package_name][key].value === true &&
      versions[package_name][key] !== package_versions[key]
    ) {
      notifications[package_name][key].latest_notification = Date.now();
      notification.body = `${package_name} has a new update: ${ver[1][key]}`;
      notification.show();
      user_store.set("notifications", notifications);
    }
  });
  Object.keys(ver[1]).forEach((key) => {
    versions[package_name][key] = package_versions[key];
  });
});

ipcMain.on("minimize:main", () => {
  mainWindow.minimize();
});
ipcMain.on("close:main", () => {
  app.quit();
});

ipcMain.on("settings:ready", () => {
  const settings: any = {};
  settings.timeout = user_store.get("notification_timeout");
  settings.runOnStartup = user_store.get("run_on_startup");
  settings.hideOnClose = user_store.get("minimize_on_close");
  settingsWindow.webContents.send("settings:get", settings);
  const theme = interface_store.get("theme");
  settingsWindow.webContents.send("set:theme", theme);
});

function handleSquirrelEvent(application) {
  if (process.argv.length === 1) {
    return false;
  }

  const ChildProcess = require("child_process");
  const path = require("path");

  const appFolder = path.resolve(process.execPath, "..");
  const rootAtomFolder = path.resolve(appFolder, "..");
  const updateDotExe = path.resolve(path.join(rootAtomFolder, "Update.exe"));
  const exeName = path.basename(process.execPath);

  const spawn = function (command, args) {
    let spawnedProcess, error;

    try {
      spawnedProcess = ChildProcess.spawn(command, args, {
        detached: true,
      });
    } catch (error) {}

    return spawnedProcess;
  };

  const spawnUpdate = function (args) {
    return spawn(updateDotExe, args);
  };

  const squirrelEvent = process.argv[1];
  switch (squirrelEvent) {
    case "--squirrel-install":
    case "--squirrel-updated":
      // Optionally do things such as:
      // - Add your .exe to the PATH
      // - Write to the registry for things like file associations and
      //   explorer context menus

      // Install desktop and start menu shortcuts
      spawnUpdate(["--createShortcut", exeName]);

      setTimeout(application.quit, 1000);
      return true;

    case "--squirrel-uninstall":
      // Undo anything you did in the --squirrel-install and
      // --squirrel-updated handlers

      // Remove desktop and start menu shortcuts
      spawnUpdate(["--removeShortcut", exeName]);

      setTimeout(application.quit, 1000);
      return true;

    case "--squirrel-obsolete":
      // This is called on the outgoing version of your app before
      // we update to the new version - it's the opposite of
      // --squirrel-updated

      application.quit();
      return true;
  }
}

ipcMain.on("settings:close", () => {
  settingsWindow.destroy();
});
