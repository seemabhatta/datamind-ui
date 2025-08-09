interface VisualizationConfig {
  title: string;
  description: string;
  chartType: string;
  chartConfig: any;
  data: any;
  sqlQuery?: string;
}

class VisualizationService {
  async createVisualizationFromData(data: any[], sqlQuery: string, userQuery: string): Promise<VisualizationConfig | null> {
    if (!data || data.length === 0) {
      return null;
    }

    // Analyze the data structure to determine the best visualization type
    const analysis = this.analyzeData(data);
    const chartType = this.selectChartType(analysis, userQuery);
    
    // Generate Plotly configuration based on the chart type and data
    const chartConfig = this.generatePlotlyConfig(data, chartType, analysis);
    
    return {
      title: this.generateTitle(userQuery, chartType),
      description: this.generateDescription(analysis, chartType),
      chartType,
      chartConfig,
      data,
      sqlQuery
    };
  }

  private analyzeData(data: any[]): any {
    if (data.length === 0) return null;

    const firstRow = data[0];
    const columns = Object.keys(firstRow);
    const analysis = {
      rowCount: data.length,
      columns: columns.map(col => ({
        name: col,
        type: this.inferColumnType(data, col),
        uniqueValues: new Set(data.map(row => row[col])).size,
        hasNulls: data.some(row => row[col] == null)
      }))
    };

    return analysis;
  }

  private inferColumnType(data: any[], columnName: string): 'numeric' | 'categorical' | 'date' | 'text' {
    const sample = data.slice(0, 10).map(row => row[columnName]).filter(val => val != null);
    
    if (sample.length === 0) return 'text';

    // Check if all values are numbers
    if (sample.every(val => !isNaN(Number(val)))) {
      return 'numeric';
    }

    // Check if values look like dates
    if (sample.every(val => !isNaN(Date.parse(val)))) {
      return 'date';
    }

    // Check if it's categorical (low cardinality)
    const uniqueValues = new Set(sample).size;
    if (uniqueValues <= sample.length * 0.5 && uniqueValues <= 20) {
      return 'categorical';
    }

    return 'text';
  }

  private selectChartType(analysis: any, userQuery: string): string {
    const query = userQuery.toLowerCase();
    
    // Check for explicit chart type requests
    if (query.includes('bar chart') || query.includes('bar graph')) return 'bar';
    if (query.includes('line chart') || query.includes('line graph')) return 'line';
    if (query.includes('pie chart') || query.includes('pie graph')) return 'pie';
    if (query.includes('scatter plot') || query.includes('scatter')) return 'scatter';
    if (query.includes('histogram')) return 'histogram';

    // Auto-select based on data characteristics
    const numericColumns = analysis.columns.filter((col: any) => col.type === 'numeric');
    const categoricalColumns = analysis.columns.filter((col: any) => col.type === 'categorical');

    // If we have one categorical and one numeric column, use bar chart
    if (categoricalColumns.length === 1 && numericColumns.length === 1) {
      return 'bar';
    }

    // If we have multiple numeric columns, use line chart for trends
    if (numericColumns.length >= 2) {
      return 'line';
    }

    // If we have one categorical column with low cardinality, use pie chart
    if (categoricalColumns.length === 1 && categoricalColumns[0].uniqueValues <= 10) {
      return 'pie';
    }

    // Default to bar chart
    return 'bar';
  }

  private generatePlotlyConfig(data: any[], chartType: string, analysis: any): any {
    const config = {
      displayModeBar: true,
      modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
      displaylogo: false,
      responsive: true
    };

    const layout = {
      margin: { l: 60, r: 30, t: 40, b: 80 },
      height: 400,
      font: { size: 12 },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)'
    };

