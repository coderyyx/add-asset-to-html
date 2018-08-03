const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const AddAssetHtmlPlugin = require('../lib/index');

module.exports = {
  // Normally CWD
  context: __dirname,
  entry: path.join(__dirname, 'entry.js'),
  devtool: '#source-map',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'index_bundle.js',
  },
  plugins: [
    new HtmlWebpackPlugin(),
    new AddAssetHtmlPlugin({
      filepath: 'entry.js',
      hash: true,
      includeSourcemap: false
    }),
  ],
};
