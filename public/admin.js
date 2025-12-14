// public/admin.js

// Delete all questions
async function deleteAll() {
  if (!confirm("Are you sure? This will delete all questions.")) return;
  const res = await fetch("/admin/delete-all", { method: "DELETE" });
  const data = await res.json();
  alert(data.msg);
  location.reload();
}

// Add question form handler
const addForm = document.getElementById("addForm");
if (addForm) {
  addForm.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(addForm);
    const payload = {};
    for (let [k, v] of fd.entries()) payload[k] = v.trim();
    const res = await fetch("/admin/add-question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    alert(data.msg);
    addForm.reset();
    setTimeout(() => location.reload(), 400);
  };
}

// Admin control buttons
async function startExam() {
  const res = await fetch("/admin/start", { method: "POST" });
  const data = await res.json();
  alert(data.msg);
  location.reload();
}
async function stopExam() {
  const res = await fetch("/admin/stop", { method: "POST" });
  const data = await res.json();
  alert(data.msg);
  location.reload();
}
async function publishResult() {
  const res = await fetch("/admin/publish", { method: "POST" });
  const data = await res.json();
  alert(data.msg);
  location.reload();
}
async function nextExam() {
  if (!confirm("Proceed to next exam? This will increment the exam number.")) return;
  const res = await fetch("/admin/next", { method: "POST" });
  const data = await res.json();
  alert(data.msg);
  location.reload();
}
function downloadMarklist() {
  window.location = "/admin/download-marklist";
}

// status display
async function loadAdminStatus() {
  const el = document.getElementById("adminStatus");
  if (!el) return;
  const res = await fetch("/admin/api/status");
  const data = await res.json();
  el.innerText = `Exam ${data.config.currentExam} | started: ${data.config.examStarted} | stopped: ${data.config.examStopped} | published: ${data.config.resultPublished}
PartA: ${data.partAcount}/25, PartB: ${data.partBcount}/75, Total Questions: ${data.totalQuestions}`;
}
loadAdminStatus();

