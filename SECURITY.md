# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.10.x  | :white_check_mark: |
| 0.9.x   | :white_check_mark: |
| < 0.9   | :x:                |

## Reporting a Vulnerability

We take security bugs seriously. We appreciate your efforts to responsibly disclose your findings, and will make every effort to acknowledge your contributions.

### How to Report a Security Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to: **security@woolsocks.eu**

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

### What to Include

Please include the following information in your report:

- Type of issue (e.g. buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### What to Expect

After you submit a report, we will:

1. Confirm receipt of your vulnerability report within 48 hours
2. Provide regular updates on our progress
3. Credit you in our security advisories (unless you prefer to remain anonymous)

### Security Considerations

This browser extension:

- **Does not collect sensitive data** - Only analyzes public page content for merchant detection
- **Processes data locally** - All content analysis happens in your browser
- **Uses secure APIs** - All communication with Woolsocks servers uses HTTPS
- **Minimizes permissions** - Only requests necessary browser permissions
- **Follows security best practices** - Regular dependency updates and security audits

### Browser Security

The extension operates within the browser's security model:

- **Content Security Policy (CSP)** - Follows strict CSP guidelines
- **Same-Origin Policy** - Respects browser security boundaries
- **Permission Model** - Uses minimal required permissions
- **Sandboxing** - Operates within browser extension sandbox

### Data Handling

- **No personal data collection** from visited websites
- **Local storage only** for user preferences and session data
- **Encrypted communication** with Woolsocks servers
- **No tracking** of browsing behavior or personal information

## Security Updates

Security updates will be released as soon as possible after a vulnerability is confirmed and a fix is available. We will:

- Release patches for supported versions
- Provide detailed security advisories
- Credit security researchers (with permission)
- Update this security policy as needed

## Contact

For security-related questions or concerns, please contact: **security@woolsocks.eu**

---

*This security policy is effective as of the latest version of the Woolsocks Browser Extension.*
