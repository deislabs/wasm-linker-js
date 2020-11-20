"use strict";
const { WASI } = require("wasi");
const { Linker } = require("../dist/src/index");
const fs = require("fs");
const wasi = new WASI();

(async () => {
  var linker = new Linker();
  linker.imports({ wasi_snapshot_preview1: wasi.wasiImport });

  const wasi_hello = await WebAssembly.compile(
    fs.readFileSync("./wasi_hello.wasm")
  );

  var instance = await linker.instantiate(wasi_hello);
  wasi.start(instance);
})();
