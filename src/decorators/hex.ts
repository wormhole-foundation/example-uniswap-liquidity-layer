import {Keyword, KeywordMethods} from "@tsed/ajv";
import { CustomKey } from "@tsed/schema";

@Keyword({
  keyword: "sized_hex",
  type:"string",
  schemaType: "string",
  metaSchema: {
    type: "string",
    pattern: '0x[a-f0-9]'
  },
})
export class HexKeyword implements KeywordMethods {
  compile(size?: number) {
    return (data: any) => {
      if(size && size > 0){
        return data.length == size + 2
      }else {
        return true
      }
    }
  }
}

export function Hex(size?: number) {
  return CustomKey("sized_hex", size);
}
