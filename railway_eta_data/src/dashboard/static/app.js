/**
 * SIH ETA — Local Inspection Dashboard
 * app.js — Vanilla JS frontend logic
 *
 * All data fetched from the local FastAPI server at http://127.0.0.1:8000
 * No external dependencies. No build step required.
 */

'use strict';

// ─────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────
const API_BASE = '';  // Same origin — FastAPI serves both UI and API
const PAGE_SIZE = 50;

// ─────────────────────────────────────────────────────────
// Pagination state
// ─────────────────────────────────────────────────────────
const state = {
  stations: { offset: 0, total: 0, query: '' },
  trains:   { offset: 0, total: 0, query: '' },
  delays:   { offset: 0, total: 0 },
};

// ─────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────
async function apiFetch(path) {
  const response = await fetch(API_BASE + path);
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || response.statusText);
  }
  return response.json();
}

async function apiPost(path, body) {
  const response = await fetch(API_BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(err.detail || response.statusText);
  }
  return response.json();
}

function fmt(n) {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString('en-IN');
}

function escHtml(str) {
  if (str === null || str === undefined) return '<span style="color:var(--text-muted)">—</span>';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─────────────────────────────────────────────────────────
// Tab switching
// ─────────────────────────────────────────────────────────
function switchTab(name, btn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`panel-${name}`).classList.add('active');
  btn.classList.add('active');

  // Lazy-load data on first open
  if (name === 'stations' && state.stations.total === 0) loadStations();
  if (name === 'trains'   && state.trains.total === 0)   loadTrains();
  if (name === 'delays'   && state.delays.total === 0)   loadDelays();
}

// ─────────────────────────────────────────────────────────
// Status bar & Health check
// ─────────────────────────────────────────────────────────
async function checkHealth() {
  const dot = document.getElementById('statusDot');
  const bar = document.getElementById('statusDatasets');
  const loadedAt = document.getElementById('statusLoadedAt');

  try {
    const data = await apiFetch('/api/health');
    dot.className = 'status-dot green';
    document.querySelector('#statusBar span:first-child').innerHTML =
      `<span class="status-dot green"></span> &nbsp;Server: <strong style="color:var(--accent-green)">OK</strong>`;
    bar.textContent = `Datasets: ${data.datasets_loaded ? '✓ Loaded' : '⏳ Loading...'}`;
    if (data.loaded_at && data.loaded_at !== 'NOT_LOADED_YET') {
      const d = new Date(data.loaded_at);
      loadedAt.textContent = `Loaded at: ${d.toLocaleTimeString()}`;
    }
  } catch (e) {
    dot.className = 'status-dot red';
    document.querySelector('#statusBar span:first-child').innerHTML =
      `<span class="status-dot red"></span> &nbsp;Server: <strong style="color:var(--accent-red)">Offline</strong>`;
    bar.textContent = 'Cannot reach server at 127.0.0.1:8000';
  }
}

