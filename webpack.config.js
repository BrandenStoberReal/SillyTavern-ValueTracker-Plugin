const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: './src/index.ts',
    target: 'node', // This is a Node.js application
    mode: 'production', // Use 'development' for debugging
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'plugin.js',
        libraryTarget: 'commonjs2', // This is important for Node.js modules
    },
    externals: {
        // Don't bundle these modules, they should be resolved at runtime
        'express': 'commonjs express',
        'body-parser': 'commonjs body-parser',
        'chalk': 'commonjs chalk',
        'fs': 'commonjs fs',
        'path': 'commonjs path',
        'crypto': 'commonjs crypto',
        // sql.js will be included in the bundle since it's a pure JavaScript library
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                {from: 'node_modules/sql.js/dist/sql-wasm.wasm', to: '.'},
            ],
        }),
    ],
    optimization: {
        minimize: true, // Enable minimization for production
        usedExports: true, // Enable tree-shaking
    },
    stats: {
        colors: true,
    },
};