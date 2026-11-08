const { merge } = require('webpack-merge');
const config = require("./webpack.config.js");

// merge webpack.config.js with new and replace config parts for load react as no external on app configuration
module.exports = (env, { mode }) => {
  const base = config(env, { mode });
  return base.map((configuration) => {
    if (configuration.name !== "app") {
      return configuration;
    }
    return {
      ...configuration,
      externals: {},
    };
  });
};