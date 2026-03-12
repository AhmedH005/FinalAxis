/* eslint-env node */
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Watch workspace packages so Metro hot-reloads on changes to @axis/*
config.watchFolders = [workspaceRoot];

// Resolve node_modules from both the project and workspace root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Required for .cjs modules (e.g. Supabase)
config.resolver.sourceExts.push('cjs');

module.exports = config;
