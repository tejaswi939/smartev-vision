/* ═══════════════════════════════════════════════════════
   SmartEV Vision — Dashboard Charts (Plotly)
   ═══════════════════════════════════════════════════════ */

// ── Plotly Theme Config ──
const plotlyDarkTheme = {
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: {
        color: '#8888a0',
        family: 'Inter, sans-serif',
        size: 12
    },
    margin: { l: 50, r: 30, t: 30, b: 50 },
    xaxis: {
        gridcolor: 'rgba(255, 255, 255, 0.04)',
        zerolinecolor: 'rgba(255, 255, 255, 0.06)',
        linecolor: 'rgba(255, 255, 255, 0.06)'
    },
    yaxis: {
        gridcolor: 'rgba(255, 255, 255, 0.04)',
        zerolinecolor: 'rgba(255, 255, 255, 0.06)',
        linecolor: 'rgba(255, 255, 255, 0.06)'
    },
    hoverlabel: {
        bgcolor: '#1a1a2e',
        bordercolor: 'rgba(0, 212, 255, 0.3)',
        font: { color: '#f0f0f5', family: 'Inter', size: 13 }
    }
};

const plotlyConfig = {
    responsive: true,
    displayModeBar: false
};

// Accent color palette
const accentColors = ['#00d4ff', '#00ff88', '#a855f7', '#ff006e', '#ffc107', '#06d6a0', '#4cc9f0', '#e76f51'];

/**
 * Fetch dashboard statistics from the API
 */
async function fetchDashboardStats() {
    try {
        const data = await apiCall('/api/dashboard/stats');
        if (data) {
            // Update stat cards with animated counters
            const totalUsersEl = document.getElementById('statTotalUsers');
            const totalSessionsEl = document.getElementById('statTotalSessions');
            const avgEngagementEl = document.getElementById('statAvgEngagement');
            const topModelEl = document.getElementById('statTopModel');

            if (totalUsersEl) animateCounter(totalUsersEl, data.total_users || 0);
            if (totalSessionsEl) animateCounter(totalSessionsEl, data.total_sessions || 0);
            if (avgEngagementEl) animateCounter(avgEngagementEl, data.average_engagement_score || 0, 1500, '%');
            if (topModelEl) topModelEl.textContent = data.most_viewed_ev_model || '—';
        }
        return data;
    } catch (error) {
        console.warn('[Dashboard] Stats fetch failed, using demo data');
        // Fallback demo data
        useDemoStats();
        return null;
    }
}

/**
 * Populate stats with demo data when API is unavailable
 */
function useDemoStats() {
    const totalUsersEl = document.getElementById('statTotalUsers');
    const totalSessionsEl = document.getElementById('statTotalSessions');
    const avgEngagementEl = document.getElementById('statAvgEngagement');
    const topModelEl = document.getElementById('statTopModel');

    if (totalUsersEl) animateCounter(totalUsersEl, 247);
    if (totalSessionsEl) animateCounter(totalSessionsEl, 1034);
    if (avgEngagementEl) animateCounter(avgEngagementEl, 78, 1500, '%');
    if (topModelEl) topModelEl.textContent = 'Tesla Model S';
}

/**
 * Render Model Popularity Pie Chart
 * @param {object} data - { labels: [], values: [] }
 */
function renderModelPieChart(data) {
    const labels = data?.labels || ['Tesla Model S', 'BMW iX', 'Porsche Taycan', 'Mercedes EQS', 'Audi e-tron', 'Hyundai Ioniq 5'];
    const values = data?.values || [28, 22, 18, 15, 10, 7];

    const trace = {
        type: 'pie',
        labels: labels,
        values: values,
        hole: 0.55,
        marker: {
            colors: accentColors.slice(0, labels.length),
            line: { color: '#0a0a0f', width: 2 }
        },
        textinfo: 'percent',
        textfont: { color: '#f0f0f5', size: 12 },
        hoverinfo: 'label+value+percent',
        pull: [0.03, 0, 0, 0, 0, 0],
        sort: false
    };

    const layout = {
        ...plotlyDarkTheme,
        margin: { l: 20, r: 20, t: 20, b: 20 },
        showlegend: true,
        legend: {
            font: { color: '#8888a0', size: 11 },
            bgcolor: 'transparent',
            borderwidth: 0,
            orientation: 'v',
            x: 1.05,
            y: 0.5
        },
        annotations: [{
            text: '<b>Models</b>',
            showarrow: false,
            font: { size: 16, color: '#f0f0f5', family: 'Inter' },
            x: 0.5,
            y: 0.5
        }]
    };

    Plotly.newPlot('modelPieChart', [trace], layout, plotlyConfig);
}

