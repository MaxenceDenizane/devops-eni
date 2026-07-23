# GitHub Actions CI/CD Pipeline Documentation

## Overview

This CI/CD pipeline ensures code quality and reliability by automatically running tests on every push and pull request to the `main` branch. It follows a multi-stage approach:

1. **Test Stage**: Run unit and integration tests with a temporary MySQL database
2. **Build & Deploy Stage**: Build Docker image and run smoke tests (only if tests pass)
3. **Notification Stage**: Summarize results

## Workflow Triggers

The pipeline is triggered automatically on:
- **Push to `main` branch**: Full pipeline runs (tests → build → deploy)
- **Pull requests to `main` branch**: Tests only (no deployment)

## Pipeline Stages

### Stage 1: Testing (Job: `test`)

**When it runs:**
- On every push to `main`
- On every pull request to `main`

**What it does:**
1. Sets up Node.js 18 environment
2. Installs project dependencies from npm
3. Starts an ephemeral MySQL 8.0 service container
4. Waits for MySQL to be ready (health check)
5. Initializes the database using `scriptSQL.sql`
6. Runs all tests with Jest: `npm test -- --coverage`
7. Uploads coverage reports as artifacts for 30 days

**Environment Variables:**
```
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=test_password
DB_NAME=todolist_db
DB_DIALECT=mysql
NODE_ENV=test
```

### Stage 2: Build & Deploy (Job: `build-and-deploy`)

**When it runs:**
- Only on **push to `main`** (not on pull requests)
- Only **if Stage 1 (test) passes**

**What it does:**
1. Builds Docker image: `docker build -t projetback:${SHA}`
2. Tags image with `latest` for easy reference
3. Starts application container locally:
   - Maps port 3000
   - Injects environment variables
   - Configured for production mode
4. Waits for application to respond (30 second timeout)
5. Runs smoke tests:
   - Verifies HTTP response (200 or 404)
   - Tests root endpoint availability
6. Cleans up container (even if tests fail)

**Environment Variables:**
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=test_password
DB_NAME=todolist_db
DB_DIALECT=mysql
NODE_ENV=production
```

### Stage 3: Notification (Job: `notify`)

**What it does:**
- Runs after both `test` and `build-and-deploy` jobs complete
- Provides final status summary
- Returns exit code 0 (success) if all stages passed, 1 (failure) otherwise

## Key Features

### ✓ Automatic MySQL Database
- Docker container with MySQL 8.0 runs during tests
- Automatically created and destroyed per test run
- No manual database setup needed in CI/CD

### ✓ Test-First Deployment
- Deployment only happens if all tests pass
- Failed tests block Docker build and deployment
- Pull requests don't deploy (tests only)

### ✓ Smoke Testing
- Verifies Docker image can start successfully
- Confirms HTTP endpoints are responding
- Tests application health before considering deployment complete

### ✓ Artifact Preservation
- Coverage reports uploaded for analysis
- Kept for 30 days for performance tracking

### ✓ Clean Resource Management
- MySQL service stops automatically after tests
- Docker container is cleaned up after deployment tests
- Prevents resource leaks

## Detailed Workflow Logic

```
┌─────────────────────────────────────────────────────┐
│   Push to main OR Pull Request to main              │
└────────────────┬──────────────────────────────────┘
                 │
                 ▼
        ┌────────────────────┐
        │   TEST JOB         │
        │ (Always runs)      │
        └────────┬───────────┘
                 │
          ┌──────▼──────┐
          │ Tests Pass? │
          └──┬────────┬─┘
             │Yes     │No
             │        │
             ▼        ▼
       ┌─────────┐  ┌─────────┐
       │Deploy?  │  │STOP     │
       │Push OK? │  │(PR fails)
       └┬────┬───┘  └─────────┘
        │Yes │No
        │    └─────► STOP
        │          (PR only)
        ▼
    BUILD & DEPLOY
    (Push only)
        │
        ▼
    SMOKE TEST
        │
    ┌───▼────┐
    │Success? │
    └────────┘
        │
        ▼
    NOTIFY
    (Final status)
```

## Running Tests Locally

To test your changes before pushing to GitHub:

### Run all tests locally:
```bash
npm test
```

### Run tests with MySQL service (like CI/CD):
```bash
# Start MySQL
docker-compose up -d mysql

# Wait for MySQL to be ready
sleep 10

# Initialize database
mysql -h localhost -u root -pyour_password todolist_db < scriptSQL.sql

# Set environment variables
export DB_HOST=localhost
export DB_USER=root
export DB_PASSWORD=your_password
export DB_NAME=todolist_db
export DB_DIALECT=mysql
export NODE_ENV=test

# Run tests
npm test

# Cleanup
docker-compose down
```

## Common Issues & Solutions

### Issue: Tests fail with "Cannot connect to MySQL"
**Solution**: 
- Ensure the test waits for MySQL health check to pass
- Check that `DB_HOST=127.0.0.1` is used (not `localhost`)
- Increase the wait timeout from 30 to 60 seconds if needed

### Issue: Docker build fails with "COPY failed"
**Solution**:
- Ensure all files referenced in `COPY` commands exist
- Check that `.dockerignore` doesn't exclude necessary files

### Issue: Application container doesn't start
**Solution**:
- Check Docker logs: `docker logs projetback-app`
- Verify port 3000 is not already in use
- Check environment variables are correctly set

### Issue: Smoke tests timeout
**Solution**:
- Increase the 30-second timeout in the workflow
- Ensure application startup is responsive
- Check logs in the Docker container

## Modifying the Workflow

### To change the trigger branch:
Edit line 5-6 in `.github/workflows/ci-cd-local.yml`:
```yaml
on:
  push:
    branches: [ your_branch_name ]  # Change here
  pull_request:
    branches: [ your_branch_name ]  # And here
```

### To add more test steps:
Add steps in the `test` job before running `npm test`:
```yaml
- name: Run linter
  run: npm run lint

- name: Check types
  run: npm run typecheck
```

### To deploy to production:
After smoke tests pass, add deployment steps in `build-and-deploy` job.

## GitHub Repository Setup

### Initial Setup:
1. Push your code to GitHub (if not already done)
2. The workflow will run automatically on next push/PR to `main`

### Check Results:
1. Go to GitHub repository
2. Click "Actions" tab
3. Select the latest workflow run
4. View logs for each job

### View Coverage Reports:
1. After tests complete, go to "Actions"
2. Click the workflow run
3. Scroll to "Artifacts" section
4. Download `coverage-report.zip`

## Environment Variables Reference

| Variable | Test Value | Production Value |
|----------|-----------|------------------|
| DB_HOST | 127.0.0.1 | localhost or hostname |
| DB_USER | root | root |
| DB_PASSWORD | test_password | your_password |
| DB_NAME | todolist_db | todolist_db |
| DB_DIALECT | mysql | mysql |
| NODE_ENV | test | production |

## Security Considerations

1. **Secrets**: Passwords in this workflow are stored as plain text for CI/CD. For production:
   - Use GitHub Secrets for sensitive credentials
   - Rotate passwords regularly
   - Never commit real credentials to repository

2. **Database**: Ephemeral MySQL database is deleted after each run. Use `scriptSQL.sql` to initialize test data.

3. **Docker Images**: Use specific version tags (not `latest`) in production deployments.

## Performance Tips

- The workflow takes approximately 5-10 minutes per run
- Node dependencies are cached to speed up `npm install`
- MySQL service container uses minimal resources
- Use native GitHub runners (ubuntu-latest) for cost efficiency

---

**Workflow File**: `.github/workflows/ci-cd-local.yml`  
**Last Updated**: 2026-07-23
