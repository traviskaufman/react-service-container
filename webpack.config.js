const path = require("path");
const fileName = require("./package.json").name;
const { merge } = require("webpack-merge");

const common = {
  entry: "./lib/index.tsx",
  devtool: "source-map",
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
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    path: path.resolve(__dirname, "umd"),
    library: "ReactServiceContainer",
    libraryTarget: "umd",
  },
  externals: {
    react: {
      commonjs: "react",
      commonjs2: "react",
      amd: "react",
      root: "React",
    },
  },
};

const dev = {
  mode: "development",
  output: {
    filename: `${fileName}.js`,
  },
};

const prod = {
  mode: "production",
  output: {
    filename: `${fileName}.min.js`,
  },
};

module.exports = (env) => merge(common, env === "production" ? prod : dev);
