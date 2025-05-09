export default {
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
	styleDirs: {
		'plugins/example-plugin/src/': 'plugins/example-plugin/dist/css',
		'plugins/example-plugin/specific-file.scss': 'plugins/example-plugin/dist/css',
	},

/**
	 * COMPILING SCRIPTS (scriptDirs)
	 *
	 * Use the scriptDirs object to run files or directories through ESBuild.
	 *
	 * Each key can be either an input directory or file. Each value should be the output directory.
	 * Any JS file at the root of the input directory will be compiled.
	 *
	 * Files will also automatically export common globals (i.e. React, ReactDOM, and all WP packages)
	 */
	scriptDirs: {
		'plugins/example-plugin/src/': 'plugins/example-plugin/dist/js',
		'plugins/example-plugin/specific-file.js': 'plugins/example-plugin/dist/js',
	},

	/**
	 * COMPILING BLOCKS (blockDirs)
	 *
	 * Use the blockDirs object to run files or directories through ESBuild.
	 *
	 * An array of directories to compile block plugins.
	 */
	blockDirs: [
		'plugins/example-plugin/src/blocks',
	]
}