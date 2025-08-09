import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Visualization } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface DashboardPanelProps {
  userId: string;
  onClose: () => void;
}

export function DashboardPanel({ userId, onClose }: DashboardPanelProps) {
  const [activeTab, setActiveTab] = useState<'pinned' | 'published'>('pinned');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pinned visualizations
  const { data: pinnedData, isLoading: pinnedLoading } = useQuery({
    queryKey: ['/api/pinned', userId],
    enabled: activeTab === 'pinned'
  });

  // Fetch published visualizations
  const { data: publishedData, isLoading: publishedLoading } = useQuery({
    queryKey: ['/api/published'],
    enabled: activeTab === 'published'
  });

  // Unpin mutation
  const unpinMutation = useMutation({
    mutationFn: async (visualizationId: string) => {
      return apiRequest('DELETE', `/api/pinned/${userId}/${visualizationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pinned', userId] });
      toast({
        title: "Visualization unpinned",
        description: "Removed from your dashboard"
      });
    }
  });

  const renderVisualizationCard = (viz: Visualization, isPinned: boolean = false) => (
    <div key={viz.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="text-sm font-medium text-slate-900">{viz.title}</h4>
          <p className="text-xs text-slate-500">
            {isPinned ? 'Pinned' : 'Published'} {' '}
            {new Date(viz.createdAt!).toLocaleDateString()}
          </p>
        </div>
        <div className="flex space-x-1">
          <button 
            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
            title="Full screen"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
            </svg>
          </button>
          {isPinned && (
            <button 
              onClick={() => unpinMutation.mutate(viz.id)}
              disabled={unpinMutation.isPending}
              className="p-1 text-slate-400 hover:text-red-600 transition-colors"
              title="Remove pin"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          )}
          {!isPinned && (
            <button 
              className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
              title="Share link"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"/>
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className="bg-white rounded border border-slate-200 h-32 flex items-center justify-center">
        <div className="text-xs text-slate-500">
          {viz.chartType.charAt(0).toUpperCase() + viz.chartType.slice(1)} Chart Preview
        </div>
      </div>
      {viz.description && (
        <p className="text-xs text-slate-600 mt-2">{viz.description}</p>
      )}
    </div>
  );

  const pinnedVisualizations = pinnedData?.map((item: any) => item.visualization) || [];
  const publishedVisualizations = publishedData || [];

  return (
    <div className="w-80 bg-white border-l border-slate-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Dashboard</h3>
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex mt-4 space-x-1 bg-slate-100 rounded-lg p-1">
          <button 
            onClick={() => setActiveTab('pinned')}
            className={`flex-1 px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'pinned'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pinned
          </button>
          <button 
            onClick={() => setActiveTab('published')}
            className={`flex-1 px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'published'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Published
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'pinned' && (
          <>
            {pinnedLoading && (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            
            {!pinnedLoading && pinnedVisualizations.length === 0 && (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h4a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
                <p className="text-sm text-slate-500">Pin visualizations to save them here</p>
              </div>
            )}
            
            {pinnedVisualizations.map((viz: Visualization) => 
              renderVisualizationCard(viz, true)
            )}
          </>
        )}

        {activeTab === 'published' && (
          <>
            {publishedLoading && (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            
            {!publishedLoading && publishedVisualizations.length === 0 && (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"/>
                </svg>
                <p className="text-sm text-slate-500">No published visualizations yet</p>
              </div>
            )}
            
            {publishedVisualizations.map((viz: Visualization) => 
              renderVisualizationCard(viz, false)
            )}
          </>
        )}
      </div>
    </div>
  );
}
