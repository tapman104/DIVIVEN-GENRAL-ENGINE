const { spawn } = require('child_process');
const path = require('path');

function runPerft() {
  const perftPath = path.join(__dirname, '..', 'dist', 'perft.js');
  const proc = spawn(process.execPath, [perftPath], { stdio: ['ignore', 'pipe', 'pipe'] });

  proc.stdout.on('data', (data) => {
    process.stdout.write(data);
  });
  proc.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  proc.on('close', (code) => {
    if (code === 0) {
      console.log('\nperf-runner: perft finished successfully');
      process.exit(0);
    } else {
      console.error(`\nperf-runner: perft exited with code ${code}`);
      process.exit(code);
    }
  });
}

if (require.main === module) {
  runPerft();
}
