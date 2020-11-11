import * as asyncify from "asyncify-wasm";
import { use } from "chai";
import { Store } from "./store";

/**
 * A JavaScript object that can be used to link WebAssembly instances.
 *
 * This is a helper class to be used when instantiating WebAssembly
 * modules with imports. It can be used to define individual imports
 * (like functions, or memories), or link entire modules when
 * instantiating modules that depend on other modules.
 */
export class Linker {
  public store: Store;
  public useAsyncify: boolean;

  constructor(useAsyncify: boolean = false, store: Store = new Store()) {
    this.useAsyncify = useAsyncify;
    this.store = store;
  }

  /**
   * Adds a new WebAssembly.ImportValue to the imports cache.
   *
   * Example:
   * ```js
const { Linker } = require("@deislabs/wasm-linker-js");
const { parseText } = require("binaryen");
const assert = require("assert");

(async () => {
  const usingAdd = `
    (module
        (import "calculator" "add" (func $calc_add (param i32 i32) (result i32))
        (export "add" (func $add))
    
        (func $add (param i32) (param i32) (result i32)
            (return
                (call $calc_add
                    (local.get 0)
                    (local.get 1)
                )
            )
        )
    )
    `;

  var linker = new Linker();

  // the "usingAdd" module above imports calculator.add
  // we define it and provide a JS implementation, then
  // instantiate it.
  linker.define("calculator", "add", (a, b) => a + b);
  var calc = await linker.instantiate(
    parseText(usingAdd).emitBinary());
  assert.equal(await calc.instance.exports.add(1, 2), 3)
   * ```
   */
  define(module: string, name: string, item: WebAssembly.ImportValue): void {
    return this.store.addImport(module, name, item);
  }

  /**
   * Instantiate and add a module to the linker's instance cache.
   * 
   * Example:
   * ```js
const { Linker } = require("@deislabs/wasm-linker-js");
const { parseText } = require("binaryen");
const assert = require("assert");

(async () => {
  const usingAdd = `
(module
    (import "calculator" "add" (func $calc_add (param i32 i32) (result i32)))
    (export "add" (func $add))

    (func $add (param i32) (param i32) (result i32)
        (return
            (call $calc_add
                (local.get 0)
                (local.get 1)
            )
        )
    )
)
`;

  const add = `
(module
  (memory 1 1)
  (export "memory" (memory 0))
  (export "add" (func $add))

  (func $add (param i32) (param i32) (result i32)
      (return
          (i32.add
              (local.get 0)
              (local.get 1)
          )
      )
  )
)
`;

  var linker = new Linker();

  // the "usingAdd" module above imports calculator.add
  // we link a module that we know exports the functionality
  // required, then instantiate the module that uses it.

  await linker.module(
    "calculator",
    new WebAssembly.Module(parseText(add).emitBinary())
  );
  var calc = await linker.instantiate(parseText(add).emitBinary());
  assert.equal(await calc.instance.exports.add(1, 41), 42);
})();
   *```
   */
  async module(name: string, module: WebAssembly.Module): Promise<void> {
    return this.store.addInstance(name, await this.instantiate(module));
  }

  /**
   * Add an instance to the linker's instance cache.
   * Example:
   * ```js
const { Linker } = require("@deislabs/wasm-linker-js");
const { parseText } = require("binaryen");
const assert = require("assert");

(async () => {
  const usingAdd = `
(module
    (import "calculator" "add" (func $calc_add (param i32 i32) (result i32)))
    (export "add" (func $add))

    (func $add (param i32) (param i32) (result i32)
        (return
            (call $calc_add
                (local.get 0)
                (local.get 1)
            )
        )
    )
)
`;

  const add = `
(module
  (memory 1 1)
  (export "memory" (memory 0))
  (export "add" (func $add))

  (func $add (param i32) (param i32) (result i32)
      (return
          (i32.add
              (local.get 0)
              (local.get 1)
          )
      )
   )
)
`;

    var linker = new Linker();
    var depsInstance = await WebAssembly.instantiate(
      new WebAssembly.Module(parseText(add).emitBinary())
    );
    linker.instance("calculator", depsInstance);
    var calc = await linker.instantiate(parseText(usingAdd).emitBinary());

    assert.equal(await calc.instance.exports.add(1, 41), 42);
})();
   *```
   */
  instance(name: string, instance: WebAssembly.Instance): void {
    return this.store.addInstance(name, instance);
  }

