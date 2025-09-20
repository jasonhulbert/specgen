# IndexedDB Migration Fix

## Problem
The LLM configuration manager was using `localStorage` which caused SSR (Server-Side Rendering) errors in Next.js:
```
Failed to save LLM configurations: ReferenceError: localStorage is not defined
```

## Root Cause
- `localStorage` is not available during server-side rendering
- The project already had IndexedDB infrastructure that wasn't being used for LLM configurations
- The LLM config manager was instantiated during SSR, causing the error

## Solution Overview
Migrated LLM configuration storage from localStorage to IndexedDB to maintain consistency with the project's existing data persistence strategy.

## Changes Made

### 1. Database Schema Updates
**File: `/src/types/database.ts`**
- Added `LLMConfigRecord` interface for storing LLM configurations
- Includes proper IndexedDB compatibility with `is_active` as number (1/0)

**File: `/src/lib/database.ts`**
- Updated database version from 1 to 2 for schema migration
- Added `llm_configs` object store with indexes
- Added LLM configuration CRUD methods:
  - `createLLMConfig()` - Create new LLM configuration
  - `getLLMConfig()` - Get specific configuration
  - `getAllLLMConfigs()` - Get all configurations
  - `getActiveLLMConfig()` - Get active configuration
  - `updateLLMConfig()` - Update configuration
  - `deleteLLMConfig()` - Delete configuration
  - `deactivateLLMConfigs()` - Helper to deactivate all configs

### 2. LLM Config Manager Refactor
**File: `/src/lib/llm/config.ts`**
- **SSR Safety**: Added browser environment check (`typeof window !== 'undefined'`)
- **Async Initialization**: Made all operations async to work with IndexedDB
- **Lazy Loading**: Configuration manager only initializes when accessed
- **Database Integration**: Replaced localStorage with IndexedDB operations
- **Error Handling**: Added proper error handling for database operations

Key changes:
```typescript
// Before (localStorage)
localStorage.setItem('llm_configurations', JSON.stringify(data))

// After (IndexedDB)
await dbService.createLLMConfig(id, { config_json: config, is_active: isActive ? 1 : 0 })
```

### 3. Service Layer Updates
**File: `/src/lib/llm.ts`**
- Made all config-related methods async to support IndexedDB
- Updated method signatures:
  - `getActiveConfiguration()` → `async getActiveConfiguration()`
  - `switchConfiguration()` → `async switchConfiguration()`
  - `getAvailableConfigurations()` → `async getAvailableConfigurations()`

### 4. UI Component Updates
**File: `/src/components/LLMSelector.tsx`**
- Added loading states for async operations
- Updated all config manager calls to use `await`
- Added error handling for async operations

**File: `/src/components/LLMConfigManager.tsx`**
- Made configuration loading and management async
- Added loading states for better UX
- Updated all config operations to be async

## Benefits

1. **SSR Compatibility**: No more server-side localStorage errors
2. **Data Consistency**: All app data now uses IndexedDB uniformly
3. **Better Error Handling**: Proper async error handling throughout
4. **Performance**: IndexedDB provides better performance for structured data
5. **Offline Support**: IndexedDB works offline, unlike server-dependent storage
6. **Type Safety**: Full TypeScript support with proper interfaces

## Migration Notes

- **Automatic Migration**: First-time users get default LM Studio configuration
- **Backward Compatibility**: Existing localStorage data is ignored (clean start)
- **Database Versioning**: Proper IndexedDB version upgrade from v1 to v2

## Testing

The fix has been tested and verified:
- ✅ Server starts without localStorage errors
- ✅ LLM configurations load properly in browser
- ✅ Configuration management UI works correctly
- ✅ Multi-provider LLM system remains functional
- ✅ Database migration works correctly without ConstraintError

## Additional Fix: Database Migration ConstraintError

### Problem
After the initial IndexedDB migration, users encountered:
```
Uncaught ConstraintError: Failed to execute 'createObjectStore' on 'IDBDatabase': An object store with the specified name already exists.
```

### Root Cause
The database upgrade function wasn't handling version migrations properly - it tried to create object stores that already existed when upgrading from version 1 to 2.

### Solution
- **Proper Migration Logic**: Added version-aware migration with `oldVersion` checking
- **Conditional Store Creation**: Only create stores if they don't already exist
- **Database Version Management**: Structured migrations by version increments

### Changes Made
**File: `/src/lib/database.ts`**
```typescript
// Before: Simple upgrade function
upgrade(db) {
  // Create all stores every time
}

// After: Version-aware migrations
upgrade(db, oldVersion, newVersion, transaction) {
  if (oldVersion < 1) {
    // Create v1 stores
  }
  if (oldVersion < 2) {
    // Only create llm_configs if it doesn't exist
    if (!db.objectStoreNames.contains('llm_configs')) {
      const llmConfigStore = db.createObjectStore('llm_configs', { keyPath: 'id' })
      // ... indexes
    }
  }
}
```

- **Database Utility**: Added `clearDatabase()` function for development/testing
- **Version Increment**: Bumped to version 3 to force clean migration for existing users

## Future Considerations

1. **Data Migration**: Could add localStorage → IndexedDB migration utility
2. **Backup/Restore**: IndexedDB enables export/import of configurations
3. **Sync**: Could add cloud sync capabilities in the future
4. **Performance**: IndexedDB allows for indexed queries and better performance