#!/usr/bin/env node
const { spawnSync } = require('node:child_process');

const isProduction = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
const allowProdSeed = String(process.env.ALLOW_PRODUCTION_SEED || 'false').toLowerCase() === 'true';
const seedMode = String(process.env.SEED_MODE || (isProduction ? 'production' : 'development')).toLowerCase();

if (isProduction && !allowProdSeed) {
  console.error('Refusing to run seed in production. Set ALLOW_PRODUCTION_SEED=true to continue.');
  process.exit(1);
}

process.env.SEED_MODE = seedMode;
const result = spawnSync('npx', ['ts-node', 'prisma/seed.ts'], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

process.exit(result.status === null ? 1 : result.status);