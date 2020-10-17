
const { promisify } = require("util");
const { resolve } = require("path");
const fs = require("fs");
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const vscode = require("vscode");

var indexPath =
  "./index.json";

async function getFiles(dir) {
  const subdirs = await readdir(dir);
  const files = await Promise.all(
    subdirs.map(async (subdir) => {
      const res = resolve(dir, subdir);
      return (await stat(res)).isDirectory() ? getFiles(res) : res;
    })
  );
  return files.reduce((a, f) => a.concat(f), []);
}

const indexWorkspaceFolders = () => {
  if (vscode.workspace.workspaceFolders != null) {
    indexDirs(
      vscode.workspace.workspaceFolders.map((item) => item.uri.fsPath),
      indexPath
    );
  } else {
    console.error("no folders in workspace");
  }
};

const indexDirs = (directories, output) => {
  var conc = [];

  var functions = directories.map((dir) =>
    getFiles(dir).then(function(paths) {conc = conc.concat(paths); })
  );

  Promise.all(functions).then(() => {
    var filenames = {};

    conc.forEach((path) => {
      var filename = path.replace(/^.*[\\\/]/, "");
      if (filenames.hasOwnProperty(filename)) {
        filenames[filename].push(path);
      } else {
        filenames[filename] = [path];
      }
    });
    writeToFile(filenames, output);
  });
};

const writeToFile = (jsonObject, output) => {
  var file = fs.createWriteStream(output);
  file.on("error", function (err) {
    console.error(err);
  });
  file.write(JSON.stringify(jsonObject));
  file.end();
};

const readJson = (filename) => {
  return JSON.parse(fs.readFileSync(filename, "utf8"));
};

const containsParts = (substg, stg) => {
  var index = -2;
  var previousIndex = 0;
  for (let char of substg) {
    previousIndex = index;
    index = stg.indexOf(char, index);
    if (index == -1 || index == previousIndex) return false;
  }
  return true;
};

const containsWhole = (substg, stg) => {
  return stg.includes(substg);
};

const quickInputItems = (searchTarget) => {
  var indexFileName = indexPath;
  var jzzon = readJson(indexFileName);
  var resultFilenames = Object.keys(jzzon).filter(
    (name) => containsParts(searchTarget, name) && searchTarget != ""
  );
  
  //no flatMap for node version < 11
  const reducer = (accumulator, filename) =>
    accumulator.concat(jzzon[filename]);

  let items = resultFilenames.reduce(reducer, []).map(function (path, i) {
    return {
      quickPickData: {
        id: i,
        description: "",
        detail: path,
        label: path.replace(/^.*[\\\/]/, ""),
        alwaysShow: true,
      },
      actionData: { path: path },
    };
  });
  return items;
};

function showQuickPick() {
  const quickpick = vscode.window.createQuickPick();
  var actionData = {};
  quickpick.onDidChangeValue(() => {
    var items = quickInputItems(quickpick.value);
    quickpick.items = items.map((item) => item.quickPickData);
    items.forEach((item) => {
      actionData[item.quickPickData.id] = item.actionData;
    });
  });
  quickpick.onDidAccept((e) => {
    let selectedItemId = quickpick.selectedItems[0]["id"];
    let accepted = actionData[selectedItemId]["path"];
    let uri = vscode.Uri.file(accepted);
    vscode.commands.executeCommand("vscode.openFolder", uri);
  });
  quickpick.matchOnDescription = false;
  quickpick.matchOnDetail = false;
  quickpick.placeholder = "search";
  quickpick.show();
}
function launch() {
  showQuickPick();
}

function index() {
  indexWorkspaceFolders();
}

module.exports = { launch, index };