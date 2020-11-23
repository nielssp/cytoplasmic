const path = require('path');


const config = {
  entry: './src/index.tsx',
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
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        use: [
          {
            loader: 'file-loader',
            options: {
              esModule: false,
            },
          },
        ],
      },
    ],
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json']
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
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
    config.entry = [config.entry, './examples/examples.tsx'];
    config.plugins = [
      new HtmlWebpackPlugin({template: './examples/index.html'})
    ];
  }
  if (env.mode) {
    config.mode = env.mode;
  }
  return config;
};
