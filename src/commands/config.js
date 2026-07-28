const { getConfig, setConfig } = require('../config');

function configSetCommand(key, value) {
  const validKeys = ['backoff-base', 'max-retries'];
  if (!validKeys.includes(key)) {
    console.error(`Error: unknown config key "${key}". Valid keys: ${validKeys.join(', ')}`);
    process.exit(1);
  }

  const num = Number(value);
  if (isNaN(num)) {
    console.error(`Error: value must be a number`);
    process.exit(1);
  }

  setConfig(key, num);
  console.log(`${key} set to ${num}`);
}

function configGetCommand(key) {
  console.log(`${key} = ${getConfig(key)}`);
}

module.exports = { configSetCommand, configGetCommand };
