/** @type {import('prettier').Config} */
const config = {
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  semi: true,
  // Git checks files out with CRLF on Windows and LF elsewhere; accept both.
  endOfLine: 'auto',
};

export default config;
