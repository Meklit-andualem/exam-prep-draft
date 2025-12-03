/* Shared logic for demo: loads tests, runs exam, saves results to localStorage */

async function loadBiologyData() {
    try {
        const res = await fetch("data/biology.json");
        return (await res.json()).tests;
    } catch (e) {
        console.warn("FAILED TO LOAD biology.json, using fallback!");
        return [{ id: 1, title: "Fallback Test", duration_minutes: 40, questions: [] }];
    }
}

async function initExam() {
    const params = new URLSearchParams(location.search);
    const testId = Number(params.get("test") || 1);
    const tests = await loadBiologyData();
    const test = tests.find(t => t.id === testId) || tests[0];
    const root = document.getElementById("examRoot");

    if (!root) return;

    if (!test.questions || test.questions.length === 0) {
        root.innerHTML = `
      <div class="home-card">
        <h3>No questions found for Test ${testId}</h3>
        <p>Add questions inside data/biology.json</p>
        <a class="btn" href="biology.html">Back</a>
      </div>`;
        return;
    }

    let current = 0;
    let answers = Array(test.questions.length).fill(null);

    // TIMER
    let timeLeft = test.duration_minutes * 60;
    let timerInterval;

    function startTimer() {
        const tEl = document.getElementById("timer");
        timerInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft < 0) {
                clearInterval(timerInterval);
                finishExam();
                return;
            }
            let mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
            let ss = String(timeLeft % 60).padStart(2, "0");
            tEl.textContent = `${mm}:${ss}`;
        }, 1000);
    }

    // RENDER QUESTION
    function render() {
        const q = test.questions[current];

        root.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
        <div><strong>${test.title}</strong> — Question ${current + 1}/${test.questions.length}</div>
        <div id="timer">${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}</div>
      </div>

      <div class="question">${q.question}</div>

      <div class="options">
        ${q.options.map((opt, idx) => `
          <button class="opt-btn" data-idx="${idx}">
            ${String.fromCharCode(65 + idx)}. ${opt}
          </button>`).join("")}
      </div>

      <div class="controls">
        <button id="prevBtn" class="btn">Previous</button>
        <button id="nextBtn" class="btn">Next</button>
        <button id="finishBtn" class="btn">Finish Test</button>
      </div>
    `;

        // option selection
        root.querySelectorAll(".opt-btn").forEach(btn => {
            btn.onclick = () => {
                answers[current] = Number(btn.dataset.idx);
                root.querySelectorAll(".opt-btn").forEach(b => b.style.borderColor = "#cbd5e1");
                btn.style.borderColor = "var(--accent)";
            };
        });

        document.getElementById("prevBtn").onclick = () => {
            if (current > 0) { current--; render(); }
        };

        document.getElementById("nextBtn").onclick = () => {
            if (current < test.questions.length - 1) { current++; render(); }
        };

        document.getElementById("finishBtn").onclick = finishExam;
    }

    // FINISH EXAM
    function finishExam() {
        clearInterval(timerInterval);

        let correct = 0;
        let breakdown = {};

        test.questions.forEach((q, i) => {
            const got = answers[i];
            const isCorrect = got === q.answer;
            if (isCorrect) correct++;

            const topic = q.topic || "Other";
            if (!breakdown[topic]) breakdown[topic] = { total: 0, wrong: 0 };
            breakdown[topic].total++;
            if (!isCorrect) breakdown[topic].wrong++;
        });

        const score = Math.round((correct / test.questions.length) * 100);

        // store
        const attempts = JSON.parse(localStorage.getItem("exam_attempts") || "[]");
        const attempt = {
            id: Date.now(),
            testId: test.id,
            correct,
            total: test.questions.length,
            score,
            date: new Date().toISOString(),
            breakdown
        };

        attempts.push(attempt);
        localStorage.setItem("exam_attempts", JSON.stringify(attempts));
        localStorage.setItem("last_attempt", JSON.stringify(attempt));

        location.href = `result.html?attempt=${attempt.id}`;
    }

    render();
    startTimer();
}

///// RESULT PAGE /////
function initResult() {
    const params = new URLSearchParams(location.search);
    const id = params.get("attempt");
    const attempts = JSON.parse(localStorage.getItem("exam_attempts") || "[]");
    const last = attempts.find(a => String(a.id) === String(id))
        || JSON.parse(localStorage.getItem("last_attempt") || "null");

    const root = document.getElementById("resultRoot");
    if (!root) return;

    if (!last) {
        root.innerHTML = `<div class="home-card"><h3>No attempt found.</h3></div>`;
        return;
    }

    let html = `
    <h2>Result — <span class="result-score">${last.score}%</span></h2>
    <p>${last.correct}/${last.total} correct</p>
    
    <h3>Weakness Analysis</h3>
    <ul>
  `;

    for (const [topic, data] of Object.entries(last.breakdown)) {
        const acc = Math.round(((data.total - data.wrong) / data.total) * 100);
        html += `<li>${topic}: ${acc}% (${data.total - data.wrong}/${data.total})</li>`;
    }

    html += `</ul><h3>Progress History</h3><div class="progress-history">`;

    attempts.sort((a, b) => b.id - a.id).forEach(a => {
        html += `<div class="saved-item">Test ${a.testId} — ${a.score}% — ${new Date(a.date).toLocaleString()}</div>`;
    });

    html += `</div><a class="btn" href="biology.html">Back</a>`;
    root.innerHTML = html;
}

// HOMEPAGE SLIDER
function initHomeSlider() {
    const slider = document.querySelector(".hero-img img");
    if (!slider) return;

    const images = [
        "12 pic.jfif",
        "12 pic2.jfif", // add your second image
    ];
    let current = 0;

    const heroDiv = document.querySelector(".hero-img");
    const prevArrow = document.createElement("div");
    const nextArrow = document.createElement("div");

    prevArrow.textContent = "‹";
    nextArrow.textContent = "›";

    [prevArrow, nextArrow].forEach(arrow => {
        arrow.style.position = "absolute";
        arrow.style.top = "50%";
        arrow.style.transform = "translateY(-50%)";
        arrow.style.fontSize = "32px";
        arrow.style.color = "white";
        arrow.style.cursor = "pointer";
        arrow.style.userSelect = "none";
        arrow.style.padding = "10px";
        arrow.style.background = "rgba(0,0,0,0.3)";
        arrow.style.borderRadius = "50%";
    });

    prevArrow.style.left = "10px";
    nextArrow.style.right = "10px";

    heroDiv.style.position = "relative";
    heroDiv.appendChild(prevArrow);
    heroDiv.appendChild(nextArrow);

    function showSlide(idx) {
        current = (idx + images.length) % images.length;
        slider.src = images[current];
    }

    prevArrow.onclick = () => showSlide(current - 1);
    nextArrow.onclick = () => showSlide(current + 1);

    setInterval(() => showSlide(current + 1), 5000);
}

// HOMEPAGE SUBJECT CARDS
function initSubjectProgress() {
    document.querySelectorAll(".subject-card").forEach(card => {
        const subject = card.dataset.subject;
        const attempts = JSON.parse(localStorage.getItem("exam_attempts") || "[]");
        const lastAttempt = attempts.filter(a => a.testId === getTestId(subject))
            .sort((a, b) => b.id - a.id)[0];
        const scoreEl = card.querySelector(".score");
        if (lastAttempt) scoreEl.textContent = lastAttempt.score;

        card.onclick = () => {
            window.location.href = subject + ".html"; // Navigate to subject page
        };
    });
}

function getTestId(subject) {
    const mapping = { biology: 1, physics: 2, chemistry: 3, mathematics: 4, english: 5 };
    return mapping[subject] || 1;
}

window.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("examRoot")) initExam();
    if (document.getElementById("resultRoot")) initResult();
    initHomeSlider();
    initSubjectProgress();
});
