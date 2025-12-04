# Entitry

[![npm version](https://img.shields.io/npm/v/entitry.svg)](https://www.npmjs.com/package/entitry)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Entitry** is an interactive CLI tool designed to simplify the creation of Prisma models. 
It brings the developer experience (DX) of Symfony's `make:entity` to the Prisma ecosystem.

> 🚧 **Work In Progress**: This project is in active development.

## Why?

Writing `schema.prisma` files manually is great, but managing relations (One-to-Many, Many-to-Many) manually can be error-prone and tedious. **Entitry** solves this by asking you simple questions and generating the complex PSL (Prisma Schema Language) code for you.

## Features

- 🧙‍♂️ **Interactive Wizard**: No need to remember complex syntax.
- ⚡ **Auto-detection**: Automatically finds your `schema.prisma` or creates one if missing.
- ✅ **Smart Validation**: Prevents duplicate models or invalid names.
- 🌐 **Framework Agnostic**: Works with any framework using Prisma (Next.js, NestJS, Express, etc.).

## Installation

You can run it directly using `npx`:

```bash
npx entitry make:model
```
Or install it globally (not recommended) or as a dev dependency:

```bash
npm install -D entitry
```

## Usage

### Create or Edit a Model

```bash
npx entitry make:model
```

Follow the prompts:

1.  The tool detects your schema.
2.  Enter the model name (e.g., `Product`).
3.  (Coming soon) Add fields and define relations interactively.

## Roadmap

  - [x] Schema file detection & initialization
  - [x] Model name validation
  - [ ] Add primitive fields (String, Int, Boolean...)
  - [ ] **Add Relations** (1-1, 1-n, n-n) automatically updating both models
  - [ ] Support for Prisma Attributes (`@unique`, `@default`, etc.)

## Contributing

Contributions are welcome\!

1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.