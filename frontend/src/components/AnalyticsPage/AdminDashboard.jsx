import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Pie, Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, LineElement, PointElement, LinearScale, CategoryScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import './Analytics.css';

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
      const filters = { user_id: null }; // Get overall data
      
      const suggestionRes = await axios.post('http://localhost:8000/analytics/suggestions', filters);
      setSuggestionData(suggestionRes.data);

      const trendRes = await axios.post('http://localhost:8000/analytics/trends', filters);
      setTrendData(trendRes.data);

      const accuracyRes = await axios.post('http://localhost:8000/analytics/detection-accuracy', filters);
      setDetectionAccuracy(accuracyRes.data);

      const latencyRes = await axios.post('http://localhost:8000/analytics/latency', filters);
      setLatencyData(latencyRes.data);

      const effectivenessRes = await axios.post('http://localhost:8000/analytics/learning-effectiveness', filters);
      setLearningEffectivenessData(effectivenessRes.data);

      const errorTypesRes = await axios.post('http://localhost:8000/analytics/error-types', filters);
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
      
      const suggestionRes = await axios.post('http://localhost:8000/analytics/suggestions', filters);
      const trendRes = await axios.post('http://localhost:8000/analytics/trends', filters);
      const accuracyRes = await axios.post('http://localhost:8000/analytics/detection-accuracy', filters);
      const latencyRes = await axios.post('http://localhost:8000/analytics/latency', filters);
      const effectivenessRes = await axios.post('http://localhost:8000/analytics/learning-effectiveness', filters);
      const errorTypesRes = await axios.post('http://localhost:8000/analytics/error-types', filters);

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

  const pieChartData = {
    labels: ['Accepted', 'Rejected', 'Modified'],
    datasets: [
      {
        data: [suggestionData.accepted, suggestionData.rejected, suggestionData.modified],
        backgroundColor: ['#36A2EB', '#FF6384', '#FFCE56'],
        hoverBackgroundColor: ['#36A2EB', '#FF6384', '#FFCE56'],
      },
    ],
  };

  const developerSuggestionChartData = {
    labels: suggestionData.developer_stats.map(d => d.username),
    datasets: [
      {
        label: 'Accepted',
        data: suggestionData.developer_stats.map(d => d.accepted),
        backgroundColor: '#36A2EB',
      },
      {
        label: 'Rejected',
        data: suggestionData.developer_stats.map(d => d.rejected),
        backgroundColor: '#FF6384',
      },
      {
        label: 'Modified',
        data: suggestionData.developer_stats.map(d => d.modified),
        backgroundColor: '#FFCE56',
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

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
    },
  };

  const handleLogout = () => {
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
    navigate('/');
  };

  if (isLoading) {
    return <div className="analytics-page"><div>Loading...</div></div>;
  }

  if (userRole !== 'admin') {
    return <div className="analytics-page"><div>Access restricted to admins.</div></div>;
  }

  if (error) {
    return <div className="analytics-page"><p className="error-message">{error}</p></div>;
  }

  return (
    <div className="analytics-page">
      <div className="star-container">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="star"></div>
        ))}
      </div>
      <nav className="navbar">
        <div className="logo">CodeReview.</div>
        <ul className="nav-links">
          <li><Link to="/" onClick={handleLogout}>LOGOUT</Link></li>
        </ul>
      </nav>
      
      <div className="analytics-container">
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
              <div className="developers-grid">
                {developers.map(dev => (
                  <div key={dev.id} className="developer-card">
                    <h3>{dev.username}</h3>
                    <p>User ID: {dev.id}</p>
                    <p>Joined: {new Date(dev.created_at).toLocaleDateString()}</p>
                    <button 
                      className="view-analytics-btn"
                      onClick={() => handleViewDeveloper(dev)}
                    >
                      View Analytics
                    </button>
                  </div>
                ))}
              </div>
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
                {viewMode === 'overall' ? 'Overall Analytics' : `Analytics for ${selectedDeveloper.username}`}
              </h2>
            </div>

            <div className="top-charts">
              <div className="chart-card">
                <h2>Suggestion Breakdown</h2>
                <div style={{ height: '300px' }}>
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

              {viewMode === 'overall' && (
                <div className="chart-card">
                  <h2>Developer Suggestions Comparison</h2>
                  <div style={{ height: '300px' }}>
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
            </div>

            {viewMode === 'overall' && (
              <div className="bottom-charts">
                <div className="chart-card">
                  <h2>Developer Detection Accuracy</h2>
                  <div style={{ height: '300px' }}>
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
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;