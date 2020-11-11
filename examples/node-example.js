const { Linker } = require("../dist/src/index");
const { parseText } = require("binaryen");
const assert = require("assert");

const usingAdd = `
(module
    (import "calculator" "add" (func $calc_add (param i32 i32) (result i32)))
    
    (memory 1 1)
    (export "memory" (memory 0))
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

(async () => {
  // example of using linker.define
  {
    var linker = new Linker();

    // the "usingAdd" module above imports calculator.add
    // we define it and provide a JS implementation, then
    // instantiate it.
    linker.define("calculator", "add", (a, b) => a + b);
    var calc = await linker.instantiate(parseText(usingAdd).emitBinary());

    assert.equal(calc.instance.exports.add(1, 2), 3);
  }

  // example of using linker.module
  {
    var linker = new Linker();

    // the "usingAdd" module above imports calculator.add
    // we link a module that we know exports the functionality
    // required, then instantiate the module that uses it.

    await linker.module(
      "calculator",
      new WebAssembly.Module(parseText(add).emitBinary())
    );
    var calc = await linker.instantiate(parseText(usingAdd).emitBinary());
    assert.equal(calc.instance.exports.add(1, 41), 42);
  }

  // example of using linker.instance
  {
    var linker = new Linker();
    var depsInstance = await WebAssembly.instantiate(
      new WebAssembly.Module(parseText(add).emitBinary())
    );
    linker.instance("calculator", depsInstance);
    var calc = await linker.instantiate(parseText(usingAdd).emitBinary());

    assert.equal(42, calc.instance.exports.add(1, 41), 42);
  }

  // example of using linker.alias
  {
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

    assert.equal(calc.instance.exports.add1(1, 99), 100);
    assert.equal(calc.instance.exports.add2(2, 99), 101);
  }

  // example of defining an asynchronous import,
  // made possible with Binaryen and asyncify-wasm
  {
    var useAsyncify = true;
    var linker = new Linker(useAsyncify);

    // notice how we define an asynchronous import, which
    // will wait for 1.5s before returning the result
    linker.define("calculator", "add", async (a, b) => {
      await sleep(1500);
      return a + b;
    });

    let bytes = parseText(usingAdd);

    // we perform the asyncify compiler pass from Binaryen
    bytes.runPasses(["asyncify"]);
    var calc = await linker.instantiate(bytes.emitBinary());

    assert.equal(await calc.instance.exports.add(1, 2), 3);
  }
})();

async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
