import { file, write } from "bun";

// Define your source paths
const PATHS = {
  extension: "F:/DevStack/package.json",
  ui: "F:/playground/package.json",
  icons: "F:/icons/package.json",
  target: "F:/forge/index.js",
};

async function sync() {
  try {
    // 1. Read package files using Bun.file (returns a blob, then .json())
    const ext = await file(PATHS.extension).json();
    const ui = await file(PATHS.ui).json();
    const icons = await file(PATHS.icons).json();

    // 2. Read the current target file
    let content = await file(PATHS.target).text();

    // 3. Update the constants (No outdir needed, we write back to the same file)
    content = content
      .replace(/const currentExtVersion = ".*?"/, `const currentExtVersion = "${ext.version}"`)
      .replace(/const currentUIVersion = ".*?"/, `const currentUIVersion = "${ui.version}"`)
      .replace(/const currentIconsVersion = ".*?"/, `const currentIconsVersion = "${icons.version}"`);

    // 4. Write it back
    await write(PATHS.target, content);

    console.log(`✅ Synced: UI ${ui.version}, Icons ${icons.version}, Ext ${ext.version}`);
  } catch (err) {
    console.error("❌ Sync failed. Check if your F: drive paths are correct.");
    console.error(err);
  }
}

sync();