/**
 * Render Component Attention Bar Chart
 * @param {object} data - { components: [], attention_time: [] }
 */
function renderAttentionBarChart(data) {
    let components, times;
    if (data && Array.isArray(data)) {
        components = data.map(c => c.component);
        times = data.map(c => c.total_duration);
    } else {
        components = data?.components || ['Body Design', 'Dashboard', 'Headlights', 'Wheels', 'Interior', 'Charging Port', 'Trunk', 'Logo'];
        times = data?.attention_time || [45, 38, 32, 28, 24, 15, 12, 8];
    }

    const trace = {
        type: 'bar',
        x: components,
        y: times,
        marker: {
            color: times.map((v, i) => accentColors[i % accentColors.length]),
            line: { width: 0 },
            opacity: 0.85
        },
        hovertemplate: '<b>%{x}</b><br>Avg. Attention: %{y}s<extra></extra>'
    };

    const layout = {
        ...plotlyDarkTheme,
        xaxis: {
            ...plotlyDarkTheme.xaxis,
            tickangle: -35,
            tickfont: { size: 11 }
        },
        yaxis: {
            ...plotlyDarkTheme.yaxis,
            title: { text: 'Avg. Attention (seconds)', font: { size: 12 } }
        },
        bargap: 0.3
    };

    Plotly.newPlot('attentionBarChart', [trace], layout, plotlyConfig);
}

/**
 * Render Session Timeline (line chart)
 * @param {object} data - { dates: [], counts: [] }
 */
function renderSessionTimeline(data) {
    // Generate demo data if not provided
    const dates = data?.dates || generateDemoDates(30);
    const counts = data?.counts || generateDemoValues(30, 5, 25);

    const trace = {
        type: 'scatter',
        mode: 'lines+markers',
        x: dates,
        y: counts,
        line: {
            color: '#00d4ff',
            width: 2.5,
            shape: 'spline',
            smoothing: 1.3
        },
        marker: {
            color: '#00d4ff',
            size: 5,
            line: { color: '#0a0a0f', width: 1.5 }
        },
        fill: 'tozeroy',
        fillcolor: 'rgba(0, 212, 255, 0.06)',
        hovertemplate: '<b>%{x}</b><br>Sessions: %{y}<extra></extra>'
    };

    const layout = {
        ...plotlyDarkTheme,
        xaxis: {
            ...plotlyDarkTheme.xaxis,
            title: { text: 'Date', font: { size: 12 } },
            tickformat: '%b %d',
            tickangle: -30,
            tickfont: { size: 10 }
        },
        yaxis: {
            ...plotlyDarkTheme.yaxis,
            title: { text: 'Sessions', font: { size: 12 } }
        }
    };

    Plotly.newPlot('sessionTimelineChart', [trace], layout, plotlyConfig);
}

/**
 * Render heatmap for a specific session
 * @param {string} sessionId - Session ID
 */
async function renderHeatmap(sessionId) {
    const viewer = document.getElementById('heatmapViewer');
    if (!sessionId || !viewer) return;

    viewer.innerHTML = `
        <div class="heatmap-placeholder">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--accent-blue);"></i>
            <p style="margin-top: 1rem;">Loading heatmap...</p>
        </div>
    `;

    try {
        const data = await apiCall(`/api/sessions/${sessionId}/heatmap`);
        if (data && data.heatmap_url) {
            viewer.innerHTML = `<img src="${data.heatmap_url}" alt="Gaze Heatmap — Session ${sessionId}">`;
        } else {
            throw new Error('No heatmap data');
        }
    } catch (error) {
        // Show a placeholder with a simulated heatmap
        viewer.innerHTML = `
            <div class="heatmap-placeholder">
                <i class="fas fa-fire-flame-curved"></i>
                <p>Heatmap for session <strong style="color: var(--accent-blue);">#${sessionId}</strong></p>
                <p style="font-size: 0.78rem; margin-top: 0.5rem;">Connect backend to view real heatmap data</p>
            </div>
        `;
    }
}

/**
 * Load and populate the sessions table
 */
async function loadSessionTable() {
    const tbody = document.getElementById('sessionsTableBody');
    if (!tbody) return;

    try {
        const data = await apiCall('/api/sessions');
        if (data && data.sessions && data.sessions.length > 0) {
            populateSessionTable(data.sessions);
            populateHeatmapSelector(data.sessions);
        } else {
            throw new Error('No sessions');
        }
    } catch (error) {
        console.warn('[Dashboard] Sessions fetch failed, using demo data');
        const demoSessions = generateDemoSessions();
        populateSessionTable(demoSessions);
        populateHeatmapSelector(demoSessions);
    }
}

