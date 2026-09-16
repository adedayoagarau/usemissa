// Registers the test loader before test files are imported. Prepend this with
// `--import` (e.g. `NODE_OPTIONS=--import=./test/register.mjs`) when running
// the web unit suite.
import { register } from "node:module";

register("./loader.mjs", import.meta.url);
