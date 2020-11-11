path = require("path");
module.exports = {
  entry: "./src/index.ts",
  devtool: "inline-source-map",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    modules: [path.resolve(__dirname, "./src"), "node_modules"],
    extensions: [".ts", ".js"],
  },
  output: {
    filename: "wasm-linker.js",
    path: path.resolve(__dirname, "dist"),
    libraryTarget: "umd",
  },
};