// ─────────────────────────────────────────────────────────
// Data Summary tab
// ─────────────────────────────────────────────────────────
async function loadSummary() {
  try {
    const data = await apiFetch('/api/data/summary');

    // Update disclaimer
    document.getElementById('disclaimerText').innerHTML =
      `<strong>System Notice:</strong> ${escHtml(data.disclaimer)}`;

    // Build stats cards
    const ds = data.datasets;
    const statsHTML = [
      statCard('Stations',       ds.stations?.record_count,   'blue',   `${ds.stations?.file_size_mb} MB`),
      statCard('Trains',         ds.trains?.record_count,     'green',  `${ds.trains?.file_size_mb} MB`),
      statCard('Schedule Stops', ds.schedules?.record_count,  'purple', `${ds.schedules?.file_size_mb} MB`),
      statCard('Journey Routes', ds.journeys?.train_count,    'orange', `${ds.journeys?.file_size_mb} MB`),
      statCard('Delay Records',  ds.delays?.record_count,     'blue',   `${ds.delays?.file_size_mb} MB`),
      statCard('Historical Rows',ds.public_historical_delay?.record_count, 'yellow', `${ds.public_historical_delay?.file_size_mb} MB`),
      statCard('Decision Log',   ds.decision_log?.record_count, 'green',`${ds.decision_log?.file_size_mb} MB`),
    ].join('');
    document.getElementById('statsGrid').innerHTML = statsHTML;

    // Build dataset table
    const rows = Object.entries(ds).map(([key, d]) => {
      const badgeClass = d.status === 'AVAILABLE' ? 'badge-green' : 'badge-red';
      const hasWarning = !!d.temporal_safety_warning;
      const noteHtml = hasWarning
        ? `<span style="color:var(--accent-yellow)">⚠ ${escHtml(d.temporal_safety_warning)}</span>`
        : (d.note ? escHtml(d.note) : '');
      const schemaHtml = d.schema_fields?.length
        ? `<details class="schema-expand"><summary>Show ${d.schema_fields.length} fields</summary>
            <div class="field-list">${d.schema_fields.map(f => `<span class="field-pill">${escHtml(f)}</span>`).join('')}</div>
           </details>`
        : '';
      return `<tr>
        <td style="font-weight:500;color:var(--text-primary)">${escHtml(key.replace(/_/g,' '))}</td>
        <td class="mono">${escHtml(d.source_file || '—')}</td>
        <td style="font-variant-numeric:tabular-nums;">${fmt(d.record_count ?? d.train_count)}</td>
        <td style="font-variant-numeric:tabular-nums;">${d.file_size_mb ?? '—'}</td>
        <td><span class="badge ${badgeClass}">${d.status}</span></td>
        <td class="note">${noteHtml}${schemaHtml}</td>
      </tr>`;
    }).join('');

    document.getElementById('datasetTableBody').innerHTML = rows;

  } catch (e) {
    document.getElementById('statsGrid').innerHTML =
      `<div class="empty-state" style="grid-column:1/-1">⚠ Failed to load summary: ${escHtml(e.message)}</div>`;
    document.getElementById('datasetTableBody').innerHTML =
      `<tr><td colspan="6" class="empty-state">Error: ${escHtml(e.message)}</td></tr>`;
  }
}

function statCard(label, value, colorClass, sub) {
  return `<div class="stat-card">
    <div class="stat-label">${escHtml(label)}</div>
    <div class="stat-value ${colorClass}">${fmt(value)}</div>
    <div class="stat-sub">${escHtml(sub || '')}</div>
  </div>`;
}

// ─────────────────────────────────────────────────────────
// Generic table builder
// ─────────────────────────────────────────────────────────
function buildTableHTML(records, theadId, tbodyId, columns) {
  if (!records || records.length === 0) {
    document.getElementById(tbodyId).innerHTML =
      `<tr><td colspan="${(columns || []).length || 5}" class="empty-state">No records found.</td></tr>`;
    return;
  }

  // Auto-detect columns from first record if not specified
  const cols = columns || Object.keys(records[0]);

  document.getElementById(theadId).innerHTML =
    `<tr>${cols.map(c => `<th>${escHtml(String(c).replace(/_/g,' '))}</th>`).join('')}</tr>`;

  const rows = records.map(r =>
    `<tr>${cols.map(c => {
      const v = r[c];
      return `<td>${v === null || v === undefined ? '<span style="color:var(--text-muted)">—</span>' : escHtml(String(v))}</td>`;
    }).join('')}</tr>`
  ).join('');

  document.getElementById(tbodyId).innerHTML = rows;
}

// ─────────────────────────────────────────────────────────
// Stations Tab
// ─────────────────────────────────────────────────────────
const STATIONS_COLS = ['code', 'name', 'lat', 'lng', 'state', 'zone'];

async function loadStations() {
  const q = state.stations.query;
  const offset = state.stations.offset;
  document.getElementById('stationsBody').innerHTML =
    `<tr><td colspan="${STATIONS_COLS.length}" class="loading-overlay"><span class="loading-spinner"></span> Loading...</td></tr>`;

  try {
    const data = await apiFetch(`/api/stations?limit=${PAGE_SIZE}&offset=${offset}&query=${encodeURIComponent(q)}`);
    state.stations.total = data.total;

    document.getElementById('stationsTotal').textContent = `${fmt(data.total)} records`;
    buildTableHTML(data.results, 'stationsHeader', 'stationsBody', STATIONS_COLS);
    updatePagination('stations', data.total, offset, data.results.length);

  } catch (e) {
    document.getElementById('stationsBody').innerHTML =
      `<tr><td colspan="6" class="empty-state">Error: ${escHtml(e.message)}</td></tr>`;
  }
}

