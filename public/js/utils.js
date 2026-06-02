import { NORMALIZED_CATEGORIES } from './config.js';

export function escapeHTML(str) {
    if (str === null || str === undefined) return "";

    return String(str).replace(/[&<>'"]/g, tag => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;"
    }[tag] || tag));
}

export function normalizeCategory(category) {
    if (!category) return "Інше";

    const trimmed = String(category).trim();

    if (NORMALIZED_CATEGORIES.includes(trimmed)) {
        return trimmed;
    }

    return "Інше";
}

export function normalizeIssue(issue) {
    return {
        ...issue,
        category: normalizeCategory(issue.category),
        status: issue.status || "new",
        upvotes: Array.isArray(issue.upvotes) ? issue.upvotes : [],
        comments: Array.isArray(issue.comments) ? issue.comments : []
    };
}

export function showToast(msg, isError = false) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = msg;

    if (isError) {
        toast.classList.add('error');
    } else {
        toast.classList.remove('error');
    }

    toast.style.display = 'block';

    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');

        setTimeout(() => {
            toast.style.display = 'none';
        }, 400);
    }, 3000);
}

export function showConfirm(title, desc, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    if (!modal) return;

    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-desc').textContent = desc;
    modal.style.display = 'flex';

    document.getElementById('btn-confirm-yes').onclick = () => {
        modal.style.display = 'none';
        onConfirm();
    };

    document.getElementById('btn-confirm-no').onclick = () => {
        modal.style.display = 'none';
    };
}

export function getStatusLabel(status) {
    if (status === 'process') return '<span class="badge process">В обробці</span>';
    if (status === 'done') return '<span class="badge done">Вирішено</span>';
    return '<span class="badge new">Очікує розгляду</span>';
}

export function getStatusText(status) {
    if (status === 'process') return "В обробці";
    if (status === 'done') return "Вирішено";
    return "Очікує розгляду";
}

export function formatDate(value) {
    if (!value) return "";

    if (typeof value.toDate === "function") {
        return value.toDate().toLocaleDateString('uk-UA');
    }

    return new Date(value).toLocaleDateString('uk-UA');
}

export function formatDateTime(value) {
    if (!value) return "";

    if (typeof value.toDate === "function") {
        return value.toDate().toLocaleString('uk-UA');
    }

    return new Date(value).toLocaleString('uk-UA');
}
