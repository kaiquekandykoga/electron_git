/**
 * scripts/ad-hoc-sign-mac.js
 *
 * @process      Build. An electron-builder afterPack hook, wired up from package.json;
 *               macOS only.
 * @purpose      Ad-hoc sign the packaged .app so an unsigned CI build is runnable at
 *               all on Apple Silicon.
 * @exports      adHocSignMac, as module.exports.
 * @dependencies child_process: runs codesign; electron-builder: supplies the pack
 *               context.
 * @sideEffects  Spawns codesign against the packed .app bundle.
 * @notes        Without it Gatekeeper calls the download damaged instead of showing the
 *               usual unidentified-developer prompt. When a real identity is
 *               configured, electron-builder signs again afterwards and replaces this
 *               signature.
 */

const path = require('path');
const { execFileSync } = require('child_process');

module.exports = async function adHocSignMac(context) {
  // Only meaningful for macOS builds, and codesign only exists on macOS hosts.
  if (context.electronPlatformName !== 'darwin' || process.platform !== 'darwin') {
    return;
  }

  const appPath = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`,
  );

  // --deep is discouraged for distribution signing, but it is the practical way
  // to cover the nested helpers and frameworks with an ad-hoc identity.
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], {
    stdio: 'inherit',
  });
};
