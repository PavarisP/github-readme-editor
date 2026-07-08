# tool-name

![license](https://img.shields.io/badge/license-MIT-blue) ![platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey)

A command-line tool that does one thing well.

## Installation

```bash
npm install -g tool-name
```

## Usage

```bash
tool-name <command> [options]
```

### Commands

| Command | Description                         |
| ------- | ----------------------------------- |
| `init`  | Set up a new project in the folder. |
| `build` | Build the project for production.   |
| `serve` | Start a local development server.   |

### Options

| Flag            | Description               |
| --------------- | ------------------------- |
| `-h, --help`    | Show help.                |
| `-v, --version` | Print the version number. |
| `--verbose`     | Enable verbose logging.   |

## Examples

```bash
# Create a new project and start the dev server
tool-name init my-app
cd my-app
tool-name serve --verbose
```

## License

MIT
