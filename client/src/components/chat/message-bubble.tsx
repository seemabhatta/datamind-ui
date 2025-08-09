import { useState } from "react";
import { ChatMessage } from "@shared/schema";
import { VisualizationCard } from "./visualization-card";
import { useQuery } from "@tanstack/react-query";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const [showSql, setShowSql] = useState(false);

  // Fetch visualizations for this message
  const { data: visualizations = [] } = useQuery({
    queryKey: ['/api/visualizations', message.id],
    enabled: message.role === 'assistant'
  });

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { 
      hour: 'numeric',
      minute: '2-digit',
      hour12: true 
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (message.role === 'user') {
    return (
      <div className="flex space-x-3 justify-end">
        <div className="flex-1 max-w-2xl">
          <div className="bg-primary-600 text-white rounded-lg px-4 py-3">
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </div>
          <p className="text-xs text-slate-500 mt-1 text-right">
            {formatTime(message.createdAt!)}
          </p>
        </div>
        <div className="w-8 h-8 bg-slate-300 rounded-full"></div>
      </div>
    );
  }

  // Assistant message
  const metadata = message.metadata as any || {};
  
  return (
    <div className="flex space-x-3">
      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
        <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
        </svg>
      </div>
      <div className="flex-1">
        <div className="bg-slate-100 rounded-lg px-4 py-3">
          <div className="prose prose-sm max-w-none">
            {message.content.split('\n').map((line, index) => {
              // Handle code blocks
              if (line.startsWith('```sql')) {
                const sqlQuery = metadata?.sqlQuery;
                if (sqlQuery) {
                  return (
                    <div key={index} className="my-4">
                      <div className="bg-slate-800 text-slate-100 rounded-md p-3 text-sm font-mono">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-slate-400">SQL Query</span>
                          <button 
                            onClick={() => copyToClipboard(sqlQuery)}
                            className="text-slate-400 hover:text-white text-xs"
                          >
                            Copy
                          </button>
                        </div>
                        <code className="whitespace-pre-wrap">{sqlQuery}</code>
                      </div>
                    </div>
                  );
                }
              }
              
              if (line.startsWith('```')) {
                return null; // Skip code block markers
              }

              // Handle markdown-style formatting
              if (line.startsWith('**') && line.endsWith('**')) {
                return (
                  <p key={index} className="font-semibold text-slate-900 mt-3 mb-1">
                    {line.slice(2, -2)}
                  </p>
                );
              }

              if (line.trim() === '') {
                return <br key={index} />;
              }

              return (
                <p key={index} className="text-sm text-slate-700 mb-2">
                  {line}
                </p>
              );
            })}
          </div>

          {/* Data Table */}
          {metadata?.rowCount > 0 && (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden my-4">
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
                <h4 className="text-sm font-medium text-slate-900">
                  Query Results ({metadata.rowCount} rows)
                </h4>
              </div>
              <div className="overflow-x-auto max-h-64">
                <div className="p-4 text-sm text-slate-600">
                  <em>Data table would be rendered here based on query results</em>
                </div>
              </div>
            </div>
          )}

          {/* Visualizations */}
          {(visualizations as any[]).map((viz: any) => (
            <VisualizationCard 
              key={viz.id} 
              visualization={viz}
            />
          ))}

          {/* Execution metadata */}
          {metadata?.executionTime && (
            <div className="mt-3 text-xs text-slate-500">
              Query executed in {metadata.executionTime}ms
            </div>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {formatTime(message.createdAt!)}
        </p>
      </div>
    </div>
  );
}