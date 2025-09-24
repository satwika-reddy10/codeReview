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
  const [filters, setFilters] = useState({
    user_id: null, // Replace with actual user ID from auth context
    language: '',
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
  }, [filters]);

  // Pie chart data
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

  // Line chart data
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

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  // Language options matching server.py
  const languageOptions = [
    { value: '', label: 'All Languages' },
    { value: 'python', label: 'Python' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
    { value: 'csharp', label: 'C#' },
    { value: 'php', label: 'PHP' },
  ];

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
            <Link to="/submit">SUBMIT CODE</Link>
          </li>
          <li>
            <Link to="/analytics">ANALYTICS</Link>
          </li>
        </ul>
      </nav>

      <div className="analytics-container">
        <h1>Analytics Dashboard</h1>
        {error && <div className="error-message">{error}</div>}

        <div className="filter-section">
          <select
            name="language"
            value={filters.language}
            onChange={handleFilterChange}
            className="language-dropdown"
          >
            {languageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="chart-section">
          <div className="chart-card">
            <h2>Suggestion Breakdown</h2>
            <Pie
              data={pieChartData}
              options={{
                responsive: true,
                plugins: {
                  legend: { position: 'top' },
                  title: { display: true, text: 'Suggestion Status Distribution' },
                },
              }}
            />
            <div className="chart-stats">
              <p>Accepted: {suggestionData.percentages.accepted.toFixed(1)}%</p>
              <p>Rejected: {suggestionData.percentages.rejected.toFixed(1)}%</p>
              <p>Modified: {suggestionData.percentages.modified.toFixed(1)}%</p>
            </div>
          </div>

          <div className="chart-card">
            <h2>Suggestions Over Time</h2>
            <Line
              data={lineChartData}
              options={{
                responsive: true,
                plugins: {
                  legend: { position: 'top' },
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
      </div>
    </div>
  );
};

export default Analytics;