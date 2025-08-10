# CLI Analysis: Patterns to Reuse in Web Platform

## Key Architectural Patterns from GitHub Repository

### 1. OpenAI Agent SDK Architecture
**Current CLI Implementation:**
```python
from agents import Agent, Runner, function_tool, SQLiteSession

@function_tool
def connect_to_snowflake() -> str:
    """Connect to Snowflake and establish a connection"""
    return connect_tool(agent_context)

snowflake_agent = Agent(
    name="SnowflakeQueryAgent",
    instructions=AGENT_INSTRUCTIONS,
    tools=[
        connect_to_snowflake,
        get_databases,
        select_database,
        # ... more tools
    ]
)
```

**What We Should Adopt:**
- Function decorator pattern for tool registration
- Clean separation between tool wrappers and implementation
- Agent context management pattern
- Comprehensive tool ecosystem

### 2. Session Management Pattern
**CLI Implementation:**
```python
session = SQLiteSession("dictionary_session")
runner = Runner(agent=dictionary_agent, session=session)
```

**Current Web Implementation:** 
- Basic session tracking in database
- WebSocket-based real-time communication

**Enhancement Needed:**
- Implement proper OpenAI Agent SDK session management
- Maintain conversation context across requests
- Better session persistence

### 3. Function Tools Ecosystem

**CLI has comprehensive tool sets:**

#### Connection Tools:
- `connect_to_snowflake()`
- `get_current_context()`

#### Metadata Tools:
- `get_databases()` / `select_database()`
- `get_schemas()` / `select_schema()`
- `get_stages()` / `select_stage()`

#### Query Tools:
- `generate_sql()` - NL2SQL conversion
- `execute_sql()` - Query execution
- `generate_summary()` - AI result summarization

#### YAML/Dictionary Tools:
- `get_yaml_files()` / `load_yaml_file()`
- `get_yaml_content()`
- `generate_yaml_dictionary()`

#### Advanced Features:
- `visualize_data()` - LLM-powered visualization
- `get_visualization_suggestions()`

### 4. Agent Context Management
**CLI Pattern:**
```python
@dataclass
class AgentContext:
    connection_id: Optional[str] = None
    current_database: Optional[str] = None
    current_schema: Optional[str] = None
    current_stage: Optional[str] = None
    yaml_content: Optional[str] = None
    yaml_data: Optional[Dict] = None
    tables: List[Dict] = None
    last_query_results: Optional[List[Dict]] = None
    last_query_columns: Optional[List[str]] = None
    last_query_sql: Optional[str] = None

# Global context for the agent
agent_context = AgentContext()
```

**Current Web Implementation:**
- Basic session-based context
- Limited state management

**Enhancement Needed:**
- Rich context object with all necessary state
- Persistent context across requests
- Better context restoration

### 5. Intelligent Agent Instructions
**CLI has sophisticated behavioral guidelines:**
- Context-aware response patterns
- Proactive action taking
- Smart user intent interpretation
- Workflow-aware decision making

## Implementation Plan for Web Platform

### Phase 1: Adopt OpenAI Agent SDK Architecture ✅ CURRENT FOCUS
1. **Replace current function tool system** with OpenAI Agent SDK pattern
2. **Implement proper Agent instances** for each agent type
3. **Add function_tool decorators** for clean tool registration
4. **Create AgentContext dataclass** for rich state management

### Phase 2: Expand Tool Ecosystem
1. **YAML/Dictionary Tools** - For ontology/semantic modeling
2. **Advanced Visualization Tools** - LLM-powered chart generation  
3. **Stage Management Tools** - File handling in Snowflake stages
4. **Summary Generation Tools** - AI-powered result analysis

### Phase 3: Enhanced Session Management
1. **Integrate SQLiteSession** for conversation persistence
2. **Implement conversation context restoration**
3. **Add proper session lifecycle management**

### Phase 4: Advanced Agent Behaviors
1. **Context-aware response patterns** from CLI instructions
2. **Proactive action taking** without asking for permission
3. **Smart user intent interpretation**
4. **Multi-step workflow management**

## Immediate Next Steps

1. **Refactor agent-service.ts** to use OpenAI Agent SDK pattern
2. **Create comprehensive function tool ecosystem** matching CLI capabilities
3. **Implement AgentContext dataclass equivalent** in TypeScript
4. **Add missing tools** like visualization, YAML processing, summary generation
5. **Enhance agent instructions** with CLI behavioral patterns

## Benefits of This Approach

- **Consistency** between CLI and web platform
- **Rich tool ecosystem** with proven patterns
- **Better user experience** with proactive agents
- **Scalable architecture** for adding new capabilities
- **Context preservation** across conversations
- **Advanced AI-powered features** like visualization and summarization