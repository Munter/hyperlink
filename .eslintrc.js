const { rules, plugins, ...other } = require('eslint-config-pretty-standard');

const filteredRules = Object.entries(rules)
  .filter(([key, value]) => !key.startsWith('react/'))
  .reduce((result, [key, value]) => {
    result[key] = value;

    return result;
  }, {});

const config = {
  plugins: [...plugins.filter(p => p !== 'react')],
  rules: filteredRules,
  ...other
};

if (process.stdin.isTTY) {
  // Enable plugin-prettier when running in a terminal. Allows us to have
  // eslint verify prettier formatting, while not being bothered by it in our
  // editors.
  config.plugins = config.plugins || [];
  config.plugins.push('prettier');
  config.rules = config.rules || {};
  config.rules['prettier/prettier'] = 'error';
}

module.exports = config;
