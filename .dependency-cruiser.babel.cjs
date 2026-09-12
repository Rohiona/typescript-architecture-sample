module.exports = {
  presets: [["@babel/preset-typescript", { allExtensions: true, isTSX: true }]],
  parserOpts: { plugins: ["typescript", "jsx"] },
};
