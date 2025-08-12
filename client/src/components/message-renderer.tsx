import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

interface MessageRendererProps {
  content: string;
  role: 'user' | 'assistant';
}

// Helper function to detect and format error messages
const formatErrorMessage = (content: string) => {
  // Check for error patterns
  const errorPatterns = [
    /❌\s*\*\*([^*]+)\*\*\s*(.*?)💡\s*(.*)/s,
    /❌\s*(.*?)💡\s*(.*)/s,
    /Error:\s*(.*)/s,
    /Failed:\s*(.*)/s,
    /\*\*Connection Failed\*\*\s*(.*)/s
  ];

  for (const pattern of errorPatterns) {
    const match = content.match(pattern);
    if (match) {
      const title = match[1] || 'Error';
      const message = match[2] || match[1] || '';
      const suggestion = match[3] || '';

      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-red-800 mb-2">
                {title.replace(/\*\*/g, '')}
              </h4>
              {message && (
                <p className="text-sm text-red-700 mb-3 leading-relaxed">
                  {message.replace(/\*\*/g, '').trim()}
                </p>
              )}
              {suggestion && (
                <div className="bg-red-100 border border-red-200 rounded-md p-3">
                  <div className="flex items-center space-x-2">
                    <Info className="w-4 h-4 text-red-600" />
                    <p className="text-sm text-red-800 font-medium">Suggestion</p>
                  </div>
                  <p className="text-sm text-red-700 mt-1">
                    {suggestion.replace(/💡\s*/, '').trim()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
  }
  
  return null;
};

// Helper function to detect and format success messages
const formatSuccessMessage = (content: string) => {
  if (content.includes('✅') || content.includes('Successfully') || content.includes('Connected')) {
    const lines = content.split('\n').filter(line => line.trim());
    const successItems = lines.filter(line => line.includes('✅'));
    const otherContent = lines.filter(line => !line.includes('✅')).join('\n');

    if (successItems.length > 0) {
      return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-green-800 mb-2">Success</h4>
              <ul className="space-y-1 mb-3">
                {successItems.map((item, index) => (
                  <li key={index} className="text-sm text-green-700 flex items-start space-x-2">
                    <span className="text-green-500 mt-0.5">•</span>
                    <span>{item.replace('✅', '').trim()}</span>
                  </li>
                ))}
              </ul>
              {otherContent && (
                <p className="text-sm text-green-700">{otherContent}</p>
              )}
            </div>
          </div>
        </div>
      );
    }
  }
  
  return null;
};

// Helper function to format lists and structured content
const formatStructuredContent = (content: string) => {
  // Check for markdown-style lists
  const listPattern = /^[\s]*[-*+]\s+(.+)$/gm;
  const numberedListPattern = /^[\s]*\d+\.\s+(.+)$/gm;
  
  if (listPattern.test(content) || numberedListPattern.test(content)) {
    const lines = content.split('\n');
    const formattedLines = lines.map((line, index) => {
      if (/^[\s]*[-*+]\s+/.test(line)) {
        return (
          <li key={index} className="text-sm text-gray-700 flex items-start space-x-2">
            <span className="text-gray-400 mt-0.5">•</span>
            <span>{line.replace(/^[\s]*[-*+]\s+/, '').trim()}</span>
          </li>
        );
      } else if (/^[\s]*\d+\.\s+/.test(line)) {
        const match = line.match(/^[\s]*(\d+)\.\s+(.+)$/);
        return (
          <li key={index} className="text-sm text-gray-700 flex items-start space-x-2">
            <span className="text-gray-400 mt-0.5 font-medium">{match?.[1]}.</span>
            <span>{match?.[2]?.trim()}</span>
          </li>
        );
      } else if (line.trim()) {
        return <p key={index} className="text-sm text-gray-700 mb-2">{line.trim()}</p>;
      }
      return null;
    }).filter(Boolean);

    return (
      <div className="space-y-2">
        <ul className="space-y-1">{formattedLines}</ul>
      </div>
    );
  }
  
  return null;
};

// Helper function to format warning messages
const formatWarningMessage = (content: string) => {
  if (content.includes('⚠️') || content.includes('Warning') || content.includes('Note:')) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-yellow-800 mb-2">Warning</h4>
            <p className="text-sm text-yellow-700 leading-relaxed">
              {content.replace(/⚠️/g, '').replace(/Warning:?/gi, '').trim()}
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return null;
};

export function MessageRenderer({ content, role }: MessageRendererProps) {
  // For user messages, display as-is
  if (role === 'user') {
    return <div className="text-sm">{content}</div>;
  }

  // For assistant messages, try different formatting approaches
  const errorFormatted = formatErrorMessage(content);
  if (errorFormatted) return errorFormatted;

  const successFormatted = formatSuccessMessage(content);
  if (successFormatted) return successFormatted;

  const warningFormatted = formatWarningMessage(content);
  if (warningFormatted) return warningFormatted;

  const structuredFormatted = formatStructuredContent(content);
  if (structuredFormatted) return structuredFormatted;

  // Default formatting for regular content
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length > 1) {
    return (
      <div className="space-y-2">
        {lines.map((line, index) => (
          <p key={index} className="text-sm text-gray-700 leading-relaxed">
            {line.trim()}
          </p>
        ))}
      </div>
    );
  }

  return <div className="text-sm text-gray-700 leading-relaxed">{content}</div>;
}