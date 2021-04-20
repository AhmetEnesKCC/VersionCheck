import { ipcRenderer } from "electron";
import $ from "jquery";
import axios from "axios";
import _ from "lodash";
import cheerio from "cheerio";

type versions = {
  node: {
    stable: string;
    latest: string;
    link: string;
  };
  npm: {
    latest: string;
    link: string;
  };
  yarn: {
    latest: string;
    link: string;
  };
};

let versions: versions = {
  node: { latest: "", stable: "", link: "" },
  npm: { latest: "", link: "" },
  yarn: { latest: "", link: "" },
};

const get_versions = async () => {
  await axios
    .get("https://nodejs.org/en/")
    .then((response) => {
      versions.node.link = "https://nodejs.org/en/";
      const $_ = cheerio.load(response.data);
      let version: string[] = [];
      $_(".home-downloadblock").map((i, block) => {
        version.push(
          $_(block)
            .find("a")
            .text()
            .match(/[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}/)![0]
        );
      });
      versions.node.stable = version![0];
      versions.node.latest = version![1];
      ipcRenderer.send("version:package", [
        "node",
        { stable: version[0], latest: version[1] },
      ]);
    })
    .catch((err) => {
      console.error(err);
    });
  await axios
    .get("https://www.npmjs.com/package/yarn")
    .then((response) => {
      versions.yarn.link = "https://www.npmjs.com/package/yarn";
      const $_ = cheerio.load(response.data);
      let version = "";
      $_("p").map((i, block) => {
        if (/[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}/.test($_(block).text())) {
          version = $_(block)
            .text()
            .match(/[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}/)![0];
        }
      });

      versions.yarn.latest = version;
      ipcRenderer.send("version:package", ["yarn", { latest: version }]);
    })
    .catch((err) => {
      console.log(err);
    });
  await axios
    .get("https://www.npmjs.com/package/npm")
    .then((response) => {
      versions.npm.link = "https://www.npmjs.com/package/npm";

      const $_ = cheerio.load(response.data);
      let version = "";
      $_("p").map((i, block) => {
        if (/[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}/.test($_(block).text())) {
          version = $_(block)
            .text()
            .match(/[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}/)![0];
        }
      });

      versions.npm.latest = version;
      ipcRenderer.send("version:package", ["npm", { latest: version }]);
    })
    .catch((err) => {
      console.log(err);
    });
  return versions;
};

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
  if (connection === false) {
    ipcRenderer.send("disconnect");
  }
};

$(function () {
  ipcRenderer.send("main:ready");

  ipcRenderer.on("get:mode", (e, mode) => {
    changeMode(mode);
  });
  const version_function = () => {
    get_versions().then((res) => {
      ipcRenderer.send("set:versions", res);
      Object.keys(res).map((key, i) => {
        $(`.${key} .card_content`).map((e, el) => {
          let classList = $(el).attr("class")?.split(/\s+/);
          let type_of_el = classList![classList!.length - 1];
          el.innerText = res[key][type_of_el];

          el.onclick = () => {
            ipcRenderer.send("open:externalLink", {
              url: res[key].link,
              name: key,
            });
          };
        });
      });
    });
  };
  version_function();
  setInterval(version_function, 5000);
  const nav_npm = $(".nav_npm");
  const nav_node = $(".nav_node");
  const nav_yarn = $(".nav_yarn");
  const theme_button = $("header .theme_button");
  const content_node = $(".content .node");
  const content_npm = $(".content .npm");
  const content_yarn = $(".content .yarn");
  const minimize_button = $(".appbar .buttons .minimize");
  const close_button = $(".appbar .buttons .close");
  minimize_button.on("click", () => {
    ipcRenderer.send("minimize:main");
  });
  close_button.on("click", () => {
    ipcRenderer.send("close:main");
  });

  const version_info = $(".version_info");
  version_info.on("click", () => {
    ipcRenderer.send("dialog:version");
  });

  const checkboxes = $(".content .checkbox").each((i, el) => {
    el.onclick = () => {
      el.classList.toggle("check");
      el.children[0].classList.toggle("display_icon");
      const id = el.id;
      ipcRenderer.send("set:notification", id);
    };
  });
  const changeMode = (mode: "node" | "npm" | "yarn") => {
    const title = $("header .title .text");
    title.text(_.capitalize(mode + " Version Check"));
    const navs = ["node", "npm", "yarn"];
    const navs_els = [nav_node, nav_npm, nav_yarn];
    const content_els = [content_node, content_npm, content_yarn];
    // TODO found good app name
    // document.title =
    //   mode.charAt(0).toUpperCase() +
    //   mode.slice(1).toLowerCase() +
    //   " Version Check";
    $(":root").css("--theme-color", `var(--${mode}-color)`);
    for (const nav of navs) {
      const index = navs.indexOf(nav);
      if (nav === mode) {
        navs_els[index].addClass("selected");
        content_els[index].removeClass("content_hide");
      } else {
        navs_els[index].removeClass("selected");
        content_els[index].addClass("content_hide");
      }
    }
  };
  nav_node.on("click", (e) => {
    ipcRenderer.send("nav:changed", "node");
    changeMode("node");
  });
  nav_npm.on("click", (e) => {
    ipcRenderer.send("nav:changed", "npm");
    changeMode("npm");
  });
  nav_yarn.on("click", (e) => {
    ipcRenderer.send("nav:changed", "yarn");
    changeMode("yarn");
  });
  theme_button.on("click", () => {
    ipcRenderer.send("theme:changed");
  });
});

ipcRenderer.on("get:interface:theme", (e, data) => {
  const theme_button = $("header .theme_button");

  if (data === "dark") {
    $(":root").css("--app-color", "var(--app-dark)");
    $(":root").css("--text-color", "var(--text-dark)");
    theme_button.html(`<i class="fa fa-sun"></i>`);
  } else {
    $(":root").css("--app-color", "var(--app-light)");
    $(":root").css("--text-color", "var(--text-light)");
    theme_button.html(`<i class="fa fa-moon"></i>`);
  }
});

ipcRenderer.on("get:notifications", (e, val) => {
  Object.keys(val).forEach((key) => {
    Object.keys(val[key]).forEach((sub_key) => {
      if (val[key][sub_key].value == true) {
        const element = $(`#${val[key][sub_key].element}`);
        element.toggleClass("check");
        element.children().toggleClass("display_icon");
      }
    });
  });
});

ipcRenderer.on("notinstalled:package", (e, pckg) => {});

ipcRenderer.on("yourpackage:versions", (e, pckg) => {
  if (pckg.type == "error") {
    $(`.${pckg.name} .your_version`).text("You did not install this package");
  } else if (pckg.type == "response") {
    $(`.${pckg.name} .your_version`).text(pckg.version.trim());
  }
});

const runConnectionInterval = (func: () => void, interval: number): any => {
  func();
  return setInterval(func, interval);
};

var connectionInterval = runConnectionInterval(() => {
  connection_function();
}, 1000);
