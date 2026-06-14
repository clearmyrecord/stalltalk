#!/usr/bin/env node
import { spawn } from "node:child_process";

const maxAttempts = Number.parseInt(process.env.PRISMA_MIGRATE_DEPLOY_ATTEMPTS ?? "3", 10);
const timeoutMs = Number.parseInt(process.env.PRISMA_MIGRATE_DEPLOY_TIMEOUT_MS ?? "120000", 10);
const baseDelayMs = Number.parseInt(process.env.PRISMA_MIGRATE_DEPLOY_RETRY_DELAY_MS ?? "10000", 10);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function runMigrateDeploy(attempt) {
  return new Promise((resolve) => {
    const child = spawn("npx", ["prisma", "migrate", "deploy"], {
      env: process.env,
      shell: process.platform === "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    const timer = setTimeout(() => {
      output += `\nTimed out after ${timeoutMs}ms while waiting for prisma migrate deploy.\n`;
      child.kill("SIGTERM");
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(text);
    });

    child.on("close", (code, signal) => {
      clearTimeout(timer);
      resolve({ attempt, code, signal, output });
    });
  });
}

const isRetryableLockFailure = ({ signal, output }) => {
  if (signal) return true;
  return /P1002|pg_advisory_lock|advisory lock|Timed out/i.test(output);
};

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  console.log(`Running prisma migrate deploy (attempt ${attempt}/${maxAttempts})...`);
  const result = await runMigrateDeploy(attempt);

  if (result.code === 0) {
    process.exit(0);
  }

  if (attempt < maxAttempts && isRetryableLockFailure(result)) {
    const delayMs = baseDelayMs * attempt;
    console.warn(`prisma migrate deploy hit a retryable lock/timeout failure. Retrying in ${delayMs}ms...`);
    await sleep(delayMs);
    continue;
  }

  process.exit(result.code ?? 1);
}
