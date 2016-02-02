var path = require('path');
var webpack = require('webpack');
var DedupePlugin = webpack.optimize.DedupePlugin;
var UglifyJsPlugin = webpack.optimize.UglifyJsPlugin;

var isDev = process.env.COINS_ENV === 'development';
var clientDir = path.join(process.cwd(), 'dist', 'client');

module.exports = {
    bail: true,
    target: 'node',
    entry: {
        client: path.join(clientDir, 'client.js')
    },
    externals: [
        'dom-storage'
    ],
    output: {
        path: path.join(clientDir, 'dist'),
        filename: '[name].js', // one for each `entry`
        chunkFilename: '[id].chunk.js',
        library: 'client',
        libraryTarget: 'umd',
        umdNamedDefine: true,
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
