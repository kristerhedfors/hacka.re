# Hacka.re Scripts

This directory contains utility scripts for the Hacka.re project.

## Available Scripts

### project_metrics.sh

A bash script that calculates various metrics about the Hacka.re project size and composition.

#### Features

- Counts files, lines, and characters for different file types (.js, .html, .css, .py, etc.)
- Calculates average lines per file for each file type
- Provides test metrics (number of tests, estimated test coverage)
- Shows directory size metrics (top directories by file count)
- Follows .gitignore rules to exclude irrelevant files and directories

#### Usage

```bash
./scripts/project_metrics.sh
```

#### Notes

- The script excludes files and directories specified in the .gitignore file, as well as common directories like node_modules, .git, __pycache__, etc.
- Test coverage is a rough estimate based on the ratio of test files to JavaScript files.
