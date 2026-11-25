const path = require("path");
const webpack = require("webpack");
const childProcess = require("child_process");
const { version } = require("./package.json");
const tsconfig = require("./tsconfig.json");

const Visualizer = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

let revision = "unknown";
try {
  revision = childProcess
    .execSync("git rev-parse HEAD")
    .toString()
    .trim();
} catch (e) { }

// Packages the npm production build should load from the host app.
// The patched lscg solver and the pegjs parser stay in the bundle.
function isNpmProductionExternal(request) {
  if (!request || request.indexOf("!") !== -1) {
    return false;
  }
  if (/\.(css|scss|sass|less)(\?.*)?$/.test(request)) {
    return false;
  }
  if (request === "lscg-solver" || request.indexOf("lscg-solver/") === 0) {
    return false;
  }
  if (
    request === "react" ||
    request.indexOf("react/") === 0 ||
    request === "react-dom" ||
    request.indexOf("react-dom/") === 0 ||
    request === "styled-components" ||
    request.indexOf("styled-components/") === 0 ||
    request === "@silevis/reactgrid" ||
    request.indexOf("@silevis/reactgrid/") === 0 ||
    request === "hammerjs" ||
    request.indexOf("hammerjs/") === 0 ||
    request === "file-saver" ||
    request.indexOf("file-saver/") === 0 ||
    request === "seedrandom" ||
    request.indexOf("seedrandom/") === 0 ||
    request === "svg-path-parser" ||
    request.indexOf("svg-path-parser/") === 0 ||
    request.indexOf("@fluentui/") === 0 ||
    request.indexOf("d3-") === 0
  ) {
    return true;
  }
  return false;
}

// "module <id>" is a static ESM import, matching output.library.type "module".
function npmProductionExternals(data, callback) {
  const request = data && data.request;
  if (isNpmProductionExternal(request)) {
    return callback(null, "module " + request);
  }
  callback();
}

