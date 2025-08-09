import { useState, useEffect, useRef } from "react";
import { Visualization } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface VisualizationCardProps {
  visualization: Visualization;
}

declare global {
  interface Window {
    Plotly: any;
  }
}

export function VisualizationCard({ visualization }: VisualizationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const plotlyRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Pin/Unpin mutation
  const pinMutation = useMutation({
    mutationFn: async (isPinned: boolean) => {
      return apiRequest('PATCH', `/api/visualizations/${visualization.id}`, {
        isPinned
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/visualizations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pinned'] });
      toast({
        title: visualization.isPinned ? "Visualization unpinned" : "Visualization pinned",
        description: visualization.isPinned ? 
          "Removed from your dashboard" : 
          "Added to your dashboard"
      });
    }
  });

  // Publish/Unpublish mutation  
  const publishMutation = useMutation({
    mutationFn: async (isPublished: boolean) => {
      return apiRequest('PATCH', `/api/visualizations/${visualization.id}`, {
        isPublished
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/visualizations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/published'] });
      toast({
        title: visualization.isPublished ? "Visualization unpublished" : "Visualization published", 
        description: visualization.isPublished ?
          "Removed from public gallery" :
          "Shared with your team"
      });
    }
  });

  useEffect(() => {
    if (plotlyRef.current && window.Plotly && visualization.chartConfig) {
      try {
        const config = visualization.chartConfig as any;
        // Render Plotly chart
        window.Plotly.newPlot(
          plotlyRef.current,
          config.data || [],
          config.layout || {},
          config.config || {}
        );
      } catch (error) {
        console.error('Error rendering Plotly chart:', error);
      }
    }
  }, [visualization.chartConfig]);

  const handlePin = () => {
    pinMutation.mutate(!visualization.isPinned);
  };

  const handlePublish = () => {
    publishMutation.mutate(!visualization.isPublished);
  };

  const handleFullScreen = () => {
    setIsExpanded(true);
  };

  return (
    <>
      <div className="bg-white rounded-lg border border-slate-200 p-4 my-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-slate-900">
            {visualization.title}
          </h4>
          <div className="flex space-x-2">
            <button
              onClick={handlePin}
              disabled={pinMutation.isPending}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                visualization.isPinned
                  ? 'text-amber-800 bg-amber-200 hover:bg-amber-300'
                  : 'text-amber-700 bg-amber-100 hover:bg-amber-200'
              }`}
            >
              📌 {visualization.isPinned ? 'Unpin' : 'Pin'}
            </button>
            <button
              onClick={handlePublish}
              disabled={publishMutation.isPending}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                visualization.isPublished
                  ? 'text-emerald-800 bg-emerald-200 hover:bg-emerald-300' 
                  : 'text-emerald-700 bg-emerald-100 hover:bg-emerald-200'
              }`}
            >
              🔗 {visualization.isPublished ? 'Unpublish' : 'Publish'}
            </button>
            <button
              onClick={handleFullScreen}
              className="px-3 py-1 text-xs font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors"
            >
              ⛶ Expand
            </button>
          </div>
        </div>
        
        {visualization.description && (
          <p className="text-xs text-slate-600 mb-3">
            {visualization.description}
          </p>
        )}

        <div ref={plotlyRef} className="h-64 w-full"></div>
      </div>

      {/* Full Screen Modal */}
      {isExpanded && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl max-h-full w-full overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                {visualization.title}
              </h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div ref={plotlyRef} className="h-96 w-full"></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}