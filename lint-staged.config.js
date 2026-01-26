module.exports = {
  // Frontend: TypeScript/JavaScript files
  'apps/web/src/**/*.{ts,tsx,js,jsx}': (filenames) => {
    // Run eslint and prettier from the apps/web directory
    const files = filenames.map(f => f.replace('apps/web/', '')).join(' ');
    return [
      `cd apps/web && npx eslint --fix ${files}`,
      `cd apps/web && npx prettier --write ${files}`
    ];
  },

  // Frontend: Other files (json, css, md)
  'apps/web/src/**/*.{json,css,md}': (filenames) => {
    const files = filenames.map(f => f.replace('apps/web/', '')).join(' ');
    return [`cd apps/web && npx prettier --write ${files}`];
  },

  // Backend: Go files
  'apps/api/**/*.go': (filenames) => {
    return [`gofmt -w ${filenames.join(' ')}`];
  }
};
