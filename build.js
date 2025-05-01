/* eslint-disable */

const glob = require('glob');
const path = require('path');
const configFile = require('./build.config.js');
const config = configFile.default || configFile;

const fs = require('fs');
/**
 * HOW TO USE:
 *
 * Add your paths below to compile styles, scripts, or block plugins.
 */

/**
 *
 * COMPILING STYLESHEETS (styleDirs)
 *
 * Use the styleDirs object to run files or directories through plain old SASS.
 *
 * Each key can be either an input directory or file. Each value should be the output directory.
 * When a directory is used, all files within that directory that don't have a "_" prefix will be compiled. This includes nested files.
 * i.e.
 * 'themes/rkv-fse-theme/assets/src/styles' : 'themes/rkv-fse-theme/assets/dist'
 * OR
 * 'themes/rkv-fse-theme/assets/src/styles/style.scss' : 'themes/rkv-fse-theme/assets/dist'
 */
const styleDirs = config.styleDirs || {};

/**
 * COMPILING SCRIPTS (scriptDirs)
 *
 * Use the scriptDirs object to run files or directories through ESBuild.
 *
 * Each key can be either an input directory or file. Each value should be the output directory.
 * Any JS file at the root of the input directory will be compiled.
 */
const scriptDirs = config.scriptDirs || {};

const blockDirs = config.blockDirs || [];

const customGlobals = config.customGlobals || {};

/**
 * BUILD PROCESS SCRIPTS
 *
 * This part of the script should only need to be edited in the case of a configuration change, and is meant to apply to most use cases.
 *
 * Example of how to run this script:
 * Your proxy value should be your local URL. For instance (coming soon)
 * npm run dev -- --proxy=atlassianjapan.local
 *
 * Or to run production scripts, simply:
 * npm run build
 */
const chokidar = require('chokidar');
const esbuild = require('esbuild');
const commandLineArgs = require('command-line-args');

// Gather the command line arguments, specifically for the watch flag and for the proxy.
const optionDefinitions = [
	{ name: 'watch', alias: 'w', type: Boolean, defaultValue: false },
	// TODO: Add new proxy option.
	{ name: 'proxy', type: String, defaultValue: '' },
];
const options = commandLineArgs(optionDefinitions);

const { exec } = require('child_process');

/**
 * This function will take imports and convert them to globals.
 *
 * This is useful when compiling blocks, because WordPress package imports may be used.
 * For instance, import { data } from @wordpress/data becomes const { data } = wp.data
 *
 * Taken from: https://github.com/evanw/esbuild/issues/337
 * With help from: ttps://stackoverflow.com/a/3561711/153718
 * @param {object} mapping Object to map globals against
 * @returns
 */
function importAsGlobals(mapping) {
	const escRe = (s) => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
	const filter = new RegExp(
		Object.keys(mapping)
			.map((mod) => `^${escRe(mod)}$`)
			.join('|'),
	);

	return {
		name: 'global-imports',
		setup(build) {
			build.onResolve({ filter }, (args) => {
				if (!mapping[args.path]) {
					throw new Error('Unknown global: ' + args.path);
				}
				return {
					path: args.path,
					namespace: 'external-global',
				};
			});

			build.onLoad(
				{
					filter,
					namespace: 'external-global',
				},
				async (args) => {
					const global = mapping[args.path];
					return {
						contents: `module.exports = ${global};`,
						loader: 'js',
					};
				},
			);
		},
	};
}


const build = async () => {
	for (const assetDir in scriptDirs) {
		await buildEsbuild(assetDir);
	}

	for ( let i = 0; i < blockDirs.length; i++ ) {
		await buildBlocks( blockDirs[i] );
	}


};


/**
 * This is our main build process.
 *
 * We run our scripts through EsBuild.
 *
 * Wrapping all of this in a function allows us to trigger it on demand, for instance, during browserSync restarts or via a watch command.
 */
const buildEsbuild = async ( assetsDir ) => {
		// If the assetsDir variable has a file extension, we'll assume it's a file and not a directory.
		// In this case, we'll just compile the file.
		let entryPoints = [assetsDir];

		// But if it's a directory, we'll compile all the files in the directory.
		if (!path.extname(assetsDir)) {
			const globPattern = assetsDir + '/*.js';
			entryPoints = glob.sync(globPattern);
		}

		const args = {
			entryPoints: entryPoints,
			format: 'iife',
			bundle: true,
			minify: true,
			outdir: path.resolve(scriptDirs[assetsDir]),
			outbase: assetsDir,
			loader: {
				'.js': 'jsx',
			},
			external: [
				'*.svg',
				'*.woff',
				'*.woff2',
				'*.otf',
				'*.ttf',
				'*.jpg',
				'*.png',
				'*.webp',
				'*.gif',
				'*.mp4',
			],
			plugins: [
				importAsGlobals({
					...customGlobals,
					'@wordpress/components': 'wp.components',
					'@wordpress/api-fetch': 'wp.apiFetch',
					'@wordpress/apiFetch': 'wp.apiFetch',
					'@wordpress/blocks': 'wp.blocks',
					'@wordpress/edit-post': 'wp.editPost',
					'@wordpress/editPost': 'wp.editPost',
					'@wordpress/element': 'wp.element',
					'@wordpress/plugins': 'wp.plugins',
					'@wordpress/editor': 'wp.editor',
					'@wordpress/block-editor': 'wp.block-editor',
					'@wordpress/blocks': 'wp.blocks',
					'@wordpress/hooks': 'wp.hooks',
					'@wordpress/utils': 'wp.utils',
					'@wordpress/date': 'wp.date',
					'@wordpress/data': 'wp.data',
					'@wordpress/core-data': 'wp.coreData',
					'@wordpress/coreData': 'wp.coreData',
					'@wordpress/i18n': 'wp.i18n',
					'@wordpress/server-side-render': 'wp.serverSideRender',
					'@wordpress/serverSideRender': 'wp.serverSideRender',
					react: 'React',
					'react-dom': 'ReactDOM',
					'jquery': 'jQuery'
				}),
			],
		};

		if (options.watch) {
			args.minify = false;
		}

		try {
			await esbuild.build(args);
			console.log('Compiled JS Files!');
		} catch (e) {
			console.log(e);
		}
};

