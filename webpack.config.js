
var path = require('path');
var webpack = require('webpack');
var DedupePlugin = webpack.optimize.DedupePlugin;
var UglifyJsPlugin = webpack.optimize.UglifyJsPlugin;
var config = require('config');

var isDev = process.env.COINS_ENV === 'development';
var clientEntry = path.join(__dirname, config.get('build.clientDestPath'), 'src/index.js');

module.exports = {
    bail: true,
    target: 'node',
    entry: { client: clientEntry },
    output: {
        path: path.join(__dirname, 'dist'),
        filename: '[name].js',
        library: 'client',
        libraryTarget: 'umd'
    },
    plugins: [
        new DedupePlugin(),
    ].concat(!isDev ? [
        new UglifyJsPlugin({
            sourceMap: false,
            compress: {
                warnings: false
            }
        })
    ] : []),
    module: {
        loaders: [
            {
                test: /\.json$/,
                loader: 'json'
            }
        ]
    }
};
