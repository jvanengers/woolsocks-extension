# Contributing to Woolsocks Extension

Thank you for your interest in contributing to the Woolsocks browser extension! This document provides guidelines for contributing to the project.

## 🤝 How to Contribute

### Types of Contributions

- **Bug Fixes**: Fix issues and improve reliability
- **New Partners**: Add support for additional e-commerce websites
- **Feature Enhancements**: Improve existing functionality
- **UI/UX Improvements**: Enhance user interface and experience
- **Documentation**: Improve or add documentation
- **Performance Optimizations**: Improve extension performance

## 🚀 Getting Started

### Prerequisites

- Node.js 20.19+ or 22.12+
- npm or yarn
- Chrome browser for testing
- Git

### Development Setup

1. **Fork the Repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/YOUR-USERNAME/woolsocks-extension.git
   cd woolsocks-extension
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-description
   ```

4. **Make Your Changes**
   - Follow the coding standards
   - Add tests if applicable
   - Update documentation

5. **Build and Test**
   ```bash
   npm run build
   # Load dist/ folder in Chrome as unpacked extension
   ```

## 📋 Coding Standards

### TypeScript Guidelines

- Use TypeScript for all new code
- Define proper types for all functions and variables
- Use interfaces for object shapes
- Avoid `any` type when possible

```typescript
// Good
interface Partner {
  name: string;
  domain: string;
  isCheckoutPage: (url: string, document: Document) => boolean;
}

// Avoid
const partner: any = { ... };
```

### Code Style

- Use 2 spaces for indentation
- Use semicolons
- Use single quotes for strings
- Use camelCase for variables and functions
- Use PascalCase for classes and interfaces

```typescript
// Good
const partnerName = 'Amazon';
function isCheckoutPage(url: string): boolean {
  return url.includes('/checkout');
}

// Avoid
const partner_name = "Amazon";
function isCheckoutPage(url: string): boolean{
return url.includes("/checkout")
}
```

### Error Handling

Always include proper error handling:

```typescript
// Good
try {
  const total = extractTotal(document);
  if (total === null) {
    console.warn('Could not extract total from page');
    return;
  }
  // Process total
} catch (error) {
  console.error('Error extracting total:', error);
}
```

### Comments and Documentation

- Add JSDoc comments for public functions
- Explain complex logic
- Keep comments up-to-date

```typescript
/**
 * Detects if the current page is a checkout page for a partner
 * @param partner - The partner configuration
 * @param url - Current page URL
 * @param document - Page document object
 * @returns true if this is a checkout page
 */
function isCheckoutPage(partner: Partner, url: string, document: Document): boolean {
  // Implementation
}
```

## 🧪 Testing Guidelines

### Manual Testing

Before submitting a pull request, test your changes:

1. **Build the Extension**
   ```bash
   npm run build
   ```

2. **Load in Chrome**
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select `dist/` folder

3. **Test on Partner Websites**
   - Visit each supported partner website
   - Navigate to checkout pages
   - Verify dialog appears correctly
   - Test all functionality

### Test Checklist

- [ ] Extension loads without errors
- [ ] All supported partners work correctly
- [ ] Dialog appears on checkout pages
- [ ] Amount input functions properly
- [ ] Close button works
- [ ] Animations are smooth
- [ ] No console errors
- [ ] Performance is acceptable

### Adding Tests for New Partners

When adding a new partner, test:

1. **Homepage Detection**: Dialog should NOT appear
2. **Product Pages**: Dialog should NOT appear
3. **Cart/Checkout**: Dialog SHOULD appear
4. **Mobile/Desktop**: Works on both layouts
5. **Different Languages**: Works with non-English content

## 🎯 Adding New Partners

### Step-by-Step Process

1. **Research the Partner**
   - Understand their checkout flow
   - Identify unique selectors
   - Test on multiple pages

2. **Add Configuration**
   ```typescript
   // In src/shared/partners.ts
   {
     name: 'New Partner',
     domain: 'newpartner.com',
     isCheckoutPage: (url, document) => {
       // Detection logic
     },
     extractTotal: (document) => {
       // Total extraction logic
     }
   }
   ```

3. **Test Thoroughly**
   - Test on multiple checkout scenarios
   - Handle edge cases
   - Verify on mobile and desktop

4. **Document Changes**
   - Update README.md
   - Add to supported partners list
   - Document any special requirements

### Partner Detection Best Practices

```typescript
// Good: Specific and reliable detection
isCheckoutPage: (url, document) => {
  // Check URL patterns
  if (!url.includes('/checkout') && !url.includes('/cart')) {
    return false;
  }
  
  // Verify with DOM elements
  const checkoutElements = [
    '.checkout-container',
    '.order-summary',
    '.payment-form'
  ];
  
  return checkoutElements.some(selector => 
    document.querySelector(selector) !== null
  );
}

// Avoid: Too broad or unreliable
isCheckoutPage: (url, document) => {
  return url.includes('buy'); // Too broad
}
```

## 🐛 Bug Reports

### Before Reporting

1. Check existing issues
2. Test with latest version
3. Clear browser cache
4. Try in incognito mode

### Bug Report Template

```markdown
**Bug Description**
A clear description of what the bug is.

**Steps to Reproduce**
1. Go to '...'
2. Click on '....'
3. See error

**Expected Behavior**
What you expected to happen.

**Actual Behavior**
What actually happened.

**Environment**
- Browser: Chrome Version XX
- Extension Version: X.X.X
- OS: macOS/Windows/Linux

**Additional Context**
Any other relevant information.
```

## ✨ Feature Requests

### Before Requesting

1. Check if feature already exists
2. Consider if it fits the project scope
3. Think about implementation complexity

### Feature Request Template

```markdown
**Feature Description**
A clear description of the feature you'd like to see.

**Use Case**
Why would this feature be useful?

**Proposed Solution**
How do you envision this feature working?

**Alternatives Considered**
Other solutions you've thought about.

**Additional Context**
Any other relevant information.
```

## 📝 Pull Request Process

### Before Submitting

1. **Update Documentation**
   - Update README.md if needed
   - Add comments to complex code
   - Update CHANGELOG.md

2. **Test Thoroughly**
   - Test on multiple partner websites
   - Verify no regressions
   - Check performance impact

3. **Code Review**
   - Self-review your changes
   - Ensure code follows standards
   - Remove any debug code

### Pull Request Template

```markdown
**Description**
Brief description of changes.

**Type of Change**
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement
- [ ] New partner support

**Testing**
- [ ] Tested on [partner websites]
- [ ] Verified no regressions
- [ ] Manual testing completed

**Checklist**
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console errors
```

### Review Process

1. **Automated Checks**: CI/CD pipeline runs tests
2. **Code Review**: Maintainers review code
3. **Testing**: Manual testing by maintainers
4. **Approval**: Changes approved and merged

## 🏷️ Release Process

### Version Numbering

We use [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features, backwards compatible
- **PATCH**: Bug fixes, backwards compatible

### Release Checklist

- [ ] All tests pass
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped
- [ ] Build successful
- [ ] Chrome Web Store submission ready

## 📞 Communication

### Getting Help

- **GitHub Issues**: For bugs and feature requests
- **Discussions**: For general questions and ideas
- **Pull Requests**: For code contributions

### Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Focus on the project goals

## 🎉 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- GitHub contributor graphs

Thank you for contributing to Woolsocks Extension! 🚀