/**
 * Runs SASS files through the command line, with a watch flag enabled if necessary.
 */
const combinedStyleDirs = {};
Object.keys(styleDirs).forEach((sassInput) => {
	const inputs = glob.sync(sassInput);
	inputs.forEach((input) => {
		combinedStyleDirs[input] = styleDirs[sassInput];
	});
});

const runSass = async () => {
	Object.keys(styleDirs).forEach((sassInput) => {
		let sassOutput = path.resolve(styleDirs[sassInput]);

		// If there is a file extension, add the name of the file to the output directory.
		if (path.extname(sassInput)) {
			const sassInputParts = sassInput.split('/');
			const sassInputFile = sassInputParts.pop();
			const sassOutputDir = sassOutput;
			const sassOutputFile = sassInputFile.replace('.scss', '.css');
			sassOutput = path.resolve(sassOutputDir, sassOutputFile);
		}

		let commandFlags = '';
		if (options.watch) {
			commandFlags = '--watch';
		} else {
			commandFlags = '--style=compressed';
		}

		// Transforming to the command:
		// sass themes/rkv/assets/src/styles/style.scss themes/rkv/assets/dist/style.css --style=compressed

		const process = exec(
			`sass ${sassInput}:${sassOutput} ${commandFlags}`,
			(error, stdout, stderr) => {
				if (error) {
					console.log(`error: ${error.message}`);
					return;
				}
				if (stderr) {
					console.log(`stderr: ${stderr}`);
					return;
				}
			},
		);

		console.log(`Sass started for ${sassInput}`);

		process.stdout.on('data', function (data) {
			console.log(data);
		});
	});
};

/**
 * COMPILE BLOCK DIRECTORIES
 *
 * This replicates the build script found here:
 * https://github.com/WordPress/gutenberg/blob/trunk/packages/scripts/scripts/build.js
 */
const { sync: spawn } = require('cross-spawn');
const { sync: resolveBin } = require('resolve-bin');

const buildBlocks = async (assetsDir) => {
	// Set Defaults
	const { getWebpackArgs } = require('./node_modules/@wordpress/scripts/utils/index');

	process.env.NODE_ENV = process.env.NODE_ENV || 'production';
	process.env.WP_COPY_PHP_FILES_TO_DIST = true;
	process.env.WP_EXPERIMENTAL_MODULES = true;

	// Remove some path from the directory.
	process.env.WP_SOURCE_PATH = assetsDir.replace(__dirname + '/', '');

	// Get webpack args.
	let webpackArgs = getWebpackArgs();

	// Add output path.
	const outputPath = path.resolve(assetsDir, '../dist');
	webpackArgs.push('--output-path', outputPath);

	// Add any webpack config options from the directory, if available.
	const webpackConfigPath = path.resolve(assetsDir, 'webpack.config.js');

	if (fs.existsSync(webpackConfigPath)) {
		console.log(`%cWebpack Config found for ${process.env.WP_SOURCE_PATH}`, 'color: #444;');
		webpackArgs.push('--config', webpackConfigPath);
	}

	console.log(`WP Scripts run for ${process.env.WP_SOURCE_PATH}`);
	webpackArgs = webpackArgs.filter((arg) => {
		return arg !== '--watch'
	});

	console.log(webpackArgs);

	const childProcess = spawn(resolveBin('webpack'), webpackArgs, {
		stdio: 'inherit',
	});


	console.log( 'CHILD' );
	console.log( childProcess.status );


	process.stdout.on('data', function (data) {
		console.log(data);
	});
};

// Setup Browsersync if watch is enabled.
if (true === options.watch) {
	const browserSync = require('browser-sync').create();
	const jsWatchDirs = [];
	const watch = chokidar.watch;

	Object.keys( scriptDirs ).forEach((assetDir) => {
		if (assetDir.includes('styles')) {
			return;
		}

		const globPattern = assetDir + '/**/*.js';

		jsWatchDirs.push(...glob.sync(globPattern));
	});

	for (let i = 0; i < blockDirs.length; i++) {
		const globPattern = blockDirs[i] + '/**/*';
		jsWatchDirs.push(...glob.sync(globPattern));
	}

	// browserSync.init({
	//     port: 8080,
	//     proxy: `http://${options.proxy}`,
	//     host: `${options.proxy}`,
	//     files: builtFiles,
	//     open: 'external',
	// });

	console.log('ESbuild is watching the directories:');
	console.log(jsWatchDirs);

	const watcher = watch(jsWatchDirs);
	watcher.on('change', () => {
		build();
	});
}

// To kick everything off, run both the SASS and the JS build process
runSass();
build().then(() => {
	console.log('Build complete!');
});