// ─────────────────────────────────────────────────────────
// Trains Tab
// ─────────────────────────────────────────────────────────
const TRAINS_COLS = ['number', 'name', 'type_canonical', 'distance', 'avg_speed', 'from_station_name', 'to_station_name'];

async function loadTrains() {
  const q = state.trains.query;
  const offset = state.trains.offset;
  document.getElementById('trainsBody').innerHTML =
    `<tr><td colspan="8" class="loading-overlay"><span class="loading-spinner"></span> Loading...</td></tr>`;

  try {
    const data = await apiFetch(`/api/trains?limit=${PAGE_SIZE}&offset=${offset}&query=${encodeURIComponent(q)}`);
    state.trains.total = data.total;

    document.getElementById('trainsTotal').textContent = `${fmt(data.total)} records`;

    // Build custom rows with "View Schedule" action
    if (!data.results || data.results.length === 0) {
      document.getElementById('trainsHeader').innerHTML = `<tr><th colspan="8">No trains found</th></tr>`;
      document.getElementById('trainsBody').innerHTML = `<tr><td colspan="8" class="empty-state">No records found.</td></tr>`;
    } else {
      const actualCols = TRAINS_COLS.filter(c => c in data.results[0]);
      document.getElementById('trainsHeader').innerHTML =
        `<tr>${actualCols.map(c => `<th>${escHtml(c.replace(/_/g,' '))}</th>`).join('')}<th>Actions</th></tr>`;

      const rows = data.results.map(r =>
        `<tr>${actualCols.map(c => `<td>${escHtml(r[c] ?? '—')}</td>`).join('')}
         <td><button class="btn btn-ghost" style="font-size:11px;padding:3px 9px;"
             onclick="viewSchedule('${escHtml(r.number || '')}')">🗒 Schedule</button></td>
         </tr>`
      ).join('');
      document.getElementById('trainsBody').innerHTML = rows;
    }
    updatePagination('trains', data.total, offset, data.results.length);

  } catch (e) {
    document.getElementById('trainsBody').innerHTML =
      `<tr><td colspan="8" class="empty-state">Error: ${escHtml(e.message)}</td></tr>`;
  }
}

async function viewSchedule(trainNumber) {
  const drawer = document.getElementById('scheduleDrawer');
  const title = document.getElementById('scheduleTitle');
  drawer.style.display = 'block';
  title.textContent = `Schedule for Train ${trainNumber} — Loading...`;
  document.getElementById('scheduleBody').innerHTML =
    `<tr><td colspan="7" class="loading-overlay"><span class="loading-spinner"></span> Loading schedule...</td></tr>`;
  drawer.scrollIntoView({ behavior: 'smooth' });

  try {
    const data = await apiFetch(`/api/schedules/${encodeURIComponent(trainNumber)}`);

    if (data.status === 'NOT_FOUND') {
      title.textContent = `Schedule for Train ${trainNumber} — NOT FOUND`;
      document.getElementById('scheduleBody').innerHTML =
        `<tr><td colspan="7" class="empty-state">No schedule found for train ${escHtml(trainNumber)}.</td></tr>`;
      return;
    }

    title.textContent = `Schedule — ${trainNumber} ${data.train_name || ''} (${data.stop_count} stops)`;

    const rows = (data.stops || []).map((stop, i) => {
      const isFirst = i === 0;
      const isLast = i === data.stops.length - 1;
      const cls = (isFirst || isLast) ? 'stop-terminal' : '';
      return `<tr>
        <td class="stop-sequence">${i + 1}</td>
        <td class="${cls}" style="font-family:var(--mono)">${escHtml(stop.station || stop.station_code || '—')}</td>
        <td class="${cls}">${escHtml(stop.station_name || '—')}</td>
        <td style="font-family:var(--mono)">${escHtml(stop.arrival || stop.arrival_time || '—')}</td>
        <td style="font-family:var(--mono)">${escHtml(stop.departure || stop.departure_time || '—')}</td>
        <td>${escHtml(stop.day ?? stop.day_count ?? '—')}</td>
        <td>${escHtml(stop.distance || stop.km || '—')}</td>
      </tr>`;
    }).join('');

    document.getElementById('scheduleBody').innerHTML = rows || `<tr><td colspan="7" class="empty-state">No stops data.</td></tr>`;

  } catch (e) {
    document.getElementById('scheduleBody').innerHTML =
      `<tr><td colspan="7" class="empty-state">Error: ${escHtml(e.message)}</td></tr>`;
  }
}

