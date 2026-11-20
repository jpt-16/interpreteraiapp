const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

/**
 * The mobile app shares its pure TypeScript domain logic (exercise content,
 * evaluation heuristics, coaching, analytics, types) with the web/API project
 * in ../src. Imports of "@/…" resolve there; "~/…" is the mobile app's own src.
 */
const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, "../src");
const config = getDefaultConfig(projectRoot);

config.watchFolders = [...(config.watchFolders ?? []), sharedRoot];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")];

const defaultResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  let target = moduleName;
  if (moduleName.startsWith("@/")) target = path.resolve(sharedRoot, moduleName.slice(2));
  else if (moduleName.startsWith("~/")) target = path.resolve(projectRoot, "src", moduleName.slice(2));
  return (defaultResolve ?? context.resolveRequest)(context, target, platform);
};

module.exports = config;
