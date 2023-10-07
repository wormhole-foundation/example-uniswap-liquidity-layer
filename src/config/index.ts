import {readFileSync} from "fs";
import {envs} from "./envs/index";
import loggerConfig from "./logger/index";
import {ParsedOptions} from "./cli"
const pkg = JSON.parse(readFileSync("./package.json", {encoding: "utf8"}));

export const config = {
  version: pkg.version,
  envs,
  logger: loggerConfig,
  // additional shared configuration
  options: ParsedOptions,
};