  /**
   * Alias all exports from one module as another.
   * Example:
   * ```js
const { Linker } = require("@deislabs/wasm-linker-js");
const { parseText } = require("binaryen");
const assert = require("assert");

(async () => {
  const add = `
(module
  (memory 1 1)
  (export "memory" (memory 0))
  (export "add" (func $add))
  
  (func $add (param i32) (param i32) (result i32)
      (return
          (i32.add
              (local.get 0)
              (local.get 1)
          )
      )
  )
)
`;

  const usingAddWithAlias = `
(module
    (import "calculator1" "add" (func $calc_add1 (param i32 i32) (result i32)))
    (import "calculator2" "add" (func $calc_add2 (param i32 i32) (result i32)))

    (memory 1 1)
    (export "memory" (memory 0))

    (export "add1" (func $add1))
    (export "add2" (func $add2))

    (func $add1 (param i32) (param i32) (result i32)
        (return
            (call $calc_add1
                (local.get 0)
                (local.get 1)
            )
        )
    )

    (func $add2 (param i32) (param i32) (result i32)
        (return
            (call $calc_add2
                (local.get 0)
                (local.get 1)
            )
        )
    )
)
`;

    var linker = new Linker();
    // we first define the module that implements `add` as `calculator1`
    await linker.module(
      "calculator1",
      new WebAssembly.Module(parseText(add).emitBinary())
    );
    // we alias `calculator1` as `calculator2`
    linker.alias("calculator1", "calculator2");
    var calc = await linker.instantiate(
      parseText(usingAddWithAlias).emitBinary()
    );

    assert.equal(await calc.instance.exports.add1(1, 99), 100);
    assert.equal(await calc.instance.exports.add2(2, 99), 101);
})();
   *```
   */
  alias(module: string, asModule: string): void {
    return this.store.aliasModule(module, asModule);
  }

  /**
   * Instantiate a WebAssembly module.
   *
   * This function iterates through the module's imports and performs
   * name based resolution in trying to satisfy all module imports.
   * First, it searches
   *
   * This function iterates through the module's imports and does a
   * name based import resolution based on the exported items of the
   * modules in the store's instance cache, and passes the store's
   * imports cache when actually instantiates the module.
   */
  async instantiate(module: WebAssembly.Module): Promise<WebAssembly.Instance> {
    return this.useAsyncify
      ? await asyncify.instantiate(module, this.store.imports)
      : await WebAssembly.instantiate(module, this.store.imports);
  }

  // This is currently unused.
  // If we were to use this type of resolution, we would always
  // have to make an explicit choice between first adding imports
  // defined by the user versus those coming from modules (imports
  // not manually defined by a user, but automatically resolved by name).
  //
  // See the implementation of Store.addInstance, but in short,
  // in the case of identical import names, the one defined last
  // will be used, regardless of whether it was explicitly
  // defined using `defined` or with `module`.
  //
  // Leaving this function here for completeness.
  // @ts-ignore
  private resolveImports(module: WebAssembly.Module): void {
    let imports = WebAssembly.Module.imports(module);
    imports.forEach((im) => {
      if (
        this.store.instances[im.module] !== undefined &&
        this.store.instances[im.module].exports[im.name] !== undefined
      ) {
        this.define(
          im.module,
          im.name,
          this.store.instances[im.module].exports[im.name]
        );
      }
    });
  }
}
