#!/usr/bin/env node
const { program, Command } = require('commander');
const enqueueCommand = require('../src/commands/enqueue');
const listCommand = require('../src/commands/list');
const { dlqListCommand, dlqRetryCommand } = require('../src/commands/dlq');
const { stopAllWorkers } = require('../src/signaling');
const runWorker = require('../src/worker');
const statusCommand = require('../src/commands/status');
const { configSetCommand, configGetCommand } = require('../src/commands/config');

program
  .command('enqueue [json]')
  .option('--file <path>', 'read job JSON from a file instead of the command line')
  .action((json, options) => {
    enqueueCommand(json, options);
  });

program
  .command('list')
  .option('--state <state>', 'filter by state')
  .option('--json', 'output as JSON')
  .action((options) => {
    listCommand(options.state, options.json);
  });

program
  .command('status')
  .action(statusCommand);

const dlq = new Command('dlq').description('Manage dead letter queue');

dlq
  .command('list')
  .option('--json', 'output as JSON')
  .action((options) => {
    dlqListCommand(options.json);
  });

dlq
  .command('retry <id>')
  .action((id) => {
    dlqRetryCommand(id);
  });

program.addCommand(dlq);

const worker = new Command('worker').description('Manage workers');

worker
  .command('start')
  .action(() => {
    runWorker(`worker-${process.pid}`);
  });

worker
  .command('stop')
  .action(() => {
    stopAllWorkers();
  });

program.addCommand(worker);

const config = new Command('config').description('Manage configuration');

config
  .command('set <key> <value>')
  .action((key, value) => configSetCommand(key, value));

config
  .command('get <key>')
  .action((key) => configGetCommand(key));

program.addCommand(config);

program.parse();