import {JsonMapper, JsonMapperMethods, JsonMapperCtx} from "@tsed/json-mapper";

@JsonMapper(BigInt)
export class BigIntTypeMapper implements JsonMapperMethods {
  deserialize(data: any, ctx: JsonMapperCtx): BigInt{
    return BigInt(data);
  }

  serialize(data: any, ctx: JsonMapperCtx): String {
    return "0x"+BigInt(data).toString(16)
  }
}

