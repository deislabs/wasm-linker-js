# A simple WebAssembly Linker in JavaScript

This is _an experimental_ JavaScript library that helps instantiating
WebAssembly modules with imports by providing functionality to link JavaScript
objects (functions, memories, globals) as imports, as well as automatically
perform name based resolution for linking entire modules.

The API loosely follows the [Wasmtime][wasmtime] linker, (see the [linker
documentation][wasmtime-linker]), and it exposes asynchronous import
functionality enabled by [Binaryen][binaryen] and [Asyncify][asyncify].

### Using the Linker

> For more examples of using the Linker in both TypeScript and JavaScript, check
> the [linker tests][linker-tests] and the [NodeJS examples][node-examples].

#### Defining a single import

Assuming we are trying to instantiate the module represented in its text format
below (transformed to its binary representation using [Binaryen][binaryen]), we
can satisfy its import using the `define` method available on the linker:

```js
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
var linker = new Linker();

// The "usingAdd" module imports calculator.add.
// We define it,  provide a JS implementation, then
// instantiate it.
linker.define("calculator", "add", (a, b) => a + b);
var calc = await linker.instantiate(parseText(usingAdd).emitBinary());

assert.equal(calc.instance.exports.add(1, 2), 3);
```

#### Linking an entire module

If we have a compiled module that exports items (defined below in its text
format and contained in the `add` constant) that our initial module needs to
import, we can add it to the linker, then continue instantiating our module
(defined above in its text format and contained in the `usingAdd` constant):

```js
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

// The "usingAdd" module above imports calculator.add.
// We link a module that exports the functionality
// required, then instantiate the module that uses it.
await linker.module(
  "calculator",
  new WebAssembly.Module(parseText(add).emitBinary())
);
var calc = await linker.instantiate(parseText(usingAdd).emitBinary());
assert.equal(calc.instance.exports.add(1, 41), 42);
```

### Defining asynchronous imports

The current WebAssembly MVP does not have a way of waiting for the execution of
asynchronous imports (see [this issue][async-wasm-issue]). To enable this
functionality, [Binaryen][binaryen] has a pass that [transforms a Wasm module
and allows it to pause and resume by unwiding and rewinding the call
stack][asyncify-blog]. When enabled, this library can use the [JavaScript
wrapper of Asyncify][asyncify] and define asynchronous import functions for
WebAssembly modules (note that the Asyncify pass must have been applied to the
module before instantiating using the linker):

```js
var useAsyncify = true;
var linker = new Linker(useAsyncify);

// Notice how we define an asynchronous import, which
// will wait for 1.5s before returning the result.
linker.define("calculator", "add", async (a, b) => {
  await sleep(1500);
  return a + b;
});

let bytes = parseText(usingAdd);

// we perform the asyncify compiler pass from Binaryen
bytes.runPasses(["asyncify"]);
var calc = await linker.instantiate(bytes.emitBinary());

assert.equal(await calc.instance.exports.add(1, 2), 3);
```

The linker also allows adding an already instantiated module, through the
`instance` method, and aliasing a module under a new name, through the `alias`
method. All public methods defined on the Linker have a correspondent in the
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
- **This library is experimental, and the API is not stable**.

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
