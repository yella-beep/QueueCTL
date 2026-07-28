#!/usr/bin/env node
const { program, Command } = require('commander');
const enqueueCommand = require('../src/commands/enqueue');
const listCommand = require('../src/commands/list');
const { dlqListCommand, dlqRetryCommand } = require('../src/commands/dlq');

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

program.parse();