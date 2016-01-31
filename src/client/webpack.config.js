var path = require('path');
var webpack = require('webpack');
var DefinePlugin = webpack.DefinePlugin;
var DedupePlugin = webpack.optimize.DedupePlugin;
var UglifyJsPlugin = webpack.optimize.UglifyJsPlugin;

var isDev = process.env.COINS_ENV === 'development';

module.exports = {
    bail: true,
    node: {
        fs: 'empty'
    },
    entry: {
        client: './client.js'
    },
    externals: [
        'dom-storage'
    ],
    output: {
        path: path.join(__dirname),
        filename: '[name].bundle.js', // one for each `entry`
        chunkFilename: '[id].chunk.js',
        library: 'client',
        libraryTarget: 'umd',
        umdNamedDefine: true,
    },
    plugins: [
        new DedupePlugin(),
        new DefinePlugin({
            __NODEAPI_BASEURL__: JSON.stringify('https://coins-api.mrn.org/api')
        }),
    ].concat(!isDev ? [
        new UglifyJsPlugin({
            sourceMap: false,
            compress: {
                warnings: false
            }
        })
    ] : []),
    loaders: [
        {
            test: /\.jsx?$/,

            // exclude: /(node_modules|bower_components)/,
            loader: 'babel',
            query: {
                presets: ['es2015', 'cacheDirectory'],
                plugins: ['transform-runtime']
            }
        }
    ]
};
