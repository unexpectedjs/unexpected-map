const config = {
  extends: ['standard', 'prettier'],
  plugins: ['import', 'mocha'],
  rules: {
    'import/no-unresolved': ['error', { commonjs: true }],
    'mocha/no-exclusive-tests': 'error',
    'mocha/no-nested-tests': 'error',
    'mocha/no-identical-title': 'error',
  },
  overrides: [
    {
      files: ['test/**/*.js'],
      env: {
        mocha: true,
      },
    },
  ],
};

module.exports = config;
