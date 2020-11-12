import "mocha";
import { assert } from "chai";
import { Store } from "../src/store";
import * as wat from "./wat";

describe("store tests", async () => {
  it("a new store contains zero imports and instances in cache", () => {
    let store = new Store();
    assert.equal(Object.keys(store.imports).length, 0);
    assert.equal(Object.keys(store.instances).length, 0);
  });

  it("the length of the import cache for a new store with one import defined is one", () => {
    let store = new Store();
    store.addImport("module1", "function1", () => {});
    assert.equal(Object.keys(store.imports).length, 1);
    assert.equal(Object.keys(store.imports["module1"]).length, 1);
    assert.equal(Object.keys(store.instances).length, 0);
  });

  it("a function import is properly added in the import cache", () => {
    let store = new Store();
    let fn = (a: number, b: number) => a + b;
    store.addImport("module1", "function1", fn);
    assert.equal(store.imports["module1"]["function1"], fn);
  });

  it("a memory import is properly added in the import cache", () => {
    let store = new Store();
    let memory = new WebAssembly.Memory({ initial: 10, maximum: 100 });
    store.addImport("some-module-import", "memory", memory);
    assert.equal(store.imports["some-module-import"]["memory"], memory);
  });

  it("the length of the instance cache for a new store with one instance defined with one export is one", async () => {
    let store = new Store();
    let module = wat.moduleFromText(wat.add);
    store.addInstance("calculator", await WebAssembly.instantiate(module, {}));

    assert.equal(Object.keys(store.imports).length, 1);
    assert.equal(Object.keys(store.instances).length, 1);
  });

  it("a module alias creates entry for the alias", () => {
    let store = new Store();
    let fn1 = (a: number, b: number) => a + b;
    let fn2 = (a: number, b: number) => a * b;
    store.addImport("calculator1", "function1", fn1);
    store.addImport("calculator1", "function2", fn2);

    store.aliasModule("calculator1", "calculator2");
    assert.equal(Object.keys(store.imports["calculator2"]).length, 2);
    assert.equal(store.imports["calculator2"]["function1"], fn1);
    assert.equal(store.imports["calculator2"]["function2"], fn2);
  });

  it("an import object is correctly added to the store", () => {
    let store = new Store();

    let name = "someModule";
    let fnName = "imported_func";
    let fn = () => {};

    let importObject = {
      [name]: {
        [fnName]: fn,
      },
    };

    store.addImportObject(importObject);

    assert.equal(Object.keys(store.imports).length, 1);
    assert.equal(Object.keys(store.imports["someModule"]).length, 1);
    assert.equal(store.imports[name][fnName], fn);
  });
});
