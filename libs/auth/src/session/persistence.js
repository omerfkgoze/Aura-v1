import { __awaiter } from 'tslib';
export class AuthPersistenceManager {
  constructor(sessionManager, config = {}) {
    this.eventHistory = [];
    this.PERSISTENCE_KEY = 'aura_auth_persistence';
    this.sessionManager = sessionManager;
    this.config = Object.assign(
      {
        enableAutoRestore: true,
        enableEventLogging: true,
        maxEventHistorySize: 100,
        syncInterval: 30000,
      },
      config
    );
    if (this.config.enableEventLogging) {
      this.setupEventLogging();
    }
    if (this.config.syncInterval > 0) {
      this.startPeriodicSync();
    }
  }
  initializePersistence() {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        // Load persisted data
        const persistedData = yield this.loadPersistedData();
        if (persistedData) {
          this.eventHistory = persistedData.eventHistory || [];
          // Update device info
          yield this.updateDeviceInfo();
        }
        if (this.config.enableAutoRestore) {
          // Restore session state
          yield this.restoreAuthState();
        }
      } catch (error) {
        console.error('Failed to initialize auth persistence:', error);
        // Continue without persistence rather than failing completely
      }
    });
  }
  saveAuthState(state) {
    return __awaiter(this, void 0, void 0, function* () {
      if (!this.config.enableAutoRestore) {
        return;
      }
      try {
        const persistedData = (yield this.loadPersistedData()) || this.createEmptyPersistedData();
        persistedData.lastAuthState = {
          isAuthenticated: state.isAuthenticated,
          authMethod: state.authMethod,
          deviceRegistered: state.deviceRegistered,
          lastSyncAt: new Date().toISOString(),
        };
        yield this.savePersistedData(persistedData);
      } catch (error) {
        console.error('Failed to save auth state:', error);
      }
    });
  }
  restoreAuthState() {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        const session = yield this.sessionManager.restoreSession();
        const persistedData = yield this.loadPersistedData();
        if (session && persistedData) {
          return {
            user: session.user,
            session,
            isAuthenticated: true,
            isLoading: false,
            authMethod: persistedData.lastAuthState.authMethod,
            deviceRegistered: persistedData.lastAuthState.deviceRegistered,
            lastSyncAt: persistedData.lastAuthState.lastSyncAt
              ? new Date(persistedData.lastAuthState.lastSyncAt)
              : undefined,
          };
        }
        return null;
      } catch (error) {
        console.error('Failed to restore auth state:', error);
        return null;
      }
    });
  }
  logAuthEvent(event) {
    if (!this.config.enableEventLogging) {
      return;
    }
    // Add to in-memory history
    this.eventHistory.unshift(event);
    // Trim history to max size
    if (this.eventHistory.length > this.config.maxEventHistorySize) {
      this.eventHistory = this.eventHistory.slice(0, this.config.maxEventHistorySize);
    }
    // Persist the event
    this.persistEventHistory().catch(console.error);
  }
  getAuthEventHistory() {
    return [...this.eventHistory];
  }
  clearPersistedData() {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(this.PERSISTENCE_KEY);
        }
        this.eventHistory = [];
      } catch (error) {
        console.error('Failed to clear persisted data:', error);
      }
    });
  }
  getSecurityAuditLog() {
    return __awaiter(this, void 0, void 0, function* () {
      const persistedData = yield this.loadPersistedData();
      return (
        (persistedData === null || persistedData === void 0
          ? void 0
          : persistedData.eventHistory) || []
      );
    });
  }
  exportAuthData() {
    return __awaiter(this, void 0, void 0, function* () {
      return yield this.loadPersistedData();
    });
  }
  dispose() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
    }
  }
  setupEventLogging() {
    this.sessionManager.onAuthEvent(event => {
      this.logAuthEvent(event);
    });
  }
  startPeriodicSync() {
    this.syncTimer = setInterval(
      () =>
        __awaiter(this, void 0, void 0, function* () {
          try {
            yield this.persistEventHistory();
          } catch (error) {
            console.error('Periodic sync failed:', error);
          }
        }),
      this.config.syncInterval
    );
  }
  loadPersistedData() {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        if (typeof localStorage === 'undefined') {
          return null;
        }
        const stored = localStorage.getItem(this.PERSISTENCE_KEY);
        if (!stored) {
          return null;
        }
        const parsed = JSON.parse(stored);
        // Validate and migrate data if needed
        return this.validatePersistedData(parsed);
      } catch (error) {
        console.error('Failed to load persisted data:', error);
        return null;
      }
    });
  }
  savePersistedData(data) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        if (typeof localStorage === 'undefined') {
          return;
        }
        const serialized = JSON.stringify(data);
        localStorage.setItem(this.PERSISTENCE_KEY, serialized);
      } catch (error) {
        console.error('Failed to save persisted data:', error);
        throw error;
      }
    });
  }
  persistEventHistory() {
    return __awaiter(this, void 0, void 0, function* () {
      const persistedData = (yield this.loadPersistedData()) || this.createEmptyPersistedData();
      persistedData.eventHistory = this.eventHistory;
      yield this.savePersistedData(persistedData);
    });
  }
  createEmptyPersistedData() {
    return {
      lastAuthState: {
        isAuthenticated: false,
        authMethod: null,
        deviceRegistered: false,
        lastSyncAt: new Date().toISOString(),
      },
      eventHistory: [],
      deviceInfo: {
        deviceId: '',
        platform: this.detectPlatform(),
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
      },
    };
  }
  validatePersistedData(data) {
    try {
      // Basic validation
      if (!data || typeof data !== 'object') {
        return null;
      }
      // Ensure required structure exists
      const validated = {
        lastAuthState: data.lastAuthState || {
          isAuthenticated: false,
          authMethod: null,
          deviceRegistered: false,
          lastSyncAt: new Date().toISOString(),
        },
        eventHistory: Array.isArray(data.eventHistory) ? data.eventHistory : [],
        deviceInfo: data.deviceInfo || {
          deviceId: '',
          platform: this.detectPlatform(),
          firstSeen: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
        },
      };
      // Update last seen
      validated.deviceInfo.lastSeen = new Date().toISOString();
      return validated;
    } catch (error) {
      console.error('Failed to validate persisted data:', error);
      return null;
    }
  }
  updateDeviceInfo() {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        const deviceId = yield this.sessionManager['sessionStorage'].getDeviceId();
        const persistedData = (yield this.loadPersistedData()) || this.createEmptyPersistedData();
        persistedData.deviceInfo.deviceId = deviceId;
        persistedData.deviceInfo.lastSeen = new Date().toISOString();
        persistedData.deviceInfo.platform = this.detectPlatform();
        yield this.savePersistedData(persistedData);
      } catch (error) {
        console.error('Failed to update device info:', error);
      }
    });
  }
  detectPlatform() {
    if (typeof navigator !== 'undefined') {
      return navigator.platform || 'web';
    } else if (typeof process !== 'undefined') {
      return process.platform || 'node';
    }
    return 'unknown';
  }
}
// Cross-platform storage adapter for React Native
export class ReactNativeAuthPersistence extends AuthPersistenceManager {
  constructor(sessionManager, AsyncStorage, config) {
    super(sessionManager, config);
    this.AsyncStorage = AsyncStorage;
  }
  loadPersistedData() {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        if (!this.AsyncStorage) {
          return null;
        }
        const stored = yield this.AsyncStorage.getItem(this['PERSISTENCE_KEY']);
        if (!stored) {
          return null;
        }
        const parsed = JSON.parse(stored);
        return this['validatePersistedData'](parsed);
      } catch (error) {
        console.error('Failed to load persisted data from AsyncStorage:', error);
        return null;
      }
    });
  }
  savePersistedData(data) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        if (!this.AsyncStorage) {
          return;
        }
        const serialized = JSON.stringify(data);
        yield this.AsyncStorage.setItem(this['PERSISTENCE_KEY'], serialized);
      } catch (error) {
        console.error('Failed to save persisted data to AsyncStorage:', error);
        throw error;
      }
    });
  }
  clearPersistedData() {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        if (this.AsyncStorage) {
          yield this.AsyncStorage.removeItem(this['PERSISTENCE_KEY']);
        }
        this['eventHistory'] = [];
      } catch (error) {
        console.error('Failed to clear persisted data from AsyncStorage:', error);
      }
    });
  }
}
//# sourceMappingURL=persistence.js.map
