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
        message: 'Class name of the entity to create or update',
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

    console.log(pc.dim("\nLet's add some fields to your model (id is automatic)."));

    while (addMore) {
        console.log('');
        const fieldNameInput = await text({
            message: 'New property name (press <return> to stop adding fields)',
            placeholder: 'e.g. title, isPublished',
            validate(val) {
                if (val && fieldsInDatabase.includes(val)) return `Field "${val}" already exists!`;
                if (val && fields.some(f => f.name === val)) return `Already added in this session.`;
                if (val && !/^[a-z]/.test(val)) return 'Must start with lowercase';
            }
        });

        if (isCancel(fieldNameInput)) {
            cancel('Operation canceled.');
            process.exit(0);
        }
        const fieldName = fieldNameInput as string;

        if (!fieldName || fieldName.trim() === '') {
            addMore = false;
            break;
        }

        const fieldType = await select({
            message: 'Field type',
            options: [
                { value: 'String', label: 'String' },
                { value: 'Int', label: 'Int' },
                { value: 'Boolean', label: 'Boolean' },
                { value: 'DateTime', label: 'DateTime' },
                { value: 'Float', label: 'Float' },
                { value: 'Decimal', label: 'Decimal' },
                { value: 'Json', label: 'Json' },
                { value: 'Relation', label: 'Relation (or Entity)' },
            ],
        });
        if (isCancel(fieldType)) {
            cancel('Operation canceled.');
            process.exit(0);
        }

        let finalType = fieldType as string;
        let isRelation = false;
        let relationType: 'n-1' | '1-1' | '1-n' | 'n-n' | undefined;
        let relationTarget: string | undefined;

        if (finalType === 'Relation') {
            isRelation = true;

            const otherModels = existingModels.filter(m => m !== name);
            if (otherModels.length === 0) {
                console.log(pc.red('No other models found to relate to! Create another model first.'));
                continue;
            }

            const target = await select({
                message: 'What class should this entity be related to?',
                options: otherModels.map(m => ({ value: m, label: m }))
            });
            if (isCancel(target)) {
                cancel('Operation canceled.');
                process.exit(0);
            }
            relationTarget = target as string;
            finalType = relationTarget;

            const m1 = name;
            const m2 = relationTarget;

            const relations = [
                {
                    type: 'ManyToOne',
                    desc1: `Each ${m1} relates to (has) one ${m2}.`,
                    desc2: `Each ${m2} can relate to (have) many ${m1} objects.`
                },
                {
                    type: 'OneToMany',
                    desc1: `Each ${m1} can relate to (have) many ${m2} objects.`,
                    desc2: `Each ${m2} relates to (has) one ${m1}.`
                },
                {
                    type: 'ManyToMany',
                    desc1: `Each ${m1} can relate to (have) many ${m2} objects.`,
                    desc2: `Each ${m2} can also relate to (have) many ${m1} objects.`
                },
                {
                    type: 'OneToOne',
                    desc1: `Each ${m1} relates to (has) exactly one ${m2}.`,
                    desc2: `Each ${m2} also relates to (has) exactly one ${m1}.`
                }
            ];

            console.log(pc.dim('----------------------------------------------------------------'));
            console.log(pc.bold(` What type of relationship is this?`));
            console.log(pc.dim('----------------------------------------------------------------'));
            
            relations.forEach(rel => {
                console.log(`${pc.green(rel.type.padEnd(12))} ${rel.desc1}`);
                console.log(`${''.padEnd(13)} ${pc.dim(rel.desc2)}`);
                console.log('');
            });
            console.log(pc.dim('----------------------------------------------------------------'));

            const relationChoice = await select({
                message: 'Select the relationship type:',
                options: [
                    { value: 'n-1', label: 'ManyToOne' },
                    { value: '1-n', label: 'OneToMany' },
                    { value: 'n-n', label: 'ManyToMany' },
                    { value: '1-1', label: 'OneToOne' },
                ]
            });

            if (isCancel(relationChoice)) {
                cancel('Operation canceled.');
                process.exit(0);
            }
            relationType = relationChoice as any;
        }

        const isOptional = await confirm({
            message: `Is the ${fieldName} property allowed to be null (nullable)?`,
            initialValue: false
        });
        if (isCancel(isOptional)) {
            cancel('Operation canceled.');
            process.exit(0);
        }

        fields.push({
            name: fieldName,
            type: finalType,
            isOptional: isOptional as boolean,
            isRelation,
            relationType,
            relationTarget
        });

        console.log(pc.green(`Added field: ${fieldName}`));
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