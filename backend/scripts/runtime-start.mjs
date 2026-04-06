import { spawnSync } from 'node:child_process';

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

run('npx prisma migrate resolve --rolled-back 0001_init', { allowFailure: true });
run('npx prisma migrate deploy');

const app = spawnSync('node dist/src/main.js', {
  shell: true,
  stdio: 'inherit',
  env: process.env,
});

process.exit(app.status ?? 1);
