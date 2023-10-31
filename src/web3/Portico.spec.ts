import { encodeFlagSet } from "./Portico"

describe("flag set", ()=>{
  it("encodes", ()=>{
    const set = encodeFlagSet(
      10,
      12345,
      100,
      100,
      10,
      10,
      true,
      true,
    )
    expect(set.length).toBe(64+2)
    expect(set).toBe("0x0a00393000006400006400000a000a0000000000000000000000000000000003")
  })
})
