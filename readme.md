# wasm-linker-js

### A simple WebAssembly Linker in JavaScript

![actions badge][actions-badge] [![NPM version][npm-image]][npm]

This is _an experimental_ JavaScript library that helps instantiating
WebAssembly modules with imports by providing functionality to link JavaScript
objects (functions, memories, globals) as imports, as well as automatically
perform name based resolution for linking entire modules.

The API loosely follows the [Wasmtime][wasmtime] linker, (see the [linker
documentation][wasmtime-linker]), and it exposes asynchronous import
functionality enabled by [Binaryen][binaryen] and [Asyncify][asyncify].

### Using the Linker

> For more examples of using the Linker in both TypeScript and JavaScript, check
> the [linker tests][linker-tests] and the [Node.js examples][node-examples].

First, add the package to your project:

```plaintext
$ npm install @deislabs/wasm-linker-js
```

> Note that in order to run the examples shown here, `binaryen` is also required
> (`npm install binaryen`), in order to show the text format of the WebAssembly
> modules. In real world scenarios that is not necessary, and the modules can be
> compiled from their binary representation without additional dependencies.

#### Defining a single import

Assuming we are trying to instantiate the module represented in its text format
below (transformed to its binary representation using [Binaryen][binaryen]), we
can satisfy its import using the `define` method available on the linker:

```js
const { Linker } = require("@deislabs/wasm-linker-js");
const { parseText } = require("binaryen");

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

(async () => {
  var linker = new Linker();

  // The "usingAdd" module imports calculator.add.
  // We define it,  provide a JS implementation, then
  // instantiate it.
  linker.define("calculator", "add", (a, b) => a + b);
  var calc = await linker.instantiate(parseText(usingAdd).emitBinary());

  var result = calc.instance.exports.add(1, 2);
  console.log(result);
})();
```

#### Linking an entire module

If we have a compiled module that exports items (defined below in its text
format and contained in the `add` constant) that our initial module needs to
import, we can add it to the linker, then continue instantiating our module
(defined above in its text format and contained in the `usingAdd` constant):

```js
const { Linker } = require("@deislabs/wasm-linker-js");
const { parseText } = require("binaryen");

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

(async () => {
  var linker = new Linker();

  // The "usingAdd" module above imports calculator.add.
  // We link a module that exports the functionality
  // required, then instantiate the module that uses it.
  await linker.module(
    "calculator",
    new WebAssembly.Module(parseText(add).emitBinary())
  );
  var calc = await linker.instantiate(parseText(usingAdd).emitBinary());
  var result = calc.instance.exports.add(1, 2);
  console.log(result);
})();
```

#### Defining asynchronous imports

The current WebAssembly MVP does not have a way of waiting for the execution of
asynchronous imports (see [this issue][async-wasm-issue]). To enable this
functionality, [Binaryen][binaryen] has a pass that [transforms a Wasm module
and allows it to pause and resume by unwiding and rewinding the call
stack][asyncify-blog]. When enabled, this library can use the [JavaScript
wrapper of Asyncify][asyncify] and define asynchronous import functions for
WebAssembly modules (note that the Asyncify pass must have been applied to the
module before instantiating using the linker):

```js
const { Linker } = require("@deislabs/wasm-linker-js");
const { parseText } = require("binaryen");

(async () => {
  var useAsyncify = true;
  var linker = new Linker(useAsyncify);

  // Notice how we define an asynchronous import, which
  // will wait for 1.5s before returning the result.
  var sleep = function (ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  };
  linker.define("calculator", "add", async (a, b) => {
    await sleep(1500);
    return a + b;
  });

  let bytes = parseText(usingAdd);

  // we perform the asyncify compiler pass from Binaryen
  bytes.runPasses(["asyncify"]);
  var calc = await linker.instantiate(bytes.emitBinary());

  var result = await calc.instance.exports.add(1, 2);
  console.log(result);
})();
```

The linker also allows adding an already instantiated module, through the
`instance` method, and aliasing a module under a new name, through the `alias`
method. Most public methods defined on the Linker have a correspondent in the
[Wasmtime][wasmtime] Linker, and we try to keep the APIs similar.

### Implementation notes and known issues

- When defining multiple import items with the same name, the last one takes
  precedence (the existing items are replaced). This behavior could change in
  the future to add a configurable property defining whether import shadowing
  should be allowed.
- When instantiating a linker with Asyncify enabled, _all_ modules linked and
  instantiated with the linker will be instantiated using Asyncify's JavaScript
  wrapper. This behavior could change in the future to allow a per-instance (and
  by extension per module linked) setting for Asyncify. (this can be avoided
  through instantiating a module separately and adding it to the linker using
  the `instance` method).
- There is a [browser example in the `examples/` directory][browser-demo] in
  this repository. While functional, the implementation is far from ideal - the
  linker does not currently expose streaming methods, and the WebPack
  configuration for generating a browser-compatible library is not optimal (this
  should be changed to use ECMAScript modules).
- **This library is experimental, and the API is not stable**. We welcome
  feedback on both the public API and the implementation of this library.

### Contributing

This project welcomes contributions through the GitHub pull request process.
Prerequisites to building the project:

- Node.js
- `npm`

To iterate on the project locally:

```plaintext
$ npm run build
$ npm test
$ npm run examples
```

### Code of Conduct

This project has adopted the
[Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).

For more information see the
[Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any
additional questions or comments.

[wasmtime]: https://github.com/bytecodealliance/wasmtime
[wasmtime-linker]: https://docs.rs/wasmtime/0.21.0/wasmtime/
[binaryen]: https://github.com/WebAssembly/binaryen
[asyncify]: https://github.com/GoogleChromeLabs/asyncify
[async-wasm-issue]: https://github.com/WebAssembly/design/issues/720
[asyncify-blog]: https://kripken.github.io/blog/wasm/2019/07/16/asyncify.html
[browser-demo]: examples/index.html
[node-examples]: examples/node-example.js
[linker-tests]: tests/linker.ts
[npm-image]: https://badge.fury.io/js/%40deislabs%2Fwasm-linker-js.svg
[npm]: https://www.npmjs.com/package/@deislabs/wasm-linker-js
[actions-badge]:
  https://github.com/deislabs/wasm-linker-js/workflows/Build%20and%20Test/badge.svg
