import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Pie, Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, LineElement, PointElement, LinearScale, CategoryScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import './Analytics.css';

ChartJS.register(ArcElement, LineElement, PointElement, LinearScale, CategoryScale, BarElement, Title, Tooltip, Legend);

const Analytics = () => {
  const [suggestionData, setSuggestionData] = useState({
    accepted: 0,
    rejected: 0,
    modified: 0,
    percentages: { accepted: 0, rejected: 0, modified: 0 },
  });
  const [trendData, setTrendData] = useState({ 
    accepted: [], 
    rejected: [], 
    modified: [] 
  });
  const [detectionAccuracy, setDetectionAccuracy] = useState(0);
  const [latencyData, setLatencyData] = useState([]);
  const [learningEffectivenessData, setLearningEffectivenessData] = useState([]);
  const [errorTypesData, setErrorTypesData] = useState([]);
  const [errorCategoriesData, setErrorCategoriesData] = useState([]);
  const [filters, setFilters] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = parseInt(localStorage.getItem('user_id'));
    if (!userId) {
      setError('User not logged in');
      setLoading(false);
      return;
    }

    // Set filters to only show current user's data
    const userFilters = {
      user_id: userId,
      language: null,
      start_date: null,
      end_date: null,
    };
    
    setFilters(userFilters);
    fetchAnalyticsData(userFilters);
  }, []);

  const fetchAnalyticsData = async (filters) => {
    try {
      setLoading(true);
      
      // Fetch all analytics data in parallel
      const [
        suggestionsRes,
        trendsRes,
        accuracyRes,
        latencyRes,
        effectivenessRes,
        errorTypesRes,
        errorCategoriesRes
      ] = await Promise.all([
        axios.post('http://localhost:8000/analytics/suggestions', filters),
        axios.post('http://localhost:8000/analytics/trends', filters),
        axios.post('http://localhost:8000/analytics/detection-accuracy', filters),
        axios.post('http://localhost:8000/analytics/latency', filters),
        axios.post('http://localhost:8000/analytics/learning-effectiveness', filters),
        axios.post('http://localhost:8000/analytics/error-types', filters),
        axios.post('http://localhost:8000/analytics/error-categories', filters)
      ]);

      setSuggestionData(suggestionsRes.data);
      setTrendData(trendsRes.data);
      setDetectionAccuracy(accuracyRes.data.accuracy);
      setLatencyData(latencyRes.data.overall_latency || []);
      setLearningEffectivenessData(effectivenessRes.data.effectiveness || []);
      setErrorTypesData(errorTypesRes.data.overall_error_types || []);
      setErrorCategoriesData(errorCategoriesRes.data.overall_error_categories || []);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Pie chart data for suggestion breakdown
  const pieChartData = {
    labels: ['Accepted', 'Rejected', 'Modified'],
    datasets: [
      {
        data: [suggestionData.accepted, suggestionData.rejected, suggestionData.modified],
        backgroundColor: ['#4CAF50', '#F44336', '#FF9800'],
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  };

  // Line chart data for suggestion trends
  const lineChartData = {
    labels: trendData.accepted?.map((item) => item.date) || [],
    datasets: [
      {
        label: 'Accepted',
        data: trendData.accepted?.map((item) => item.count) || [],
        borderColor: '#4CAF50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Rejected',
        data: trendData.rejected?.map((item) => item.count) || [],
        borderColor: '#F44336',
        backgroundColor: 'rgba(244, 67, 54, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Modified',
        data: trendData.modified?.map((item) => item.count) || [],
        borderColor: '#FF9800',
        backgroundColor: 'rgba(255, 152, 0, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  // Line chart data for latency trends
  const latencyChartData = {
    labels: latencyData?.map((item) => item.date) || [],
    datasets: [
      {
        label: 'Average Latency (ms)',
        data: latencyData?.map((item) => item.latency) || [],
        borderColor: '#2196F3',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  // Line chart data for learning effectiveness trends
  const learningEffectivenessChartData = {
    labels: learningEffectivenessData?.map((item) => item.date) || [],
    datasets: [
      {
        label: 'Learning Effectiveness (%)',
        data: learningEffectivenessData?.map((item) => item.effectiveness) || [],
        borderColor: '#9C27B0',
        backgroundColor: 'rgba(156, 39, 176, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  // Bar chart for error types by severity
  const errorTypesChartData = {
    labels: errorTypesData?.map((item) => item.severity) || [],
    datasets: [
      {
        label: 'Error Count',
        data: errorTypesData?.map((item) => item.count) || [],
        backgroundColor: [
          '#FF6384', // High
          '#36A2EB', // Medium  
          '#FFCE56', // Low
          '#4BC0C0', // Unknown
        ],
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  };

  // Bar chart for error categories
  const errorCategoriesChartData = {
    labels: errorCategoriesData?.map((item) => item.category) || [],
    datasets: [
      {
        label: 'Error Count',
        data: errorCategoriesData?.map((item) => item.count) || [],
        backgroundColor: [
          '#FF6384', // Syntax Error
          '#36A2EB', // Runtime Error
          '#FFCE56', // Logical Error
          '#4BC0C0', // Performance Issue
          '#9966FF', // Security Issue
          '#FF9F40', // Code Style
          '#4BC0C0', // Best Practice
          '#C9CBCF', // Other Issue
          '#FF6384', // Python Specific Error
          '#36A2EB', // JavaScript Specific Error
          '#FFCE56', // Java Specific Error
        ],
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        font: {
          size: 16
        }
      },
    },
  };

  if (loading) {
    return (
      <div className="analytics-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <div className="star-container">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="star"></div>
        ))}
        <div className="shooting-star"></div>
        <div className="shooting-star"></div>
      </div>
      <nav className="navbar">
        <div className="logo">CodeReview.</div>
        <ul className="nav-links">
          <li>
            <Link to="/">Logout</Link>
          </li>
          <li>
            <Link to="/submit">Dashboard</Link>
          </li>
        </ul>
      </nav>

      <div className="analytics-container">
        <h1>My Analytics Dashboard</h1>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Key Metrics Summary */}
        <div className="metrics-summary">
          <div className="metric-card">
            <h3>Detection Accuracy</h3>
            <div className="metric-value">{detectionAccuracy.toFixed(1)}%</div>
            <p>Relevant Suggestions</p>
          </div>
          <div className="metric-card">
            <h3>Accepted</h3>
            <div className="metric-value">{suggestionData.accepted}</div>
            <p>Suggestions</p>
          </div>
          <div className="metric-card">
            <h3>Rejected</h3>
            <div className="metric-value">{suggestionData.rejected}</div>
            <p>Suggestions</p>
          </div>
          <div className="metric-card">
            <h3>Modified</h3>
            <div className="metric-value">{suggestionData.modified}</div>
            <p>Suggestions</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="charts-grid">
          {/* Suggestion Breakdown */}
          <div className="chart-card">
            <h2>Suggestion Breakdown</h2>
            <div className="chart-container">
              <Pie 
                data={pieChartData} 
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    title: {
                      display: true,
                      text: 'Suggestion Distribution'
                    }
                  }
                }} 
              />
            </div>
            <div className="chart-stats">
              <p>Acceptance: {suggestionData.percentages.accepted.toFixed(1)}%</p>
              <p>Rejection: {suggestionData.percentages.rejected.toFixed(1)}%</p>
              <p>Modification: {suggestionData.percentages.modified.toFixed(1)}%</p>
            </div>
          </div>

          {/* Suggestion Trends */}
          <div className="chart-card">
            <h2>Suggestion Trends</h2>
            <div className="chart-container">
              <Line 
                data={lineChartData} 
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    title: {
                      display: true,
                      text: 'Suggestions Over Time'
                    }
                  },
                  scales: {
                    x: {
                      title: {
                        display: true,
                        text: 'Date'
                      }
                    },
                    y: {
                      title: {
                        display: true,
                        text: 'Number of Suggestions'
                      },
                      beginAtZero: true
                    }
                  }
                }} 
              />
            </div>
          </div>

          {/* Latency Trends */}
          <div className="chart-card">
            <h2>Performance Latency</h2>
            <div className="chart-container">
              <Line 
                data={latencyChartData} 
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    title: {
                      display: true,
                      text: 'Average Latency Over Time'
                    }
                  },
                  scales: {
                    x: {
                      title: {
                        display: true,
                        text: 'Date'
                      }
                    },
                    y: {
                      title: {
                        display: true,
                        text: 'Latency (ms)'
                      },
                      beginAtZero: true
                    }
                  }
                }} 
              />
            </div>
          </div>

          {/* Learning Effectiveness */}
          <div className="chart-card">
            <h2>Learning Effectiveness</h2>
            <div className="chart-container">
              <Line 
                data={learningEffectivenessChartData} 
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    title: {
                      display: true,
                      text: 'Learning Progress Over Time'
                    }
                  },
                  scales: {
                    x: {
                      title: {
                        display: true,
                        text: 'Date'
                      }
                    },
                    y: {
                      title: {
                        display: true,
                        text: 'Effectiveness (%)'
                      },
                      beginAtZero: true,
                      max: 100
                    }
                  }
                }} 
              />
            </div>
          </div>

          {/* Error Types by Severity */}
          <div className="chart-card">
            <h2>Error Types by Severity</h2>
            <div className="chart-container">
              <Bar 
                data={errorTypesChartData} 
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    title: {
                      display: true,
                      text: 'Errors by Severity'
                    }
                  },
                  scales: {
                    x: {
                      title: {
                        display: true,
                        text: 'Severity'
                      }
                    },
                    y: {
                      title: {
                        display: true,
                        text: 'Count'
                      },
                      beginAtZero: true
                    }
                  }
                }} 
              />
            </div>
          </div>

          {/* Error Categories */}
          <div className="chart-card">
            <h2>Error Categories</h2>
            <div className="chart-container">
              <Bar 
                data={errorCategoriesChartData} 
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    title: {
                      display: true,
                      text: 'Errors by Category'
                    }
                  },
                  scales: {
                    x: {
                      title: {
                        display: true,
                        text: 'Error Category'
                      }
                    },
                    y: {
                      title: {
                        display: true,
                        text: 'Count'
                      },
                      beginAtZero: true
                    }
                  }
                }} 
              />
            </div>
            <div className="chart-stats">
              <p>Total Errors: {errorCategoriesData.reduce((sum, item) => sum + item.count, 0)}</p>
              <p>Most Common: {errorCategoriesData.length > 0 ? errorCategoriesData[0].category : 'None'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;