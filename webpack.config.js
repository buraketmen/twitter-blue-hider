const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  devtool: false,
  watchOptions: {
    ignored: ["node_modules/**"],
  },
  entry: {
    popup: path.resolve("src/popup/index.js"),
    background: path.resolve("src/background/index.js"),
    contentScript: path.resolve("src/contentScript/index.js"),
  },
  output: {
    filename: "[name].js",
    path: path.join(__dirname, "dist"),
  },
  optimization: {
    concatenateModules: true,
    flagIncludedChunks: true,
    removeAvailableModules: true,
    sideEffects: true,
    minimize: true,
    splitChunks: {
      chunks: "all",
      minSize: 1000000,
      maxSize: 2000000,
      minChunks: 1,
      maxAsyncRequests: 20,
      maxInitialRequests: Infinity,
      cacheGroups: {
        defaultVendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10,
          reuseExistingChunk: true,
          name(module) {
            const packageName = module.context.match(
              /[\\/]node_modules[\\/](.*?)([\\/]|$)/
            )[1];
            return `npm.${packageName.replace("@", "")}`;
          },
        },
        default: {
          minChunks: 2,
          reuseExistingChunk: true,
        },
      },
    },
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve("src/static/manifest.json"),
          to: path.resolve("dist"),
        },
        {
          from: path.resolve("src/static/icon.png"),
          to: path.resolve("dist"),
        },
      ],
    }),
    new CleanWebpackPlugin({
      protectWebpackAssets: false,
      cleanAfterEveryBuildPatterns: ["*.LICENSE.txt"],
    }),
    ...getHtmlPlugins(["popup"]),
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
        },
      },
      {
        test: /\.txt$/i,
        use: "raw-loader",
      },
      {
        test: /\.less$/,
        use: [{ loader: "less-loader" }],
      },

      {
        test: /\.css$/,
        use: [
          { loader: "style-loader" },
          {
            loader: "css-loader",
          },
        ],
      },
      {
        test: /\.(jpg|png|svg|jpg|jpeg|gif)$/i,
        type: "asset/resource",
      },
    ],
  },
};

function getHtmlPlugins(chunks) {
  return chunks.map(
    (chunk) =>
      new HtmlWebpackPlugin({
        title: "Twitter Blue Hider",
        filename: `${chunk}.html`,
        chunks: [chunk],
      })
  );
}
