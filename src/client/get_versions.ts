import axios from "axios";
import cheerio from "cheerio";

type versions = {
  node: {
    stable: string;
    latest: string;
  };
  npm: {
    latest: string;
  };
  yarn: {
    latest: string;
  };
};

let versions: versions = {
  node: { latest: "", stable: "" },
  npm: { latest: "" },
  yarn: { latest: "" },
};

const get_versions = async () => {
  await axios
    .get("https://nodejs.org/en/")
    .then((response) => {
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
    })
    .catch((err) => {
      console.error(err);
    });
  await axios
    .get("https://www.npmjs.com/package/yarn")
    .then((response) => {
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
    })
    .catch((err) => {
      console.log(err);
    });
  await axios
    .get("https://www.npmjs.com/package/npm")
    .then((response) => {
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
    })
    .catch((err) => {
      console.log(err);
    });
  return versions;
};

export default get_versions;
