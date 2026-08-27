const path = require('path');
const { execFileSync } = require('child_process');

// electron-builder afterPack hook.
//
// CI has no Apple Developer certificate, so the macOS build is unsigned. On
// Apple Silicon an unsigned bundle cannot be executed at all, and Gatekeeper
// reports the download as "damaged and can't be opened" instead of the usual
// unidentified-developer prompt. An ad-hoc signature (identity "-") is enough
// to make the app runnable, so users get the normal "Open Anyway" flow.
//
// When a real identity is configured, electron-builder signs again after this
// hook and that signature replaces the ad-hoc one.
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
