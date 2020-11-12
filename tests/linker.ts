import "mocha";
import { assert } from "chai";
import * as wat from "./wat";
import { Linker } from "../src/linker";

describe("linker tests", async () => {
  it("correctly define a single method and instantiate", async () => {
    let linker = new Linker();
    linker.define("calculator", "add", (a: number, b: number) => a + b);
    let instance = await linker.instantiate(wat.moduleFromText(wat.usingAdd));
    assert.equal(await (instance.exports["add"] as Function)(1, 2), 3);
  });

  it("correctly define an entire module and instantiate", async () => {
    let linker = new Linker();
    await linker.module("calculator", wat.moduleFromText(wat.add));
    let instance = await linker.instantiate(wat.moduleFromText(wat.usingAdd));
    assert.equal(await (instance.exports["add"] as Function)(1, 2), 3);
  });

  it("ensure the last import is chosen between identical imports", async () => {
    let linker = new Linker();
    linker.define("calculator", "add", (a: number, b: number) => 42);

    await linker.module("calculator", wat.moduleFromText(wat.add));
    let instance = await linker.instantiate(wat.moduleFromText(wat.usingAdd));
    assert.equal(await (instance.exports["add"] as Function)(1, 2), 3);
  });

  it("ensure the last import is chosen between identical imports with changed order", async () => {
    let linker = new Linker();
    await linker.module("calculator", wat.moduleFromText(wat.add));
    linker.define("calculator", "add", (a: number, b: number) => 42);
    let instance = await linker.instantiate(wat.moduleFromText(wat.usingAdd));
    assert.equal(await (instance.exports["add"] as Function)(1, 2), 42);
  });

  it("use last item when multiple identical items are defined", async () => {
    let linker = new Linker();

    linker.define("calculator", "add", (a: number, b: number) => 41);
    linker.define("calculator", "add", (a: number, b: number) => 42);
    await linker.module("calculator", wat.moduleFromText(wat.add));
    linker.define("calculator", "add", (a: number, b: number) => 43);
    let instance = await linker.instantiate(wat.moduleFromText(wat.usingAdd));
    assert.equal(await (instance.exports["add"] as Function)(1, 2), 43);
  });

  it("define an async import", async () => {
    let useAsyncify = true;
    let linker = new Linker(useAsyncify);

    linker.define("calculator", "add", async () => {
      await sleep(1500);
      return 42;
    });

    let instance = await linker.instantiate(
      wat.asyncModuleFromText(wat.usingAdd)
    );
    assert.equal(await (instance.exports["add"] as Function)(1, 2), 42);
  });

  it("add an existing instance to the linker", async () => {
    let linker = new Linker();

    let calc = await WebAssembly.instantiate(wat.moduleFromText(wat.add), {});
    linker.instance("calculator", calc);
    let instance = await linker.instantiate(wat.moduleFromText(wat.usingAdd));
    assert.equal(await (instance.exports["add"] as Function)(1, 2), 3);
  });

  it("alias modules", async () => {
    let linker = new Linker();
    await linker.module("calculator1", wat.moduleFromText(wat.add));
    linker.alias("calculator1", "calculator2");
    let instance = await linker.instantiate(
      wat.asyncModuleFromText(wat.usingAddWithAlias)
    );
    assert.equal(await (instance.exports["add"] as Function)(1, 2), 3);
  });

  it("add import object to the linker", async () => {
    let linker = new Linker();
    var importObject = {
      calculator: {
        add: (a: number, b: number) => a + b,
      },
    };

    linker.imports(importObject);
    let instance = await linker.instantiate(wat.moduleFromText(wat.usingAdd));
    assert.equal(await (instance.exports["add"] as Function)(1, 2), 3);
  });

  it("add import object with multiple imports to the linker", async () => {
    let linker = new Linker();
    var importObject = {
      calculator1: {
        add: (a: number, b: number) => a + b,
      },
      calculator2: {
        add: (a: number, b: number) => a + b,
      },
    };

    linker.imports(importObject);
    let instance = await linker.instantiate(
      wat.moduleFromText(wat.usingAddWithAlias)
    );
    assert.equal(await (instance.exports["add"] as Function)(1, 2), 3);
  });
});

async function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
