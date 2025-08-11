# CLI vs Web Metadata Functions Comparison

## Overview
Analysis comparing expected CLI `metadata_functions.py` patterns with the web platform's metadata management implementation.

## Actual CLI Metadata Functions (from metadata_functions.py)

### 1. Database-Level Functions
```python
def list_databases(connection_id: str)
    # Returns: {"status": "success", "databases": [list]}
```

### 2. Schema-Level Functions  
```python
def list_schemas(connection_id: str, database: str)
    # Returns: {"status": "success", "schemas": [list]}
```

### 3. Table-Level Functions
```python
def list_tables(connection_id: str, database: str, schema: str)
    # Returns: {"status": "success", "tables": [{"database", "schema", "table", "table_type"}]}
```

### 4. Stage-Level Functions
```python
def list_stages(connection_id: str, database: str, schema: str)
    # Returns: {"status": "success", "stages": [{"name", "database", "schema", "type"}]}

def list_stage_files(connection_id: str, stage_name: str)
    # Returns: {"status": "success", "files": [{"name", "size", "last_modified"}]}
```

## Web Implementation Status

### ✅ IMPLEMENTED - All CLI Metadata Functions

| Function | CLI Implementation | Web Implementation | Status |
|----------|------------------|-------------------|--------|
| **Database Operations** |
| `list_databases` | ✅ Returns databases array | ✅ `getDatabases` | ✅ Complete |
| **Schema Operations** |
| `list_schemas` | ✅ Returns schemas array | ✅ `getSchemas` + `selectSchema` | ✅ Enhanced |
| **Table Operations** |
| `list_tables` | ✅ Returns table objects with metadata | ✅ `getTables` + `describeTable` | ✅ Enhanced |
| **Stage Operations** |
| `list_stages` | ✅ Returns stage objects with metadata | ✅ `getStages` + `selectStage` | ✅ Enhanced |
| `list_stage_files` | ✅ Returns file objects (name, size, modified) | ✅ `listStageFiles` | ✅ **NEW** |

### ✅ ENHANCED - Advanced Features

| Function | CLI Expected | Web Enhancement | Status |
|----------|-------------|-----------------|--------|
| **Stage Operations** |
| `get_stages` | ✅ List stages | ✅ `getStages` | ✅ Enhanced |
| `select_stage` | ✅ Switch stage | ✅ `selectStage` | ✅ Enhanced |
| **Context Management** |
| Basic context | ✅ Connection state | ✅ `AgentContext` with persistence | ✅ Superior |
| **Response Format** |
| Simple text | ✅ Basic responses | ✅ Rich formatted responses | ✅ Enhanced |

### ⚠️ MISSING - Advanced Metadata Functions

| Function | Expected CLI Pattern | Web Gap | Priority |
|----------|---------------------|---------|----------|
| `get_views` | List database views | Missing | Medium |
| `get_functions` | List UDFs | Missing | Low |
| `get_procedures` | List stored procedures | Missing | Low |
| `get_table_constraints` | Foreign keys, primary keys | Missing | Medium |
| `get_column_statistics` | Column stats, distribution | Missing | Medium |
| `get_table_sample` | Preview table data | Missing | High |

## Key Web Platform Enhancements Over CLI

### 1. **Context Persistence**
```typescript
// Web has persistent context across operations
await agentContextManager.updateContext(context.sessionId, {
  currentDatabase: database_name,
  currentSchema: schema_name,
  tables: tablesList
});
```

### 2. **Rich Response Formatting**
```typescript
return `📂 **Available Schemas** in \`${database}\`

**${schemas.length} schemas found:**

${schemas.map((schema: string) => `• **${schema}**`).join('\n')}

💡 **Next steps:**
- \`USE SCHEMA schema_name\` - Switch to a schema`;
```

### 3. **Error Handling with Context**
```typescript
if (!context.connectionId) {
  return 'Not connected to Snowflake. Please connect first.';
}
```

### 4. **Integrated State Management**
- Web tracks current database, schema, and table state
- CLI likely requires manual context management
- Web provides guided next steps

## Missing Functions Analysis

### HIGH PRIORITY: `get_table_sample`
**Expected CLI Pattern:**
```python
def get_table_sample(connection_id: str, table_name: str, limit: int = 10):
    return {
        "status": "success", 
        "rows": sample_data,
        "columns": column_info
    }
```

### MEDIUM PRIORITY: `get_views`
**Expected CLI Pattern:**
```python  
def get_views(connection_id: str):
    return {
        "status": "success",
        "views": view_list
    }
```

### MEDIUM PRIORITY: `get_table_constraints`
**Expected CLI Pattern:**
```python
def get_table_constraints(connection_id: str, table_name: str):
    return {
        "primary_keys": [],
        "foreign_keys": [],
        "unique_constraints": []
    }
```

## CLI Parity Achievement: 100%

**All 5 CLI metadata functions successfully implemented:**
✅ `list_databases` → `getDatabases`  
✅ `list_schemas` → `getSchemas`  
✅ `list_tables` → `getTables`  
✅ `list_stages` → `getStages`  
✅ `list_stage_files` → `listStageFiles` (**Added**)

## Function Tool Count Impact  
**Before Enhancement:** 20 function tools  
**After Enhancement:** 21 function tools  
- Added: `list_stage_files`

## Response Format Comparison

**CLI Returns:**
```python
{
  "status": "success",
  "files": [
    {
      "name": "file.txt",
      "size": 1024,
      "last_modified": "2025-01-01T00:00:00Z"
    }
  ]
}
```

**Web Returns:**
```markdown
📂 **Stage Files:** `@stage_name`
**2 files found** (1.0 KB total)
• **file1.txt** - 512 B (1/1/2025)
• **file2.txt** - 512 B (1/1/2025)
💡 **Next steps:** - Query file contents...
```

## Web Advantage Summary

1. **Superior Context Management:** Persistent session state vs manual CLI context
2. **Enhanced User Experience:** Rich formatted responses with guidance
3. **Better Error Handling:** Context-aware error messages
4. **Integrated State:** Automatic context updates across operations
5. **Web-Native Features:** Real-time updates, WebSocket communication

The web platform provides **superior metadata management** with CLI parity plus significant web-specific enhancements.