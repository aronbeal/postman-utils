const path = require('path'); 
const WebpackBeforeBuildPlugin = require('before-build-webpack');
const fs = require('fs');
const exp = require('constants');
/**
 * TODO: Finish as needed.
 * @param {*} info 
 */
const clean_oldest_files = (info) => {
    const dir = info.outputPath;
    console.info(`Cleaning the oldest output in ${dir}`);
    // Sort the files in chronological order.
    fs.readdirSync(info.outputPath)
        .filter(f => {
            if (!fs.existsSync(f)) {
                return false;
            }
            if (!fs.statSync(f).isFile()) {
                return false;
            }
            if (path.extname(source_filepath) !== '.js') {
                return false;
            }
            return true;
        })
        .sort(function(a, b) {
            return fs.statSync(dir + a).mtime.getTime() - 
                    fs.statSync(dir + b).mtime.getTime();
        })
        .map(f => console.info("File: " + f));
}

/**
 * Called after the build asset is emitted. 
 * Creates the copy of the latest build at '/built/postman-utils.latest.js'
 * Also, removes old builds.
 * See https://webpack.js.org/api/compiler-hooks/#assetemitted
 * 
 * @param {string} file The compiled file name. 
 * @param ??? info Not sure, but keys are:
 * [ 'compilation', 'content', 'outputPath', 'source', 'targetPath' ]
 */
const after_emit = (file, info) => {
    const expected_file = 'postman-utils.latest.js';
    const source_filepath = info.targetPath;
    // Remove 3 oldest entries.
    const dest_filepath = `${info.outputPath}/${expected_file}`;
    console.log(`Copying ${source_filepath} to ${dest_filepath}`)
    fs.copyFile(source_filepath, dest_filepath, fs.constants.COPYFILE_EXCL, (err) => {
        if (err) { console.log(err); }
    });
}
module.exports = {
    // bundling mode
    mode: 'production',
    // entry files
    entry: './src/index.ts',
    output: {
        filename: '[name].[contenthash].bundle.js',
        path: path.resolve(__dirname, 'built'),
        globalObject: 'this',
        library: {
            name: "PostmanUtilsFactory",
            type: "umd"
        }
    },

    // file resolutions
    resolve: {
        extensions: ['.ts', '.js']
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
    },
    plugins: [
        new WebpackBeforeBuildPlugin(after_emit, ['assetEmitted']),
    ]
};
