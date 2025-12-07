import fs from 'node:fs';
import path from 'node:path';
import { getSchema, printSchema } from '@mrleebo/prisma-ast';

const DEFAULT_SCHEMA_PATH = path.join(process.cwd(), 'prisma', 'schema.prisma');

export interface ModelField {
    name: string;
    type: string;
    isOptional: boolean;
    isRelation?: boolean;
    relationType?: '1-1' | '1-n' | 'n-n' | 'n-1';
    relationTarget?: string;
}

export const schemaManager = {
    findPath: () => {
        const pathsToCheck = [
            DEFAULT_SCHEMA_PATH,
            path.join(process.cwd(), 'schema.prisma'),
        ];

        return pathsToCheck.find(p => fs.existsSync(p)) || null;
    },

    getExistingModels: (schemaPath: string) => {
        const content = fs.readFileSync(schemaPath, 'utf-8');
        const schema = getSchema(content);

        return schema.list
            .filter((item: any) => item.type === 'model')
            .map((item: any) => item.name);
    },

    getModelFields: (schemaPath: string, modelName: string): string[] => {
        const content = fs.readFileSync(schemaPath, 'utf-8');
        const schema = getSchema(content);

        const model = schema.list.find(
            (item: any) => item.type === 'model' && item.name === modelName
        ) as any;

        if (!model) return [];

        return model.properties
            .filter((prop: any) => prop.type === 'field')
            .map((prop: any) => prop.name);
    },

    createBasicSchema: () => {
        const dir = path.dirname(DEFAULT_SCHEMA_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const basicContent = `
generator client {
    provider = "prisma-client-js"
}

datasource db {
    provider = "postgresql"
    url = env("DATABASE_URL")
}
`;
        fs.writeFileSync(DEFAULT_SCHEMA_PATH, basicContent);
        return DEFAULT_SCHEMA_PATH;
    },

    addModel: (schemaPath: string, modelName: string, customFields: ModelField[]) => {
        const content = fs.readFileSync(schemaPath, 'utf-8');
        const schema = getSchema(content);
        
        let mainModel = schema.list.find((item: any) => item.type === 'model' && item.name === modelName) as any;
        if (!mainModel) {
            mainModel = {
                type: 'model', name: modelName,
                properties: [{
                    type: 'field', name: 'id', fieldType: 'Int',
                    attributes: [{ type: 'attribute', kind: 'field', name: 'id', args: [] }, { type: 'attribute', kind: 'field', name: 'default', args: [{ value: { type: 'function', name: 'autoincrement', args: [] } }] }]
                }]
            };
            schema.list.push(mainModel);
        }

        const getUniqueFieldName = (model: any, baseName: string) => {
            let name = baseName;
            let counter = 2;
            while (model.properties.some((p: any) => p.name === name)) {
                name = `${baseName}_${counter}`;
                counter++;
            }
            return name;
        };

        for (const field of customFields) {
            const exists = mainModel.properties.some((p: any) => p.type === 'field' && p.name === field.name);
            if (exists) continue;

            if (field.isRelation && field.relationTarget) {
                const relationName = `${modelName}_${field.name}`;
                const targetModel = schema.list.find((item: any) => item.type === 'model' && item.name === field.relationTarget) as any;

                if (field.relationType === 'n-1') {
                    const fkName = `${field.name}Id`;
                    mainModel.properties.push({
                        type: 'field', name: field.name, fieldType: field.relationTarget, optional: field.isOptional,
                        attributes: [{
                            type: 'attribute', kind: 'field', name: 'relation',
                            args: [
                                { type: 'attributeArgument', value: `"${relationName}"` },
                                { type: 'attributeArgument', value: { type: 'keyValue', key: 'fields', value: { type: 'array', args: [fkName] } } },
                                { type: 'attributeArgument', value: { type: 'keyValue', key: 'references', value: { type: 'array', args: ['id'] } } }
                            ]
                        }]
                    });
                    mainModel.properties.push({ type: 'field', name: fkName, fieldType: 'Int', optional: field.isOptional, attributes: [] });

                    if (targetModel) {
                        const backFieldName = getUniqueFieldName(targetModel, modelName.toLowerCase() + 's');
                        targetModel.properties.push({ 
                            type: 'field', name: backFieldName, fieldType: modelName, array: true, 
                            attributes: [{ type: 'attribute', kind: 'field', name: 'relation', args: [{ type: 'attributeArgument', value: `"${relationName}"` }] }] 
                        });
                    }
                }

                else if (field.relationType === '1-n') {
                    mainModel.properties.push({
                        type: 'field', name: field.name, fieldType: field.relationTarget, array: true,
                        attributes: [{ type: 'attribute', kind: 'field', name: 'relation', args: [{ type: 'attributeArgument', value: `"${relationName}"` }] }]
                    });

                    if (targetModel) {
                        const backFieldName = getUniqueFieldName(targetModel, modelName.toLowerCase());
                        const backFkName = `${backFieldName}Id`;
                        
                        targetModel.properties.push({
                            type: 'field', name: backFieldName, fieldType: modelName, optional: true,
                            attributes: [{
                                type: 'attribute', kind: 'field', name: 'relation',
                                args: [
                                    { type: 'attributeArgument', value: `"${relationName}"` },
                                    { type: 'attributeArgument', value: { type: 'keyValue', key: 'fields', value: { type: 'array', args: [backFkName] } } },
                                    { type: 'attributeArgument', value: { type: 'keyValue', key: 'references', value: { type: 'array', args: ['id'] } } }
                                ]
                            }]
                        });
                        targetModel.properties.push({ type: 'field', name: backFkName, fieldType: 'Int', optional: true, attributes: [] });
                    }
                }

                else if (field.relationType === 'n-n') {
                    mainModel.properties.push({
                        type: 'field', name: field.name, fieldType: field.relationTarget, array: true, attributes: []
                    });
                    if (targetModel) {
                        const backFieldName = getUniqueFieldName(targetModel, modelName.toLowerCase() + 's');
                        targetModel.properties.push({ type: 'field', name: backFieldName, fieldType: modelName, array: true, attributes: [] });
                    }
                }

                else if (field.relationType === '1-1') {
                    const fkName = `${field.name}Id`;
                    mainModel.properties.push({
                        type: 'field', name: field.name, fieldType: field.relationTarget, optional: field.isOptional,
                        attributes: [{
                            type: 'attribute', kind: 'field', name: 'relation',
                            args: [
                                { type: 'attributeArgument', value: `"${relationName}"` },
                                { type: 'attributeArgument', value: { type: 'keyValue', key: 'fields', value: { type: 'array', args: [fkName] } } },
                                { type: 'attributeArgument', value: { type: 'keyValue', key: 'references', value: { type: 'array', args: ['id'] } } }
                            ]
                        }] 
                    });
                    mainModel.properties.push({ type: 'field', name: fkName, fieldType: 'Int', optional: field.isOptional, attributes: [{ type: 'attribute', kind: 'field', name: 'unique', args: [] }] });

                    if (targetModel) {
                        const backFieldName = getUniqueFieldName(targetModel, modelName.toLowerCase());
                        targetModel.properties.push({ 
                            type: 'field', name: backFieldName, fieldType: modelName, optional: true, 
                            attributes: [{ type: 'attribute', kind: 'field', name: 'relation', args: [{ type: 'attributeArgument', value: `"${relationName}"` }] }] 
                        });
                    }
                }

            } else {
                mainModel.properties.push({ type: 'field', name: field.name, fieldType: field.type, optional: field.isOptional, attributes: [] });
            }
        }

        const newContent = printSchema(schema);
        fs.writeFileSync(schemaPath, newContent);
    }
};