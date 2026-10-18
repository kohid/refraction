const refractionEditorPlugin = require('./packages/packages/tools/eslint-plugin-editor/dist/index.js');

module.exports = {
  'no-path-imports': refractionEditorPlugin.rules['no-path-imports'],
  'no-react-namespace': refractionEditorPlugin.rules['no-react-namespace'],
};
