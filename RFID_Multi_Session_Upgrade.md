# RFID Multi-Session Upgrade Documentation

## Problem Statement
The current RFID implementation has a critical issue where scanning in one menu (e.g., Register) affects other menus (e.g., Linen Bersih). This happens because the `RfidWrapper.cs` uses static fields that create a global shared state across the entire application.

## Root Cause Analysis

### Current RfidWrapper.cs Issues:
```csharp
// PROBLEM: Static global state
private static RFIDReader _reader;
private static bool _isConnected = false;
private static List<TagRecord> _tags = new List<TagRecord>();
```

### Consequences:
1. **Single Global Connection**: Only one RFID connection can be active
2. **Shared Tags Pool**: All pages read from the same `_tags` list
3. **Cross-Interference**: Scanning in Register affects Linen Bersih, etc.
4. **No Session Isolation**: Cannot have multiple independent scanning sessions

## Solution Implemented

### Updated RfidWrapper.cs Features

#### 1. Multi-Session Architecture
```csharp
// NEW: Session-based management
private static Dictionary<string, SessionData> _sessions = new Dictionary<string, SessionData>();
private static readonly object _sessionsLock = new object();

private class SessionData
{
    public List<TagRecord> Tags { get; set; } = new List<TagRecord>();
    public bool IsActive { get; set; } = false;
    public DateTime SessionStart { get; set; }
    public string SessionName { get; set; }
}
```

#### 2. New Session Management Methods
- `CreateSession(sessionName)` - Creates new session with unique ID
- `StartSessionInventory(sessionId)` - Start scanning for specific session
- `StopSessionInventory(sessionId)` - Stop scanning for specific session
- `GetSessionTags(sessionId)` - Get tags for specific session
- `ClearSessionTags(sessionId)` - Clear tags for specific session
- `DestroySession(sessionId)` - Remove session completely
- `GetActiveSessions()` - List all active sessions

#### 3. Updated Event Handler
```csharp
private void Events_ReadNotify(object sender, Events.ReadEventArgs args)
{
    // Distribute tags to all active sessions
    SessionData[] activeSessions;
    lock (_sessionsLock)
    {
        activeSessions = _sessions.Values.Where(s => s.IsActive).ToArray();
    }

    foreach (var session in activeSessions)
    {
        // Add tags to each active session
        // ...
    }

    // Maintain backward compatibility with legacy _tags
}
```

## Required Updates to Implement

### 1. electron/main.js Changes
```javascript
// Add new edge functions
let createSession, startSessionInventory, stopSessionInventory,
    getSessionTags, clearSessionTags, destroySession, getActiveSessions;

// In initializeRfidFunctions():
createSession = edge.func({
  assemblyFile: dllPath,
  typeName: "ZebraLib.RfidWrapper",
  methodName: "CreateSession",
  sync: false,
});

// Add all other session methods...

// Add IPC handlers:
ipcMain.handle("rfid-create-session", async (event, sessionName) => {
  return new Promise((resolve, reject) => {
    createSession({ sessionName }, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
});

// Add handlers for all session methods...
```

### 2. electron/preload.js Changes
```javascript
contextBridge.exposeInMainWorld("rfidAPI", {
  // Existing methods...
  connect: (config) => ipcRenderer.invoke("rfid-connect", config),
  startInventory: () => ipcRenderer.invoke("rfid-start-inventory"),

  // NEW: Session methods
  createSession: (sessionName) => ipcRenderer.invoke("rfid-create-session", sessionName),
  startSessionInventory: (sessionId) => ipcRenderer.invoke("rfid-start-session-inventory", sessionId),
  stopSessionInventory: (sessionId) => ipcRenderer.invoke("rfid-stop-session-inventory", sessionId),
  getSessionTags: (sessionId) => ipcRenderer.invoke("rfid-get-session-tags", sessionId),
  clearSessionTags: (sessionId) => ipcRenderer.invoke("rfid-clear-session-tags", sessionId),
  destroySession: (sessionId) => ipcRenderer.invoke("rfid-destroy-session", sessionId),
  getActiveSessions: () => ipcRenderer.invoke("rfid-get-active-sessions"),
});
```

