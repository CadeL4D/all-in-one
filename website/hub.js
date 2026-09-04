const root = document.documentElement;
const themeToggle = document.querySelector('#theme-toggle');
const searchInput = document.querySelector('#tool-search');
const toolCards = [...document.querySelectorAll('.tool-card')];
const emptyState = document.querySelector('#empty-state');
const toolCount = document.querySelector('#tool-count');
const toast = document.querySelector('#toast');
const toastTitle = document.querySelector('#toast-title');
const toastCopy = document.querySelector('#toast-copy');
const dismissToast = toast.querySelector('button');
let toastTimer;

const savedTheme = localStorage.getItem('one-hub-theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

function setTheme(theme) {
  root.dataset.theme = theme;
  themeToggle.setAttribute(
    'aria-label',
    theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
  );
}

setTheme(savedTheme || (prefersDark ? 'dark' : 'light'));

themeToggle.addEventListener('click', () => {
  const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  setTheme(nextTheme);
  localStorage.setItem('one-hub-theme', nextTheme);
});

const formattedDate = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
}).format(new Date());
document.querySelector('#today-label').textContent = formattedDate;

function filterTools() {
  const query = searchInput.value.trim().toLowerCase();
  let visibleCount = 0;

  toolCards.forEach((card) => {
    const isVisible = card.dataset.tool.includes(query);
    card.hidden = !isVisible;
    if (isVisible) visibleCount += 1;
  });

  emptyState.hidden = visibleCount !== 0;
  toolCount.textContent = visibleCount;
}

searchInput.addEventListener('input', filterTools);

document.addEventListener('keydown', (event) => {
  const activeTag = document.activeElement.tagName;
  if (event.key === '/' && activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
    event.preventDefault();
    searchInput.focus();
  }

  if (event.key === 'Escape' && document.activeElement === searchInput) {
    searchInput.value = '';
    filterTools();
    searchInput.blur();
  }
});

function hideToast() {
  toast.classList.remove('visible');
  toast.setAttribute('aria-hidden', 'true');
}

document.querySelectorAll('[data-upcoming]').forEach((card) => {
  card.addEventListener('click', () => {
    const toolName = card.dataset.upcoming;
    toastTitle.textContent = `${toolName} is coming soon`;
    toastCopy.textContent = 'Tasks is ready to use in the meantime.';
    toast.classList.add('visible');
    toast.setAttribute('aria-hidden', 'false');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 3600);
  });
});

dismissToast.addEventListener('click', hideToast);
