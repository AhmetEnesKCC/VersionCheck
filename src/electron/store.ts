const electron = require("electron");
const path = require("path");

const fs = require("fs");

type store_options = {
  configName: string;
  defaults: {};
};

class Store {
  data: string;
  file_path: string;
  defaults: {};
  constructor(options: store_options) {
    const userDataPath = (electron.app || electron.remote.app).getPath(
      "userData"
    );
    this.defaults = options.defaults;
    this.file_path = path.join(userDataPath, options.configName + ".json");
    this.data = parseDataFile(this.file_path, options.defaults);
  }
  get(key: string) {
    return this.data[key];
  }

  async set(key: string, value: string) {
    this.data[key] = value;
    try {
      fs.writeFileSync(this.file_path, JSON.stringify(this.data));
    } catch (err) {
      console.log(err);
    }
  }
  async setInner(key: string, value: string, parent: string) {
    this.data[parent][key] = value;
    try {
      fs.writeFileSync(this.file_path, JSON.stringify(this.data));
    } catch (err) {
      console.log(err);
    }
  }
  async reset(key: string) {
    this.data[key] = this.defaults[key];
  }
}

const parseDataFile = (filePath: string, defaults: {}) => {
  try {
    return JSON.parse(fs.readFileSync(filePath).toString());
  } catch (err) {
    return defaults;
  }
};

export default Store;
