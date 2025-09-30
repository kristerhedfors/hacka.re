# Quick Start Guide - Parallel Testing

## TL;DR - Run Tests Fast

```bash
cd _tests/playwright

# Run core tests (4 workers, ~2-3 min)
./run_core_tests.sh

# Run feature tests (6 workers, ~10-15 min)
./run_feature_tests.sh

# Run all tests (6 workers, ~10-20 min)
./run_tests.sh

# VSCode: Click play button in Test Explorer
```

## Default Configuration

### Optimal Worker Counts (Pre-configured)

- **Core tests**: 4 workers (small suite, quick validation)
- **Feature tests**: 6 workers (large suite, balanced performance)
- **Full suite**: 6 workers (295 files, best throughput)

### Why These Defaults?

Based on actual performance measurements:
- **Sequential**: 65s, 31% CPU ❌ Slow
- **4 workers**: 14s, 184% CPU ✅ 4.8× faster
- **6 workers**: 13s, 168% CPU ✅ 5× faster

More workers (8+) showed diminishing returns due to overhead.

## Running Tests

### Command Line (Recommended for Full Suite)

```bash
# Default (uses optimal workers)
./run_core_tests.sh

# Custom worker count
./run_feature_tests.sh --workers 8

# Sequential mode (debugging)
./run_tests.sh --no-parallel

# Headless mode (CI/CD)
./run_tests.sh --headless

# Specific test files
.venv/bin/python -m pytest -n 6 test_function*.py
```

### VSCode Test Explorer (Recommended for Single Tests)

1. Open `_tests/playwright` folder in VSCode
2. Click **Testing** icon (beaker) in left sidebar
3. Click ▶️ play button next to any test
4. Runs in sequential mode (perfect for debugging)

**Note**: VSCode runs tests sequentially. For parallel runs, use terminal.

## Performance Expectations

### Actual Measurements

| Test Count | Sequential | Parallel (6 workers) | Speedup |
|-----------|-----------|---------------------|---------|
| 4 tests | 15s | 14s | 1.1× |
| 5 tests | 43s | 16s | 2.7× |
| 7 tests | 65s | 14s | 4.6× |
| 20+ tests | 120s | 25s | 4.8× |

### Full Suite Projections

| Workers | Estimated Time | Speedup |
|---------|---------------|---------|
| 1 (sequential) | 30-60 min | 1× |
| 4 | 10-15 min | 3-4× |
| **6 (default)** | **8-12 min** | **4-5×** ✅ |
| 8 | 7-10 min | 5-6× |

## Troubleshooting

### Tests Not Running

**Issue**: No tests found or test discovery fails

**Solutions**:
```bash
# Verify you're in test directory
cd _tests/playwright

# Check Python environment
.venv/bin/python --version

# Reinstall dependencies
.venv/bin/pip install -r requirements.txt
```

### Port Conflicts

**Issue**: `Address already in use`

**Solutions**:
```bash
# Kill orphaned servers
pkill -f "http.server 8000"

# Or use specific PID
lsof -ti:8000 | xargs kill -9
```

### Slow Performance

**Issue**: Tests still running slowly

**Checklist**:
- ✅ Using `-n` flag? (e.g., `pytest -n 6`)
- ✅ Running from `_tests/playwright` directory?
- ✅ Using scripts (`./run_core_tests.sh`) not manual commands?
- ✅ Have enough CPU/RAM? (8GB RAM recommended for 6 workers)

## Advanced Usage

### Custom Worker Counts

```bash
# More workers (high-end machine)
./run_tests.sh --workers 8

# Fewer workers (laptop)
./run_tests.sh --workers 2

# Auto-detect CPU cores
.venv/bin/python -m pytest -n auto test_*.py
```

### CI/CD Optimization

```bash
# GitHub Actions / Jenkins
./run_tests.sh --headless --workers 6 --maxfail=10

# With timeout protection
timeout 20m ./run_tests.sh --workers 8
```

### Debugging Failed Tests

```bash
# Run failed test sequentially
.venv/bin/python -m pytest test_failed.py::test_specific -v -s

# Or use script
./run_core_tests.sh --no-parallel -k "test_specific"

# VSCode: Right-click test → Debug Test
```

## Best Practices

### Development Workflow

1. **Write test** in editor
2. **Run single test** via VSCode (click play button)
3. **Run related tests** in terminal: `.venv/bin/python -m pytest -n 4 test_*.py`
4. **Before commit**, run full suite: `./run_tests.sh`

### When to Use What

| Scenario | Method | Workers |
|----------|--------|---------|
| Single test debugging | VSCode Test Explorer | 1 (sequential) |
| Quick validation | `./run_core_tests.sh` | 4 (default) |
| Feature development | `./run_feature_tests.sh` | 6 (default) |
| Before commit | `./run_tests.sh` | 6 (default) |
| CI/CD pipeline | `./run_tests.sh --headless` | 6-8 |

## Documentation

- [PARALLEL_TESTING.md](PARALLEL_TESTING.md) - Comprehensive parallel testing guide
- [VSCODE_TESTING.md](VSCODE_TESTING.md) - VSCode integration details
- [TESTING_SUMMARY.md](TESTING_SUMMARY.md) - Implementation details

## Summary

✅ **Default: 6 workers** for optimal 4-5× speedup
✅ **Scripts pre-configured** with best settings
✅ **VSCode integration** for single test debugging
✅ **No setup required** - just run the scripts!

**Recommended command**: `./run_tests.sh` (runs full suite in ~10-15 min)