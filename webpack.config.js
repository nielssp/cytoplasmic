const path = require('path');


const config = {
  entry: './src/index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json']
  },
  output: {
    path: path.resolve(__dirname, '_bundles'),
    filename: '[name].js',
    libraryTarget: 'umd',
    library: 'CSTK',
    umdNamedDefine: true
  },
  devServer: {
    contentBase: path.join(__dirname, 'dist'),
    compress: true,
    port: 9000
  }
};
module.exports = (argv, env) => {
  if (env.mode === 'development') {
    const HtmlWebpackPlugin = require('html-webpack-plugin');
    config.entry = [config.entry, './examples/examples.ts'];
    config.plugins.push(
      new HtmlWebpackPlugin({template: './examples/index.html'})
    );
  }
  if (env.mode) {
    config.mode = env.mode;
  }
  return config;
};
