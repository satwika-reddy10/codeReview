import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Pie, Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, LineElement, PointElement, LinearScale, CategoryScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import './Analytics.css';

ChartJS.register(ArcElement, LineElement, PointElement, LinearScale, CategoryScale, BarElement, Title, Tooltip, Legend);

const AdminDashboard = () => {
  const navigate = useNavigate();
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
  const [productivityData, setProductivityData] = useState({
    developer_productivity: [],
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
  const [selectedDeveloper, setSelectedDeveloper] = useState(null);

  useEffect(() => {
    const storedRole = localStorage.getItem('user_role');
    setUserRole(storedRole);

    if (storedRole !== 'admin') {
      navigate('/submit');
      return;
    }

    const fetchData = async () => {
      try {
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

        const productivityRes = await axios.post('http://localhost:8000/analytics/productivity', filters);
        setProductivityData(productivityRes.data);

        setError(null);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError('Failed to load analytics data. Please try again.');
        setIsLoading(false);
      }
    };

    fetchData();
  }, [filters, navigate]);

  const handleDeveloperAnalytics = (user_id) => {
    setSelectedDeveloper(user_id);
    setFilters({ ...filters, user_id });
  };

  const handleOverallAnalytics = () => {
    setSelectedDeveloper(null);
    setFilters({ ...filters, user_id: null });
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: function (context) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = suggestionData.accepted + suggestionData.rejected + suggestionData.modified;
            const percentage = total ? ((value / total) * 100).toFixed(1) : 0;
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
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

  const lineChartData = {
    labels: trendData.accepted.map(d => d.date),
    datasets: [
      {
        label: 'Accepted',
        data: trendData.accepted.map(d => d.count),
        borderColor: '#36A2EB',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        fill: true,
      },
      {
        label: 'Rejected',
        data: trendData.rejected.map(d => d.count),
        borderColor: '#FF6384',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        fill: true,
      },
      {
        label: 'Modified',
        data: trendData.modified.map(d => d.count),
        borderColor: '#FFCE56',
        backgroundColor: 'rgba(255, 206, 86, 0.2)',
        fill: true,
      },
    ],
  };

  const developerAccuracyChartData = {
    labels: detectionAccuracy.developer_accuracy.map(d => d.username),
    datasets: [
      {
        label: 'Accuracy (%)',
        data: detectionAccuracy.developer_accuracy.map(d => d.accuracy),
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: '#4BC0C0',
        borderWidth: 1,
      },
    ],
  };

  const developerErrorTypesChartData = {
    labels: errorTypesData.developer_error_types.map(d => d.username),
    datasets: [
      {
        label: 'High Severity',
        data: errorTypesData.developer_error_types.map(d => (d.error_types.find(e => e.severity === 'High') || { count: 0 }).count),
        backgroundColor: '#FF6384',
      },
      {
        label: 'Medium Severity',
        data: errorTypesData.developer_error_types.map(d => (d.error_types.find(e => e.severity === 'Medium') || { count: 0 }).count),
        backgroundColor: '#36A2EB',
      },
      {
        label: 'Low Severity',
        data: errorTypesData.developer_error_types.map(d => (d.error_types.find(e => e.severity === 'Low') || { count: 0 }).count),
        backgroundColor: '#FFCE56',
      },
    ],
  };

  const productivityChartData = {
    labels: productivityData.developer_productivity.map(d => d.username),
    datasets: [
      {
        label: 'Code Sessions',
        data: productivityData.developer_productivity.map(d => d.sessions),
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        borderColor: '#9966FF',
        borderWidth: 1,
      },
      {
        label: 'Tasks Completed',
        data: productivityData.developer_productivity.map(d => d.tasks_completed),
        backgroundColor: 'rgba(255, 159, 64, 0.2)',
        borderColor: '#FF9F40',
        borderWidth: 1,
      },
    ],
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="analytics-container">
      <div className="sidebar">
        <div className="sidebar-content">
          <h2>Navigation</h2>
          <ul>
            <li><Link to="/submit">Submit Code</Link></li>
            <li><Link to="/analytics">Analytics</Link></li>
            <li><Link to="/admin-dashboard">Admin Dashboard</Link></li>
            <li><Link to="/login">Logout</Link></li>
          </ul>
        </div>
      </div>
      <div className="main-content">
        <h1>Admin Dashboard</h1>
        {error && <div className="error-message">{error}</div>}
        <div className="developer-list">
          <h2>Developers</h2>
          <button onClick={handleOverallAnalytics} className="overall-analytics-btn">
            View Overall Analytics
          </button>
          <ul>
            {suggestionData.developer_stats.map(dev => (
              <li key={dev.user_id}>
                {dev.username}
                <button onClick={() => handleDeveloperAnalytics(dev.user_id)}>
                  View Analytics
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="charts-container">
          <div className="top-charts">
            <div className="chart-card">
              <h2>Suggestion Distribution {selectedDeveloper ? `for ${suggestionData.developer_stats.find(d => d.user_id === selectedDeveloper)?.username}` : '(Overall)'}</h2>
              <div style={{ height: '300px' }}>
                <Pie
                  data={pieChartData}
                  options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      title: { display: true, text: 'Suggestion Distribution' },
                    },
                  }}
                />
                <div className="chart-stats">
                  <p>Acceptance Rate: {suggestionData.percentages.accepted.toFixed(1)}%</p>
                  <p>Rejection Rate: {suggestionData.percentages.rejected.toFixed(1)}%</p>
                  <p>Modification Rate: {suggestionData.percentages.modified.toFixed(1)}%</p>
                </div>
              </div>
            </div>
            <div className="chart-card">
              <h2>Suggestions Over Time {selectedDeveloper ? `for ${suggestionData.developer_stats.find(d => d.user_id === selectedDeveloper)?.username}` : '(Overall)'}</h2>
              <Line
                data={lineChartData}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    title: { display: true, text: 'Suggestion Trends' },
                  },
                  scales: {
                    x: { title: { display: true, text: 'Date' } },
                    y: { title: { display: true, text: 'Number of Suggestions' } },
                  },
                }}
              />
            </div>
          </div>
          <div className="bottom-charts">
            <div className="chart-card">
              <h2>Performance Latency</h2>
              <Line
                data={{
                  labels: latencyData.overall_latency.map(d => d.date),
                  datasets: [
                    {
                      label: 'Average Latency (ms)',
                      data: latencyData.overall_latency.map(d => d.avg_latency),
                      borderColor: '#9966FF',
                      backgroundColor: 'rgba(153, 102, 255, 0.2)',
                      fill: true,
                    },
                  ],
                }}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    title: { display: true, text: 'Average Latency Over Time' },
                  },
                  scales: {
                    x: { title: { display: true, text: 'Date' } },
                    y: { title: { display: true, text: 'Latency (ms)' } },
                  },
                }}
              />
            </div>
            <div className="chart-card">
              <h2>Developer Productivity</h2>
              <Bar
                data={productivityChartData}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    title: { display: true, text: 'Developer Productivity' },
                  },
                  scales: {
                    x: { title: { display: true, text: 'Developer' } },
                    y: { title: { display: true, text: 'Count' } },
                  },
                }}
              />
            </div>
            <div className="chart-card">
              <h2>Detection Accuracy by Developer</h2>
              <Bar
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
            <div className="chart-card">
              <h2>Developer Error Types</h2>
              <div style={{ height: '300px' }}>
                <Bar
                  data={developerErrorTypesChartData}
                  options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      title: { display: true, text: 'Error Types by Developer' },
                    },
                    scales: {
                      x: { title: { display: true, text: 'Developer' } },
                      y: { title: { display: true, text: 'Number of Errors' } },
                    },
                  }}
                />
              </div>
            </div>
            <div className="chart-card">
              <h2>Learning Effectiveness</h2>
              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {learningEffectivenessData.developer_effectiveness.map((dev, index) => (
                  <div key={index} style={{ marginBottom: '30px' }}>
                    <h3>{dev.username}</h3>
                    <div style={{ height: '250px' }}>
                      <Line
                        data={{
                          labels: dev.effectiveness.map(d => d.date),
                          datasets: [
                            {
                              label: 'Effectiveness (%)',
                              data: dev.effectiveness.map(d => d.effectiveness),
                              borderColor: '#9966FF',
                              backgroundColor: 'rgba(153, 102, 255, 0.2)',
                              fill: true,
                            },
                          ],
                        }}
                        options={{
                          ...chartOptions,
                          plugins: {
                            ...chartOptions.plugins,
                            title: { display: true, text: `Learning Effectiveness for ${dev.username}` },
                          },
                          scales: {
                            x: { title: { display: true, text: 'Date' } },
                            y: { title: { display: true, text: 'Effectiveness (%)' } },
                          },
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;