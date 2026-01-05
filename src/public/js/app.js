const $ = id => document.getElementById(id);

let config = null;
let timer = null;
let startTime = null;

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

function startTimer() {
  startTime = Date.now();
  timer = setInterval(() => {
    const elapsed = formatTime(Date.now() - startTime);
    $('statusTime').textContent = elapsed;
    document.title = `${elapsed} · ${config.name}`;
  }, 1000);
}

function stopTimer() {
  clearInterval(timer);
  document.title = config.name;
}

async function runAgent(prompt) {
  const res = await fetch('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: prompt })
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const chunk = JSON.parse(line);
        if (chunk.type === 'text' || chunk.type === 'result') {
          $('content').textContent += chunk.text;
        } else if (chunk.type === 'tool') {
          $('statusText').textContent = chunk.name;
        } else if (chunk.type === 'usage') {
          $('tokens').textContent = chunk.input + chunk.output;
          $('cost').textContent = ((chunk.input * 0.25 + chunk.output * 1.25) / 1e6).toFixed(4);
        } else if (chunk.type === 'done') {
          stopTimer();
          $('status').classList.remove('visible');
          $('btn').disabled = false;
          $('btn').textContent = 'Send';
        }
      } catch {}
    }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  config = await fetch('/config.json').then(r => r.json());
  document.title = config.name;
  $('agentName').textContent = config.name;
  $('agentTagline').textContent = config.tagline;
  $('input').value = config.example;

  $('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const prompt = $('input').value.trim();
    if (!prompt) return;

    $('btn').disabled = true;
    $('btn').textContent = 'Working...';
    $('content').textContent = '';
    $('statusText').textContent = 'Starting...';
    $('statusTime').textContent = '0:00';
    $('status').classList.add('visible');
    $('results').classList.add('visible');

    startTimer();
    await runAgent(prompt);
  });
});
