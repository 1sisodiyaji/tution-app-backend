const { fork } = require('child_process');
const path = require('path');

const sendEmailViaWorker = (emailOptions) => {
  return new Promise((resolve, reject) => {
    const worker = fork(path.resolve(__dirname, 'emailWorker.js'));

    worker.send(emailOptions);

    worker.on('message', (msg) => {
      if (msg.status === 'success') resolve(msg.result);
      else reject(new Error(msg.error));
      worker.kill();
    });

    worker.on('error', (err) => {
      reject(err);
      worker.kill();
    });

    worker.on('exit', (code) => {
      console.error(`Email worker exited with code ${code}`);
    });
  });
};

module.exports = sendEmailViaWorker;
