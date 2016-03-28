var path = require('path');
var webpack = require('webpack');
var DedupePlugin = webpack.optimize.DedupePlugin;
var UglifyJsPlugin = webpack.optimize.UglifyJsPlugin;

var isDev = process.env.COINS_ENV === 'development';
var clientEntry = path.join(__dirname, 'src', 'client', 'client.js');
var clientOutput = path.join(__dirname, 'dist', 'client', 'dist');

module.exports = {
    bail: true,
    target: 'node',
    entry: {
        client: clientEntry
    },
    output: {
        path: clientOutput,
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
