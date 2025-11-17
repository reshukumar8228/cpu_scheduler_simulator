class Process {
    constructor(pid, arrival, burst, priority) {
        this.pid = pid;
        this.arrival = arrival;
        this.burst = burst;
        this.priority = priority;
        this.completion = 0;
        this.turnaround = 0;
        this.waiting = 0;
        this.remaining = burst;
        this.start = -1;
        this.response = 0;
    }
}

let processes = [];
const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788'];

const algoDescriptions = {
    'FCFS': 'Non-Preemptive: Processes executed in order of arrival.',
    'SJF': 'Non-Preemptive: Process with shortest burst time executes first.',
    'SRTF': 'Preemptive SJF: Process with shortest remaining time executes.',
    'RR': 'Preemptive: Each process gets a fixed time quantum.',
    'Priority_NP': 'Non-Preemptive: Highest priority process executes first.',
    'Priority_P': 'Preemptive: Can be interrupted by higher priority arrivals.'
};

const priorityAlgorithms = ['Priority_NP', 'Priority_P'];

function toggleInputs() {
    const algorithm = document.getElementById('algorithm').value;
    document.getElementById('quantumGroup').classList.toggle('hidden', algorithm !== 'RR');
    document.getElementById('priorityNote').classList.toggle('hidden', !priorityAlgorithms.includes(algorithm));
}

function generateProcessInputs() {
    const numProcesses = parseInt(document.getElementById('numProcesses').value);
    const container = document.getElementById('processInputs');
    container.innerHTML = '';

    if (numProcesses === 0) {
        container.innerHTML = '<p style="color: #666; text-align: center;">Please enter number of processes greater than 0</p>';
        return;
    }

    for (let i = 0; i < numProcesses; i++) {
        const card = document.createElement('div');
        card.className = 'process-card';
        card.innerHTML = `
                <h4>Process ${i + 1}</h4>
                <div class="process-fields">
                    <div>
                        <label>Process ID</label>
                        <input type="text" id="pid_${i}" value="P${i + 1}">
                    </div>
                    <div>
                        <label>Arrival Time</label>
                        <input type="number" id="arrival_${i}" value="0" min="0">
                    </div>
                    <div>
                        <label>Burst Time</label>
                        <input type="number" id="burst_${i}" value="0" min="0">
                    </div>
                    <div>
                        <label>Priority</label>
                        <input type="number" id="priority_${i}" value="0" min="0">
                    </div>
                </div>
            `;
        container.appendChild(card);
    }
}

function fcfsScheduling(processes) {
    const sorted = [...processes].sort((a, b) => a.arrival - b.arrival);
    let currentTime = 0;
    const gantt = [];

    sorted.forEach(p => {
        if (currentTime < p.arrival) currentTime = p.arrival;
        p.start = currentTime;
        p.completion = currentTime + p.burst;
        p.turnaround = p.completion - p.arrival;
        p.waiting = p.turnaround - p.burst;
        p.response = p.start - p.arrival;
        gantt.push({ pid: p.pid, start: p.start, end: p.completion });
        currentTime = p.completion;
    });
    return { processes: sorted, gantt };
}

function sjfScheduling(processes) {
    const remaining = processes.map(p => ({ ...p }));
    const completed = [];
    const gantt = [];
    let currentTime = 0;

    while (remaining.length > 0) {
        const available = remaining.filter(p => p.arrival <= currentTime);
        if (available.length === 0) {
            currentTime = Math.min(...remaining.map(p => p.arrival));
            continue;
        }
        const shortest = available.reduce((min, p) => p.burst < min.burst ? p : min);
        const index = remaining.indexOf(shortest);
        shortest.start = currentTime;
        shortest.completion = currentTime + shortest.burst;
        shortest.turnaround = shortest.completion - shortest.arrival;
        shortest.waiting = shortest.turnaround - shortest.burst;
        shortest.response = shortest.start - shortest.arrival;
        gantt.push({ pid: shortest.pid, start: shortest.start, end: shortest.completion });
        currentTime = shortest.completion;
        completed.push(shortest);
        remaining.splice(index, 1);
    }
    return { processes: completed, gantt };
}

function srtfScheduling(processes) {
    const processQueue = processes.map(p => ({ ...p, remaining: p.burst }));
    const completed = [];
    const gantt = [];
    let currentTime = 0;
    let lastProcess = null;

    while (processQueue.some(p => p.remaining > 0)) {
        const available = processQueue.filter(p => p.arrival <= currentTime && p.remaining > 0);
        if (available.length === 0) {
            currentTime++;
            continue;
        }
        const shortest = available.reduce((min, p) => p.remaining < min.remaining ? p : min);
        if (shortest.start === -1) shortest.start = currentTime;
        if (lastProcess !== shortest.pid) {
            if (lastProcess !== null) gantt[gantt.length - 1].end = currentTime;
            gantt.push({ pid: shortest.pid, start: currentTime, end: currentTime + 1 });
            lastProcess = shortest.pid;
        }
        shortest.remaining--;
        currentTime++;
        if (shortest.remaining === 0) {
            shortest.completion = currentTime;
            shortest.turnaround = shortest.completion - shortest.arrival;
            shortest.waiting = shortest.turnaround - shortest.burst;
            shortest.response = shortest.start - shortest.arrival;
            completed.push(shortest);
            gantt[gantt.length - 1].end = currentTime;
        }
    }
    return { processes: completed, gantt };
}

