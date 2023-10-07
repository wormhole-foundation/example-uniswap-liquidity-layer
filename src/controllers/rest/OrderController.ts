import {Controller} from "@tsed/di";
import {Get} from "@tsed/schema";

@Controller("/order")
export class OrderController {
  @Get("/")
  get() {
    return "hello";
  }
}
