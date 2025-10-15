import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Pie, Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, LineElement, PointElement, LinearScale, CategoryScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import './AdminDashboard.css';

ChartJS.register(ArcElement, LineElement, PointElement, LinearScale, CategoryScale, BarElement, Title, Tooltip, Legend);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [developers, setDevelopers] = useState([]);
  const [selectedDeveloper, setSelectedDeveloper] = useState(null);
  const [viewMode, setViewMode] = useState('overview'); // 'overview', 'developer', 'overall'
  const [suggestionData, setSuggestionData] = useState({
    accepted: 0,
    rejected: 0,
    modified: 0,
    percentages: { accepted: 0, rejected: 0, modified: 0 },
    developer_stats: [],
  });
  const [trendData, setTrendData] = useState({
    accepted: [],
    rejected: [],
    modified: [],
    developer_trends: { accepted: [], rejected: [], modified: [] },
  });
  const [detectionAccuracy, setDetectionAccuracy] = useState({
    accuracy: 0,
    developer_accuracy: [],
  });
  const [latencyData, setLatencyData] = useState({
    overall_latency: [],
    developer_latency: [],
  });
  const [learningEffectivenessData, setLearningEffectivenessData] = useState({
    effectiveness: [],
    developer_effectiveness: [],
  });
  const [errorTypesData, setErrorTypesData] = useState({
    overall_error_types: [],
    developer_error_types: [],
  });
  const [filters, setFilters] = useState({
    user_id: null,
    language: null,
    start_date: null,
    end_date: null,
  });
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedRole = localStorage.getItem('user_role');
    setUserRole(storedRole);

    if (storedRole !== 'admin') {
      navigate('/submit');
      return;
    }

    fetchDevelopers();
    fetchOverallAnalytics();
  }, [navigate]);

  const fetchDevelopers = async () => {
    try {
      const response = await axios.get('http://localhost:8000/admin/developers');
      setDevelopers(response.data.developers);
    } catch (err) {
      console.error('Error fetching developers:', err);
      setError('Failed to load developers list.');
    }
  };

  const fetchOverallAnalytics = async () => {
    try {
      const filters = { user_id: null };

      const [
        suggestionRes,
        trendRes,
        accuracyRes,
        latencyRes,
        effectivenessRes,
        errorTypesRes
      ] = await Promise.all([
        axios.post('http://localhost:8000/analytics/suggestions', filters),
        axios.post('http://localhost:8000/analytics/trends', filters),
        axios.post('http://localhost:8000/analytics/detection-accuracy', filters),
        axios.post('http://localhost:8000/analytics/latency', filters),
        axios.post('http://localhost:8000/analytics/learning-effectiveness', filters),
        axios.post('http://localhost:8000/analytics/error-types', filters)
      ]);

      setSuggestionData(suggestionRes.data);
      setTrendData(trendRes.data);
      setDetectionAccuracy(accuracyRes.data);
      setLatencyData(latencyRes.data);
      setLearningEffectivenessData(effectivenessRes.data);
      setErrorTypesData(errorTypesRes.data);
      setError(null);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching overall analytics:', err);
      setError('Failed to load analytics data.');
      setIsLoading(false);
    }
  };

  const fetchDeveloperAnalytics = async (developerId) => {
    try {
      const filters = { user_id: developerId };

      const [
        suggestionRes,
        trendRes,
        accuracyRes,
        latencyRes,
        effectivenessRes,
        errorTypesRes
      ] = await Promise.all([
        axios.post('http://localhost:8000/analytics/suggestions', filters),
        axios.post('http://localhost:8000/analytics/trends', filters),
        axios.post('http://localhost:8000/analytics/detection-accuracy', filters),
        axios.post('http://localhost:8000/analytics/latency', filters),
        axios.post('http://localhost:8000/analytics/learning-effectiveness', filters),
        axios.post('http://localhost:8000/analytics/error-types', filters)
      ]);

      return {
        suggestionData: suggestionRes.data,
        trendData: trendRes.data,
        detectionAccuracy: accuracyRes.data,
        latencyData: latencyRes.data,
        learningEffectivenessData: effectivenessRes.data,
        errorTypesData: errorTypesRes.data,
      };
    } catch (err) {
      console.error('Error fetching developer analytics:', err);
      throw new Error('Failed to load developer analytics');
    }
  };

  const handleViewDeveloper = async (developer) => {
    setSelectedDeveloper(developer);
    setViewMode('developer');
    setIsLoading(true);

    try {
      const analytics = await fetchDeveloperAnalytics(developer.id);
      setSuggestionData(analytics.suggestionData);
      setTrendData(analytics.trendData);
      setDetectionAccuracy(analytics.detectionAccuracy);
      setLatencyData(analytics.latencyData);
      setLearningEffectivenessData(analytics.learningEffectivenessData);
      setErrorTypesData(analytics.errorTypesData);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
    setIsLoading(false);
  };

  const handleViewOverall = () => {
    setViewMode('overall');
    setSelectedDeveloper(null);
    fetchOverallAnalytics();
  };

  const handleBackToOverview = () => {
    setViewMode('overview');
    setSelectedDeveloper(null);
  };

  // Helper function to get the correct data structure for charts
  const getLatencyData = () => {
    if (viewMode === 'developer') {
      // For single developer, use overall_latency array directly
      return latencyData.overall_latency || [];
    } else {
      // For overall view, use overall_latency array
      return latencyData.overall_latency || [];
    }
  };

  const getLearningEffectivenessData = () => {
    if (viewMode === 'developer') {
      // For single developer, use effectiveness array directly
      return learningEffectivenessData.effectiveness || [];
    } else {
      // For overall view, use effectiveness array
      return learningEffectivenessData.effectiveness || [];
    }
  };

  const getErrorTypesData = () => {
    if (viewMode === 'developer') {
      // For single developer, use overall_error_types array directly
      return errorTypesData.overall_error_types || [];
    } else {
      // For overall view, use overall_error_types array
      return errorTypesData.overall_error_types || [];
    }
  };

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

  const developerSuggestionChartData = {
    labels: suggestionData.developer_stats.map(d => d.username),
    datasets: [
      {
        label: 'Accepted',
        data: suggestionData.developer_stats.map(d => d.accepted),
        backgroundColor: '#4CAF50',
      },
      {
        label: 'Rejected',
        data: suggestionData.developer_stats.map(d => d.rejected),
        backgroundColor: '#F44336',
      },
      {
        label: 'Modified',
        data: suggestionData.developer_stats.map(d => d.modified),
        backgroundColor: '#FF9800',
      },
    ],
  };

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

  const developerAccuracyChartData = {
    labels: detectionAccuracy.developer_accuracy.map(d => d.username),
    datasets: [
      {
        label: 'Detection Accuracy (%)',
        data: detectionAccuracy.developer_accuracy.map(d => d.accuracy),
        borderColor: '#4BC0C0',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true,
      },
    ],
  };

  const latencyChartData = {
    labels: getLatencyData().map((item) => item.date) || [],
    datasets: [
      {
        label: 'Average Latency (ms)',
        data: getLatencyData().map((item) => item.latency) || [],
        borderColor: '#2196F3',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const learningEffectivenessChartData = {
    labels: getLearningEffectivenessData().map((item) => item.date) || [],
    datasets: [
      {
        label: 'Learning Effectiveness (%)',
        data: getLearningEffectivenessData().map((item) => item.effectiveness) || [],
        borderColor: '#9C27B0',
        backgroundColor: 'rgba(156, 39, 176, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const errorTypesChartData = {
    labels: getErrorTypesData().map((item) => item.severity) || [],
    datasets: [
      {
        label: 'Error Count',
        data: getErrorTypesData().map((item) => item.count) || [],
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

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, font: { size: 16 } },
    },
  };

  const handleLogout = () => {
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="admin-dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (userRole !== 'admin') {
    return (
      <div className="admin-dashboard">
        <div>Access restricted to admins.</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard">
        <p className="error">{error}</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="star-container">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="star"></div>
        ))}
        {[...Array(2)].map((_, i) => (
          <div key={i} className="shooting-star"></div>
        ))}
      </div>
      <nav className="navbar">
        <div className="logo">CodeReview.</div>
        <ul className="nav-links">
          <li><Link to="/" onClick={handleLogout}>Logout</Link></li>
        </ul>
      </nav>

      <div className="dashboard-container">
        <h1>Admin Dashboard</h1>

        {viewMode === 'overview' && (
          <div className="admin-overview">
            <div className="admin-actions">
              <button className="overall-analytics-btn" onClick={handleViewOverall}>
                View Overall Analytics
              </button>
            </div>

            <div className="developers-list">
              <h2>Developers</h2>
              <table className="developers-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>User ID</th>
                    <th>Joined Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {developers.map(dev => (
                    <tr key={dev.id}>
                      <td>{dev.username}</td>
                      <td>{dev.id}</td>
                      <td>{new Date(dev.created_at).toLocaleDateString()}</td>
                      <td>
                        <button
                          className="view-analytics-btn"
                          onClick={() => handleViewDeveloper(dev)}
                        >
                          View Analytics
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(viewMode === 'overall' || viewMode === 'developer') && (
          <div className="analytics-view">
            <div className="view-header">
              <button className="back-btn" onClick={handleBackToOverview}>
                ← Back to Overview
              </button>
              <h2>
                {viewMode === 'overall' ? 'Overall Analytics' : `Analytics for ${selectedDeveloper?.username}`}
              </h2>
            </div>

            <div className="metrics-summary">
              <div className="metric-card">
                <h3>Detection Accuracy</h3>
                <div className="metric-value">{detectionAccuracy.accuracy.toFixed(1)}%</div>
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
                        title: { display: true, text: 'Suggestion Status Distribution' },
                        tooltip: {
                          callbacks: {
                            label: (context) => {
                              const label = context.label || '';
                              const value = context.raw || 0;
                              const total = suggestionData.accepted + suggestionData.rejected + suggestionData.modified;
                              const percentage = total ? ((value / total) * 100).toFixed(1) : 0;
                              return `${label}: ${value} (${percentage}%)`;
                            },
                          },
                        },
                      },
                    }}
                  />
                </div>
                <div className="chart-stats">
                  <p>Acceptance Rate: {suggestionData.percentages.accepted.toFixed(1)}%</p>
                  <p>Rejection Rate: {suggestionData.percentages.rejected.toFixed(1)}%</p>
                  <p>Modification Rate: {suggestionData.percentages.modified.toFixed(1)}%</p>
                </div>
              </div>

              {/* Developer Suggestions Comparison - Only show in overall view */}
              {viewMode === 'overall' && (
                <div className="chart-card">
                  <h2>Developer Suggestions Comparison</h2>
                  <div className="chart-container">
                    <Bar
                      data={developerSuggestionChartData}
                      options={{
                        ...chartOptions,
                        plugins: {
                          ...chartOptions.plugins,
                          title: { display: true, text: 'Suggestions by Developer' },
                        },
                        scales: {
                          x: { title: { display: true, text: 'Developer' } },
                          y: { title: { display: true, text: 'Number of Suggestions' } },
                        },
                      }}
                    />
                  </div>
                </div>
              )}

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
                        title: { display: true, text: 'Suggestions Over Time' },
                      },
                      scales: {
                        x: { title: { display: true, text: 'Date' } },
                        y: { title: { display: true, text: 'Number of Suggestions' }, beginAtZero: true },
                      },
                    }}
                  />
                </div>
              </div>

              {/* Developer Detection Accuracy - Only show in overall view */}
              {viewMode === 'overall' && (
                <div className="chart-card">
                  <h2>Developer Detection Accuracy</h2>
                  <div className="chart-container">
                    <Line
                      data={developerAccuracyChartData}
                      options={{
                        ...chartOptions,
                        plugins: {
                          ...chartOptions.plugins,
                          title: { display: true, text: 'Detection Accuracy by Developer' },
                        },
                        scales: {
                          x: { title: { display: true, text: 'Developer' } },
                          y: { title: { display: true, text: 'Accuracy (%)' } },
                        },
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Performance Latency - Show for both views */}
              <div className="chart-card">
                <h2>Performance Latency</h2>
                <div className="chart-container">
                  <Line
                    data={latencyChartData}
                    options={{
                      ...chartOptions,
                      plugins: {
                        ...chartOptions.plugins,
                        title: { display: true, text: 'Average Latency Over Time' },
                      },
                      scales: {
                        x: { title: { display: true, text: 'Date' } },
                        y: { title: { display: true, text: 'Latency (ms)' }, beginAtZero: true },
                      },
                    }}
                  />
                </div>
              </div>

              {/* Learning Effectiveness - Show for both views */}
              <div className="chart-card">
                <h2>Learning Effectiveness</h2>
                <div className="chart-container">
                  <Line
                    data={learningEffectivenessChartData}
                    options={{
                      ...chartOptions,
                      plugins: {
                        ...chartOptions.plugins,
                        title: { display: true, text: 'Learning Progress Over Time' },
                      },
                      scales: {
                        x: { title: { display: true, text: 'Date' } },
                        y: { title: { display: true, text: 'Effectiveness (%)' }, beginAtZero: true, max: 100 },
                      },
                    }}
                  />
                </div>
              </div>

              {/* Error Types - Show for both views */}
              <div className="chart-card">
                <h2>Error Types</h2>
                <div className="chart-container">
                  <Bar
                    data={errorTypesChartData}
                    options={{
                      ...chartOptions,
                      plugins: {
                        ...chartOptions.plugins,
                        title: { display: true, text: 'Errors by Severity' },
                      },
                      scales: {
                        x: { title: { display: true, text: 'Severity' } },
                        y: { title: { display: true, text: 'Count' }, beginAtZero: true },
                      },
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;