function roundRobinScheduling(processes, quantum) {
    const queue = [];
    const gantt = [];
    const completed = [];
    let currentTime = 0;
    const remaining = processes.map(p => ({ ...p, remaining: p.burst })).sort((a, b) => a.arrival - b.arrival);
    let i = 0;

    if (remaining.length > 0) queue.push(remaining[i++]);

    while (queue.length > 0 || i < remaining.length) {
        if (queue.length === 0) {
            currentTime = remaining[i].arrival;
            queue.push(remaining[i++]);
        }
        const process = queue.shift();
        if (process.start === -1) process.start = currentTime;
        const execTime = Math.min(quantum, process.remaining);
        const startTime = currentTime;
        process.remaining -= execTime;
        currentTime += execTime;
        gantt.push({ pid: process.pid, start: startTime, end: currentTime });
        while (i < remaining.length && remaining[i].arrival <= currentTime) {
            queue.push(remaining[i++]);
        }
        if (process.remaining > 0) {
            queue.push(process);
        } else {
            process.completion = currentTime;
            process.turnaround = process.completion - process.arrival;
            process.waiting = process.turnaround - process.burst;
            process.response = process.start - process.arrival;
            completed.push(process);
        }
    }
    return { processes: completed, gantt };
}

function priorityNPScheduling(processes) {
    const remaining = processes.map(p => ({ ...p }));
    const completed = [];
    const gantt = [];
    let currentTime = 0;

    while (remaining.length > 0) {
        const available = remaining.filter(p => p.arrival <= currentTime);
        if (available.length === 0) {
            currentTime = Math.min(...remaining.map(p => p.arrival));
            continue;
        }
        const highest = available.reduce((min, p) => p.priority < min.priority ? p : min);
        const index = remaining.indexOf(highest);
        highest.start = currentTime;
        highest.completion = currentTime + highest.burst;
        highest.turnaround = highest.completion - highest.arrival;
        highest.waiting = highest.turnaround - highest.burst;
        highest.response = highest.start - highest.arrival;
        gantt.push({ pid: highest.pid, start: highest.start, end: highest.completion });
        currentTime = highest.completion;
        completed.push(highest);
        remaining.splice(index, 1);
    }
    return { processes: completed, gantt };
}

function priorityPScheduling(processes) {
    const processQueue = processes.map(p => ({ ...p, remaining: p.burst }));
    const completed = [];
    const gantt = [];
    let currentTime = 0;
    let lastProcess = null;

    while (processQueue.some(p => p.remaining > 0)) {
        const available = processQueue.filter(p => p.arrival <= currentTime && p.remaining > 0);
        if (available.length === 0) {
            currentTime++;
            continue;
        }
        const highest = available.reduce((min, p) => p.priority < min.priority ? p : min);
        if (highest.start === -1) highest.start = currentTime;
        if (lastProcess !== highest.pid) {
            if (lastProcess !== null) gantt[gantt.length - 1].end = currentTime;
            gantt.push({ pid: highest.pid, start: currentTime, end: currentTime + 1 });
            lastProcess = highest.pid;
        }
        highest.remaining--;
        currentTime++;
        if (highest.remaining === 0) {
            highest.completion = currentTime;
            highest.turnaround = highest.completion - highest.arrival;
            highest.waiting = highest.turnaround - highest.burst;
            highest.response = highest.start - highest.arrival;
            completed.push(highest);
            gantt[gantt.length - 1].end = currentTime;
        }
    }
    return { processes: completed, gantt };
}

function calculateMetrics(processes) {
    const avgWaiting = processes.reduce((sum, p) => sum + p.waiting, 0) / processes.length;
    const avgTurnaround = processes.reduce((sum, p) => sum + p.turnaround, 0) / processes.length;
    const avgResponse = processes.reduce((sum, p) => sum + p.response, 0) / processes.length;
    const maxCompletion = Math.max(...processes.map(p => p.completion));
    const throughput = processes.length / maxCompletion;

    return {
        avgWaiting: avgWaiting.toFixed(2),
        avgTurnaround: avgTurnaround.toFixed(2),
        avgResponse: avgResponse.toFixed(2),
        throughput: throughput.toFixed(4),
        totalProcesses: processes.length,
        totalTime: maxCompletion
    };
}

