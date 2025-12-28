# Snyk Security Scanning Setup Guide

This guide explains how to set up and use the Snyk security scanning integration for the animated-spork project.

## What is Snyk?

Snyk is a security platform that helps you find and fix vulnerabilities in your dependencies, container images, and Infrastructure as Code (IaC) configurations. The GitHub workflow integration automatically scans your project on every push and pull request.

## Prerequisites

1. A free Snyk account (https://snyk.io/signup/)
2. Your project imported into Snyk
3. A Snyk API token
4. Access to your GitHub repository settings

## Setup Instructions

### Step 1: Get Your Snyk API Token

1. Log in to your Snyk account at https://app.snyk.io
2. Navigate to your account settings (click your avatar in the bottom left)
3. Go to "General" → "Auth Token"
4. Copy your API token (keep it secure!)

### Step 2: Add the Token to GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Set the name as: `SNYK_TOKEN`
5. Paste your Snyk API token as the value
6. Click **Add secret**

### Step 3: Verify the Workflow

The Snyk workflow file (`.github/workflows/snyk-security-scan.yml`) is already configured and will:

- Run automatically on pushes to the `main` branch
- Run on all pull requests
- Scan all projects in the monorepo using `--all-projects` flag
- Upload results to GitHub Security tab (via SARIF format)
- Continue even if vulnerabilities are found (using `continue-on-error: true`)

### Step 4: Link to Your Snyk Project (Optional)

If you want to monitor a specific Snyk project ID, you can modify the workflow to include:

```yaml
- name: Run Snyk to check for vulnerabilities
  uses: snyk/actions/node@master
  continue-on-error: true
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
  with:
    args: --all-projects --org=YOUR_ORG_ID --project-id=YOUR_PROJECT_ID
```

Replace `YOUR_ORG_ID` and `YOUR_PROJECT_ID` with your actual values from Snyk.

## Understanding the Workflow

### Workflow Triggers

The workflow runs on:
- **Push to main**: Scans code merged to the main branch
- **Pull requests**: Scans code in PRs before merging

### Workflow Steps

1. **Checkout repository**: Gets the latest code
2. **Setup Node.js**: Installs Node.js v20 (matching project requirements)
3. **Install dependencies**: Runs `npm install --ignore-scripts`
4. **Run Snyk scan**: Scans for vulnerabilities in all workspace packages
5. **Upload results**: Sends findings to GitHub Security tab

### Key Configuration Options

- `--all-projects`: Scans all packages in the monorepo (shared-core, api-core, frontend-core, demo-api, demo-web)
- `continue-on-error: true`: Workflow won't fail if vulnerabilities are found
- SARIF upload: Integrates with GitHub Security tab for easy review

## Viewing Results

### In GitHub

1. Go to your repository on GitHub
2. Click the **Security** tab
3. Select **Code scanning alerts** to see Snyk findings
4. Click on any alert for detailed information and remediation advice

### In Snyk Dashboard

1. Log in to https://app.snyk.io
2. Navigate to your project
3. View detailed vulnerability reports, dependency trees, and fix recommendations

## Customizing the Workflow

### Scan Only Specific Packages

To scan only certain packages, modify the `args` parameter:

```yaml
with:
  args: --file=packages/shared-core/package.json
```

### Fail the Build on High Severity

To fail the workflow when high severity vulnerabilities are found:

```yaml
- name: Run Snyk to check for vulnerabilities
  uses: snyk/actions/node@master
  # Remove or set to false: continue-on-error: true
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
  with:
    args: --all-projects --severity-threshold=high
```

### Monitor Projects in Snyk

To send results to your Snyk dashboard for continuous monitoring:

```yaml
with:
  command: monitor
  args: --all-projects
```

## Troubleshooting

### "SNYK_TOKEN not found" Error

- Verify the secret is named exactly `SNYK_TOKEN` in GitHub
- Ensure the token is valid and not expired
- Check that the secret is available to workflows

### "No supported package files found"

- Ensure `npm install` completed successfully
- Verify that `package.json` and `package-lock.json` exist
- Check that the repository was checked out correctly

### Workflow Not Running

- Verify the workflow file is in `.github/workflows/`
- Check that you're pushing to `main` or creating a pull request
- Review the Actions tab for any errors

## Best Practices

1. **Regular Updates**: Keep dependencies updated to minimize vulnerabilities
2. **Review Findings**: Regularly check the Security tab and Snyk dashboard
3. **Prioritize Fixes**: Focus on high and critical severity issues first
4. **Test Fixes**: Always test dependency updates in a branch before merging
5. **Monitor Trends**: Use Snyk dashboard to track vulnerability trends over time

## Additional Resources

- [Snyk Documentation](https://docs.snyk.io/)
- [Snyk GitHub Actions](https://github.com/snyk/actions)
- [GitHub Code Scanning](https://docs.github.com/en/code-security/code-scanning)

## Support

For issues with:
- **Snyk service**: Contact Snyk support or check their documentation
- **Workflow configuration**: Open an issue in this repository
- **Vulnerabilities**: Follow remediation advice in Snyk reports

---

**Last Updated**: 2025-12-28  
**Maintained by**: Jeff Caradona ([@jeffcaradona](https://github.com/jeffcaradona))
