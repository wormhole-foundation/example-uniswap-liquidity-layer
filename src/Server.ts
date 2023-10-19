import {join} from "path";
import {Configuration, Inject} from "@tsed/di";
import {PlatformApplication} from "@tsed/common";
import "@tsed/platform-koa"; // /!\ keep this import
import "@tsed/ajv";
import "@tsed/swagger";
import "@tsed/terminus";
import "@tsed/json-mapper";
import {config} from "./config/index";
import * as api from "./controllers/api/index";
import * as pages from "./controllers/pages/index";
import "@tsed/objection";

@Configuration({
  ...config,
  acceptMimes: ["application/json"],
  httpPort: config.options.port,
  httpsPort: false, // CHANGE
  disableComponentsScan: true,
  mount: {
    "/api": [
      ...Object.values(api)
    ],
    "/": [
      ...Object.values(pages)
    ]
  },
  swagger: [
    {
      path: "/doc",
      specVersion: "3.0.1",
    }
  ],
  terminus: {
    path: "/health"
  },
  middlewares: [
    "@koa/cors",
    "koa-compress",
    "koa-override",
    "koa-bodyparser"
  ],
  knex: {
    client: "sqlite3",
    connection: ":memory:"
  },
  views: {
    root: join(process.cwd(), "../views"),
    extensions: {
      ejs: "ejs"
    }
  },
  exclude: [
    "**/*.spec.ts"
  ],
  ajv:{},
  jsonMapper: {
    additionalProperties: false,
    disableUnsecureConstructor: false,
  }
})
export class Server {
  @Inject()
  protected app: PlatformApplication;

  @Configuration()
  protected settings: Configuration;
}