function closeSchedule() {
  document.getElementById('scheduleDrawer').style.display = 'none';
}

// ─────────────────────────────────────────────────────────
// Delays Tab
// ─────────────────────────────────────────────────────────
async function loadDelays() {
  const offset = state.delays.offset;
  document.getElementById('delaysBody').innerHTML =
    `<tr><td colspan="8" class="loading-overlay"><span class="loading-spinner"></span> Loading...</td></tr>`;

  try {
    const data = await apiFetch(`/api/delays?limit=${PAGE_SIZE}&offset=${offset}`);
    state.delays.total = data.total;

    document.getElementById('delaysTotal').textContent = `${fmt(data.total)} records`;
    buildTableHTML(data.results, 'delaysHeader', 'delaysBody', null);
    updatePagination('delays', data.total, offset, data.results.length);

  } catch (e) {
    document.getElementById('delaysBody').innerHTML =
      `<tr><td colspan="8" class="empty-state">Error: ${escHtml(e.message)}</td></tr>`;
  }
}

// ─────────────────────────────────────────────────────────
// Pagination helpers
// ─────────────────────────────────────────────────────────
function updatePagination(key, total, offset, returned) {
  const from = total === 0 ? 0 : offset + 1;
  const to = offset + returned;
  document.getElementById(`${key}Pagination`).textContent =
    `Showing ${fmt(from)}–${fmt(to)} of ${fmt(total)}`;
  document.getElementById(`${key}Prev`).disabled = offset === 0;
  document.getElementById(`${key}Next`).disabled = to >= total;
}

function prevPage(key) {
  if (state[key].offset <= 0) return;
  state[key].offset = Math.max(0, state[key].offset - PAGE_SIZE);
  reloadTab(key);
}

function nextPage(key) {
  if (state[key].offset + PAGE_SIZE >= state[key].total) return;
  state[key].offset += PAGE_SIZE;
  reloadTab(key);
}

function reloadTab(key) {
  if (key === 'stations') loadStations();
  if (key === 'trains')   loadTrains();
  if (key === 'delays')   loadDelays();
}

// ─────────────────────────────────────────────────────────
// Debounced search
// ─────────────────────────────────────────────────────────
const _debounceTimers = {};
function debounceSearch(key) {
  clearTimeout(_debounceTimers[key]);
  _debounceTimers[key] = setTimeout(() => {
    state[key].query = document.getElementById(`${key}Search`).value.trim();
    state[key].offset = 0;
    reloadTab(key);
  }, 350);
}

// ─────────────────────────────────────────────────────────
// ETA Demo
// ─────────────────────────────────────────────────────────
function setPreset(trainNum, dest) {
  document.getElementById('etaTrainNumber').value = trainNum;
  document.getElementById('etaDestination').value = dest;
  document.getElementById('etaDelay').value = '';
}