function drawGanttChart(gantt) {
    const container = document.getElementById('ganttChart');
    container.innerHTML = '';

    const maxTime = Math.max(...gantt.map(g => g.end));
    const containerWidth = container.parentElement.offsetWidth - 40;
    const totalWidth = containerWidth * 0.95;

    gantt.forEach((g, index) => {
        const widthPercent = ((g.end - g.start) / maxTime) * 100;
        const bar = document.createElement('div');
        bar.className = 'gantt-bar';
        bar.style.width = widthPercent + '%';
        bar.style.backgroundColor = colors[parseInt(g.pid.replace('P', '')) % colors.length];

        let timeLabels = '';
        if (index === 0) timeLabels += `<span class="gantt-time-marker start">${g.start}</span>`;
        timeLabels += `<span class="gantt-time-marker end">${g.end}</span>`;

        bar.innerHTML = `${g.pid}${timeLabels}`;
        container.appendChild(bar);
    });
}

function displayResults(result, metrics, algorithm) {
    const algorithmText = document.getElementById('algorithm').options[document.getElementById('algorithm').selectedIndex].text;
    document.getElementById('algorithmNameHeader').textContent = algorithmText;
    document.getElementById('algorithmInfo').innerHTML = `<strong>Algorithm:</strong> ${algorithmText}<br><strong>Description:</strong> ${algoDescriptions[algorithm]}`;

    drawGanttChart(result.gantt);

    const showPriority = priorityAlgorithms.includes(algorithm);
    document.querySelectorAll('.priority-col').forEach(col => {
        col.style.display = showPriority ? 'table-cell' : 'none';
    });

    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    result.processes.forEach(p => {
        const row = tbody.insertRow();
        row.innerHTML = `
                <td><strong>${p.pid}</strong></td>
                <td>${p.arrival}</td>
                <td>${p.burst}</td>
                <td class="priority-col" style="display: ${showPriority ? 'table-cell' : 'none'}">${p.priority}</td>
                <td>${p.completion}</td>
                <td>${p.turnaround}</td>
                <td>${p.waiting}</td>
                <td>${p.response}</td>
            `;
    });

    // Performance Metrics with Formulas
    document.getElementById('metricsGrid').innerHTML = `
            <div class="metric-card">
                <h3>${metrics.avgWaiting}</h3>
                <p>Avg Waiting Time</p>
                <div class="metric-formula">ΣWT / n</div>
            </div>
            <div class="metric-card">
                <h3>${metrics.avgTurnaround}</h3>
                <p>Avg Turnaround Time</p>
                <div class="metric-formula">ΣTAT / n</div>
            </div>
            <div class="metric-card">
                <h3>${metrics.avgResponse}</h3>
                <p>Avg Response Time</p>
                <div class="metric-formula">ΣRT / n</div>
            </div>
            <div class="metric-card">
                <h3>${metrics.throughput}</h3>
                <p>Throughput</p>
                <div class="metric-formula">n / Total Time</div>
            </div>
        `;

    document.getElementById('results').style.display = 'block';
    document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
}

function simulate() {
    const algorithm = document.getElementById('algorithm').value;
    const numProcesses = parseInt(document.getElementById('numProcesses').value);
    const quantum = parseInt(document.getElementById('quantum').value);

    if (numProcesses === 0) {
        alert('Please enter number of processes greater than 0');
        return;
    }

    processes = [];
    for (let i = 0; i < numProcesses; i++) {
        const pid = document.getElementById(`pid_${i}`).value;
        const arrival = parseInt(document.getElementById(`arrival_${i}`).value);
        const burst = parseInt(document.getElementById(`burst_${i}`).value);
        const priority = parseInt(document.getElementById(`priority_${i}`).value);
        processes.push(new Process(pid, arrival, burst, priority));
    }

    let result;
    switch (algorithm) {
        case 'FCFS': result = fcfsScheduling(processes); break;
        case 'SJF': result = sjfScheduling(processes); break;
        case 'SRTF': result = srtfScheduling(processes); break;
        case 'RR': result = roundRobinScheduling(processes, quantum); break;
        case 'Priority_NP': result = priorityNPScheduling(processes); break;
        case 'Priority_P': result = priorityPScheduling(processes); break;
    }

    const metrics = calculateMetrics(result.processes);
    displayResults(result, metrics, algorithm);
}

function resetAll() {
    document.getElementById('results').style.display = 'none';
    document.getElementById('processInputs').innerHTML = '';
    document.getElementById('numProcesses').value = 0;
    document.getElementById('algorithm').value = 'FCFS';
    toggleInputs();
}

window.onload = function () {
    // Don't auto-generate on load since numProcesses starts at 0
};