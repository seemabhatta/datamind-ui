import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { agentService } from "./services/agent-service";
import { visualizationService } from "./services/visualization-service";
import { 
  insertChatSessionSchema, insertChatMessageSchema, insertVisualizationSchema,
  insertPinnedVisualizationSchema, insertSnowflakeConnectionSchema
} from "@shared/schema";
import { snowflakeService } from "./services/snowflake-service";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for real-time chat
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Store active WebSocket connections by session ID
  const activeSessions = new Map<string, WebSocket>();

  wss.on('connection', (ws: WebSocket, request) => {
    console.log('WebSocket client connected');

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('Received message:', message);

        switch (message.type) {
          case 'join_session':
            activeSessions.set(message.sessionId, ws);
            ws.send(JSON.stringify({ type: 'session_joined', sessionId: message.sessionId }));
            break;

          case 'chat_message':
            await handleChatMessage(message, ws);
            break;

          case 'agent_switch':
            // Handle agent switching
            ws.send(JSON.stringify({ 
              type: 'agent_switched', 
              agentType: message.agentType 
            }));
            break;

          default:
            console.log('Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Failed to process message' 
        }));
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      // Remove from active sessions
      for (const [sessionId, socket] of activeSessions) {
        if (socket === ws) {
          activeSessions.delete(sessionId);
          break;
        }
      }
    });
  });

  async function handleChatMessage(message: any, ws: WebSocket) {
    const { sessionId, content, agentType, userId } = message;

    try {
      // Save user message
      const userMessage = await storage.createMessage({
        sessionId,
        role: 'user',
        content,
      });

      // Send confirmation to client
      ws.send(JSON.stringify({
        type: 'message_saved',
        message: userMessage
      }));

      // Show typing indicator
      ws.send(JSON.stringify({
        type: 'agent_typing',
        isTyping: true
      }));

      // Process message with appropriate agent
      console.log(`Processing message with agent: ${agentType}`);
      const headers = message.headers || {};
      const agentResponse = await agentService.processMessage(content, agentType, sessionId, headers);
      console.log(`Agent response received:`, agentResponse);

      // Save agent response
      const assistantMessage = await storage.createMessage({
        sessionId,
        role: 'assistant',
        content: agentResponse.content,
        metadata: agentResponse.metadata,
      });
      console.log(`Assistant message saved:`, assistantMessage);

      // Stop typing indicator
      ws.send(JSON.stringify({
        type: 'agent_typing',
        isTyping: false
      }));

      // Send agent response
      ws.send(JSON.stringify({
        type: 'agent_response',
        message: assistantMessage
      }));

      // If response includes visualization data, create visualization
      if (agentResponse.visualization) {
        const visualization = await storage.createVisualization({
          messageId: assistantMessage.id,
          userId,
          title: agentResponse.visualization.title,
          description: agentResponse.visualization.description,
          chartType: agentResponse.visualization.chartType,
          chartConfig: agentResponse.visualization.chartConfig,
          data: agentResponse.visualization.data,
          sqlQuery: agentResponse.visualization.sqlQuery,
        });

        ws.send(JSON.stringify({
          type: 'visualization_created',
          visualization
        }));
      }

    } catch (error) {
      console.error('Error handling chat message:', error);
      
      ws.send(JSON.stringify({
        type: 'agent_typing',
        isTyping: false
      }));

      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to process your request. Please try again.'
      }));
    }
  }

  // REST API routes

  // Chat sessions
  app.get('/api/sessions/:userId', async (req, res) => {
    try {
      const sessions = await storage.getChatSessionsByUser(req.params.userId);
      res.json(sessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      res.status(500).json({ message: 'Failed to fetch sessions' });
    }
  });

  app.post('/api/sessions', async (req, res) => {
    try {
      const sessionData = insertChatSessionSchema.parse(req.body);
      const session = await storage.createChatSession(sessionData);
      res.json(session);
    } catch (error) {
      console.error('Error creating session:', error);
      res.status(500).json({ message: 'Failed to create session' });
    }
  });

  app.delete('/api/sessions/:sessionId', async (req, res) => {
    try {
      await storage.deleteChatSession(req.params.sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting session:', error);
      res.status(500).json({ message: 'Failed to delete session' });
    }
  });

  app.delete('/api/sessions', async (req, res) => {
    try {
      const { sessionIds } = req.body;
      if (!Array.isArray(sessionIds)) {
        return res.status(400).json({ message: 'sessionIds must be an array' });
      }
      await storage.deleteChatSessions(sessionIds);
      res.json({ success: true });
    } catch (error) {
      console.error('Error bulk deleting sessions:', error);
      res.status(500).json({ message: 'Failed to delete sessions' });
    }
  });

  // Messages
  app.get('/api/sessions/:sessionId/messages', async (req, res) => {
    try {
      const messages = await storage.getMessagesBySession(req.params.sessionId);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });

  // Visualizations
  app.get('/api/visualizations/:userId', async (req, res) => {
    try {
      const visualizations = await storage.getVisualizationsByUser(req.params.userId);
      res.json(visualizations);
    } catch (error) {
      console.error('Error fetching visualizations:', error);
      res.status(500).json({ message: 'Failed to fetch visualizations' });
    }
  });

  app.patch('/api/visualizations/:id', async (req, res) => {
    try {
      const { isPinned, isPublished } = req.body;
      const visualization = await storage.updateVisualization(req.params.id, {
        isPinned,
        isPublished
      });
      res.json(visualization);
    } catch (error) {
      console.error('Error updating visualization:', error);
      res.status(500).json({ message: 'Failed to update visualization' });
    }
  });

  // Pinned visualizations
  app.get('/api/pinned/:userId', async (req, res) => {
    try {
      const pinned = await storage.getPinnedVisualizationsByUser(req.params.userId);
      res.json(pinned);
    } catch (error) {
      console.error('Error fetching pinned visualizations:', error);
      res.status(500).json({ message: 'Failed to fetch pinned visualizations' });
    }
  });

  app.post('/api/pinned', async (req, res) => {
    try {
      const pinData = insertPinnedVisualizationSchema.parse(req.body);
      const pin = await storage.pinVisualization(pinData);
      res.json(pin);
    } catch (error) {
      console.error('Error pinning visualization:', error);
      res.status(500).json({ message: 'Failed to pin visualization' });
    }
  });

  app.delete('/api/pinned/:userId/:visualizationId', async (req, res) => {
    try {
      await storage.unpinVisualization(req.params.userId, req.params.visualizationId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error unpinning visualization:', error);
      res.status(500).json({ message: 'Failed to unpin visualization' });
    }
  });

  // Published visualizations
  app.get('/api/published', async (req, res) => {
    try {
      const published = await storage.getPublishedVisualizations();
      res.json(published);
    } catch (error) {
      console.error('Error fetching published visualizations:', error);
      res.status(500).json({ message: 'Failed to fetch published visualizations' });
    }
  });

  // Snowflake connections
  app.get('/api/snowflake/connections/:userId', async (req, res) => {
    try {
      const connections = await storage.getSnowflakeConnections(req.params.userId);
      // Don't return passwords in the response
      const safeConnections = connections.map(conn => ({
        ...conn,
        password: undefined
      }));
      res.json(safeConnections);
    } catch (error) {
      console.error('Error fetching Snowflake connections:', error);
      res.status(500).json({ message: 'Failed to fetch Snowflake connections' });
    }
  });

  app.post('/api/snowflake/connections', async (req, res) => {
    try {
      const connectionData = insertSnowflakeConnectionSchema.parse(req.body);
      const connection = await storage.createSnowflakeConnection(connectionData);
      
      // Don't return password in response
      const safeConnection = { ...connection, password: undefined };
      res.json(safeConnection);
    } catch (error) {
      console.error('Error creating Snowflake connection:', error);
      res.status(500).json({ message: 'Failed to create Snowflake connection' });
    }
  });

  app.post('/api/snowflake/connections/:id/test', async (req, res) => {
    try {
      const connection = await storage.getSnowflakeConnection(req.params.id);
      
      if (!connection) {
        return res.status(404).json({ message: 'Connection not found' });
      }

      const isValid = await snowflakeService.testConnection({
        account: connection.account,
        username: connection.username,
        password: connection.password || '',
        database: connection.database || undefined,
        schema: connection.schema || undefined,
        warehouse: connection.warehouse || undefined,
        role: connection.role || undefined,
        authenticator: connection.authenticator || undefined,
      });

      if (isValid) {
        // Update last connected timestamp
        await storage.updateSnowflakeConnection(connection.id, {
          lastConnected: new Date()
        });
      }

      res.json({ success: isValid });
    } catch (error) {
      console.error('Error testing Snowflake connection:', error);
      res.status(500).json({ message: 'Failed to test Snowflake connection' });
    }
  });

  app.post('/api/snowflake/connections/:id/execute', async (req, res) => {
    try {
      const { sqlText } = req.body;
      const connection = await storage.getSnowflakeConnection(req.params.id);
      
      if (!connection) {
        return res.status(404).json({ message: 'Connection not found' });
      }

      // Create Snowflake connection if not exists
      const hasActiveConnection = snowflakeService.hasActiveConnection(connection.id);
      if (!hasActiveConnection) {
        const connected = await snowflakeService.createConnection(connection.id, {
          account: connection.account,
          username: connection.username,
          password: connection.password || '',
          database: connection.database || undefined,
          schema: connection.schema || undefined,
          warehouse: connection.warehouse || undefined,
          role: connection.role || undefined,
          authenticator: connection.authenticator || undefined,
        });

        if (!connected) {
          return res.status(500).json({ message: 'Failed to establish Snowflake connection' });
        }
      }

      const result = await snowflakeService.executeQuery(connection.id, sqlText);
      
      // Update last connected timestamp
      await storage.updateSnowflakeConnection(connection.id, {
        lastConnected: new Date()
      });

      res.json(result);
    } catch (error) {
      console.error('Error executing Snowflake query:', error);
      res.status(500).json({ message: 'Failed to execute query: ' + (error instanceof Error ? error.message : 'Unknown error') });
    }
  });

  app.get('/api/snowflake/connections/:id/schema', async (req, res) => {
    try {
      const connection = await storage.getSnowflakeConnection(req.params.id);
      
      if (!connection) {
        return res.status(404).json({ message: 'Connection not found' });
      }

      // Ensure connection exists
      const hasActiveConnection = snowflakeService.hasActiveConnection(connection.id);
      if (!hasActiveConnection) {
        const connected = await snowflakeService.createConnection(connection.id, {
          account: connection.account,
          username: connection.username,
          password: connection.password || '',
          database: connection.database || undefined,
          schema: connection.schema || undefined,
          warehouse: connection.warehouse || undefined,
          role: connection.role || undefined,
          authenticator: connection.authenticator || undefined,
        });

        if (!connected) {
          return res.status(500).json({ message: 'Failed to establish Snowflake connection' });
        }
      }

      const schemaInfo = await snowflakeService.getSchemaInfo(connection.id);
      res.json(schemaInfo);
    } catch (error) {
      console.error('Error fetching Snowflake schema info:', error);
      res.status(500).json({ message: 'Failed to fetch schema info: ' + (error instanceof Error ? error.message : 'Unknown error') });
    }
  });

  app.delete('/api/snowflake/connections/:id', async (req, res) => {
    try {
      await snowflakeService.closeConnection(req.params.id);
      await storage.deleteSnowflakeConnection(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting Snowflake connection:', error);
      res.status(500).json({ message: 'Failed to delete Snowflake connection' });
    }
  });

  app.put('/api/snowflake/connections/:id/default', async (req, res) => {
    try {
      const { userId } = req.body;
      await storage.setDefaultSnowflakeConnection(userId, req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error setting default Snowflake connection:', error);
      res.status(500).json({ message: 'Failed to set default connection' });
    }
  });

  return httpServer;
}
