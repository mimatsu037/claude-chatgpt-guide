const status = document.getElementById("copy-status");
const resetTimers = new WeakMap();

function playInView(video) {
  let visible = false;
  let shouldPlay = true;
  const threshold = 0.5;
  const observer = new IntersectionObserver(([entry]) => {
    const inView = entry.isIntersecting && entry.intersectionRatio >= threshold;
    if (inView === visible) return;
    visible = inView;
    if (!visible) {
      if (!video.paused) {
        shouldPlay = !video.ended;
        video.pause();
      }
      return;
    }
    if (!shouldPlay || video.ended) return;
    shouldPlay = false;
    video.play().catch((error) => {
      if (error.name === "AbortError" && !visible) shouldPlay = true;
    });
  }, { threshold });
  observer.observe(video);
}

if ("IntersectionObserver" in window) {
  document.querySelectorAll("[data-play-in-view]").forEach(playInView);
}

const walkthrough = document.querySelector(".walkthrough-clip");
let chapterTime = null;
function seekToChapter() {
  if (chapterTime === null || !(walkthrough.duration >= chapterTime)) return;
  walkthrough.currentTime = chapterTime;
  chapterTime = null;
}
walkthrough.addEventListener("durationchange", seekToChapter);
document.querySelectorAll("[data-video-time]").forEach((button) => {
  button.addEventListener("click", () => {
    walkthrough.scrollIntoView({ block: "center", behavior: "instant" });
    chapterTime = Number(button.dataset.videoTime);
    seekToChapter();
    walkthrough.play().catch(() => {
      status.textContent = "再生できませんでした。動画の再生ボタンをお試しください。";
    });
  });
});

async function copyText(target) {
  const text = target.textContent.trim();
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const input = document.createElement("textarea");
    input.className = "sr-only";
    input.value = text;
    input.setAttribute("readonly", "");
    document.body.append(input);
    const previousFocus = document.activeElement;
    input.select();
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } finally {
      input.remove();
      previousFocus?.focus();
    }
    if (copied) return;
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(target);
    selection.removeAllRanges();
    selection.addRange(range);
    throw new Error("Clipboard unavailable");
  }
}

document.querySelectorAll("[data-copy]").forEach((button) => {
  const initialLabel = button.textContent;
  button.addEventListener("click", async () => {
    const target = document.getElementById(button.dataset.copy);
    clearTimeout(resetTimers.get(button));
    status.textContent = "";
    try {
      await copyText(target);
      button.textContent = "コピー済み";
      status.textContent = "コピーしました";
    } catch {
      button.textContent = "手動でコピー";
      status.textContent = "選択したテキストを手動でコピーしてください";
    }
    resetTimers.set(button, setTimeout(() => { button.textContent = initialLabel; }, 2200));
  });
});

const checklist = document.querySelector(".checklist");
const checks = [...checklist.querySelectorAll("input[type=checkbox]")];
const progress = checklist.querySelector(".check-progress");

function updateProgress() {
  const checked = checks.filter((input) => input.checked).length;
  progress.textContent = `${checked} / ${checks.length} 完了`;
}

checks.forEach((input) => {
  const storageKey = `mina-claude-chatgpt-bakery-check-${input.name}`;
  try {
    input.checked = localStorage.getItem(storageKey) === "1";
  } catch {
    // The checklist works for this visit if browser storage is unavailable.
  }
  input.addEventListener("change", () => {
    try {
      localStorage.setItem(storageKey, input.checked ? "1" : "0");
    } catch {
      // Keep the current selection when browser storage is unavailable.
    }
    updateProgress();
  });
});
updateProgress();
