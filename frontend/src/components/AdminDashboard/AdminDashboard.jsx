import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Pie, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from 'chart.js';
import './AdminDashboard.css';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

const AdminDashboard = () => {
  const [suggestionData, setSuggestionData] = useState({
    accepted: 0,
    rejected: 0,
    modified: 0,
    percentages: { accepted: 0, rejected: 0, modified: 0 },
  });
  const [errorTypes, setErrorTypes] = useState([]);
  const [developerPerformance, setDeveloperPerformance] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch suggestion stats for all developers
    axios
      .post('http://localhost:8000/analytics/suggestions', {})
      .then((res) => {
        setSuggestionData(res.data);
        setError(null);
      })
      .catch((err) => {
        console.error('Error fetching suggestion data:', err);
        setError('Failed to load suggestion data.');
      });

    // Fetch error types
    axios
      .post('http://localhost:8000/analytics/error-types', {})
      .then((res) => {
        setErrorTypes(res.data);
        setError(null);
      })
      .catch((err) => {
        console.error('Error fetching error types:', err);
        setError('Failed to load error types.');
      });

    // Fetch developer performance
    axios
      .post('http://localhost:8000/analytics/developer-performance', {})
      .then((res) => {
        setDeveloperPerformance(res.data);
        setError(null);
      })
      .catch((err) => {
        console.error('Error fetching developer performance:', err);
        setError('Failed to load developer performance.');
      });
  }, []);

  const pieChartData = {
    labels: ['Accepted', 'Rejected', 'Modified'],
    datasets: [
      {
        data: [suggestionData.accepted, suggestionData.rejected, suggestionData.modified],
        backgroundColor: ['#4CAF50', '#F44336', '#FF9800'],
        borderColor: '#ffffff',
        borderWidth: 1,
      },
    ],
  };

  const errorChartData = {
    labels: errorTypes.map(item => item.severity),
    datasets: [
      {
        label: 'Error Count',
        data: errorTypes.map(item => item.count),
        backgroundColor: '#2196F3',
        borderColor: '#1976D2',
        borderWidth: 1,
      },
    ],
  };

  const performanceChartData = {
    labels: developerPerformance.map(item => item.username),
    datasets: [
      {
        label: 'Accepted Suggestions',
        data: developerPerformance.map(item => item.accepted_count),
        backgroundColor: '#4CAF50',
        borderColor: '#388E3C',
        borderWidth: 1,
      },
      {
        label: 'Modified Suggestions',
        data: developerPerformance.map(item => item.modified_count),
        backgroundColor: '#FF9800',
        borderColor: '#F57C00',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      tooltip: { enabled: true },
    },
  };

  return (
    <div className="admin-dashboard">
      <nav className="navbar">
        <div className="logo">CodeReview Admin</div>
        <ul className="nav-links">
          <li><Link to="/">HOME</Link></li>
          <li><Link to="/login">LOGOUT</Link></li>
        </ul>
      </nav>
      <div className="dashboard-container">
        <h1>Admin Dashboard</h1>
        {error && <p className="error">{error}</p>}
        <div className="charts">
          <div className="chart-card">
            <h2>Suggestion Breakdown</h2>
            <Pie
              data={pieChartData}
              options={{
                ...chartOptions,
                plugins: {
                  ...chartOptions.plugins,
                  title: { display: true, text: 'Suggestion Status Distribution' },
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
            <h2>Error Types</h2>
            <Bar
              data={errorChartData}
              options={{
                ...chartOptions,
                plugins: {
                  ...chartOptions.plugins,
                  title: { display: true, text: 'Error Severity Distribution' },
                },
                scales: {
                  x: { title: { display: true, text: 'Severity' } },
                  y: { title: { display: true, text: 'Count' } },
                },
              }}
            />
          </div>
          <div className="chart-card">
            <h2>Developer Performance</h2>
            <Bar
              data={performanceChartData}
              options={{
                ...chartOptions,
                plugins: {
                  ...chartOptions.plugins,
                  title: { display: true, text: 'Developer Task Completion' },
                },
                scales: {
                  x: { title: { display: true, text: 'Developer' } },
                  y: { title: { display: true, text: 'Tasks Completed' } },
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;