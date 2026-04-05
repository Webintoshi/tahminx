#!/usr/bin/env node
const target = process.env.HEALTHCHECK_URL || 'http://127.0.0.1:3000/health/ready';
const timeoutMs = Number(process.env.HEALTHCHECK_TIMEOUT_MS || 6000);

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), timeoutMs);

fetch(target, { signal: controller.signal })
  .then(async (response) => {
    clearTimeout(timer);
    const body = await response.text();
    if (!response.ok) {
      console.error(`Healthcheck failed: ${response.status} ${response.statusText}`);
      console.error(body);
      process.exit(1);
    }

    console.log(`Healthcheck ok: ${target}`);
    console.log(body);
    process.exit(0);
  })
  .catch((error) => {
    clearTimeout(timer);
    console.error(`Healthcheck request failed for ${target}: ${error.message}`);
    process.exit(1);
  });