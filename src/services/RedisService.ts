import { RedisClientType } from "@redis/client";
import { Service} from "@tsed/di";
import { Class } from "estree";
import { createClient } from "redis";
import { config } from "src/config";

@Service()
export class RedisService {
  public readonly client

  constructor() {
    this.client = createClient({
      url:config.options.redisUrl
    })
  }

  public get json() {
    return this.client.json
  }

  public jset(typ:Class) {

  }

  public get jget() {
    return this.client.json.get
  }

  public get jnumIncrBy() {
    return this.client.json.numIncrBy
  }

}
