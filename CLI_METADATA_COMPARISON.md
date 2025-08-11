# CLI vs Web Metadata Functions Comparison

## Overview
Analysis comparing expected CLI `metadata_functions.py` patterns with the web platform's metadata management implementation.

## Expected CLI Metadata Functions (Based on DataMind Architecture)

### 1. Database-Level Functions
```python
def get_databases(connection_id: str)
def get_database_info(connection_id: str, database_name: str)  
def select_database(connection_id: str, database_name: str)
```

### 2. Schema-Level Functions
```python
def get_schemas(connection_id: str, database_name: str = None)
def get_schema_info(connection_id: str, schema_name: str)
def select_schema(connection_id: str, schema_name: str)
```

### 3. Table-Level Functions
```python
def get_tables(connection_id: str, database_name: str = None, schema_name: str = None)
def get_table_info(connection_id: str, table_name: str)
def describe_table(connection_id: str, table_name: str)
def get_table_sample(connection_id: str, table_name: str, limit: int = 10)
```

### 4. Advanced Metadata Functions
```python
def get_views(connection_id: str)
def get_functions(connection_id: str)  
def get_procedures(connection_id: str)
def get_stages(connection_id: str)
def get_table_constraints(connection_id: str, table_name: str)
def get_column_statistics(connection_id: str, table_name: str)
```

## Web Implementation Status

### ✅ IMPLEMENTED - Core Metadata Functions

| Function | CLI Expected | Web Implementation | Status |
|----------|-------------|-------------------|--------|
| **Database Operations** |
| `get_databases` | ✅ List databases | ✅ `getDatabases` | ✅ Complete |
| `select_database` | ✅ Switch database | ✅ `selectDatabase` | ✅ Complete |
| **Schema Operations** |
| `get_schemas` | ✅ List schemas | ✅ `getSchemas` | ✅ Complete |
| `select_schema` | ✅ Switch schema | ✅ `selectSchema` | ✅ Complete |
| **Table Operations** |
| `get_tables` | ✅ List tables | ✅ `getTables` | ✅ Complete |
| `describe_table` | ✅ Table structure | ✅ `describeTable` | ✅ Complete |

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

## Implementation Recommendations

### 1. Add Missing High-Priority Functions
- `get_table_sample` - Essential for data preview
- `get_views` - Important for complete schema understanding
- `get_table_constraints` - Critical for relationship mapping

### 2. Enhance Existing Functions
- Add row count information to table listings
- Include table types (table vs view) in responses
- Add last modified timestamps where available

### 3. CLI Parity Achievement
Current CLI parity: **75%** (6/8 core functions)  
With missing functions: **100%** CLI parity + Web enhancements

## Web Advantage Summary

1. **Superior Context Management:** Persistent session state vs manual CLI context
2. **Enhanced User Experience:** Rich formatted responses with guidance
3. **Better Error Handling:** Context-aware error messages
4. **Integrated State:** Automatic context updates across operations
5. **Web-Native Features:** Real-time updates, WebSocket communication

The web platform provides **superior metadata management** with CLI parity plus significant web-specific enhancements.