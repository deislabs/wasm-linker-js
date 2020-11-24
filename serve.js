// A simple web server that serves Wasm modules
// using the appropriate MIME type.
//
// Used to run the browser example, which fetches
// WebAssembly modules and instantiates them.

var express = require("express");
var app = express();
express.static.mime.types["wasm"] = "application/wasm";
app.use(express.static(__dirname + "/"));
app.listen(8080);
