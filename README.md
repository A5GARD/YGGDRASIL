
# @A5GARD/YGGDRASIL CLI 🚀

The official command-line tool for managing the **Asgard Software** ecosystem. This tool detects your current project state and offers a smart, context-aware menu to install or update UI components, icons, and VS Code extensions.

The forge will continue to serve as the centralized CLI to update / create / configure your projects and will recieve updates as new libraries are released for example, currently in the works is a library that will create projects akin to create-remix and remix-stacks but will be platform agnostic.

## 📦 Core Functionality

The CLI logic is driven by your project's `package.json`, `.vscode` folder, and the `config.midgardr` file. It dynamically presents options based on what you already have installed.

### 🛠 Smart Menu Options

#### 1. Project Initialization

* **Create new remix-run project:** Scaffolds a fresh Remix project. If you're already in a project, it offers to create it in another folder.

#### 2. Workflow Actions

* **Install All:** (Premium Only) One-click installation of both Icons and UI in your current workspace.
* **Update All:** Updates everything in the current workspace to match the latest remote versions.

#### 3. Catalyst UI Management

* **Install Catalyst UI:** visible if no `config.midgardr` is found.
* **Update Catalyst UI:** visible if your local version differs from the remote version.
* **Interactive UI Menu:** Opens the detailed component/library/CSS selector.
* **Full Install (with or without Ngin):** Automated setup including optional Ngin presets.
* **Configure Only:** Set up Tailwind and PostCSS without adding components.
* **Create Config:** Generates a pre-configured `config.midgardr` file.
* **Configure Import Call:** Sets up the `#midgardr` and `#baldr` path aliases.

#### 4. Icon & Extension Support

* **Catalyst Icons:** Detects versioning in `package.json` to offer Install or Update.
* **VS Code Extension:** Checks your `.vscode` folder to suggest installing or updating the Catalyst extension.

---

## 🚀 Usage

Run the CLI using Bun or your preferred runner:

```bash
bunx @a5gard/yggdrasil -p [target-project-path]

```

### Path Flag (`-p`)

The tool uses the `-p` flag to resolve the `targetPath`. If no flag is provided, it defaults to your current working directory.

## ⚙️ How it Works (Project State)

The CLI checks the following to build your menu:

1. **UI Version:** Read from `config.midgardr` version key.
2. **Icon Version:** Read from `dependencies` in `package.json`.
3. **Extension:** Checks for the presence of the catalyst extension in `.vscode`.
4. **Remote Versions:** Pings the registry/marketplace to compare `local` vs `remote`.

---

### Internal Dev Note: Version Updates

The constants `currentExtVersion`, `currentUIVersion`, and `currentIconsVersion` in the header of `index.js` are used as the fallback/source of truth for the latest versions. Ensure these are updated before running.

Would you like me to add a specific section for the **Premium vs Free** feature differences to the README?