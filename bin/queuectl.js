#!/usr/bin/env node
const { program } = require('commander');
const enqueueCommand = require('../src/commands/enqueue');
const listCommand = require('../src/commands/list');

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

program.parse();