'use strict';

// Node decides ESM vs CommonJS per directory. Without these markers the ESM
// build is read as CommonJS and every `import` in it throws.
const fs = require('fs');
const path = require('path');

const marker = (dir, type) => {
  fs.writeFileSync(
    path.join(__dirname, '..', 'dist', dir, 'package.json'),
    JSON.stringify({ type }, null, 2) + '\n',
  );
};

marker('esm', 'module');
marker('cjs', 'commonjs');

console.log('wrote dist/esm/package.json and dist/cjs/package.json');