async function submitETA() {
  const trainNumber = document.getElementById('etaTrainNumber').value.trim();
  const destination = document.getElementById('etaDestination').value.trim().toUpperCase();
  const delayVal = document.getElementById('etaDelay').value.trim();

  if (!trainNumber || !destination) {
    alert('Please enter both a train number and destination station code.');
    return;
  }

  const btn = document.getElementById('etaSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Predicting...';

  const resultCard = document.getElementById('etaResultCard');
  resultCard.innerHTML = `<div class="loading-overlay"><span class="loading-spinner"></span> Running ETA calculation...</div>`;

  try {
    const body = { train_number: trainNumber, destination_station: destination };
    if (delayVal !== '') body.current_delay_minutes = parseFloat(delayVal);

    const data = await apiPost('/api/eta/predict', body);
    renderETAResult(data, trainNumber, destination);
  } catch (e) {
    resultCard.innerHTML = `<div class="result-error-banner">
      <div class="error-code">REQUEST ERROR</div>
      <div class="error-message">${escHtml(e.message)}</div>
    </div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Predict ETA →';
  }
}

function renderETAResult(data, trainNum, dest) {
  const card = document.getElementById('etaResultCard');

  if (data.status === 'ERROR') {
    card.innerHTML = `
      <div class="result-train-header">
        <div>
          <div class="result-train-number">${escHtml(trainNum)}</div>
          <div class="result-destination">→ ${escHtml(dest)}</div>
        </div>
        <span class="badge badge-red">ERROR</span>
      </div>
      <div class="result-error-banner">
        <div class="error-code">${escHtml(data.error_code || 'UNKNOWN_ERROR')}</div>
        <div class="error-message">${escHtml(data.message || 'An unknown error occurred.')}</div>
      </div>
      <details class="raw-json-toggle">
        <summary>🔍 Raw JSON Response</summary>
        <pre class="raw-json-block">${JSON.stringify(data, null, 2)}</pre>
      </details>`;
    return;
  }

  const methodBadge = data.prediction_method === 'DELAY_ADJUSTED_BASELINE'
    ? `<span class="badge badge-purple">${escHtml(data.prediction_method)}</span>`
    : `<span class="badge badge-blue">${escHtml(data.prediction_method)}</span>`;

  const completenessClass = data.data_completeness_status === 'DELAY_AVAILABLE' ? 'badge-green' : 'badge-yellow';

  // Format predicted arrival
  let arrivalDisplay = data.predicted_arrival || 'DATA NOT AVAILABLE';
  try {
    if (data.predicted_arrival) {
      const d = new Date(data.predicted_arrival);
      if (!isNaN(d)) {
        arrivalDisplay = d.toLocaleString('en-IN', {
          dateStyle: 'medium', timeStyle: 'short', hour12: true
        });
      }
    }
  } catch (_) {}

  const delayLine = data.current_delay_minutes !== null && data.current_delay_minutes !== undefined
    ? `<span class="badge badge-yellow">+${data.current_delay_minutes} min delay injected</span>`
    : `<span class="badge badge-yellow">No delay provided</span>`;

  const assumptionsList = (data.assumptions || []).map(a =>
    `<li>${escHtml(a)}</li>`).join('');

  const limitationsList = (data.limitations || []).map(l =>
    `<li>${escHtml(l)}</li>`).join('');

  card.innerHTML = `
    <div class="result-train-header">
      <div>
        <div class="result-train-number">🚆 ${escHtml(data.train_number)}</div>
        <div class="result-destination">→ ${escHtml(data.destination_station)}</div>
      </div>
      <span class="badge ${completenessClass}">${escHtml(data.data_completeness_status)}</span>
    </div>

    <div class="result-eta-label">Predicted Arrival</div>
    <div class="result-eta-time">${escHtml(arrivalDisplay)}</div>

    <div class="result-meta">
      ${methodBadge}
      ${delayLine}
      <span class="badge badge-green">status: OK</span>
    </div>

    ${assumptionsList ? `
    <div class="result-detail-section">
      <div class="detail-heading">Assumptions</div>
      <ul class="detail-list">${assumptionsList}</ul>
    </div>` : ''}

    ${limitationsList ? `
    <div class="result-detail-section" style="margin-top:12px;">
      <div class="detail-heading">System Limitations</div>
      <ul class="detail-list">${limitationsList}</ul>
    </div>` : ''}

    <details class="raw-json-toggle">
      <summary>🔍 Raw JSON Response (for audit)</summary>
      <pre class="raw-json-block">${JSON.stringify(data, null, 2)}</pre>
    </details>`;
}

// ─────────────────────────────────────────────────────────
// Initialise
// ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  checkHealth();
  loadSummary();
});