    switch (chartType) {
      case 'bar':
        return this.generateBarChart(data, analysis, layout, config);
      case 'line':
        return this.generateLineChart(data, analysis, layout, config);
      case 'pie':
        return this.generatePieChart(data, analysis, layout, config);
      case 'scatter':
        return this.generateScatterChart(data, analysis, layout, config);
      default:
        return this.generateBarChart(data, analysis, layout, config);
    }
  }

  private generateBarChart(data: any[], analysis: any, layout: any, config: any): any {
    const categoricalCol = analysis.columns.find((col: any) => col.type === 'categorical');
    const numericCol = analysis.columns.find((col: any) => col.type === 'numeric');

    if (!categoricalCol || !numericCol) {
      // Fallback: use first two columns
      const cols = analysis.columns;
      return {
        data: [{
          x: data.map(row => row[cols[0].name]),
          y: data.map(row => row[cols[1]?.name] || 1),
          type: 'bar',
          marker: { color: '#3b82f6' }
        }],
        layout: {
          ...layout,
          xaxis: { title: cols[0].name },
          yaxis: { title: cols[1]?.name || 'Count' }
        },
        config
      };
    }

    return {
      data: [{
        x: data.map(row => row[categoricalCol.name]),
        y: data.map(row => row[numericCol.name]),
        type: 'bar',
        marker: { color: '#3b82f6' }
      }],
      layout: {
        ...layout,
        xaxis: { title: categoricalCol.name },
        yaxis: { title: numericCol.name }
      },
      config
    };
  }

  private generateLineChart(data: any[], analysis: any, layout: any, config: any): any {
    const numericColumns = analysis.columns.filter((col: any) => col.type === 'numeric');
    
    if (numericColumns.length < 2) {
      // Fallback to bar chart
      return this.generateBarChart(data, analysis, layout, config);
    }

    const xCol = numericColumns[0];
    const yCol = numericColumns[1];

    return {
      data: [{
        x: data.map(row => row[xCol.name]),
        y: data.map(row => row[yCol.name]),
        type: 'scatter',
        mode: 'lines+markers',
        marker: { color: '#3b82f6' },
        line: { color: '#3b82f6' }
      }],
      layout: {
        ...layout,
        xaxis: { title: xCol.name },
        yaxis: { title: yCol.name }
      },
      config
    };
  }

  private generatePieChart(data: any[], analysis: any, layout: any, config: any): any {
    const categoricalCol = analysis.columns.find((col: any) => col.type === 'categorical');
    
    if (!categoricalCol) {
      return this.generateBarChart(data, analysis, layout, config);
    }

    // Aggregate data by category
    const aggregated = data.reduce((acc: any, row: any) => {
      const category = row[categoricalCol.name];
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    return {
      data: [{
        labels: Object.keys(aggregated),
        values: Object.values(aggregated),
        type: 'pie',
        marker: {
          colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
        }
      }],
      layout: {
        ...layout,
        showlegend: true
      },
      config
    };
  }

  private generateScatterChart(data: any[], analysis: any, layout: any, config: any): any {
    const numericColumns = analysis.columns.filter((col: any) => col.type === 'numeric');
    
    if (numericColumns.length < 2) {
      return this.generateBarChart(data, analysis, layout, config);
    }

    const xCol = numericColumns[0];
    const yCol = numericColumns[1];

    return {
      data: [{
        x: data.map(row => row[xCol.name]),
        y: data.map(row => row[yCol.name]),
        type: 'scatter',
        mode: 'markers',
        marker: { 
          color: '#3b82f6',
          size: 8
        }
      }],
      layout: {
        ...layout,
        xaxis: { title: xCol.name },
        yaxis: { title: yCol.name }
      },
      config
    };
  }

  private generateTitle(userQuery: string, chartType: string): string {
    const cleanQuery = userQuery.replace(/^(show|display|create|generate)\s+/i, '');
    return cleanQuery.charAt(0).toUpperCase() + cleanQuery.slice(1);
  }

  private generateDescription(analysis: any, chartType: string): string {
    const rowCount = analysis.rowCount;
    const columnCount = analysis.columns.length;
    
    return `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} chart showing ${rowCount} data points across ${columnCount} columns.`;
  }
}

export const visualizationService = new VisualizationService();
