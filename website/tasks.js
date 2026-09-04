const root = document.documentElement;
const themeToggle = document.querySelector('#theme-toggle');
const form = document.querySelector('#task-form');
const input = document.querySelector('#new-task');
const list = document.querySelector('#task-list');
const emptyState = document.querySelector('#task-empty');
const doneCount = document.querySelector('#done-count');
const totalCount = document.querySelector('#total-count');
const progressBar = document.querySelector('#progress-bar');
const clearCompleted = document.querySelector('#clear-completed');
const filterButtons = [...document.querySelectorAll('[data-filter]')];
const storageKey = 'one-hub-html-tasks';
let activeFilter = 'all';

const starterTasks = [
  { id: crypto.randomUUID(), text: 'Choose the three things that matter today', completed: false },
  { id: crypto.randomUUID(), text: 'Take a real break away from the screen', completed: false },
];

function loadTasks() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey));
    return Array.isArray(stored) ? stored : starterTasks;
  } catch {
    return starterTasks;
  }
}

let tasks = loadTasks();

function saveTasks() {
  localStorage.setItem(storageKey, JSON.stringify(tasks));
}

function setTheme(theme) {
  root.dataset.theme = theme;
  themeToggle.setAttribute(
    'aria-label',
    theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
  );
}

const savedTheme = localStorage.getItem('one-hub-theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
setTheme(savedTheme || (prefersDark ? 'dark' : 'light'));

themeToggle.addEventListener('click', () => {
  const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  setTheme(nextTheme);
  localStorage.setItem('one-hub-theme', nextTheme);
});

document.querySelector('#task-date').textContent = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
}).format(new Date());

function visibleTasks() {
  if (activeFilter === 'open') return tasks.filter((task) => !task.completed);
  if (activeFilter === 'done') return tasks.filter((task) => task.completed);
  return tasks;
}

function render() {
  list.replaceChildren();

  visibleTasks().forEach((task) => {
    const item = document.createElement('li');
    item.className = `task-item${task.completed ? ' completed' : ''}`;
    item.dataset.id = task.id;

    const check = document.createElement('button');
    check.className = 'task-check';
    check.type = 'button';
    check.setAttribute('aria-label', task.completed ? `Mark ${task.text} open` : `Complete ${task.text}`);
    check.textContent = '✓';

    const text = document.createElement('span');
    text.className = 'task-text';
    text.textContent = task.text;

    const remove = document.createElement('button');
    remove.className = 'delete-task';
    remove.type = 'button';
    remove.setAttribute('aria-label', `Delete ${task.text}`);
    remove.textContent = '×';

    item.append(check, text, remove);
    list.append(item);
  });

  const complete = tasks.filter((task) => task.completed).length;
  doneCount.textContent = complete;
  totalCount.textContent = tasks.length;
  progressBar.style.width = tasks.length ? `${(complete / tasks.length) * 100}%` : '0%';
  emptyState.hidden = visibleTasks().length !== 0;
  clearCompleted.disabled = complete === 0;
  clearCompleted.style.opacity = complete === 0 ? '0.42' : '1';
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  tasks.unshift({ id: crypto.randomUUID(), text, completed: false });
  input.value = '';
  activeFilter = 'all';
  filterButtons.forEach((button) => button.classList.toggle('active', button.dataset.filter === 'all'));
  saveTasks();
  render();
  input.focus();
});

list.addEventListener('click', (event) => {
  const item = event.target.closest('.task-item');
  if (!item) return;

  if (event.target.closest('.task-check')) {
    tasks = tasks.map((task) =>
      task.id === item.dataset.id ? { ...task, completed: !task.completed } : task,
    );
  }

  if (event.target.closest('.delete-task')) {
    tasks = tasks.filter((task) => task.id !== item.dataset.id);
  }

  saveTasks();
  render();
});

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((candidate) => candidate.classList.toggle('active', candidate === button));
    render();
  });
});

clearCompleted.addEventListener('click', () => {
  tasks = tasks.filter((task) => !task.completed);
  saveTasks();
  render();
});

render();
