// Import Jest DOM extensions
import '@testing-library/jest-dom';

// Mock environment variables
process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3001/api';

// Mock the fetch API (will be overridden in individual tests)
global.fetch = jest.fn().mockImplementation(() => {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ status: 'success' })
  });
});

// Mock File API
global.File = class File {
  constructor(bits, name, options = {}) {
    this.name = name;
    this.size = bits.length;
    this.type = options.type || '';
  }
};

// Mock URL API
global.URL = {
  createObjectURL: jest.fn(() => 'mock-url'),
  revokeObjectURL: jest.fn()
};

// Mock Event
global.Event = class Event {
  constructor(type) {
    this.type = type;
  }
};

// Mock ProgressEvent
global.ProgressEvent = class ProgressEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.lengthComputable = init.lengthComputable || false;
    this.loaded = init.loaded || 0;
    this.total = init.total || 0;
  }
};

// Mock AbortController
global.AbortController = class AbortController {
  constructor() {
    this.signal = {
      aborted: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
      onabort: null
    };
  }

  abort() {
    this.signal.aborted = true;
    if (this.signal.onabort) {
      this.signal.onabort();
    }
  }
};

// Mock FormData
global.FormData = class FormData {
  constructor() {
    this.data = {};
  }

  append(key, value) {
    this.data[key] = value;
  }

  get(key) {
    return this.data[key];
  }

  getAll(key) {
    return [this.data[key]];
  }

  has(key) {
    return key in this.data;
  }
};
