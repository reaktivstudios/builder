# Builder
A build script designed for SASS, JavaScript, and WordPress blocks, all in one place.

## Installing dependencies
Builder is a drop-in script that can be added to any project.

To use the build script, drop in the package, and install any necessary packages either by copying the `devDependencies` object into your package.json or by installing them all at once:

```
npm i @wordpress/scripts chokidar command-line-args path glob --save-dev
```

## Adding your config file
Builder works by grabbing a configuration from a file called build.config.js. This is where you can define which directories to target for compiling SASS, JavaScript or WordPress blocks.

There are three possible values in the config.
- `styleDirs` an object with each key being a file or directory to compile with SASS and the value being the directory to output to
- `scriptDirs` an object with each key being a file or directory to compile with Esbuild and the value being the directory to output to
- `blockDirs` an array of source directories for WordPress blocks. It will compile any blocks within that directory and output them to the default directory at the root of the plugin `/dist`.

See [the example config]('./build.config.js') for more info.

## Using the script
You can run the script from the command line with:

```
node run build.js
```

Adding the watch flag will automatically watch JS and SASS files and compile when they are updated.

You can add this to the scripts object of your package.json file for convienience
```
    "build": "node build.js",
    "start": "node build.js --watch"
```