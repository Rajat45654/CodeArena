import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
  });

  const createMockArgumentsHost = () => {
    const mockJson = jest.fn();
    const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    const mockResponse = { status: mockStatus };
    const mockRequest = {
      headers: { 'x-request-id': 'req-123' },
      url: '/api/v1/auth/login',
      method: 'POST',
    };

    const host = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;

    return { host, mockStatus, mockJson };
  };

  it('should handle HttpException correctly', () => {
    const { host, mockStatus, mockJson } = createMockArgumentsHost();
    const exception = new HttpException('Invalid email or password', HttpStatus.UNAUTHORIZED);

    filter.catch(exception, host);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.UNAUTHORIZED,
        code: 'UNAUTHORIZED',
        message: 'Invalid email or password',
        requestId: 'req-123',
        path: '/api/v1/auth/login',
      }),
    );
  });

  it('should handle generic unhandled Error as 500 INTERNAL_SERVER_ERROR', () => {
    const { host, mockStatus, mockJson } = createMockArgumentsHost();
    const exception = new Error('Database connection failed');

    filter.catch(exception, host);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        requestId: 'req-123',
      }),
    );
  });
});
