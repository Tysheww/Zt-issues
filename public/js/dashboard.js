import { state } from './state.js';
import { escapeHTML, normalizeCategory } from './utils.js';
import { NORMALIZED_CATEGORIES, CATEGORY_COLORS } from './config.js';
import { fetchIssues } from './issues.js';

export async function initWelcomeChart() {
    const ctx = document.getElementById('welcomeChart');
    const chartContainer = document.querySelector('.chart-container');

    const issues = await fetchIssues();

    const resolvedText = document.getElementById('resolved-text');
    const totalText = document.getElementById('total-text');
    const progress = document.getElementById('resolved-progress');

    if (!resolvedText || !totalText || !progress) return;

    if (issues.length === 0) {
        resolvedText.innerText = "0 вирішено";
        totalText.innerText = "з 0 загалом (0%)";
        progress.style.width = "0%";

        if (chartContainer) chartContainer.style.display = 'none';
        return;
    }

    const resolvedCount = issues.filter(i => i.status === 'done').length;
    const totalCount = issues.length;
    const percentage = Math.round((resolvedCount / totalCount) * 100);

    resolvedText.innerText = `${resolvedCount} вирішено`;
    totalText.innerText = `з ${totalCount} загалом (${percentage}%)`;

    setTimeout(() => {
        progress.style.width = `${percentage}%`;
    }, 300);

    if (!ctx) return;

    if (chartContainer) chartContainer.style.display = 'block';
    if (state.welcomeChartInstance) state.welcomeChartInstance.destroy();

    const categoryCounts = {};

    NORMALIZED_CATEGORIES.forEach(category => {
        categoryCounts[category] = 0;
    });

    issues.forEach(issue => {
        const category = normalizeCategory(issue.category);
        categoryCounts[category]++;
    });

    const labels = Object.keys(categoryCounts).filter(key => categoryCounts[key] > 0);
    const data = labels.map(key => categoryCounts[key]);
    const colors = labels.map(key => CATEGORY_COLORS[key] || "#64748B");

    try {
        state.welcomeChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors,
                    borderColor: "#FFFFFF",
                    borderWidth: 2,
                    hoverOffset: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            boxWidth: 12,
                            padding: 14,
                            color: "#334155",
                            font: {
                                size: 12,
                                family: "'Montserrat', sans-serif",
                                weight: '600'
                            }
                        }
                    }
                },
                cutout: '68%'
            }
        });
    } catch (e) {
        console.error("Помилка генерації графіка:", e);
    }
}

export function updateDashboard(issues) {
    const totalCount = document.getElementById('total-count');
    const newCount = document.getElementById('new-count');
    const resolvedCount = document.getElementById('resolved-count');

    if (!totalCount || !newCount || !resolvedCount) return;

    totalCount.innerText = issues.length;
    newCount.innerText = issues.filter(i => i.status === 'new' || !i.status).length;
    resolvedCount.innerText = issues.filter(i => i.status === 'done').length;

    const dashboard = document.querySelector('.dashboard');
    const oldTrend = document.getElementById('trend-card');

    if (oldTrend) oldTrend.remove();
    if (!dashboard) return;

    let addressCounts = {};
    let topAddress = "Даних недостатньо";
    let maxCount = 0;

    issues.forEach(i => {
        if (i.address && i.address !== "Координати встановлено") {
            const parts = i.address.split(',');
            const shortAddr = parts[0] + (parts[1] ? ',' + parts[1] : '');

            addressCounts[shortAddr] = (addressCounts[shortAddr] || 0) + 1;

            if (addressCounts[shortAddr] > maxCount) {
                maxCount = addressCounts[shortAddr];
                topAddress = shortAddr;
            }
        }
    });

    if (maxCount > 0 && state.isAdmin) {
        const trendCard = document.createElement('div');
        trendCard.id = 'trend-card';
        trendCard.className = 'stat-card trend-card';

        trendCard.innerHTML = `
            <span class="stat-label">Проблемна локація - аналітика</span>
            <span class="stat-value small-danger">${escapeHTML(topAddress)}</span>
        `;

        dashboard.appendChild(trendCard);
    }
}
