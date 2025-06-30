/**
 * Basic smoke tests to verify the testing infrastructure works
 */

describe('Basic Infrastructure Tests', () => {
  it('should run a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have access to test utilities', () => {
    const mockAmount = {
      value: 100,
      currency: 'USD',
      precision: 2,
    };
    
    expect(mockAmount.value).toBe(100);
    expect(mockAmount.currency).toBe('USD');
  });

  it('should handle async operations', async () => {
    const promise = new Promise(resolve => {
      setTimeout(() => resolve('success'), 10);
    });
    
    const result = await promise;
    expect(result).toBe('success');
  });

  it('should be able to mock functions', () => {
    const mockFn = jest.fn();
    mockFn('test');
    
    expect(mockFn).toHaveBeenCalledWith('test');
  });
});