module.exports = (env, { mode }) => {
  if (mode == null) {
    mode = "production";
  }
  // Set only for `build.js npm --mode=production` (webpack --env npm).
  const npmProduction = Boolean(env && env.npm) && mode === "production";
  const libraryOptimization = npmProduction
    ? {
      // Webpack's default minimizer is Terser.
      minimize: true,
      usedExports: true,
    }
    : {
      minimize: false,
      usedExports: true,
    };
  const extensions = ['.tsx', '.ts', '.jsx', '.js', '.css', '.svg'];
  const pegjsConfig = {
    test: /\.pegjs$/,
    loader: require.resolve('pegjs-loader'),
    options: {
      allowedStartRules: ["start", "start_text"],
      cache: true,
      optimize: "size"
    }
  };
  const typescriptConfig = {
    test: /(\.tsx)|(\.ts)$/,
    use: [
      {
        loader: require.resolve('babel-loader')
      },
      {
        loader: require.resolve('ts-loader'),
        options: {
          transpileOnly: false,
          experimentalWatchApi: false,
          compilerOptions: {
            ...tsconfig.compilerOptions,
          }
        }
      }
    ]
  }
  const cssConfig = {
    test: /\.(css|scss|less)?$/,
    use: [
      require.resolve('style-loader'),
      require.resolve('css-loader'),
      require.resolve('sass-loader')
    ],
  };
  const svgConfig = {
    test: /\.svg$/i,
    issuer: /\.[jt]sx?$/,
    type: 'asset',
    parser: {
      dataUrlCondition: {
        maxSize: 32 * 1024 // Inline SVGs smaller than 8kb as Base64, emit larger ones as files
      }
    },
    generator: {
      filename: 'icons/[name].[ext]' // Defines output folder and naming format
    },
    oneOf: [
      {
        resourceQuery: /react/,
        use: [
          {
            loader: require.resolve('@svgr/webpack'),
            options: {
              typescript: true,
            }
          }
        ],
        type: 'javascript/auto',
      },
      {
        // Fallback for CSS files or other assets (e.g. background-image)
        type: 'asset/resource',
      },
    ]
  };
  const lscgConfig = {
    test: /lscg-solver/,
    use: [
      {
        loader: 'exports-loader',
        options: {
          exports: 'single desc', // Injects 'var desc;' at the top and exports it
        },
      },
    ],
  }
  const externals = {
    'react': 'react',
    'react-dom': 'react-dom'
  }
  const plugins = [
    new webpack.DefinePlugin({
      CHARTICULATOR_PACKAGE: JSON.stringify({
        version,
        revision,
        buildTimestamp: new Date().getTime()
      }),
      "process.env": {
        NODE_ENV: JSON.stringify(mode)
      },
    })
  ];
  return [
    {
      name: "app",
      dependencies: ["worker"],
      experiments: {
        outputModule: true, // Enables the ESM output type mechanism
      },
      // devtool: "eval",
      entry:
        mode == "production"
          ? {
            app: "./src/app/index.tsx"
          }
          : {
            app: "./src/app/index.tsx",
            test: "./src/tests/test_app/index.tsx",
            playwright: "./src/tests/playwright/index.tsx"
          },
      output: {
        filename: "[name].bundle.js",
        path: __dirname + "/dist/scripts",
        // Export the app as a global variable "Charticulator"
        library: {
          type: "module",
        },
        chunkFormat: 'module',
      },
      // externals: {
      //   // Exclude react and react-dom from the final bundle
      //   react: 'module react',
      //   'react-dom': 'module react-dom',
      // },
      // No eval, and no source maps, in the npm production package.
      // Use devtool: "source-map" here if external maps are needed.
      ...(npmProduction ? { devtool: false } : {}),
      optimization: libraryOptimization,
      cache: {
        type: 'filesystem',
        allowCollectingMemory: true,
      },
      module: {
        rules: [
          pegjsConfig,
          typescriptConfig,
          cssConfig,
          svgConfig,
          {
            test: /\.(woff|ttf|ico|woff2|jpg|jpeg|png|webp)$/i,
            use: [
              {
                loader: require.resolve('url-loader'),
                options: {
                  esModule: false,
                  limit: 65536
                }
              }
            ]
          }
        ]
      },
      resolve: {
        alias: {
          resources: __dirname + "/resources",
          src: path.resolve(__dirname, '/src'),
          'lscg-solver': path.resolve(__dirname, './lscg-solver-umd.js'),
        },
        extensions: extensions
      },
      externals: npmProduction ? npmProductionExternals : externals,
      plugins: [...plugins, mode === "production" ? new Visualizer({
        reportFilename: 'app.static.html',
        openAnalyzer: false,
        analyzerMode: `static`
      }) : null].filter(p => p)
    },
    {
      name: "about",
      module: {
        rules: [
          pegjsConfig,
          typescriptConfig
        ]
      },
      // devtool: "eval",
      entry: {
        about: "./src/about.ts"
      },
      output: {
        filename: "[name].bundle.js",
        path: __dirname + "/dist/scripts"
      },
      resolve: {
        alias: {
          src: path.resolve(__dirname, '/src'),
        },
        extensions: extensions
      },
      externals,
      plugins
    },
    {
      name: "worker",
      module: {
        rules: [
          pegjsConfig,
          typescriptConfig,
          svgConfig,
        ]
      },
      entry: {
        worker: "./src/worker/worker_main.ts"
      },
      output: {
        filename: "[name].bundle.js",
        path: __dirname + "/dist/scripts",
        libraryTarget: "var",
        library: "CharticulatorWorker"
      },
      // The worker runs on its own. Keep every dependency inside the file.
      ...(npmProduction
        ? {
          devtool: false,
          optimization: {
            minimize: true,
            usedExports: true,
          },
        }
        : {}),
      resolve: {
        alias: {
          src: path.resolve(__dirname, '/src'),
          resources: __dirname + "/resources",
          'lscg-solver': path.resolve(__dirname, './lscg-solver-umd.js'),
          [path.resolve(__dirname, '/src/core/common/fetch')]: false,
          './src/core/common/fetch.ts': false,
        },
        extensions: extensions
      },
      plugins: [...plugins, mode === "production" ? new Visualizer({
        reportFilename: 'worker.static.html',
        openAnalyzer: false,
        analyzerMode: `static`
      }) : null].filter(p => p)
    },
    {
      name: "container",
      module: {
        rules: [
          pegjsConfig,
          typescriptConfig,
          svgConfig
        ]
      },
      experiments: {
        outputModule: true, // Enables the ESM output type mechanism
      },
      entry: {
        container: "./src/container/index.ts"
      },
      output: {
        filename: "[name].bundle.js",
        path: __dirname + "/dist/scripts",
        // Export the app as a global variable "Charticulator"
        library: {
          type: "module",
        },
        chunkFormat: 'module',
      },
      // Leave optimization unset outside the npm production build so the
      // website production build keeps webpack's mode defaults.
      ...(npmProduction
        ? {
          devtool: false,
          optimization: {
            minimize: true,
            usedExports: true,
          },
        }
        : {}),
      resolve: {
        alias: {
          src: path.resolve(__dirname, '/src'),
          resources: __dirname + "/resources",
          // react: "preact-compat",
          // "react-dom": "preact-compat",
          // Not necessary unless you consume a module using `createClass`
          // "create-react-class": "preact-compat/lib/create-react-class",
          // Not necessary unless you consume a module requiring `react-dom-factories`
          // "react-dom-factories": "preact-compat/lib/react-dom-factories"
        },
        extensions: extensions
      },
      externals: npmProduction ? npmProductionExternals : externals,
      plugins: [...plugins, mode === "production" ? new Visualizer({
        reportFilename: 'container.static.html',
        openAnalyzer: false,
        analyzerMode: `static`
      }) : null].filter(p => p)
    }
  ];
};