/**
 * Populate session table rows
 * @param {Array} sessions
 */
function populateSessionTable(sessions) {
    const tbody = document.getElementById('sessionsTableBody');
    if (!tbody) return;

    tbody.innerHTML = sessions.map(session => {
        const userName = session.user ? session.user.name : (session.user_name || 'Unknown');
        const evModel = session.ev_model || (session.model_name || '—');
        const engagement = session.engagement_score !== undefined ? Math.round(session.engagement_score) : (session.engagement || 0);
        const startTime = session.start_time || session.created_at;
        const engClass = engagement >= 80 ? 'high' : engagement >= 50 ? 'medium' : 'low';
        
        return `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <span style="width:30px;height:30px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;background:linear-gradient(135deg,rgba(0,212,255,0.15),rgba(0,255,136,0.08));color:var(--accent-blue);margin-right:0.5rem;flex-shrink:0;">
                            ${(userName || 'U').charAt(0).toUpperCase()}
                        </span>
                        ${userName}
                    </div>
                </td>
                <td>${evModel}</td>
                <td>${formatDuration(session.duration)}</td>
                <td>
                    <span class="engagement-pill ${engClass}">
                        <i class="fas fa-circle" style="font-size:0.45rem;"></i>
                        ${engagement}%
                    </span>
                </td>
                <td>
                    <span class="badge-glow badge-${engagement >= 70 ? 'green' : 'purple'}">
                        ${session.prediction || 'Pending'}
                    </span>
                </td>
                <td style="font-size:0.85rem; color:var(--text-secondary);">${formatDate(startTime)}</td>
                <td>
                    <a href="/sessions/${session.id}/report" class="table-action-btn view-report">
                        <i class="fas fa-file-lines"></i> Report
                    </a>
                    <button class="table-action-btn view-heatmap" onclick="renderHeatmap('${session.id}')">
                        <i class="fas fa-fire-flame-curved"></i> Heatmap
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Populate heatmap session selector dropdown
 */
function populateHeatmapSelector(sessions) {
    const select = document.getElementById('heatmapModelSelect');
    if (!select) return;

    select.innerHTML = '<option value="" disabled selected>Select a session...</option>';
    sessions.forEach(session => {
        const option = document.createElement('option');
        option.value = session.id;
        const name = session.user ? session.user.name : (session.user_name || 'Unknown');
        const model = session.ev_model || (session.model_name || '—');
        option.textContent = `${name} — ${model}`;
        select.appendChild(option);
    });
}

/**
 * Initialize the entire dashboard
 */
async function initDashboard() {
    const data = await fetchDashboardStats();
    if (data) {
        renderModelPieChart(data.model_popularity);
        renderAttentionBarChart(data.top_components);
        renderSessionTimeline(data.sessions_over_time);
    } else {
        renderModelPieChart();
        renderAttentionBarChart();
        renderSessionTimeline();
    }
    loadSessionTable();
}

/* ══════════════════════════════════
   DEMO DATA GENERATORS
   ══════════════════════════════════ */

function generateDemoDates(count) {
    const dates = [];
    const now = new Date();
    for (let i = count - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
}

function generateDemoValues(count, min, max) {
    return Array.from({ length: count }, () =>
        Math.floor(Math.random() * (max - min + 1)) + min
    );
}

function generateDemoSessions() {
    const users = ['John Doe', 'Alice Smith', 'Raj Kumar', 'Maria Garcia', 'Chen Wei', 'Fatima Al-Hassan', 'Liam O\'Brien', 'Yuki Tanaka'];
    const models = ['Tesla Model S', 'BMW iX', 'Porsche Taycan', 'Mercedes EQS', 'Audi e-tron GT', 'Hyundai Ioniq 5'];
    const predictions = ['Tesla Model S', 'BMW iX', 'Porsche Taycan', 'Mercedes EQS', 'Audi e-tron GT', 'Hyundai Ioniq 5'];

    return Array.from({ length: 10 }, (_, i) => {
        const now = new Date();
        now.setHours(now.getHours() - Math.floor(Math.random() * 168));
        return {
            id: i + 1,
            user_name: users[Math.floor(Math.random() * users.length)],
            model_name: models[Math.floor(Math.random() * models.length)],
            duration: Math.floor(Math.random() * 400) + 60,
            engagement: Math.floor(Math.random() * 45) + 55,
            prediction: predictions[Math.floor(Math.random() * predictions.length)],
            created_at: now.toISOString()
        };
    });
}
