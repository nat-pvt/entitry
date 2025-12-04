import fs from 'node:fs';
import path from 'node:path';
import { getSchema, printSchema } from '@mrleebo/prisma-ast';

const DEFAULT_SCHEMA_PATH = path.join(process.cwd(), 'prisma', 'schema.prisma');

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

    addModel: (schemaPath: string, modelName: string) => {
        const content = fs.readFileSync(schemaPath, 'utf-8');
        const schema = getSchema(content);
        const newModel = {
            type: 'model',
            name: modelName,
            properties: [
                {
                    type: 'field',
                    name: 'id',
                    fieldType: 'Int',
                    attributes: [
                        {
                            type: 'attribute',
                            kind: 'field',
                            name: 'id',
                            args: [] 
                        },
                        {
                            type: 'attribute',
                            kind: 'field',
                            name: 'default',
                            args: [
                                {
                                    value: {
                                        type: 'function',
                                        name: 'autoincrement',
                                        args: []
                                    }
                                }
                            ]
                        }
                    ]
                }
            ]
        };

        schema.list.push(newModel as any);

        const newContent = printSchema(schema);
        fs.writeFileSync(schemaPath, newContent);
    }
};