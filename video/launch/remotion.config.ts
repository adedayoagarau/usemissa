import { Config } from "@remotion/cli/config";
import fs from "node:fs";

// Cloud sessions ship Chromium under /opt/pw-browsers; use it instead of downloading one.
const preinstalled =
  "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
if (fs.existsSync(preinstalled)) {
  Config.setBrowserExecutable(preinstalled);
}

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setCodec("h264");
Config.setCrf(16);
Config.setPixelFormat("yuv420p");
Config.setConcurrency(4);
