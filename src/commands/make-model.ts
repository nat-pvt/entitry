import { intro, outro, text, spinner, select, isCancel, cancel, confirm } from '@clack/prompts';
import pc from 'picocolors';
import { schemaManager, ModelField } from '../lib/schema-manager';

export async function makeModel() {
    console.clear();
    intro(pc.bgCyan(pc.black(' ENTITRY ')));

    const s = spinner();

    s.start('Recherche du fichier schema.prisma...');
    await new Promise(r => setTimeout(r, 500));

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
        message: 'What is the name of your model?',
        placeholder: 'Ex: Product, User...',
        validate(value) {
            if (!value) return 'Name is required.';
            if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) return 'The name must begin with a capital letter.';
        },
    });

    if (isCancel(modelName)) {
        cancel('Operation canceled.');
        process.exit(0);
    }

    const name = modelName as string;

    let fieldsInDatabase: string[] = [];

    if (existingModels.includes(name)) {
        console.log(pc.yellow(`Model "${name}" already exists. Adding new fields to it.`));
        fieldsInDatabase = schemaManager.getModelFields(schemaPath!, name);
    } else {
        console.log(pc.green(`Creating new model "${name}".`));
    }

    const fields: ModelField[] = [];
    let addMore = true;

    const PrismaTypes = [
        { value: 'String', label: 'String' },
        { value: 'Int', label: 'Int' },
        { value: 'Boolean', label: 'Boolean' },
        { value: 'DateTime', label: 'DateTime' },
        { value: 'Float', label: 'Float' },
        { value: 'Decimal', label: 'Decimal' },
        { value: 'Json', label: 'Json' },
    ];
    
    console.log(pc.dim('\nLet\'s add some fields to your model (id is automatic).'));

    while (addMore) {
        const fieldName = await text({
            message: 'New field name (leave empty to stop)',
            placeholder: 'Ex: title, price, isPublished',
            validate(value) {
                if (value && !/^[a-z][a-zA-Z0-9]*$/.test(value)) return 'Field name should start with a lowercase letter (camelCase)';
                if (fieldsInDatabase.includes(value)) {
                    return `Field "${value}" already exists in model "${name}"!`;
                }
                if (fields.some(f => f.name === value)) {
                    return `You just added "${value}" in this session!`;
                }
            }
        });

        if (isCancel(fieldName)) {
            cancel('Operation canceled.');
            process.exit(0);
        }

        if (!fieldName || fieldName.toString().trim() === '') {
            addMore = false;
            break;
        }

        const fieldType = await select({
            message: `Type for "${fieldName}"?`,
            options: PrismaTypes,
        });

        if (isCancel(fieldType)) {
            cancel('Operation canceled.');
            process.exit(0);
        }

        const isOptional = await confirm({
            message: `Is "${fieldName}" optional? (nullable)`,
            initialValue: false
        });

        if (isCancel(isOptional)) {
            cancel('Operation canceled.');
            process.exit(0);
        }

        fields.push({
            name: fieldName as string,
            type: fieldType as string,
            isOptional: isOptional as boolean
        });

        console.log(pc.cyan(`Added fields: ${fieldName} ${fieldType}${isOptional ? '?' : ''}`));
    }

    s.start(`Generating model ${modelName}...`);

    try {
        schemaManager.addModel(schemaPath!, modelName as string, fields);
        s.stop(pc.green('Schema successfully updated!'));
    } catch (error) {
        s.stop(pc.red('Error while writing the file.'));
        console.error(error);
        process.exit(1);
    }

    outro(pc.green(`Done! You can now run “npx prisma format” to clean up the file.`));
}