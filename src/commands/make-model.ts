import { intro, outro, text, spinner, isCancel, cancel, confirm } from '@clack/prompts';
import pc from 'picocolors';
import { schemaManager } from '../lib/schema-manager';

export async function makeModel() {
    console.clear();
    intro(pc.bgCyan(pc.black(' ENTITRY ')));

    const s = spinner();

    s.start('Recherche du fichier schema.prisma...');

    await new Promise(r => setTimeout(r, 800));

    let schemaPath = schemaManager.findPath();
    let existingModels: string[] = [];

    if (schemaPath) {
        s.stop(pc.green('schema.prisma file found!'));
        existingModels = schemaManager.getExistingModels(schemaPath);
    } else {
        s.stop(pc.yellow('No schema.prisma file found.'));
        
        const shouldCreate = await confirm({
            message: 'Do you want to initialize a new Prisma file?',
        });

        if (isCancel(shouldCreate) || !shouldCreate) {
            cancel('Unable to continue without a schema file.');
            process.exit(0);
        }

        s.start('Creating the standard file...');
        schemaPath = schemaManager.createBasicSchema();
        s.stop(pc.green(`File created in ${schemaPath}`));
    }

    const modelName = await text({
        message: 'What is the name of your new model?',
        placeholder: 'Ex: Product, User...',
        validate(value) {
            if (value.length === 0) return 'Name is required.';
            if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) return 'The name must begin with a capital letter.';
            if (existingModels.includes(value)) {
                return `The “${value}” model already exists in your schema!`;
            }
        },
    });

    if (isCancel(modelName)) {
        cancel('Operation canceled.');
        process.exit(0);
    }

    outro(pc.green(`The schema.prisma file has been updated.`));
}