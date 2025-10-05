import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Pie, Line } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, LineElement, PointElement, LinearScale, CategoryScale, Title, Tooltip, Legend } from 'chart.js';
import './Analytics.css';

ChartJS.register(ArcElement, LineElement, PointElement, LinearScale, CategoryScale, Title, Tooltip, Legend);

const Analytics = () => {
  const [suggestionData, setSuggestionData] = useState({
    accepted: 0,
    rejected: 0,
    modified: 0,
    percentages: { accepted: 0, rejected: 0, modified: 0 },
  });
  const [trendData, setTrendData] = useState({ accepted: [], rejected: [], modified: [] });
  const [detectionAccuracy, setDetectionAccuracy] = useState(0);
  const [latencyData, setLatencyData] = useState([]);
  const [learningEffectivenessData, setLearningEffectivenessData] = useState([]);
  const [filters, setFilters] = useState({
    user_id: null, // Replace with actual user ID from auth context
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch suggestion counts
    axios
      .post('http://localhost:8000/analytics/suggestions', filters)
      .then((res) => {
        setSuggestionData(res.data);
        setError(null);
      })
      .catch((err) => {
        console.error('Error fetching suggestion data:', err);
        setError('Failed to load suggestion data. Please try again.');
      });

    // Fetch trend data
    axios
      .post('http://localhost:8000/analytics/trends', filters)
      .then((res) => {
        setTrendData(res.data);
        setError(null);
      })
      .catch((err) => {
        console.error('Error fetching trend data:', err);
        setError('Failed to load trend data. Please try again.');
      });

    // Fetch detection accuracy
    axios
      .post('http://localhost:8000/analytics/detection-accuracy', filters)
      .then((res) => {
        setDetectionAccuracy(res.data.accuracy);
        setError(null);
      })
      .catch((err) => {
        console.error('Error fetching detection accuracy:', err);
        setError('Failed to load detection accuracy. Please try again.');
      });

    // Fetch latency data
    axios
      .post('http://localhost:8000/analytics/latency', filters)
      .then((res) => {
        setLatencyData(res.data);
        setError(null);
      })
      .catch((err) => {
        console.error('Error fetching latency data:', err);
        setError('Failed to load latency data. Please try again.');
      });

    // Fetch learning effectiveness data
    axios
      .post('http://localhost:8000/analytics/learning-effectiveness', filters)
      .then((res) => {
        setLearningEffectivenessData(res.data);
        setError(null);
      })
      .catch((err) => {
        console.error('Error fetching learning effectiveness data:', err);
        setError('Failed to load learning effectiveness data. Please try again.');
      });
  }, [filters]);

  // Pie chart data for suggestion breakdown
  const pieChartData = {
    labels: ['Acceptance Rate', 'Rejection Rate', 'Modification Rate'],
    datasets: [
      {
        data: [suggestionData.accepted, suggestionData.rejected, suggestionData.modified],
        backgroundColor: ['#4CAF50', '#F44336', '#FF9800'],
        borderColor: '#ffffff',
        borderWidth: 1,
      },
    ],
  };

  // Line chart data for suggestion trends
  const lineChartData = {
    labels: trendData.accepted?.map((item) => item.date) || [],
    datasets: [
      {
        label: 'Accepted Suggestions',
        data: trendData.accepted?.map((item) => item.count) || [],
        borderColor: '#4CAF50',
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
        fill: true,
      },
      {
        label: 'Rejected Suggestions',
        data: trendData.rejected?.map((item) => item.count) || [],
        borderColor: '#F44336',
        backgroundColor: 'rgba(244, 67, 54, 0.2)',
        fill: true,
      },
      {
        label: 'Modified Suggestions',
        data: trendData.modified?.map((item) => item.count) || [],
        borderColor: '#FF9800',
        backgroundColor: 'rgba(255, 152, 0, 0.2)',
        fill: true,
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
        backgroundColor: 'rgba(33, 150, 243, 0.2)',
        fill: true,
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
        backgroundColor: 'rgba(156, 39, 176, 0.2)',
        fill: true,
      },
    ],
  };

  // Common chart options to control size and prevent overflow
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1.5,
    plugins: {
      legend: { position: 'top' },
    },
  };

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
          <li>
            <Link to="/">LOGOUT</Link>
          </li>
          <li>
            <Link to="/submit">SUBMIT CODE</Link>
          </li>
        </ul>
      </nav>

      <div className="analytics-container">
        <h1>Analytics Dashboard</h1>
        {error && <div className="error-message">{error}</div>}

        <div className="chart-section">
          <div className="chart-card detection-accuracy">
            <h2>Detection Accuracy</h2>
            <div className="metric-display">
              <p>{detectionAccuracy.toFixed(1)}%</p>
              <span>Percentage of relevant suggestions (Accepted + Modified)</span>
            </div>
          </div>

          <div className="top-charts">
            <div className="chart-card">
              <h2>Suggestion Breakdown</h2>
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
              <div className="chart-stats">
                <p>Acceptance Rate: {suggestionData.percentages.accepted.toFixed(1)}%</p>
                <p>Rejection Rate: {suggestionData.percentages.rejected.toFixed(1)}%</p>
                <p>Modification Rate: {suggestionData.percentages.modified.toFixed(1)}%</p>
              </div>
            </div>

            <div className="chart-card">
              <h2>Suggestions Over Time</h2>
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
                data={latencyChartData}
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
              <h2>Learning Effectiveness</h2>
              <Line
                data={learningEffectivenessChartData}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    title: { display: true, text: 'Learning Effectiveness Over Time' },
                  },
                  scales: {
                    x: { title: { display: true, text: 'Date' } },
                    y: { title: { display: true, text: 'Effectiveness (%)' } },
                  },
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;