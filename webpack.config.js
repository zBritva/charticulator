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

module.exports = (env, { mode }) => {
  if (mode == null) {
    mode = "production";
  }
  const extensions = ['.tsx', '.ts', '.jsx', '.js', '.css', 'svg'];
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
          compilerOptions: tsconfig.compilerOptions
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
  const plugins = [
    new webpack.DefinePlugin({
      CHARTICULATOR_PACKAGE: JSON.stringify({
        version,
        revision,
        buildTimestamp: new Date().getTime()
      }),
      "process.env": {
        NODE_ENV: JSON.stringify(mode)
      }
    })
  ];
  return [
    {
      name: "app",
      dependencies: ["worker"],
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
        libraryTarget: "var",
        library: "Charticulator"
      },
      optimization: {
        minimize: false,
        usedExports: true,
      },
      cache: {
        type: 'filesystem',
        allowCollectingMemory: true,
      },
      module: {
        rules: [
          pegjsConfig,
          typescriptConfig,
          cssConfig,
          {
            test: /\.(woff|ttf|ico|woff2|jpg|jpeg|png|webp|svg)$/i,
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
        },
        extensions: extensions
      },
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
      plugins
    },
    {
      name: "worker",
      module: {
        rules: [
          pegjsConfig,
          typescriptConfig
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
      resolve: {
        alias: {
          src: path.resolve(__dirname, '/src'),
          resources: __dirname + "/resources",
          // 'lscg-solver': path.resolve(__dirname, './lscg-solver-umd.js'),
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
          typescriptConfig
        ]
      },
      entry: {
        container: "./src/container/index.ts"
      },
      output: {
        filename: "[name].bundle.js",
        path: __dirname + "/dist/scripts",
        // Export the app as a global variable "Charticulator"
        libraryTarget: "var",
        library: "CharticulatorContainer"
      },
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
      plugins: [...plugins, mode === "production" ? new Visualizer({
        reportFilename: 'container.static.html',
        openAnalyzer: false,
        analyzerMode: `static`
      }) : null].filter(p => p)
    }
  ];
};