import { Inject, Service} from "@tsed/di";
import { Class } from "estree";
import { createClient } from "redis";
import { config } from "src/config";

import {Configuration, registerProvider} from "@tsed/di";

const CONNECTION = Symbol.for("CONNECTION");

registerProvider({
  provide: CONNECTION,
  deps: [Configuration],
  async useAsyncFactory(settings: Configuration) {
    const options = settings.get("myOptions");
    const connection = createClient({
      url:config.options.redisUrl
    })

    await connection.connect();

    return connection;
  }
});

@Service()
export class RedisService {
  public readonly client = createClient({
      url:config.options.redisUrl
    })

  constructor(@Inject(CONNECTION) connection: any) {
    this.client = connection
  }

}

