const config = {
  extends: ['standard', 'prettier', 'prettier/standard'],
  plugins: ['import', 'mocha'],
  rules: {
    'import/no-unresolved': ['error', { commonjs: true }],
    'mocha/no-exclusive-tests': 'error',
    'mocha/no-nested-tests': 'error',
    'mocha/no-identical-title': 'error'
  },
  overrides: [
    {
      files: ['test/**/*.js'],
      env: {
        mocha: true
      }
    }
  ]
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
