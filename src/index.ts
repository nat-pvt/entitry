#!/usr/bin/env node
import { cac } from 'cac';
import { makeModel } from './commands/make-model';
import pc from 'picocolors';

const cli = cac('entitry');

cli
    .command('make:model', 'Create a new model')
    .action(() => {
        makeModel();
    });

cli.help();
cli.version('0.0.1');

try {
    cli.parse();
} catch (error) {
    console.error(pc.red('An error occurred:'));
    console.error(error);
    process.exit(1);
}