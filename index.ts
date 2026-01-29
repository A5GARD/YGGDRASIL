import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { spawnSync } from 'bun';
// current file location F:\forge\index.js
const currentExtVersion = "4.0.115" //F:\DevStack\package.json
const currentUIVersion = "1.0.124" //F:\playground\package.json
const currentIconsVersion = "1.0.58" //F:\icons\package.json

async function detectPackageManager(): Promise<string> {
    try {
        await fs.access(path.join(process.cwd(), 'pnpm-lock.yaml'));
        return 'pnpm';
    } catch { }

    try {
        await fs.access(path.join(process.cwd(), 'yarn.lock'));
        return 'yarn';
    } catch { }

    return 'npm';
}

async function getLatestLibraryVersion(): Promise<string> {
    // have to edit this because as of now we are currently getting the correct data  {"_id":"@catalystsoftware/ui","_rev":"16-358149fe48f929901be77a9badbe82bd","name":"@catalystsoftware/ui","dist-tags":{"latest":"1.0.17"},
    try {
        const response = await fetch('https://registry.npmjs.org/@a5gard/midgardr-cli', { headers: { 'Accept': 'application/json' } });
        if (!response.ok) return currentUIVersion;
        const data = await response.json() as { "dist-tags": { latest: string } };
        return data["dist-tags"].latest || currentUIVersion;
    } catch (error) {
        return currentUIVersion;
    }
}
async function getLatestIconVersion(): Promise<string> {
    try {
        const response = await fetch('https://registry.npmjs.org/@a5gard/baldr', { headers: { 'Accept': 'application/json' } });
        if (!response.ok) return currentIconsVersion;
        const data = await response.json() as { "dist-tags": { latest: string } };
        return data["dist-tags"].latest || currentIconsVersion;
    } catch (error) {
        return currentIconsVersion;
    }
}
async function getLatestExtVersion(): Promise<string> {
    // REPLACE THESE WITH YOUR ACTUAL NAMES
    const publisher = "skyler";
    const extensionName = "ocrmnav";

    try {
        const response = await fetch('https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery', {
            method: 'POST',
            headers: {
                'Accept': 'application/json;api-version=3.0-preview.1',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                filters: [{
                    criteria: [
                        { filterType: 7, value: `${publisher}.${extensionName}` }
                    ],
                }],
                flags: 0x1 | 0x10, // 0x1: Latest version only, 0x10: Include version metadata
            }),
        });

        if (!response.ok) return currentExtVersion;

        const data = await response.json();

        // The Marketplace API nesting is deep as fuck, so we safely navigate it:
        const extension = data.results?.[0]?.extensions?.[0];
        const version = extension?.versions?.[0]?.version;

        return version || currentExtVersion;
    } catch (error) {
        // Fallback if the Marketplace is down or network fails
        return currentExtVersion;
    }
}
async function getProjectState(targetPath: string) {
    let localUIVer: string | null = null;
    let hasPackageJson = false;
    let localIconsVer: string | null = null;
    let localHasExtension = false;

    try {
        const configPath = path.join(targetPath, 'config.midgardr');
        const raw = await fs.readFile(configPath, 'utf-8');
        const json = JSON.parse(raw.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''));
        localUIVer = json.version || null;
    } catch {
        localUIVer = null;
    }

    try {
        const pkgPath = path.join(targetPath, 'package.json');
        const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
        hasPackageJson = true;
        localIconsVer = pkg.dependencies?.['@a5gard/baldr'] || null;
    } catch {
        hasPackageJson = false;
    }

    try {
        const extensions = await fs.readdir(path.join(targetPath, '.vscode'));
        localHasExtension = extensions.some(ext => ext.includes('midgardr'));
    } catch (e) {
        localHasExtension = false;
    }


    const remoteUIVer = await getLatestLibraryVersion();
    const remoteIconsVer = await getLatestIconVersion();
    const remoteExtVer = await getLatestExtVersion();

    return { localUIVer, localIconsVer, hasPackageJson, remoteUIVer, remoteIconsVer, localHasExtension, remoteExtVer };
}
async function showSmartMenu(targetPath: string, isPremium: boolean, state) {
    const spinner = ora('Checking project status...').start();
    spinner.stop();

    const choices = [];

    if (!state.hasPackageJson) {
        choices.push({ name: `${chalk.bold('Create new remix-run project')} ${chalk.dim('(Remix-based)')}`, value: 'create-new' });
    } else {
        choices.push({ name: `${chalk.bold('Create new remix-run project in another folder')} ${chalk.dim('(Remix-based)')}`, value: 'create-new' });
        choices.push({ name: `${chalk.bold('Install All')} ${chalk.dim('Installs icons and UI in current workspace')}`, value: isPremium ? 'full-premium-install' : 'full-install'});
        choices.push({ name: `${chalk.bold('Update All')} ${chalk.dim('Updates icons and UI in current workspace')}`, value: 'update-all' });
    }

    if (!state.localUIVer) {
        choices.push({ name: `${chalk.bold('Install MIÐGARÐR UI')} ${chalk.dim(`(v${state.remoteUIVer})`)}`, value: isPremium ? 'full-premium-install' : 'full-install' });
        choices.push({ name: `${chalk.bold('Interactive UI Menu')} ${chalk.gray('→ Components + Libraries + CSS')}`, value: 'ui-interactive' })
        choices.push({ name: `${chalk.bold('Full Install')} ${chalk.gray('→ Components + Libraries + CSS')}`, value: 'ui-full-install' })
        choices.push({ name: `${chalk.bold('Full Install with Ngin')} ${chalk.gray('→ Includes presets')}`, value: 'ui-full-install-ngin' })
        choices.push({ name: `${chalk.bold('Select Components')} ${chalk.gray('→ Specific free components')}`, value: 'ui-select-components' })
        choices.push({ name: `${chalk.bold('Configure Only')} ${chalk.gray('→ Tailwind + PostCSS setup')}`, value: 'ui-configure-tailwind-postcss' })
        choices.push({ name: `${chalk.bold('Configure with Ngin')} ${chalk.gray('→ Tailwind + PostCSS + Ngin preset')}`, value: 'ui-configure-ngin' })
        choices.push({ name: `${chalk.bold('Create Config')} ${chalk.gray('→ Configure installation options with pre-configured config file')}`, value: 'ui-create-config' })
        choices.push({ name: `${chalk.bold('Configure Import Call')} ${chalk.gray('→ Allows the use of #midgardr & #icons')}`, value: 'ui-import-call' })
    } else if (state.localUIVer !== state.remoteUIVer) {
        choices.push({ name: `${chalk.yellow('Update')} MIÐGARÐR UI Components ${chalk.dim(`(${state.localUIVer} → ${state.remoteUIVer})`)}`, value: 'ui-components-and-libs' });
        choices.push({ name: `${chalk.bold('Interactive UI Menu')} ${chalk.gray('→ Components + Libraries + CSS')}`, value: 'ui-interactive' })
        choices.push({ name: `${chalk.bold('Configure Only')} ${chalk.gray('→ Tailwind + PostCSS setup')}`, value: 'ui-configure-tailwind-postcss' })
        choices.push({ name: `${chalk.bold('Select Components')} ${chalk.gray('→ Specific free components')}`, value: 'ui-select-components' })
        choices.push({ name: `${chalk.bold('Configure with Ngin')} ${chalk.gray('→ Tailwind + PostCSS + Ngin preset')}`, value: 'ui-configure-ngin' })
        choices.push({ name: `${chalk.bold('Create Config')} ${chalk.gray('→ Configure installation options with pre-configured config file')}`, value: 'ui-create-config' })
        choices.push({ name: `${chalk.bold('Configure Import Call')} ${chalk.gray('→ Allows the use of #midgardr & #icons')}`, value: 'ui-import-call' })
    }

    if (!state.localIconsVer) {
        choices.push({ name: 'Add MIÐGARÐR Icons', value: 'install-icons' });
    } else if (state.localIconsVer !== state.remoteIconsVer) {
        choices.push({ name: `Update MIÐGARÐR Icons ${chalk.dim(`(${state.localIconsVer} → ${state.remoteIconsVer})`)}`, value: 'update-icons' });
    }

    if (!state.localHasExtension) {
        choices.push({ name: 'Install VS Code Extension', value: 'install-ext' });
    } else if (state.localHasExtension && state.remoteExtVer !== "1.0.0") {
        // Logic for update-ext if versioning is tracked
        choices.push({ name: 'Update VS Code Extension', value: 'update-ext' });
    }


    choices.push(new inquirer.Separator());
    choices.push({ name: chalk.red('✗ Exit'), value: 'exit' });

    renderBoxedHeader(
        isPremium ? 'MIÐGARÐR UI - PREMIUM' : 'MIÐGARÐR UI',
        `Context: ${path.basename(targetPath)}`,
        isPremium ? chalk.magenta : chalk.cyan
    );

    const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: 'Select an option?',
        choices,
        pageSize: 10
    }]);

    return action;
}
async function installUi(projectPath, which) {
    switch (which) {
        case 'ui-interactive':
        case 'create-new':
            return spawnSync('bunx', ['@catalystsoftware/ui'], {
                stdio: 'inherit',
                shell: true,
                cwd: projectPath
            });
        case 'ui-full-install':
            return spawnSync('bunx', ['@catalystsoftware/ui', 'full-install'], {
                stdio: 'inherit',
                shell: true,
                cwd: projectPath
            });
        case 'ui-full-install-ngin':
            return spawnSync('bunx', ['@catalystsoftware/ui', 'full-w-ngin'], {
                stdio: 'inherit',
                shell: true,
                cwd: projectPath
            });
        case 'ui-select-components':
            return spawnSync('bunx', ['@catalystsoftware/ui', 'select-components'], {
                stdio: 'inherit',
                shell: true,
                cwd: projectPath
            });
        case 'ui-configure-tailwind-postcss':
            return spawnSync('bunx', ['@catalystsoftware/ui', 'configure-tailwind-postcss'], {
                stdio: 'inherit',
                shell: true,
                cwd: projectPath
            });
        case 'ui-configure-ngin':
            return spawnSync('bunx', ['@catalystsoftware/ui', 'configure-ngin'], {
                stdio: 'inherit',
                shell: true,
                cwd: projectPath
            });
        case 'ui-create-config':
            return spawnSync('bunx', ['@catalystsoftware/ui', 'create-config'], {
                stdio: 'inherit',
                shell: true,
                cwd: projectPath
            });
        case 'ui-import-call':
            return spawnSync('bunx', ['@catalystsoftware/ui', 'import-call'], {
                stdio: 'inherit',
                shell: true,
                cwd: projectPath
            });
    }
}
async function installIcons(projectPath) {
    const pkg = await detectPackageManager()
    if (pkg === 'pnpm') {
        return execSync('pnpm install @catalystsoftware/icons', {
            stdio: 'inherit',
            shell: true,
            cwd: projectPath
        });
    } else if (pkg === 'npm') {
        return execSync('npm install @catalystsoftware/icons', {
            stdio: 'inherit',
            shell: true,
            cwd: projectPath
        });
    }
}
async function updateIcons(projectPath) {
    const pkg = await detectPackageManager()
    if (pkg === 'pnpm') {
        return execSync('pnpm update @catalystsoftware/icons', {
            stdio: 'inherit',
            shell: true,
            cwd: projectPath
        });
    } else if (pkg === 'npm') {
        return execSync('npm update @catalystsoftware/icons', {
            stdio: 'inherit',
            shell: true,
            cwd: projectPath
        });
    }
}
async function installExtension() {
    return execSync('code --install-extension skyler.ocrmnav --force', { stdio: 'inherit' });
}
async function updateExtension() {
    console.log(chalk.blue('Checking for extension updates...'));
    return execSync('code --install-extension skyler.ocrmnav --force', { stdio: 'inherit' });
}
async function CreateRemix2() {
    const projectName = await p.text({
        message: 'What is the name of your new project?',
        placeholder: 'my-catalyst-app'
    });
    if (p.isCancel(projectName)) process.exit(0);
    await spawnSync('npx', ['create-remix@latest', projectName as string], {
        stdio: 'inherit',
        shell: true
    });
    return projectName
}
async function handleAction(action: string, isPremium: boolean, targetPath: string, state) {
    switch (action) {
        case 'create-new':
            const projectFolderName = await CreateRemix2();
            if (projectFolderName) {
                const projectPath = path.join(targetPath, projectFolderName as string);
                await installUi(projectPath, 'create-new');
                await installIcons(projectPath);
                console.log(chalk.green('\n✔ Created new project!'));
            }
            break;     
            case 'ui-interactive':
        case 'ui-full-install':
        case 'ui-full-install-ngin':
        case 'ui-select-components':
        case 'ui-configure-tailwind-postcss':
        case 'ui-configure-ngin':
        case 'ui-create-config':
        case 'ui-import-call':
            return await installUi(targetPath, action);
        case 'install-icons':
            return await installIcons(targetPath);
        case 'update-icons':
            return await updateIcons(targetPath);
        case 'install-ext':
            return await installExtension()
        case 'update-ext':
            break;
        case 'install-all':
            await installUi(targetPath, 'ui-full-install');
            await installIcons(targetPath);
            if (!state.localHasExtension) {
                await installExtension()
            } else {
                await updateExtension()
            }
            break;
        case 'update-all':
            await installUi(targetPath, 'ui-full-install');
            await updateIcons(targetPath);
            await updateExtension()
            break;
        case 'exit':
            process.exit(0);
            break;
    }
}


async function main() {
    const args = process.argv.slice(2);
    const pathFlagIndex = args.indexOf('-p');
    let targetPath = process.cwd();
    if (pathFlagIndex !== -1 && args[pathFlagIndex + 1]) {        targetPath = path.resolve(args[pathFlagIndex + 1]);    }

    const isPremium = false// await checkSecretAccess(args);
    const state = await getProjectState(targetPath);
    const action = await showSmartMenu(targetPath, isPremium, state);
    await handleAction(action, isPremium, targetPath, state);
    
    process.exit(0);
}

main();