### 3. src/hooks/useRfid.js Changes
```javascript
// Add session state
const [activeSessions, setActiveSessions] = useState({});
const [registerSessionId, setRegisterSessionId] = useState(null);
const [linenBersihSessionId, setLinenBersihSessionId] = useState(null);
// ... for each page type

// Update start functions to use sessions
const startRegister = async () => {
  try {
    // 1. Create dedicated session for Register
    const { sessionId } = await window.rfidAPI.createSession("Register");
    setRegisterSessionId(sessionId);

    // 2. Start session-specific inventory
    await window.rfidAPI.startSessionInventory(sessionId);
    setIsRegisterActive(true);

    // 3. Polling from session-specific tags
    intervalRefs.current.register = setInterval(async () => {
      try {
        const tagsData = await window.rfidAPI.getSessionTags(sessionId);
        const uniqueTags = tagsData.filter((tag, index, self) =>
          index === self.findIndex((t) => t.EPC === tag.EPC)
        );
        setRegisterTags(uniqueTags);
      } catch (err) {
        console.error("Error fetching register tags:", err);
      }
    }, 1000);
  } catch (err) {
    console.error("Error starting register:", err);
  }
};

const stopRegister = async () => {
  try {
    if (registerSessionId) {
      await window.rfidAPI.stopSessionInventory(registerSessionId);
      // Optional: destroy session or keep for reuse
      // await window.rfidAPI.destroySession(registerSessionId);
      setRegisterSessionId(null);
    }
    setIsRegisterActive(false);
    if (intervalRefs.current.register) {
      clearInterval(intervalRefs.current.register);
      intervalRefs.current.register = null;
    }
  } catch (err) {
    console.error("Error stopping register:", err);
  }
};

// Apply same pattern for:
// - startGrouping/stopGrouping
// - startSorting/stopSorting
// - startDelivery/stopDelivery
// - startLinenBersih/stopLinenBersih
```

### 4. Component Updates
Each page component needs to be updated to use the new session-based approach:

#### RegisterPage.jsx
```javascript
// Before:
// const { startRegister, stopRegister, registerTags, isRegisterActive } = useRfid();

// After: Same interface, but now uses isolated sessions
```

#### LinenBersihPage.jsx
```javascript
// Now has independent scanning - no interference from Register
const { startLinenBersih, stopLinenBersih, linenBersihTags, isLinenBersihActive } = useRfid();
```

## Benefits of This Solution

### ✅ Problem Resolution
- **No Cross-Interference**: Each page has isolated tag collection
- **Multiple Active Sessions**: Can scan in Register and Linen Bersih simultaneously
- **Independent Control**: Start/stop in one page doesn't affect others

### ✅ Enhanced Features
- **Session Naming**: Can identify sessions by purpose (Register, Linen Bersih, etc.)
- **Session Management**: Can create, destroy, and monitor sessions
- **Backward Compatibility**: Legacy methods still work for existing code

### ✅ Better Architecture
- **Scalable**: Easy to add new scanning pages
- **Maintainable**: Clear separation of concerns
- **Debuggable**: Can inspect active sessions and their states

## Implementation Priority

1. **High Priority**: Update `electron/main.js` with session handlers
2. **High Priority**: Update `electron/preload.js` to expose session API
3. **Medium Priority**: Update `src/hooks/useRfid.js` with session logic
4. **Low Priority**: Update individual page components (they work with minimal changes)

## Testing Strategy

1. **Session Isolation Test**:
   - Start scanning in Register
   - Verify Linen Bersih shows no tags
   - Start scanning in Linen Bersih
   - Verify both show independent tag lists

2. **Concurrent Session Test**:
   - Start sessions in multiple pages
   - Verify all collect tags independently
   - Stop one session - verify others continue

3. **Session Cleanup Test**:
   - Create and destroy sessions
   - Verify memory cleanup
   - Test session timeout scenarios

## Future Enhancements

- **Session Persistence**: Save/restore sessions across app restarts
- **Session Templates**: Predefined session configurations
- **Session Analytics**: Track scanning metrics per session
- **Visual Session Indicator**: UI to show active sessions

---

**Status**: RfidWrapper.cs updated ✅
**Next Steps**: Update Electron layers to expose session functionality
**Testing**: Verify session isolation and multi-session capability