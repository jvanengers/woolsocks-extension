# Voucher Popup Testing

This directory contains comprehensive unit tests for the voucher popup module.

## Test Structure

### `voucher-popup-types.test.ts`
Tests for TypeScript interfaces and type definitions:
- Voucher interface validation
- PopupAssets interface validation  
- VoucherTranslations interface validation
- VoucherPopupConfig interface validation
- PopupState interface validation
- StyleObject interface validation

### `voucher-popup-styles.test.ts`
Tests for the CSS-in-JS styling system:
- `applyStyles` function behavior
- Style object structure validation
- CSS property application
- Numeric value handling
- CSS custom properties support

### `voucher-popup.test.ts`
Tests for the main popup logic:
- Popup creation and DOM structure
- Voucher collection from partner data
- Multiple vs single voucher handling
- Error handling and edge cases
- Essential UI element creation
- Event handler ID presence

## Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test

# Run tests once and exit
npm run test:run

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

## Test Coverage

Current coverage for the voucher popup module:
- **voucher-popup-styles.ts**: 100% coverage
- **voucher-popup.ts**: ~67% coverage (good coverage of main logic)
- **voucher-popup-types.ts**: 0% coverage (type definitions only)

## Test Philosophy

These tests focus on **high-ROI testing**:

✅ **What we test:**
- Core business logic (voucher collection, sorting, filtering)
- DOM element creation and structure
- Error handling and edge cases
- Style application and CSS-in-JS functionality
- Type safety and interface compliance

❌ **What we don't test:**
- Visual rendering (browser-specific, complex setup)
- Real-world injection scenarios (too many variables)
- User interaction flows (requires human judgment)
- Cross-browser visual consistency

## Adding New Tests

When adding new features to the voucher popup:

1. **Add unit tests** for new business logic
2. **Test error handling** for edge cases
3. **Update type tests** if interfaces change
4. **Test DOM structure** for new UI elements
5. **Avoid visual tests** - use manual testing instead

## Example Test

```typescript
it('should handle new voucher feature', () => {
  const config = createMockConfig()
  const popup = createVoucherPopup(config)
  
  // Test the new feature
  expect(popup.querySelector('#new-feature')).toBeTruthy()
  expect(popup).toBeInstanceOf(HTMLElement)
})
```
