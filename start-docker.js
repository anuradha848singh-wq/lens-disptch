const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure tmp directory exists
fs.mkdirSync('./tmp', { recursive: true });

const out = fs.openSync('./tmp/docker-desktop-out.log', 'a');
const err = fs.openSync('./tmp/docker-desktop-err.log', 'a');

const p = spawn('C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe', [], {
  detached: true,
  stdio: ['ignore', out, err]
});
p.unref();
console.log('Docker Desktop spawned in background with PID:', p.pid);
process.exit(0);
