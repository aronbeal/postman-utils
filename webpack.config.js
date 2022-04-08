const path = require('path');

module.exports = {
    // bundling mode
    mode: 'production',

    // entry files
    entry: './src/index.ts',
    output: {
        filename: "hebbia_utils.min.js",
        path: path.resolve(__dirname, 'built'),
        library: {
            name: "UtilsFactory",
            type: "this"
        }
    },

    // file resolutions
    resolve: {
        extensions: ['.ts', '.js'],
    },

    // loaders
    module: {
        rules: [
            {
                test: /\.tsx?/,
                use: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    }
};
