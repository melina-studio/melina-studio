# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously at Melina Studio. If you discover a security vulnerability, please report it responsibly.

### How to Report

1. **Do not** open a public GitHub issue for security vulnerabilities
2. Email your findings to the maintainers
3. Include as much information as possible:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- Acknowledgment within 48 hours
- Regular updates on the progress
- Credit in the security advisory (if desired)

### Scope

The following are in scope:
- The Melina Studio application code
- Authentication and authorization systems
- Data handling and storage
- API endpoints

### Out of Scope

- Social engineering attacks
- Denial of service attacks
- Issues in dependencies (report to the upstream project)

## Security Best Practices

When contributing, please ensure:

- No secrets or credentials in code
- Input validation on all user data
- Proper authentication checks
- Secure session handling
- SQL injection prevention (use parameterized queries)
- XSS prevention (proper output encoding)

Thank you for helping keep Melina Studio secure!
