const vscode = require("vscode");
const { launch, index } = require("./search");

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log(
    'Extension "quick-filesearch" is now active!'
  );
  index();

  let commands = [
    vscode.commands.registerCommand("quick-filesearch.quickfilesearch", () =>
      launch()
    ),
    vscode.commands.registerCommand("quick-filesearch.index", () =>
      index()
    ),
  ];

  context.subscriptions.concat(commands);
}
exports.activate = activate;

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
