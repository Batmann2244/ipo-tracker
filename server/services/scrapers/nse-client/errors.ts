export class BhavcopyNotAvailableError extends Error {
  constructor(message = "Bhavcopy not available for this date (market was closed)") {
    super(message);
    this.name = "BhavcopyNotAvailableError";
  }
}

export class DateFormatError extends Error {
  constructor(message = "Invalid date format") {
    super(message);
    this.name = "DateFormatError";
  }
}

export class InvalidStockCodeError extends Error {
  code: string;
  constructor(code: string) {
    super(`Invalid stock code: ${code}`);
    this.name = "InvalidStockCodeError";
    this.code = code;
  }
}

export class InvalidIndexError extends Error {
  index: string;
  constructor(index: string) {
    super(`Invalid index: ${index}`);
    this.name = "InvalidIndexError";
    this.index = index;
  }
}

export class NSEAPIError extends Error {
  statusCode: number | null;
  constructor(message: string, statusCode: number | null = null) {
    super(message);
    this.name = "NSEAPIError";
    this.statusCode = statusCode;
  }
}
