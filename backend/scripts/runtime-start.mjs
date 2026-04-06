import { spawnSync } from 'node:child_process';

const RECOVERABLE_MIGRATIONS = [
  '0001_init',
  '0005_model_analysis_observability',
  '0006_model_strategy_and_feature_lab',
];

function run(command, { allowFailure = false } = {}) {
  const result = spawnSync(command, {
    shell: true,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0 && !allowFailure) {
    process.exit(result.status ?? 1);
  }
}

for (const migration of RECOVERABLE_MIGRATIONS) {
  run(`npx prisma migrate resolve --rolled-back ${migration}`, { allowFailure: true });
}
run('npx prisma migrate deploy');

const app = spawnSync('node dist/src/main.js', {
  shell: true,
  stdio: 'inherit',
  env: process.env,
});

process.exit(app.status ?? 1);
